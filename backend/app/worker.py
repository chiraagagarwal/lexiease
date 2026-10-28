import os
import asyncio
import httpx
from typing import Dict, Any
from app.core.arq_settings import WorkerSettings
from app.core.config import settings
import logging
from bs4 import BeautifulSoup
from google.cloud import vision

logger = logging.getLogger(__name__)

def clean_html_to_markdown(text: str) -> str:
    if '<' not in text or '>' not in text:
        return text.strip()
    soup = BeautifulSoup(text, 'html.parser')
    for table in soup.find_all('table'):
        rows = table.find_all('tr')
        md = []
        for i, row in enumerate(rows):
            cols = row.find_all(['td', 'th'])
            row_text = '| ' + ' | '.join(c.get_text(strip=True).replace('|', '\\|') for c in cols) + ' |'
            md.append(row_text)
            if i == 0:
                md.append('|' + '|'.join(['---'] * len(cols)) + '|')
        table.replace_with('\n' + '\n'.join(md) + '\n')
    return soup.get_text().strip()

async def process_document_ocr(ctx, file_content: bytes, filename: str) -> str:
    import time
    t_start = time.time()
    logger.info(f"[TRACE] WORKER START - {filename} ({len(file_content)} bytes)")

    # 0. Attempt direct text extraction for digital PDFs (instant, 100% accurate, no external credits required)
    if filename.lower().endswith('.pdf') or file_content.startswith(b'%PDF'):
        try:
            import io
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_content))
            extracted_pages = []
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text and page_text.strip():
                    extracted_pages.append(page_text.strip())
            if extracted_pages:
                full_text = "\n\n".join(extracted_pages)
                if full_text.strip():
                    t_end = time.time()
                    logger.info(f"[TRACE] WORKER FINISHED (Digital PDF) in {t_end - t_start:.2f}s - {len(full_text)} chars")
                    return full_text
        except Exception as pdf_err:
            logger.debug("Direct PDF extraction bypassed: %s", pdf_err)

    # 1. Attempt Sarvam doc-ai if configured
    if settings.SARVAM_API_KEY:
        headers = {"api-subscription-key": settings.SARVAM_API_KEY}
        mime_type = 'application/pdf' if (filename.lower().endswith('.pdf') or file_content.startswith(b'%PDF')) else 'image/jpeg'

        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                t_sarvam_post_start = time.time()
                files = {'file': (filename, file_content, mime_type)}
                data = {'output_format': 'md'}
                response = await client.post('https://api.sarvam.ai/doc-ai/v1/job/digitise', headers=headers, files=files, data=data)
                response.raise_for_status()
                job_id = response.json().get('job_id')
                t_sarvam_post_end = time.time()
                logger.info(f"[TRACE] SARVAM POST TOOK {t_sarvam_post_end - t_sarvam_post_start:.2f}s, job_id={job_id}")
                if not job_id:
                    raise Exception("No job_id returned")

                # 2. Poll status
                t_poll_start = time.time()
                polls = 0
                while True:
                    status_res = await client.get(f'https://api.sarvam.ai/doc-ai/v1/job/{job_id}/status', headers=headers)
                    status_res.raise_for_status()
                    status = status_res.json().get('status')
                    polls += 1
                    if status in ["completed", "partially_completed"]:
                        break
                    elif status in ["failed", "rejected"]:
                        raise Exception(f"Job failed with status {status}")
                    await asyncio.sleep(2)
                t_poll_end = time.time()
                logger.info(f"[TRACE] SARVAM POLLING TOOK {t_poll_end - t_poll_start:.2f}s ({polls} polls)")

                # 3. Get results
                t_res_start = time.time()
                res = await client.get(f'https://api.sarvam.ai/doc-ai/v1/job/{job_id}/results', headers=headers)
                res.raise_for_status()
                results = res.json()

                # Extract text
                text_blocks = []
                for doc in results.get("documents", []):
                    for page in doc.get("pages", []):
                        for block in page.get("blocks", []):
                            if "text" in block:
                                cleaned_text = clean_html_to_markdown(block["text"])
                                if cleaned_text:
                                    text_blocks.append(cleaned_text)

                t_end = time.time()
                result_str = "\n\n".join(text_blocks) if text_blocks else str(results)
                logger.info(f"[TRACE] WORKER FINISHED in {t_end - t_start:.2f}s - Result length: {len(result_str)} chars")
                return result_str
            except Exception as e:
                logger.error(f"Error during Sarvam OCR processing: {str(e)}")

    logger.warning(f"Sarvam OCR failed. Falling back to Google Cloud Vision API for {filename}...")
    try:
        vision_client = vision.ImageAnnotatorClient()
        feature = vision.Feature(type_=vision.Feature.Type.DOCUMENT_TEXT_DETECTION)
        request = vision.AnnotateFileRequest(
            input_config=vision.InputConfig(content=file_content, mime_type="application/pdf"),
            features=[feature],
            pages=[1, 2, 3, 4, 5] # Sync processing max 5 pages
        )

        # This blocks, but it's inside an async worker function running in an ARQ worker so it's fine.
        # Alternatively, we could run it in a threadpool, but ARQ allows blocking if we're not careful.
        # Wait, process_document_ocr is an `async def`. It's better to run in an executor.
        loop = asyncio.get_event_loop()
        def _run_vision():
            return vision_client.batch_annotate_files(requests=[request])

        response = await loop.run_in_executor(None, _run_vision)

        text_blocks = []
        if response.responses:
            for image_response in response.responses[0].responses:
                if image_response.error.message:
                    logger.error(f"Vision API error on page: {image_response.error.message}")
                    continue
                if image_response.full_text_annotation:
                    text_blocks.append(image_response.full_text_annotation.text)

        result_str = "\n\n".join(text_blocks)
        if not result_str:
            raise Exception("Google Vision API returned no text.")
        logger.info(f"[TRACE] WORKER FINISHED (Fallback) - Result length: {len(result_str)} chars")
        return result_str
    except Exception as fallback_err:
        logger.error(f"Fallback Google Vision API error: {fallback_err}")
        raise Exception(f"OCR failed for {filename}. Sarvam failed, and Vision fallback failed: {fallback_err}")

WorkerSettings.functions = [process_document_ocr]

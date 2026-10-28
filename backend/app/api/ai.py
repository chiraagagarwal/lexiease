from fastapi import APIRouter, HTTPException, Depends, UploadFile, File
from pydantic import BaseModel
from google import genai
from google.genai import types
import httpx
from gtts import gTTS
from io import BytesIO
import base64
from app.core.config import settings
import logging
from typing import List, Optional
from app.core.security import verify_guest_or_user
from app.core.file_validation import validate_assessment_file
from app.core.rate_limiter import check_ai_rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai", tags=["ai"])

class SimplifyRequest(BaseModel):
    text: str

class KeyVocabulary(BaseModel):
    term: str
    explanation: str

class SimplifyResponse(BaseModel):
    simplified_text: str
    reading_grade_reduction: str
    key_vocabulary: List[KeyVocabulary]
    bullet_summary: List[str]

@router.post("/simplify", response_model=SimplifyResponse)
async def simplify_text(req: SimplifyRequest, token_data: dict = Depends(check_ai_rate_limit)):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    is_guest = token_data.get("is_guest", False)
    max_len = 5000 if is_guest else 25000
    if len(req.text) > max_len:
        raise HTTPException(
            status_code=400,
            detail=f"{'Guest' if is_guest else 'User'} simplification request exceeds maximum allowed length ({max_len} characters)"
        )

    if not settings.GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY is not set.")

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        prompt = f"Simplify the following text for a struggling reader. Provide the simplified text, a reading grade reduction estimate (e.g. 'Grade 8 -> Grade 4'), a list of key vocabulary with simple explanations, and a short bullet point summary. Text: {req.text}"

        import json
        import asyncio
        from google.genai.errors import APIError

        max_retries = 3
        base_delay = 1.0

        logger.info(f"Initiating Gemini simplification for text of length {len(req.text)}")

        for attempt in range(max_retries):
            try:
                response = await client.aio.models.generate_content(
                    model='gemini-flash-latest',
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema={
                            "type": "OBJECT",
                            "properties": {
                                "simplified_text": {"type": "STRING"},
                                "reading_grade_reduction": {"type": "STRING"},
                                "key_vocabulary": {
                                    "type": "ARRAY",
                                    "items": {
                                        "type": "OBJECT",
                                        "properties": {
                                            "term": {"type": "STRING"},
                                            "explanation": {"type": "STRING"}
                                        },
                                        "required": ["term", "explanation"]
                                    }
                                },
                                "bullet_summary": {
                                    "type": "ARRAY",
                                    "items": {"type": "STRING"}
                                }
                            },
                            "required": ["simplified_text", "reading_grade_reduction", "key_vocabulary", "bullet_summary"]
                        }
                    )
                )

                result = json.loads(response.text)
                return SimplifyResponse(
                    simplified_text=result["simplified_text"],
                    reading_grade_reduction=result["reading_grade_reduction"],
                    key_vocabulary=[KeyVocabulary(**v) for v in result["key_vocabulary"]],
                    bullet_summary=result["bullet_summary"]
                )
            except APIError as e:
                if e.code in (429, 503):
                    if attempt < max_retries - 1:
                        delay = base_delay * (2 ** attempt)
                        logger.warning(f"Transient Gemini API error {e.code}, retrying in {delay}s: {e}")
                        await asyncio.sleep(delay)
                        continue
                logger.error(f"Gemini API error (APIError): {e}")
                break
            except Exception as e:
                logger.error(f"Gemini API error (General): {e}")
                break

        logger.warning("Primary Gemini Flash model failed or quota exceeded. Falling back to secondary model...")
        try:
            response = await client.aio.models.generate_content(
                model='gemini-flash-lite-latest',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "simplified_text": {"type": "STRING"},
                            "reading_grade_reduction": {"type": "STRING"},
                            "key_vocabulary": {
                                "type": "ARRAY",
                                "items": {
                                    "type": "OBJECT",
                                    "properties": {
                                        "term": {"type": "STRING"},
                                        "explanation": {"type": "STRING"}
                                    },
                                    "required": ["term", "explanation"]
                                }
                            },
                            "bullet_summary": {
                                "type": "ARRAY",
                                "items": {"type": "STRING"}
                            }
                        },
                        "required": ["simplified_text", "reading_grade_reduction", "key_vocabulary", "bullet_summary"]
                    }
                )
            )

            result = json.loads(response.text)
            return SimplifyResponse(
                simplified_text=result["simplified_text"],
                reading_grade_reduction=result["reading_grade_reduction"],
                key_vocabulary=[KeyVocabulary(**v) for v in result["key_vocabulary"]],
                bullet_summary=result["bullet_summary"]
            )
        except Exception as fallback_err:
            logger.error(f"Fallback Gemini model error: {fallback_err}")
            raise HTTPException(status_code=500, detail="Error simplifying text (Both models failed)")
    except Exception as e:
        logger.error(f"Unexpected error in simplify_text: {e}")
        raise HTTPException(status_code=500, detail="Unexpected error simplifying text")

class TranslateRequest(BaseModel):
    text: str
    target_language_code: str # e.g. hi-IN

class TranslateResponse(BaseModel):
    translated_text: str

@router.post("/translate", response_model=TranslateResponse)
async def translate_text(req: TranslateRequest, token_data: dict = Depends(check_ai_rate_limit)):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    is_guest = token_data.get("is_guest", False)
    max_len = 5000 if is_guest else 25000
    if len(req.text) > max_len:
        raise HTTPException(
            status_code=400,
            detail=f"{'Guest' if is_guest else 'User'} translation request exceeds maximum allowed length ({max_len} characters)"
        )

    # 1. Try Sarvam Translate if configured
    if settings.SARVAM_API_KEY:
        url = "https://api.sarvam.ai/translate"
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload = {
            "input": req.text,
            "source_language_code": "en-IN",
            "target_language_code": req.target_language_code,
            "speaker_gender": "Male",
            "mode": "formal",
            "model": "sarvam-translate:v1"
        }

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                response = await client.post(url, headers=headers, json=payload)
                response.raise_for_status()
                data = response.json()
                translated = data.get("translated_text", "")
                if translated and translated.strip():
                    return TranslateResponse(translated_text=translated.strip())
            except httpx.HTTPStatusError as e:
                logger.warning("Sarvam Translate API status error: %s (falling back to Gemini)", e.response.status_code)
            except Exception as e:
                logger.warning("Sarvam Translate API error: %s (falling back to Gemini)", type(e).__name__)
    else:
        logger.info("SARVAM_API_KEY not configured; using Gemini translation.")

    # 2. Fall back to Gemini API
    if settings.GEMINI_API_KEY:
        for model_name in ['gemini-flash-latest', 'gemini-flash-lite-latest']:
            try:
                client = genai.Client(api_key=settings.GEMINI_API_KEY)
                prompt = (
                    f"You are a translator. Translate the following text into the language with BCP-47 code '{req.target_language_code}'. "
                    f"Return ONLY the direct translation, with no explanation, markdown tags, or intro text.\n\nText: {req.text}"
                )
                response = await client.aio.models.generate_content(
                    model=model_name,
                    contents=prompt,
                )
                translated = response.text.strip() if response.text else ""
                if translated:
                    return TranslateResponse(translated_text=translated)
            except Exception as gemini_e:
                logger.warning("Gemini model %s translation error: %s", model_name, type(gemini_e).__name__)

    raise HTTPException(status_code=500, detail="Error translating text (Both providers failed)")

class TTSRequest(BaseModel):
    text: str
    target_language_code: str # hi-IN

@router.post("/tts")
async def tts(req: TTSRequest, token_data: dict = Depends(check_ai_rate_limit)):
    if not req.text or not req.text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    is_guest = token_data.get("is_guest", False)
    max_len = 2000 if is_guest else 10000
    if len(req.text) > max_len:
        raise HTTPException(
            status_code=400,
            detail=f"{'Guest' if is_guest else 'User'} TTS request exceeds maximum allowed length ({max_len} characters)"
        )

    # Split text into chunks of max 400 characters, respecting sentence boundaries if possible
    import re
    chunks = []
    current_chunk = ""
    sentences = re.split(r'(?<=[.!?।]) +', req.text)

    for sentence in sentences:
        if len(current_chunk) + len(sentence) < 400:
            current_chunk += sentence + " "
        else:
            if current_chunk:
                chunks.append(current_chunk.strip())
            current_chunk = sentence + " "

    if current_chunk.strip():
        chunks.append(current_chunk.strip())

    # If a single sentence was too long, split by characters
    final_chunks = []
    for chunk in chunks:
        while len(chunk) > 450:
            final_chunks.append(chunk[:450])
            chunk = chunk[450:]
        if chunk:
            final_chunks.append(chunk)

    if not final_chunks:
        final_chunks = [req.text.strip()]

    # 1. Try Sarvam TTS if configured
    if settings.SARVAM_API_KEY:
        url = "https://api.sarvam.ai/text-to-speech"
        headers = {
            "api-subscription-key": settings.SARVAM_API_KEY,
            "Content-Type": "application/json"
        }
        payload_template = {
            "target_language_code": req.target_language_code,
            "speaker": "aditya",
            "pitch": 0,
            "pace": 1.0,
            "loudness": 1.5,
            "speech_sample_rate": 8000,
            "enable_preprocessing": True,
            "model": "bulbul:v3"
        }

        all_audios = []
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                for i in range(0, len(final_chunks), 3):
                    batch_chunks = final_chunks[i:i+3]
                    payload = {**payload_template, "inputs": batch_chunks}
                    response = await client.post(url, headers=headers, json=payload)
                    response.raise_for_status()
                    data = response.json()
                    audios = data.get("audios", [])
                    all_audios.extend(audios)

            if all_audios and all(len(a) > 0 for a in all_audios):
                return {"audios_base64": all_audios, "audio_format": "audio/wav"}
        except httpx.HTTPStatusError as e:
            logger.warning("Sarvam TTS status error: %s (falling back to gTTS)", e.response.status_code)
        except Exception as e:
            logger.warning("Sarvam TTS API error: %s (falling back to gTTS)", type(e).__name__)
    else:
        logger.info("SARVAM_API_KEY not configured; using gTTS fallback.")

    # 2. Fall back to gTTS (Google Text-to-Speech)
    try:
        import asyncio
        loop = asyncio.get_event_loop()
        all_audios = []

        # gTTS expects short language codes (e.g., 'hi' instead of 'hi-IN')
        target_lang = req.target_language_code.split('-')[0].lower()
        if not target_lang:
            target_lang = 'en'

        for chunk in final_chunks:
            def _generate_gtts(text_chunk, lang):
                try:
                    tts_obj = gTTS(text=text_chunk, lang=lang)
                except Exception:
                    # Fall back to English if the specific short code is unsupported by gTTS
                    tts_obj = gTTS(text=text_chunk, lang='en')
                fp = BytesIO()
                tts_obj.write_to_fp(fp)
                fp.seek(0)
                raw_bytes = fp.read()
                if not raw_bytes:
                    raise ValueError("gTTS generated empty audio bytes")
                return base64.b64encode(raw_bytes).decode('utf-8')

            audio_base64 = await loop.run_in_executor(None, _generate_gtts, chunk, target_lang)
            all_audios.append(audio_base64)

        if all_audios and all(len(a) > 0 for a in all_audios):
            return {"audios_base64": all_audios, "audio_format": "audio/mpeg"}
        raise ValueError("No audio was generated by gTTS")
    except Exception as gtts_e:
        logger.error("gTTS fallback error: %s", gtts_e)
        raise HTTPException(status_code=500, detail="Error generating TTS (Both providers failed)")


class ConfusableSettingsSchema(BaseModel):
    enabled: bool = True
    activePairs: List[str] = ["b/d", "p/q", "m/w"]
    style: str = "weight"

class AssessmentRecommendations(BaseModel):
    font: Optional[str] = "OpenDyslexic"
    letterSpacing: float = 0.06
    lineSpacing: float = 2.0
    wordSpacing: float = 0.14
    themeId: str = "warm-cream"
    backgroundColor: str = "#FEF9EB"
    highlightMode: str = "word"
    confusableLetterSettings: ConfusableSettingsSchema = ConfusableSettingsSchema()

class AssessmentAnalysisResponse(BaseModel):
    recommendations: AssessmentRecommendations
    extractedNotes: List[str]
    disclaimer: str
    is_fallback: bool = False

@router.post("/analyze-assessment", response_model=AssessmentAnalysisResponse)
async def analyze_assessment(
    file: UploadFile = File(...),
    token_data: dict = Depends(check_ai_rate_limit)
):
    if not file:
        raise HTTPException(status_code=400, detail="No assessment file uploaded")

    content = await file.read()

    # Validate file size, extension, and content magic bytes strictly
    is_valid, mime_type, validation_err = validate_assessment_file(
        filename=file.filename or "",
        content=content,
        max_size_bytes=5 * 1024 * 1024
    )
    if not is_valid:
        raise HTTPException(status_code=400, detail=validation_err)

    # Sensitive privacy protection: Do NOT log file content or extracted personal notes
    logger.info("Received assessment document analysis request (size=%d bytes). Processing securely without persisting.", len(content))

    disclaimer_text = "LexiEase provides visual and auditory reading accommodations and does not diagnose dyslexia or provide medical advice."

    # Safe educational accommodation fallback in case of AI provider failure or unconfigured API keys
    fallback_response = AssessmentAnalysisResponse(
        recommendations=AssessmentRecommendations(
            font="OpenDyslexic",
            letterSpacing=0.06,
            lineSpacing=2.0,
            wordSpacing=0.14,
            themeId="warm-cream",
            backgroundColor="#FEF9EB",
            highlightMode="word",
            confusableLetterSettings=ConfusableSettingsSchema(
                enabled=True,
                activePairs=["b/d", "p/q", "m/w"],
                style="weight"
            )
        ),
        extractedNotes=[
            "Standard Accommodation: High letter spacing (+0.06em) reduces optical crowding.",
            "Standard Accommodation: Warm yellow/cream background (#FEF9EB) softens ocular glare.",
            "Standard Accommodation: Synchronized single-word pacing assists phoneme-to-text binding.",
            "Standard Accommodation: Disambiguation enabled for confusable letters b/d and p/q."
        ],
        disclaimer=disclaimer_text,
        is_fallback=True
    )

    if not settings.GEMINI_API_KEY:
        logger.warning("GEMINI_API_KEY is not configured; using secure accommodation defaults.")
        return fallback_response

    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)

        prompt = (
            "You are an assistive reading technology expert analyzing an educational assessment or reading observation report. "
            "LexiEase provides visual and auditory accommodations (such as letter spacing, line spacing, font themes, and confusable letter disambiguation) to help users read more comfortably. "
            "LexiEase does NOT diagnose medical conditions or dyslexia. "
            "Analyze this report to extract non-medical visual and auditory reading accommodations. "
            "Return a structured JSON object with recommendations and notes for the reader."
        )

        file_part = types.Part.from_bytes(data=content, mime_type=mime_type)

        response = await client.aio.models.generate_content(
            model='gemini-1.5-flash',
            contents=[prompt, file_part],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema={
                    "type": "OBJECT",
                    "properties": {
                        "font": {"type": "STRING"},
                        "letter_spacing": {"type": "NUMBER"},
                        "line_spacing": {"type": "NUMBER"},
                        "word_spacing": {"type": "NUMBER"},
                        "theme_id": {"type": "STRING"},
                        "background_color": {"type": "STRING"},
                        "highlight_mode": {"type": "STRING"},
                        "confusable_pairs": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        },
                        "extracted_notes": {
                            "type": "ARRAY",
                            "items": {"type": "STRING"}
                        }
                    },
                    "required": ["letter_spacing", "line_spacing", "extracted_notes"]
                }
            )
        )

        import json
        result = json.loads(response.text)

        recs = AssessmentRecommendations(
            font=result.get("font") or "OpenDyslexic",
            letterSpacing=float(result.get("letter_spacing", 0.06)),
            lineSpacing=float(result.get("line_spacing", 2.0)),
            wordSpacing=float(result.get("word_spacing", 0.14)),
            themeId=result.get("theme_id") or "warm-cream",
            backgroundColor=result.get("background_color") or "#FEF9EB",
            highlightMode=result.get("highlight_mode") or "word",
            confusableLetterSettings=ConfusableSettingsSchema(
                enabled=True,
                activePairs=result.get("confusable_pairs") or ["b/d", "p/q", "m/w"],
                style="weight"
            )
        )

        notes = result.get("extracted_notes") or fallback_response.extractedNotes

        return AssessmentAnalysisResponse(
            recommendations=recs,
            extractedNotes=notes,
            disclaimer=disclaimer_text,
            is_fallback=False
        )

    except Exception as e:
        logger.error("Gemini assessment analysis error, using secure accommodation defaults: %s", e)
        return fallback_response

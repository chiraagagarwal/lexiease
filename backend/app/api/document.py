import uuid
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Request, Depends, BackgroundTasks
from arq import create_pool
from arq.jobs import Job, JobStatus
from app.core.arq_settings import redis_settings
from app.worker import process_document_ocr
from app.core.security import verify_guest_or_user
from app.core.file_validation import validate_document_file
from app.core.rate_limiter import check_ai_rate_limit

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/document", tags=["document"])

in_memory_tasks = {}

async def run_in_memory_ocr(task_id: str, content: bytes, filename: str):
    try:
        in_memory_tasks[task_id] = {"status": "in_progress", "result": None, "error": None}
        result = await process_document_ocr(None, content, filename)
        in_memory_tasks[task_id] = {"status": "complete", "result": result, "error": None}
    except Exception as e:
        logger.error("In-memory OCR processing error: %s", e)
        in_memory_tasks[task_id] = {"status": "failed", "result": None, "error": str(e)}

@router.post("/parse")
async def parse_document(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    token_data: dict = Depends(check_ai_rate_limit)
):
    if not file:
        raise HTTPException(status_code=400, detail="No file uploaded")

    filename = file.filename or "document.pdf"
    content = await file.read()

    is_guest = token_data.get("is_guest", False)
    is_valid, mime_type, err_msg = validate_document_file(filename, content, is_guest=is_guest)
    if not is_valid:
        raise HTTPException(status_code=400, detail=err_msg)

    # Try enqueuing with Redis / ARQ with fast timeout so offline Redis does not delay requests
    try:
        import asyncio
        redis = await asyncio.wait_for(create_pool(redis_settings), timeout=0.5)
        job = await redis.enqueue_job("process_document_ocr", content, filename)
        if job:
            return {"task_id": job.job_id}
    except Exception as e:
        logger.info("Redis queue is unavailable (%s). Using in-memory background task.", e)

    # In-memory fallback
    task_id = f"local_{uuid.uuid4().hex}"
    in_memory_tasks[task_id] = {"status": "in_progress", "result": None, "error": None}
    background_tasks.add_task(run_in_memory_ocr, task_id, content, filename)
    return {"task_id": task_id}

@router.get("/tasks/{task_id}")
async def get_task_status(task_id: str, token_data: dict = Depends(verify_guest_or_user)):
    if task_id in in_memory_tasks:
        task_info = in_memory_tasks[task_id]
        return {
            "task_id": task_id,
            "status": task_info["status"],
            "result": task_info.get("result"),
            "error": task_info.get("error")
        }

    try:
        import asyncio
        redis = await asyncio.wait_for(create_pool(redis_settings), timeout=1.0)
        job = Job(task_id, redis)
        status = await job.status()

        if status == JobStatus.not_found:
            raise HTTPException(status_code=404, detail="Task not found")

        result = None
        error = None
        if status == JobStatus.complete:
            try:
                result = await job.result()
            except Exception as job_err:
                return {
                    "task_id": task_id,
                    "status": "failed",
                    "result": None,
                    "error": str(job_err)
                }
        elif status == JobStatus.in_progress:
            pass

        return {
            "task_id": task_id,
            "status": status.value,
            "result": result,
            "error": error
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"Task not found: {e}")

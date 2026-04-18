"""
routers/upload.py — POST /api/upload
"""

from fastapi import APIRouter, UploadFile, File, HTTPException
import orchestrator

router = APIRouter()


@router.post("/upload")
async def upload_tp(file: UploadFile = File(...)):
    filename = file.filename or "upload"
    file_bytes = await file.read()

    if len(file_bytes) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File too large (max 10 MB).")

    try:
        result = orchestrator.handle_upload(filename, file_bytes)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return result
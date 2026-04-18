"""
routers/submit.py — POST /api/submit
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import orchestrator

router = APIRouter()


class SubmitRequest(BaseModel):
    session_id: str
    final_code: Optional[str] = None


@router.post("/submit")
def submit(req: SubmitRequest):
    """
    Student submits their final work.
    Agent C runs and returns grade + feedback.
    """
    try:
        result = orchestrator.handle_submit(req.session_id, req.final_code)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result
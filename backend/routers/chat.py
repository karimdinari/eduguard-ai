"""
routers/chat.py — POST /api/chat  and  GET /api/session/{session_id}
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import orchestrator

router = APIRouter()


class ChatRequest(BaseModel):
    session_id: str
    message: str
    code_snippet: Optional[str] = None  # optional code the student pastes


class StepAdvanceRequest(BaseModel):
    session_id: str


@router.post("/chat")
def chat(req: ChatRequest):
    """
    Student sends a message (and optionally a code snippet).
    Agent B processes and replies.
    """
    try:
        result = orchestrator.handle_chat(req.session_id, req.message, req.code_snippet)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


@router.post("/next-step")
def next_step(req: StepAdvanceRequest):
    """Student clicks 'Next Step' in the UI."""
    try:
        result = orchestrator.handle_step_advance(req.session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    return result


@router.get("/session/{session_id}")
def get_status(session_id: str):
    """Lightweight status poll — the frontend can call this periodically."""
    try:
        return orchestrator.get_session_status(session_id)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
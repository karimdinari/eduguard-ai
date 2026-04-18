"""
routers/answer.py — POST /api/answer  and  POST /api/verify
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import orchestrator

router = APIRouter()


class AnswerRequest(BaseModel):
    session_id: str
    question_id: str          # e.g. "1.a"
    student_answer: str       # code or text
    time_spent_seconds: int   # seconds since question was displayed


class VerifyRequest(BaseModel):
    session_id: str
    student_response: str     # student's verbal response to the verification question


@router.post("/answer")
def submit_answer(req: AnswerRequest):
    """
    Student submits their answer to a specific question.
    Agent B evaluates correctness + suspicion.
    """
    try:
        result = orchestrator.handle_answer(
            req.session_id,
            req.question_id,
            req.student_answer,
            req.time_spent_seconds,
        )
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result


@router.post("/verify")
def submit_verification(req: VerifyRequest):
    """
    Student responds to a verification question after being flagged as suspicious.
    Agent B checks if they genuinely understand their submission.
    """
    try:
        result = orchestrator.handle_verification(req.session_id, req.student_response)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return result
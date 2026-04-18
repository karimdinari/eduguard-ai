"""
orchestrator.py — Holds all active sessions in memory and routes events to agents.
No framework. Just a dict + if/elif logic.
"""

from typing import Optional
from session import new_session, add_message, add_submission
from services.file_parser import parse_file
import agents.agent_a as agent_a
import agents.agent_b as agent_b
import agents.agent_c as agent_c

# ── In-memory session store ────────────────────────────────────────────────────
# { session_id: session_dict }
_sessions: dict[str, dict] = {}


# ── Public API called by routers ──────────────────────────────────────────────

def handle_upload(filename: str, file_bytes: bytes) -> dict:
    """
    Called when the student uploads a TP file.
    1. Creates a new session
    2. Parses the file
    3. Runs Agent A
    Returns the session_id + roadmap message.
    """
    session = new_session()
    sid = session["session_id"]

    # Parse file
    text, file_type = parse_file(filename, file_bytes)
    session["tp_raw_text"] = text
    session["tp_filename"] = filename
    session["tp_file_type"] = file_type

    # Run Agent A
    agent_a.run(session)

    _sessions[sid] = session

    return {
        "session_id":  sid,
        "tp_data":     session["tp_data"],
        "roadmap":     session["roadmap"],
        "objectives":  session["objectives"],
        "constraints": session["constraints"],
        "messages":    session["messages"],
    }


def handle_chat(session_id: str, student_message: str, code_snippet: Optional[str] = None) -> dict:
    """
    Called on every student chat message or code submission during the session.
    1. Records the student message
    2. Optionally records code as a submission
    3. Runs Agent B
    Returns Agent B's reply + session status.
    """
    session = _get_session(session_id)

    # If student is submitting code, record it
    if code_snippet:
        add_submission(session, code_snippet)

    # Record student message
    add_message(session, role="student", content=student_message)

    # Run Agent B
    b_result = agent_b.run(session, student_message)

    return {
        "reply": b_result["reply"],
        "blocked": b_result["blocked"],
        "risk_score": b_result["risk_score"],
        "risk_flags": b_result["risk_flags"],
        "current_step": session["current_step"],
        "messages": session["messages"][-5:],   # last 5 messages for the frontend
    }


def handle_step_advance(session_id: str) -> dict:
    """
    Called when the student clicks 'Next Step'.
    Blocked if Agent B has flagged the session.
    """
    session = _get_session(session_id)

    if session["blocked"]:
        return {
            "success": False,
            "reason": "You must answer the pending question before advancing.",
            "current_step": session["current_step"],
        }

    total_steps = len(session["roadmap"])
    if session["current_step"] < total_steps:
        session["current_step"] += 1

    next_step = (
        session["roadmap"][session["current_step"]]
        if session["current_step"] < total_steps
        else None
    )

    return {
        "success": True,
        "current_step": session["current_step"],
        "next_step": next_step,
    }


def handle_submit(session_id: str, final_code: Optional[str] = None) -> dict:
    """
    Called on final submission.
    Runs Agent C and returns the full evaluation.
    """
    session = _get_session(session_id)

    if session["submitted"]:
        return {
            "grade": session["final_grade"],
            "feedback": session["final_feedback"],
            "improvement_suggestions": session["improvement_suggestions"],
            "breakdown": session["evaluation_breakdown"],
            "already_submitted": True,
        }

    if final_code:
        add_submission(session, final_code)

    evaluation = agent_c.run(session)
    return {**evaluation, "already_submitted": False}


def get_session_status(session_id: str) -> dict:
    """Return a lightweight status snapshot for the frontend."""
    session = _get_session(session_id)
    return {
        "session_id": session_id,
        "current_step": session["current_step"],
        "total_steps": len(session["roadmap"]),
        "blocked": session["blocked"],
        "risk_score": session["risk_score"],
        "submitted": session["submitted"],
        "b_question_pending": session["b_question_pending"],
        "messages": session["messages"],
    }


# ── Internal ──────────────────────────────────────────────────────────────────

def _get_session(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise KeyError(f"Session '{session_id}' not found.")
    return session
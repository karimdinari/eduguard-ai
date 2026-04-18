"""
orchestrator.py — Holds all active sessions in memory and routes events to agents.
"""

from typing import Optional
from session import new_session, add_message, add_submission
from services.file_parser import parse_file
import agents.agent_a as agent_a
import agents.agent_b as agent_b
import agents.agent_c as agent_c

# ── In-memory session store ────────────────────────────────────────────────────
_sessions: dict[str, dict] = {}


# ── Public API called by routers ──────────────────────────────────────────────

def handle_upload(filename: str, file_bytes: bytes) -> dict:
    """
    Called when the student uploads a TP file.
    1. Creates a new session
    2. Parses the file
    3. Runs Agent A
    """
    session = new_session()
    sid = session["session_id"]

    text, file_type = parse_file(filename, file_bytes)
    session["tp_raw_text"] = text
    session["tp_filename"] = filename
    session["tp_file_type"] = file_type

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


def handle_answer(
    session_id: str,
    question_id: str,
    student_answer: str,
    time_spent_seconds: int,
) -> dict:
    """
    Called when the student submits an answer to a specific question.
    Routes to agent_b.run() for initial evaluation.
    """
    session = _get_session(session_id)
    question = _find_question(session, question_id)

    add_submission(session, student_answer)
    add_message(session, role="student", content=student_answer)

    result = agent_b.run(session, question, student_answer, time_spent_seconds)

    # Store the original answer so verification can reference it
    if result["verdict"] == "suspicious":
        session["b_pending_answer"] = student_answer
        session["b_pending_question_obj"] = question

    return {
        **result,
        "current_step": session["current_step"],
    }


def handle_verification(session_id: str, student_response: str) -> dict:
    """
    Called when the student sends a message while a verification question is pending.
    Routes to agent_b.run_verification().
    """
    session = _get_session(session_id)

    if not session.get("b_question_pending"):
        return {"error": "No verification question is pending."}

    question = session.get("b_pending_question_obj", {})
    original_answer = session.get("b_pending_answer", "")

    add_message(session, role="student", content=student_response)

    result = agent_b.run_verification(session, question, original_answer, student_response)

    # Clear pending state
    session["b_pending_answer"] = None
    session["b_pending_question_obj"] = None

    return {
        **result,
        "current_step": session["current_step"],
    }


def handle_chat(session_id: str, student_message: str, code_snippet: Optional[str] = None) -> dict:
    """
    General chat message (not tied to a specific question answer).
    If a verification is pending, route to handle_verification instead.
    """
    session = _get_session(session_id)

    # If a verification question is pending, treat any message as the student's response
    if session.get("b_question_pending"):
        return handle_verification(session_id, student_message)

    if code_snippet:
        add_submission(session, code_snippet)

    add_message(session, role="student", content=student_message)

    # No active question evaluation — just acknowledge
    reply = "Got it. Use the question panel to submit your answer to a specific question."
    add_message(session, role="system", content=reply, agent="agent_b")

    return {
        "reply":        reply,
        "verdict":      None,
        "blocked":      session["blocked"],
        "risk_score":   session["risk_score"],
        "risk_flags":   session["risk_flags"],
        "current_step": session["current_step"],
    }


def handle_step_advance(session_id: str) -> dict:
    """Called when the student clicks 'Next Step'."""
    session = _get_session(session_id)

    if session["blocked"]:
        return {
            "success": False,
            "reason": "Answer the verification question before advancing.",
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
        "success":      True,
        "current_step": session["current_step"],
        "next_step":    next_step,
    }


def handle_submit(session_id: str, final_code: Optional[str] = None) -> dict:
    """Called on final submission. Runs Agent C."""
    session = _get_session(session_id)

    if session["submitted"]:
        return {
            "grade":                   session["final_grade"],
            "feedback":                session["final_feedback"],
            "improvement_suggestions": session["improvement_suggestions"],
            "breakdown":               session["evaluation_breakdown"],
            "already_submitted":       True,
        }

    if final_code:
        add_submission(session, final_code)

    evaluation = agent_c.run(session)
    return {**evaluation, "already_submitted": False}


def get_session_status(session_id: str) -> dict:
    """Lightweight status snapshot for the frontend."""
    session = _get_session(session_id)
    return {
        "session_id":          session_id,
        "current_step":        session["current_step"],
        "total_steps":         len(session["roadmap"]),
        "blocked":             session["blocked"],
        "risk_score":          session["risk_score"],
        "submitted":           session["submitted"],
        "b_question_pending":  session["b_question_pending"],
        "messages":            session["messages"],
    }


# ── Internal ──────────────────────────────────────────────────────────────────

def _get_session(session_id: str) -> dict:
    session = _sessions.get(session_id)
    if not session:
        raise KeyError(f"Session '{session_id}' not found.")
    return session


def _find_question(session: dict, question_id: str) -> dict:
    """Find a question dict by its ID across all parts of tp_data."""
    for part in session["tp_data"].get("parts", []):
        for q in part.get("questions", []):
            if q["id"] == question_id:
                return q
    raise KeyError(f"Question '{question_id}' not found in this TP.")
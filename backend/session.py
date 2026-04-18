"""
session.py — In-memory session state.
"""

import time
import uuid


def new_session() -> dict:
    return {
        # ── Identity ──────────────────────────────────────────────
        "session_id": str(uuid.uuid4()),
        "created_at": time.time(),

        # ── Raw TP content ────────────────────────────────────────
        "tp_raw_text":   None,
        "tp_filename":   None,
        "tp_file_type":  None,

        # ── Agent A output ────────────────────────────────────────
        "objectives":    [],
        "constraints":   [],
        "tp_data":       {},
        "roadmap":       [],
        "current_step":  0,

        # ── Chat history ──────────────────────────────────────────
        "messages":      [],

        # ── Agent B state ─────────────────────────────────────────
        "submissions":            [],
        "risk_score":             0,
        "risk_flags":             [],
        "blocked":                False,

        # Verification flow
        "b_question_pending":     None,   # the verification question text currently pending
        "b_pending_answer":       None,   # original answer that triggered suspicion
        "b_pending_question_obj": None,   # the question dict that was being answered
        "b_questions_asked":      0,

        # ── Agent C output ────────────────────────────────────────
        "submitted":               False,
        "final_grade":             None,
        "final_feedback":          None,
        "improvement_suggestions": [],
        "evaluation_breakdown":    {},
    }


def add_message(session: dict, role: str, content: str, agent: str = "system") -> None:
    session["messages"].append({
        "role":    role,
        "content": content,
        "agent":   agent,
        "ts":      time.time(),
    })


def add_submission(session: dict, code: str) -> None:
    session["submissions"].append({
        "step": session["current_step"],
        "code": code,
        "ts":   time.time(),
    })
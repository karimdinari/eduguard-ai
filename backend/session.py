"""
session.py — In-memory session state.
One session per student per TP upload. No database.
"""

import time
import uuid


def new_session() -> dict:
    """Create a fresh session dict."""
    return {
        # ── Identity ──────────────────────────────────────────────
        "session_id": str(uuid.uuid4()),
        "created_at": time.time(),

        # ── Raw TP content ────────────────────────────────────────
        "tp_raw_text": None,
        "tp_filename": None,
        "tp_file_type": None,

        # ── Agent A output ────────────────────────────────────────
        "objectives":  [],     # list[str]
        "constraints": [],     # list[str]
        "tp_data":     {},     # full structured TP: {title, parts:[{part, title, questions:[...]}]}
        "roadmap":     [],     # flat list derived from tp_data parts for step tracking
        "current_step": 0,

        # ── Chat history ──────────────────────────────────────────
        "messages": [],        # list[{role, content, agent, ts}]

        # ── Agent B state ─────────────────────────────────────────
        "submissions":         [],
        "risk_score":          0,
        "risk_flags":          [],
        "blocked":             False,
        "b_question_pending":  None,
        "b_questions_asked":   0,

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
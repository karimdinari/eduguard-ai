"""
agents/agent_b.py — Understanding & Anti-Cheat Agent.
Runs on every student message/submission during the session.
Two fused responsibilities:
  1. Assess suspicious behavior → update risk_score
  2. Periodically ask understanding questions
     (and force explanation when risk is high)
"""

from pathlib import Path

from services.gemini_client import call_gemini, call_gemini_json
from session import add_message

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "agent_b_prompt.txt"

# Thresholds
RISK_BLOCK_THRESHOLD = 65      # block student and demand explanation
QUESTION_EVERY_N_MESSAGES = 4  # ask a question every N student messages


def run(session: dict, student_input: str) -> dict:
    """
    Called after each student message.
    Returns a response dict:
    {
        "reply": str,          # message to send back to student
        "blocked": bool,       # True → frontend should disable progression
        "risk_score": int,
        "risk_flags": list[str],
    }
    """
    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")

    # Build context payload for Gemini
    context = _build_context(session, student_input)

    raw: dict = call_gemini_json(system_prompt, context)

    # ── Update session risk state ─────────────────────────────────
    new_score = int(raw.get("risk_score", session["risk_score"]))
    session["risk_score"] = max(session["risk_score"], new_score)   # never decrease mid-session
    new_flags = raw.get("risk_flags", [])
    for f in new_flags:
        if f not in session["risk_flags"]:
            session["risk_flags"].append(f)

    # ── Decide whether to block ───────────────────────────────────
    if session["risk_score"] >= RISK_BLOCK_THRESHOLD:
        session["blocked"] = True

    # ── Decide whether to ask an understanding question ───────────
    student_msg_count = sum(1 for m in session["messages"] if m["role"] == "student")
    should_ask = (
        session["b_question_pending"] is None
        and (
            session["blocked"]
            or student_msg_count % QUESTION_EVERY_N_MESSAGES == 0
        )
    )

    question = raw.get("understanding_question") if should_ask else None

    if question:
        session["b_question_pending"] = question
        session["b_questions_asked"] += 1

    # ── Build reply ───────────────────────────────────────────────
    reply_parts = []

    if raw.get("encouragement"):
        reply_parts.append(raw["encouragement"])

    if session["blocked"]:
        reply_parts.append(
            "⚠️ **Progress paused.** "
            "I noticed some patterns that need clarification before you continue."
        )

    if question:
        reply_parts.append(f"🤔 **Question for you:** {question}")

    # If no question and not blocked, pass through agent's general comment
    if not reply_parts and raw.get("comment"):
        reply_parts.append(raw["comment"])

    reply = "\n\n".join(reply_parts) if reply_parts else ""

    # ── Unblock if student is answering a pending question ────────
    if session["b_question_pending"] and session["blocked"]:
        answer_quality = int(raw.get("answer_quality_score", 0))
        if answer_quality >= 60:
            session["blocked"] = False
            session["b_question_pending"] = None
            reply = (
                "✅ Good explanation! You may continue.\n\n" + reply
            ).strip()

    if reply:
        add_message(session, role="system", content=reply, agent="agent_b")

    return {
        "reply": reply,
        "blocked": session["blocked"],
        "risk_score": session["risk_score"],
        "risk_flags": session["risk_flags"],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_context(session: dict, student_input: str) -> str:
    recent_messages = session["messages"][-10:]
    recent_chat = "\n".join(
        f"[{m['role'].upper()}]: {m['content'][:500]}" for m in recent_messages
    )

    recent_submissions = session["submissions"][-3:]
    submissions_text = "\n\n".join(
        f"Step {s['step']} submission:\n{s['code'][:1000]}" for s in recent_submissions
    ) if recent_submissions else "None yet."

    roadmap_summary = "\n".join(
        f"Step {s['step']}: {s['title']}" for s in session["roadmap"]
    )

    return f"""
SESSION INFO:
- Current step: {session['current_step']} / {len(session['roadmap'])}
- Risk score so far: {session['risk_score']}
- Existing flags: {', '.join(session['risk_flags']) or 'none'}
- Questions asked so far: {session['b_questions_asked']}
- Pending question (student hasn't answered yet): {session['b_question_pending'] or 'none'}

ROADMAP:
{roadmap_summary}

RECENT CHAT:
{recent_chat}

RECENT SUBMISSIONS:
{submissions_text}

CURRENT STUDENT INPUT:
{student_input}
"""
"""
agents/agent_b.py — Answer Evaluator & Anti-Cheat Agent.

Runs when a student submits an answer to a specific question.
Flow:
  1. Student submits answer + time_spent → evaluate correctness + suspicion
     - suspicious  → ask verification question, wait for student reply
     - wrong       → return wrong + hint
     - accepted    → return accepted
  2. Student replies to verification question → evaluate understanding
     - verification_passed → accepted
     - verification_failed → return explanation of correct answer
"""

from pathlib import Path

from services.gemini_client import call_gemini, call_gemini_json
from session import add_message

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "agent_b_prompt.txt"

# Risk flags that accumulate across the session
_RISK_FLAG_WEIGHTS = {
    "too_fast":              50,
    "unusually_slow":        25,
    "suspiciously_perfect":  50,
    "style_inconsistency":   20,
    "above_expected_level":  30,
}


def run(session: dict, question: dict, student_answer: str, time_spent_seconds: int) -> dict:
    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")
    context = _build_evaluation_context(session, question, student_answer, time_spent_seconds)

    raw: dict = call_gemini_json(system_prompt, context)

    # ── Update session risk state ─────────────────────────────────────────────
    new_flags = raw.get("risk_flags", [])
    for flag in new_flags:
        if flag not in session["risk_flags"]:
            session["risk_flags"].append(flag)

    # Recalculate risk score from all accumulated flags
    session["risk_score"] = min(100, sum(
        _RISK_FLAG_WEIGHTS.get(f, 10) for f in session["risk_flags"]
    ))

    verdict = raw.get("verdict", "wrong")

    # ── Force suspicious if any flags were raised and answer was accepted ─────
    # Wrong answers are never suspicious — they just get a hint.
    # But a correct answer with any flag must always trigger verification.
    if verdict == "accepted" and new_flags:
        verdict = "suspicious"
        if not raw.get("verification_question"):
            raw["verification_question"] = _generate_verification_question(
                session, question, student_answer
            )

    # ── Update pending verification state ────────────────────────────────────
    if verdict == "suspicious":
        session["b_question_pending"] = raw.get("verification_question")
        session["b_questions_asked"] += 1
        session["blocked"] = True

    elif verdict in ("verification_passed", "accepted"):
        session["b_question_pending"] = None
        session["blocked"] = False

    elif verdict == "verification_failed":
        session["b_question_pending"] = None
        session["blocked"] = False  # unblock but session risk stays high

    # ── Build reply message ───────────────────────────────────────────────────
    reply_parts = [raw.get("message", "")]

    if verdict == "suspicious" and raw.get("verification_question"):
        reply_parts.append(f"🤔 **Question:** {raw['verification_question']}")

    elif verdict == "wrong" and raw.get("hint"):
        reply_parts.append(f"💡 **Hint:** {raw['hint']}")

    elif verdict == "verification_failed" and raw.get("explanation"):
        reply_parts.append(f"📖 **Explanation:**\n{raw['explanation']}")

    reply = "\n\n".join(p for p in reply_parts if p)

    # ── Prefix with verdict badge ─────────────────────────────────────────────
    badge = {
        "accepted":             "✅",
        "wrong":                "❌",
        "suspicious":           "🔍",
        "verification_passed":  "✅",
        "verification_failed":  "📖",
    }.get(verdict, "")

    if badge:
        reply = f"{badge} {reply}"

    add_message(session, role="system", content=reply, agent="agent_b")

    return {
        "verdict":               verdict,
        "message":               reply,
        "hint":                  raw.get("hint"),
        "verification_question": raw.get("verification_question"),
        "explanation":           raw.get("explanation"),
        "risk_score":            session["risk_score"],
        "risk_flags":            session["risk_flags"],
        "blocked":               session["blocked"],
    }


def run_verification(session: dict, question: dict, original_answer: str, student_response: str) -> dict:
    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")
    context = _build_verification_context(session, question, original_answer, student_response)

    raw: dict = call_gemini_json(system_prompt, context)

    verdict = raw.get("verdict", "verification_failed")

    # Force verdict to one of the two valid verification outcomes
    if verdict not in ("verification_passed", "verification_failed"):
        verdict = "verification_failed"

    new_flags = raw.get("risk_flags", [])
    for flag in new_flags:
        if flag not in session["risk_flags"]:
            session["risk_flags"].append(flag)

    session["risk_score"] = min(100, sum(
        _RISK_FLAG_WEIGHTS.get(f, 10) for f in session["risk_flags"]
    ))

    if verdict == "verification_passed":
        session["b_question_pending"] = None
        session["blocked"] = False
    else:
        session["b_question_pending"] = None
        session["blocked"] = False

    reply_parts = [raw.get("message", "")]
    if verdict == "verification_failed" and raw.get("explanation"):
        reply_parts.append(f"📖 **Explanation:**\n{raw['explanation']}")

    reply = "\n\n".join(p for p in reply_parts if p)
    badge = "✅" if verdict == "verification_passed" else "📖"
    reply = f"{badge} {reply}"

    add_message(session, role="system", content=reply, agent="agent_b")

    return {
        "verdict":               verdict,
        "message":               reply,
        "hint":                  None,
        "verification_question": None,
        "explanation":           raw.get("explanation"),
        "risk_score":            session["risk_score"],
        "risk_flags":            session["risk_flags"],
        "blocked":               session["blocked"],
    }


# ── Context builders ──────────────────────────────────────────────────────────

def _build_evaluation_context(
    session: dict,
    question: dict,
    student_answer: str,
    time_spent_seconds: int,
) -> str:
    previous_submissions = session["submissions"][-3:]
    prev_text = "\n\n".join(
        f"[Previous submission — Step {s['step']}]:\n{s['code'][:600]}"
        for s in previous_submissions
    ) if previous_submissions else "None."

    skeleton = f"\nCODE SKELETON PROVIDED:\n{question['code']}" if question.get("code") else ""

    return f"""
MODE: initial_evaluation

QUESTION:
- ID: {question['id']}
- Type: {question['type']}
- Task: {question['task']}{skeleton}

STUDENT ANSWER:
{student_answer}

TIME SPENT: {time_spent_seconds} seconds

SESSION RISK CONTEXT:
- Current risk score: {session['risk_score']} / 100
- Existing flags: {', '.join(session['risk_flags']) or 'none'}

PREVIOUS SUBMISSIONS (for style comparison):
{prev_text}
"""


def _build_verification_context(
    session: dict,
    question: dict,
    original_answer: str,
    student_response: str,
) -> str:
    skeleton = f"\nCODE SKELETON PROVIDED:\n{question['code']}" if question.get("code") else ""

    return f"""
MODE: verification_evaluation

You previously flagged this student as suspicious and asked them a follow-up question.
Now evaluate their verbal response to determine if they genuinely understand their submission.

ORIGINAL QUESTION:
- ID: {question['id']}
- Type: {question['type']}
- Task: {question['task']}{skeleton}

STUDENT'S ORIGINAL ANSWER:
{original_answer}

VERIFICATION QUESTION THAT WAS ASKED:
{session['b_question_pending']}

STUDENT'S RESPONSE TO VERIFICATION:
{student_response}

SESSION RISK CONTEXT:
- Current risk score: {session['risk_score']} / 100
- Existing flags: {', '.join(session['risk_flags']) or 'none'}

Respond with verdict "verification_passed" or "verification_failed" only.
"""


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_verification_question(session: dict, question: dict, student_answer: str) -> str:
    """
    Called only when Gemini returned accepted + flags but forgot to include
    a verification_question. Makes a second focused call to generate one.
    """
    prompt = (
        "You are an anti-cheat agent. A student submitted a suspiciously fast or perfect answer. "
        "Generate ONE very specific Socratic question about their submission that only someone "
        "who genuinely wrote it themselves could answer confidently. "
        "No preamble, no explanation — just the question itself."
    )
    context = (
        f"QUESTION TASK: {question['task']}\n\n"
        f"STUDENT ANSWER:\n{student_answer}\n\n"
        f"RISK FLAGS DETECTED: {', '.join(session['risk_flags'])}"
    )
    return call_gemini(prompt, context, temperature=0.4)
"""
agents/agent_c.py — Final Evaluation Agent.
Runs ONCE on student submission.
Reads the full session and produces grade + feedback.
"""

from pathlib import Path

from services.gemini_client import call_gemini_json
from session import add_message

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "agent_c_prompt.txt"


def run(session: dict) -> dict:
    """
    Reads the full session context and produces:
        - final_grade          (float, 0–20)
        - final_feedback       (str)
        - improvement_suggestions (list[str])
        - evaluation_breakdown    (dict)

    Also marks session["submitted"] = True.
    Returns the evaluation as a dict.
    """
    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")
    context = _build_context(session)

    result: dict = call_gemini_json(system_prompt, context, temperature=0.3)

    session["final_grade"] = float(result.get("grade", 0))
    session["final_feedback"] = result.get("feedback", "")
    session["improvement_suggestions"] = result.get("improvement_suggestions", [])
    session["evaluation_breakdown"] = result.get("breakdown", {})
    session["submitted"] = True

    # Post the evaluation to chat history
    summary = _format_evaluation(session)
    add_message(session, role="system", content=summary, agent="agent_c")

    return {
        "grade": session["final_grade"],
        "feedback": session["final_feedback"],
        "improvement_suggestions": session["improvement_suggestions"],
        "breakdown": session["evaluation_breakdown"],
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_context(session: dict) -> str:
    all_submissions = "\n\n".join(
        f"--- Step {s['step']} ---\n{s['code']}" for s in session["submissions"]
    ) if session["submissions"] else "No code submitted."

    full_chat = "\n".join(
        f"[{m['role'].upper()} / {m['agent']}]: {m['content'][:800]}"
        for m in session["messages"]
    )

    roadmap = "\n".join(
        f"Step {s['step']}: {s['title']} — {s['description']}"
        for s in session["roadmap"]
    )

    # Derive problem statement from available session fields if not explicitly set
    tp = session.get("tp_data", {})
    title = tp.get("title", session.get("tp_filename", "Untitled TP"))
    objectives = session.get("objectives", [])
    constraints = session.get("constraints", [])
    expected_outputs = session.get("expected_outputs", [])

    problem_statement = session.get("problem_statement") or (
        f"{title}\n\nObjectives:\n" + "\n".join(f"- {o}" for o in objectives)
        if objectives else title
    )

    return f"""
PROBLEM STATEMENT:
{problem_statement}

OBJECTIVES:
{chr(10).join('- ' + o for o in objectives) or 'Not specified.'}

CONSTRAINTS:
{chr(10).join('- ' + c for c in constraints) or 'Not specified.'}

EXPECTED OUTPUTS:
{chr(10).join('- ' + o for o in expected_outputs) or 'Not specified.'}

ROADMAP:
{roadmap}

ALL CODE SUBMISSIONS:
{all_submissions}

FULL CHAT HISTORY:
{full_chat}

ANTI-CHEAT SUMMARY:
- Final risk score: {session.get('risk_score', 0)} / 100
- Flags raised: {', '.join(session.get('risk_flags', [])) or 'none'}
- Understanding questions asked: {session.get('b_questions_asked', 0)}
- Student was blocked at some point: {any(m['content'].startswith('⚠️') for m in session['messages'])}
"""


def _format_evaluation(session: dict) -> str:
    bd = session["evaluation_breakdown"]
    lines = [
        "## 🎓 Final Evaluation\n",
        f"**Grade: {session['final_grade']} / 20**\n",
        f"### Feedback\n{session['final_feedback']}\n",
    ]

    if bd:
        lines.append("### Breakdown")
        for criterion, score in bd.items():
            lines.append(f"- **{criterion}**: {score}")
        lines.append("")

    if session["improvement_suggestions"]:
        lines.append("### Suggestions for Improvement")
        for s in session["improvement_suggestions"]:
            lines.append(f"- {s}")

    return "\n".join(lines)
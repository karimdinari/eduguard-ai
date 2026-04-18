"""
agents/agent_a.py — Context & Decomposition Agent.
Runs ONCE when the TP is uploaded.
Extracts objectives, constraints, and full tp_data structure.
"""

from pathlib import Path

from services.gemini_client import call_gemini_json
from session import add_message

_PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "agent_a_prompt.txt"


def run(session: dict) -> None:
    """
    Reads session["tp_raw_text"] and fills in:
        - objectives
        - constraints
        - tp_data        (full structured TP with parts + questions)
        - roadmap        (derived from tp_data for step tracking)
    """
    system_prompt = _PROMPT_PATH.read_text(encoding="utf-8")

    user_message = f"""
Here is the TP content:

\"\"\"
{session["tp_raw_text"][:12000]}
\"\"\"

File type: {session["tp_file_type"]}
Filename: {session["tp_filename"]}
"""

    result: dict = call_gemini_json(system_prompt, user_message)

    session["objectives"]  = result.get("objectives", [])
    session["constraints"] = result.get("constraints", [])
    session["tp_data"]     = result.get("tp_data", {})

    # Build a flat roadmap from tp_data parts for step tracking
    session["roadmap"] = _build_roadmap(session["tp_data"])
    session["current_step"] = 0

    # Post summary message to chat
    add_message(session, role="system", content=_format_summary(session), agent="agent_a")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _build_roadmap(tp_data: dict) -> list:
    """Convert tp_data parts into the flat roadmap list used by the orchestrator."""
    roadmap = []
    for part in tp_data.get("parts", []):
        questions = part.get("questions", [])
        q_summary = ", ".join(q["id"] for q in questions)
        roadmap.append({
            "step": part["part"],
            "title": part["title"],
            "description": f"Complete questions: {q_summary}",
            "questions": questions,
        })
    return roadmap


def _format_summary(session: dict) -> str:
    tp = session["tp_data"]
    lines = [
        f"## TP Loaded: {tp.get('title', session['tp_filename'])}\n",
    ]

    if session["objectives"]:
        lines.append("**Objectives:**")
        for o in session["objectives"]:
            lines.append(f"  - {o}")
        lines.append("")

    if session["constraints"]:
        lines.append("**Constraints:**")
        for c in session["constraints"]:
            lines.append(f"  - {c}")
        lines.append("")

    lines.append("**Parts:**")
    for part in tp.get("parts", []):
        q_ids = ", ".join(q["id"] for q in part.get("questions", []))
        lines.append(f"  **Part {part['part']}: {part['title']}** — Questions: {q_ids}")

    total_q = sum(len(p.get("questions", [])) for p in tp.get("parts", []))
    lines.append(f"\n{total_q} questions across {len(tp.get('parts', []))} parts. Start with Part 1!")

    return "\n".join(lines)
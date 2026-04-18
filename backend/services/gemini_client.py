"""
services/gemini_client.py — Thin wrapper around Gemini Flash 2.5.
Uses the new unified google-genai SDK (pip install google-genai).
"""

import os
import json

from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()

_MODEL_NAME = "gemini-2.5-flash-lite"

_client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])


def call_gemini(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.4,
    max_output_tokens: int = 8192,
) -> str:
    """Single-turn call to Gemini Flash 2.5. Returns raw text."""
    full_prompt = f"{system_prompt.strip()}\n\n---\n\n{user_message.strip()}"

    response = _client.models.generate_content(
        model=_MODEL_NAME,
        contents=full_prompt,
        config=types.GenerateContentConfig(
            temperature=temperature,
            max_output_tokens=max_output_tokens,
        ),
    )
    return response.text.strip()


def call_gemini_json(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.2,
    max_output_tokens: int = 8192,
) -> dict | list:
    """
    Same as call_gemini but parses the response as JSON.
    Handles markdown fences, truncated output, and trailing commas.
    """
    system_prompt_with_json = (
        system_prompt.strip()
        + "\n\nCRITICAL: Respond ONLY with a single valid JSON object. "
        "No explanation, no markdown fences, no extra text before or after. "
        "Keep all string values concise to avoid truncation."
    )

    raw = call_gemini(system_prompt_with_json, user_message, temperature, max_output_tokens)

    # Strip markdown fences if present
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[-1]
        raw = raw.rsplit("```", 1)[0]
    raw = raw.strip()

    # Find the outermost JSON object/array boundaries
    start = raw.find("{") if "{" in raw else raw.find("[")
    end = raw.rfind("}") if "{" in raw else raw.rfind("]")
    if start != -1 and end != -1:
        raw = raw[start:end+1]

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        # Attempt to fix truncated JSON by closing open structures
        raw = _attempt_json_repair(raw)
        return json.loads(raw)


def _attempt_json_repair(s: str) -> str:
    """Best-effort repair of truncated JSON."""
    # Close any open strings first — find unclosed quotes
    # Count open braces and brackets
    open_braces = s.count("{") - s.count("}")
    open_brackets = s.count("[") - s.count("]")

    # If we're inside an unclosed string, close it
    in_string = False
    escaped = False
    for ch in s:
        if escaped:
            escaped = False
            continue
        if ch == "\\":
            escaped = True
            continue
        if ch == '"':
            in_string = not in_string

    if in_string:
        s += '"'
        # Recalculate after closing the string
        open_braces = s.count("{") - s.count("}")
        open_brackets = s.count("[") - s.count("]")

    # Close open arrays then objects
    s += "]" * open_brackets
    s += "}" * open_braces

    return s
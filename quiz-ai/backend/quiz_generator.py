import json
import os
import re
import requests

# ---------------------------------------------------------------------------
# Configuration — change these to switch AI backends
# ---------------------------------------------------------------------------

# "ollama" uses a local Ollama instance (free, no API key needed)
# "groq"   uses the Groq cloud API (free tier, requires GROQ_API_KEY in .env)
AI_BACKEND = os.getenv("AI_BACKEND", "ollama")

OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL",   "llama3-8b-8192")
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

# Maximum characters of document text sent to the LLM
MAX_TEXT_CHARS = 4000

# ---------------------------------------------------------------------------
# Prompt template (exactly as specified)
# ---------------------------------------------------------------------------

PROMPT_TEMPLATE = """You are a teacher creating a quiz.
Based on the following content, generate exactly 10 multiple choice questions.

Rules:
- Each question must have exactly 4 answer choices
- Only one answer is correct
- Answers must be concise
- Questions should test understanding

Return ONLY valid JSON in this exact format with no other text, explanation, or markdown:
{{"questions":[{{"question":"string","choices":["A","B","C","D"],"correct_index":0}}]}}

CONTENT: {document_text}"""


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def generate_quiz(document_text: str) -> dict:
    """
    Send document text to the configured LLM and return a validated quiz dict.
    Retries once with a stricter prompt if the first attempt fails to parse.
    """
    truncated = document_text[:MAX_TEXT_CHARS]
    prompt    = PROMPT_TEMPLATE.format(document_text=truncated)

    raw = _call_llm(prompt)
    quiz = _parse_and_validate(raw)

    if quiz is None:
        # Retry with an even more explicit instruction
        strict_prompt = prompt + "\n\nCRITICAL: Output ONLY the JSON object. No markdown. No explanation. Start with { and end with }."
        raw  = _call_llm(strict_prompt)
        quiz = _parse_and_validate(raw)

    if quiz is None:
        raise ValueError(
            "The AI did not return valid quiz JSON after two attempts. "
            "Try a different document or switch AI backend."
        )

    return quiz


# ---------------------------------------------------------------------------
# LLM backend callers
# ---------------------------------------------------------------------------

def _call_llm(prompt: str) -> str:
    if AI_BACKEND == "groq":
        return _call_groq(prompt)
    return _call_ollama(prompt)


def _call_ollama(prompt: str) -> str:
    payload = {
        "model":  OLLAMA_MODEL,
        "prompt": prompt,
        "stream": False,
        "format": "json",   # Ollama's native JSON mode
        "options": {"temperature": 0.3},
    }
    try:
        resp = requests.post(OLLAMA_URL, json=payload, timeout=120)
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        raise RuntimeError(
            "Cannot connect to Ollama. "
            "Make sure Ollama is running: `ollama serve` "
            "and that the model is pulled: `ollama pull llama3`"
        )
    return resp.json().get("response", "")


def _call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError(
            "GROQ_API_KEY is not set. "
            "Add it to backend/.env or set AI_BACKEND=ollama to use a local model."
        )
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "response_format": {"type": "json_object"},
        "temperature": 0.3,
    }
    try:
        resp = requests.post(GROQ_URL, headers=headers, json=payload, timeout=60)
        resp.raise_for_status()
    except requests.exceptions.HTTPError as e:
        raise RuntimeError(f"Groq API error: {e.response.text}")
    return resp.json()["choices"][0]["message"]["content"]


# ---------------------------------------------------------------------------
# JSON parsing + validation
# ---------------------------------------------------------------------------

def _parse_and_validate(raw: str) -> dict | None:
    """
    Try to extract and validate a quiz JSON object from the LLM output.
    Returns the dict on success, or None on any failure.
    """
    if not raw or not raw.strip():
        return None

    # Strip markdown code fences if present
    cleaned = re.sub(r"```(?:json)?", "", raw).strip()

    # Find the outermost JSON object
    start = cleaned.find("{")
    end   = cleaned.rfind("}")
    if start == -1 or end == -1:
        return None

    json_str = cleaned[start : end + 1]

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError:
        return None

    return _validate_quiz(data)


def _validate_quiz(data: dict) -> dict | None:
    """
    Ensure the quiz has exactly 10 questions, each with 4 choices
    and a valid correct_index. Returns cleaned dict or None.
    """
    if not isinstance(data, dict):
        return None

    questions = data.get("questions")
    if not isinstance(questions, list) or len(questions) == 0:
        return None

    valid = []
    for q in questions:
        if not isinstance(q, dict):
            continue
        question  = q.get("question", "").strip()
        choices   = q.get("choices", [])
        correct   = q.get("correct_index")

        if (
            question
            and isinstance(choices, list)
            and len(choices) == 4
            and all(isinstance(c, str) and c.strip() for c in choices)
            and isinstance(correct, int)
            and 0 <= correct <= 3
        ):
            valid.append({
                "question":      question,
                "choices":       [c.strip() for c in choices],
                "correct_index": correct,
            })

    if len(valid) < 5:   # need at least half to be usable
        return None

    # Pad to 10 if some were malformed (edge case)
    return {"questions": valid[:10]}

import json
import os
import re
import requests
from dotenv import load_dotenv
from pathlib import Path
import json_repair

load_dotenv(Path(__file__).parent / ".env")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
GEMINI_URL     = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

MAX_TEXT_CHARS = 4000

PROMPT_TEMPLATE = """# ROLE
You are an expert quiz designer for school students. Your job is to transform educational content — slide decks, PDFs, or plain text — into engaging, pedagogically sound multiple-choice quizzes that reinforce learning without feeling like a chore.

# CRITICAL RULE
Never ask for clarification. Always infer everything you need from the content itself and any custom instructions. Generte immediately.

# INPUT
The user will provide extracted text or a concept description, and may optionally include custom instructions. Use whatever they give you. Infer the rest.

# INFERENCE RULES
Apply these whenever a parameter is not explicitly stated:
- Grade level: Infer from vocabulary, sentence complexity, and topic depth in the source.
- Difficulty: Default to Mixed: 30% Easy, 50% Medium, 20% Hard. Adjust based on source density.

# QUIZ DESIGN RULES
Accuracy:
- Every question must be directly traceable to the source content.
- Do not invent facts, statistics, or claims not present in the input.

Language and clarity:
- Match reading level to the inferred grade.
- Questions must be unambiguous — one clearly correct answer.
- Avoid double negatives unless explicitly requested.
- Keep question stems concise — under 30 words where possible.

Distractor quality (MCQ):
- Each question must have exactly {num_options} answer choices.
- Exactly ONE answer must be correct.
- The other {distractor_count} answers must be plausible, drawn from related concepts in the source, but clearly incorrect.
- All answer choices must be DIFFERENT from each other and mutually exclusive.
- Do NOT include choices like "All of the above" or "None of the above".
- All options should be similar in length and style.

Difficulty calibration:
- Easy: direct recall, single-step reasoning.
- Medium: connecting two ideas or applying a concept.
- Hard: synthesis, inference, or evaluation — answer not stated verbatim.

# TONE
Encouraging, clear, and student-friendly. The quiz should feel like a fair challenge, not a trick.

{custom_instructions}

# OUTPUT FORMAT
Return ONLY valid JSON in this exact format with no other text, markdown formatting, or preamble:

{{"questions":[
{{"question":"string",
"choices":[{choices_example}],
"correct_index":0}}
]}}

Generate exactly {num_questions} multiple choice questions with exactly {num_options} choices each.
Document content:
{document_text}"""


def generate_quiz(document_text: str, num_questions: int = 10, num_options: int = 4, custom_instructions: str | None = None) -> dict:
    num_questions = max(1, min(num_questions, 20))
    num_options = max(2, min(num_options, 4))
    truncated = document_text[:MAX_TEXT_CHARS]

    ins_block = ""
    if custom_instructions:
        ins_block = f"\nATTENTION! The user added custom instructions for this quiz:\n>>> {custom_instructions} <<<\nMake absolutely sure to adapt the quiz based on these instructions."

    choices_example = ", ".join([f'"Option {chr(65+i)}"' for i in range(num_options)])
    distractor_count = num_options - 1

    prompt = PROMPT_TEMPLATE.format(
        num_questions=num_questions,
        num_options=num_options,
        distractor_count=distractor_count,
        choices_example=choices_example,
        document_text=truncated,
        custom_instructions=ins_block,
    )
    raw = _call_gemini(prompt)
    return _parse_quiz(raw, num_questions, num_options)


def _call_gemini(prompt: str) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError("GEMINI_API_KEY is not set in the environment.")
    resp = None
    try:
        resp = requests.post(
            GEMINI_URL,
            params={"key": GEMINI_API_KEY},
            headers={"Content-Type": "application/json"},
            json={
                "contents": [{"parts": [{"text": prompt}]}],
                "generationConfig": {
                    "temperature": 0.1,
                    "maxOutputTokens": 2500,
                    "responseMimeType": "application/json",
                },
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
    except requests.RequestException as e:
        error_details = resp.text if resp is not None else str(e)
        raise RuntimeError(f"Gemini request failed: {e}. Details: {error_details}") from e


def _parse_quiz(raw: str, num_questions: int = 10, num_options: int = 4) -> dict:
    cleaned = re.sub(r"```(?:json)?\s*", "", raw).strip()

    start_idx = cleaned.find('{')
    end_idx = cleaned.rfind('}')

    if start_idx == -1 or end_idx == -1:
        raise ValueError(f"Could not find JSON structure in LLM response. Raw: {raw[:500]}")

    json_str = cleaned[start_idx:end_idx+1]

    try:
        data = json_repair.loads(json_str)
    except Exception as e:
        raise ValueError(f"Invalid JSON from LLM: {e}. Extracted JSON: {json_str[:500]}... Raw: {raw[:500]}") from e

    if not isinstance(data, dict) or "questions" not in data or not isinstance(data["questions"], list):
        raise ValueError("LLM response missing 'questions' list.")
    valid = []
    for item in data["questions"]:
        if not isinstance(item, dict):
            continue
        q = item.get("question", "").strip()
        choices = item.get("choices", [])
        idx = item.get("correct_index")
        if (
            q
            and isinstance(choices, list)
            and 2 <= len(choices) <= num_options
            and all(isinstance(c, str) and c.strip() for c in choices)
            and isinstance(idx, int)
            and 0 <= idx < len(choices)
        ):
            valid.append({
                "question": q,
                "choices": [c.strip() for c in choices],
                "correct_index": idx,
            })
    if not valid:
        raise ValueError(f"No valid questions parsed. Raw: {raw[:500]}")
    return {"questions": valid[:num_questions]}

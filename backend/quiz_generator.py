import json
import os
import re
import requests
from dotenv import load_dotenv
from pathlib import Path
import json_repair

load_dotenv(Path(__file__).parent / ".env")

AI_BACKEND = os.getenv("AI_BACKEND", "groq")

OLLAMA_URL   = os.getenv("OLLAMA_URL",   "http://localhost:11434/api/generate")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL",   "llama3-8b-8192")
# Wait, Render is using the old env var if we had it set in render!
# Let's completely force the model without using os.getenv just in case Render has GROQ_MODEL set to the old one in its environment variables!
REAL_GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192")
if REAL_GROQ_MODEL == "llama3-8b-8192":
    REAL_GROQ_MODEL = "llama-3.1-8b-instant"

GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

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
- Each question must have exactly 4 answer choices.
- Exactly ONE answer must be correct.
- The other 3 answers must be plausible, drawn from related concepts in the source, but clearly incorrect.
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
"choices":["First option text","Second option text","Third option text","Fourth option text"],
"correct_index":0}}
]}}

Generate exactly {num_questions} multiple choice questions.
Document content:
{document_text}"""


def generate_quiz(document_text: str, num_questions: int = 10, custom_instructions: str = None) -> dict: # type: ignore
    num_questions = max(1, min(num_questions, 20))
    truncated = document_text[:MAX_TEXT_CHARS]
    
    print("----- EXTRACTED TEXT -----")
    print(truncated)
    print("--------------------------")
    
    ins_block = ""
    if custom_instructions:
        # Heavily sanitize or just inject
        ins_block = f"\nATTENTION! The user added custom instructions for this quiz:\n>>> {custom_instructions} <<<\nMake absolutely sure to adapt the quiz based on these instructions."

    prompt = PROMPT_TEMPLATE.format(
        num_questions=num_questions,
        document_text=truncated,
        custom_instructions=ins_block
    )
    if AI_BACKEND == "groq":
        raw = _call_groq(prompt)
    else:
        raw = _call_ollama(prompt)
    return _parse_quiz(raw, num_questions)


def _call_ollama(prompt: str) -> str:
    try:
        resp = requests.post(
            OLLAMA_URL,
            json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=120,
        )
        resp.raise_for_status()
        return resp.json()["response"]
    except requests.RequestException as e:
        raise RuntimeError(f"Ollama request failed: {e}") from e


def _call_groq(prompt: str) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY is not set in the environment.")
    try:
        resp = requests.post(
            GROQ_URL,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": REAL_GROQ_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1,
                "max_tokens": 2500,
                "response_format": {"type": "json_object"},
            },
            timeout=60,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"]
    except requests.RequestException as e:
        error_details = resp.text if 'resp' in locals() else str(e) # type: ignore
        raise RuntimeError(f"Groq request failed: {e}. Details: {error_details}") from e


def _parse_quiz(raw: str, num_questions: int = 10) -> dict:
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

    if "questions" not in data or not isinstance(data["questions"], list): # type: ignore
        raise ValueError("LLM response missing 'questions' list.")
    valid = []
    for item in data["questions"]: # type: ignore
        if not isinstance(item, dict):
            continue
        q = item.get("question", "").strip()
        choices = item.get("choices", [])
        idx = item.get("correct_index")
        if (
            q
            and isinstance(choices, list)
            and len(choices) == 4
            and all(isinstance(c, str) and c.strip() for c in choices)
            and isinstance(idx, int)
            and 0 <= idx <= 3
        ):
            valid.append({
                "question": q,
                "choices": [c.strip() for c in choices],
                "correct_index": idx,
            })
    if not valid:
        raise ValueError(f"No valid questions parsed. Raw: {raw[:500]}")
    return {"questions": valid[:num_questions]}

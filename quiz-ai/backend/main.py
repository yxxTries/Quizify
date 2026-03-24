import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_text
from quiz_generator import generate_quiz

# Load .env from the same directory as this file
load_dotenv(Path(__file__).parent / ".env")

app = FastAPI(title="Quiz AI", version="1.0.0")

# Allow the Vite dev server (and any localhost port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

ALLOWED_EXTENSIONS = {".pdf", ".pptx"}
MAX_FILE_SIZE_MB   = 20


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/generate-quiz")
async def generate_quiz_endpoint(file: UploadFile = File(...)):
    # ── 1. Validate file type ──────────────────────────────────────────────
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{suffix}'. Please upload a .pdf or .pptx file.",
        )

    # ── 2. Read file bytes ─────────────────────────────────────────────────
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File is {size_mb:.1f} MB. Maximum allowed size is {MAX_FILE_SIZE_MB} MB.",
        )

    # ── 3. Extract text ────────────────────────────────────────────────────
    try:
        text = extract_text(file_bytes, file.filename)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    # ── 4. Generate quiz ───────────────────────────────────────────────────
    try:
        quiz = generate_quiz(text)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return quiz

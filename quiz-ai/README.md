# QuizAI — slides → quiz in seconds

Upload a PDF or PowerPoint. The AI reads it and writes 10 multiple-choice questions.
Play a Kahoot-style quiz right in your browser.

---

## Requirements

| Tool | Version |
|------|---------|
| Python | 3.10+ |
| Node.js | 18+ |
| Ollama *(if using local AI)* | latest |

---

## Quick start

### 1 — Backend

```bash
cd quiz-ai/backend

# Install Python dependencies
pip install -r requirements.txt

# Configure the AI backend (edit .env if you want to switch to Groq)
# Default is Ollama (local, free, no API key)

# Start the API server
uvicorn main:app --reload
# Runs at http://localhost:8000
```

### 2 — Frontend

```bash
cd quiz-ai/frontend

npm install
npm run dev
# Runs at http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## AI backend options

### Option A — Ollama (default, runs locally)

1. Install Ollama from https://ollama.com
2. Pull a model:
   ```bash
   ollama pull llama3       # ~4 GB download, recommended
   # or
   ollama pull mistral      # faster on older hardware
   # or
   ollama pull phi3         # smaller, less accurate
   ```
3. Start Ollama:
   ```bash
   ollama serve
   ```
4. Leave `AI_BACKEND=ollama` in `backend/.env` — you're done.

### Option B — Groq (cloud, free tier, very fast)

1. Sign up at https://console.groq.com and get a free API key.
2. Edit `backend/.env`:
   ```
   AI_BACKEND=groq
   GROQ_API_KEY=gsk_your_key_here
   ```
3. No GPU needed.

---

## Folder structure

```
quiz-ai/
├── backend/
│   ├── main.py            # FastAPI app + /generate-quiz endpoint
│   ├── extractor.py       # PDF and PPTX text extraction
│   ├── quiz_generator.py  # AI prompt + response parsing
│   ├── requirements.txt
│   └── .env               # AI backend config
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx       # React entry point
        ├── App.jsx        # Page router (upload → quiz)
        ├── Upload.jsx     # File upload UI
        ├── Quiz.jsx       # Quiz UI with scoring
        └── api.js         # fetch wrapper for the backend
```

---

## API reference

### `POST /generate-quiz`

**Request:** `multipart/form-data` with a `file` field (.pdf or .pptx, max 20 MB)

**Response `200`:**
```json
{
  "questions": [
    {
      "question": "What is the primary function of mitochondria?",
      "choices": [
        "Protein synthesis",
        "Energy production via ATP",
        "DNA replication",
        "Cell signalling"
      ],
      "correct_index": 1
    }
  ]
}
```

**Error responses:**
| Code | Meaning |
|------|---------|
| 400 | Wrong file type |
| 413 | File too large |
| 422 | No readable text found in file |
| 503 | Cannot connect to AI backend |
| 500 | AI returned invalid JSON |

---

## Example generated quiz

Given a PDF about cell biology, the AI returns:

```json
{
  "questions": [
    {
      "question": "Which organelle is responsible for producing ATP?",
      "choices": ["Nucleus", "Mitochondria", "Ribosome", "Golgi apparatus"],
      "correct_index": 1
    },
    {
      "question": "What is the role of ribosomes in the cell?",
      "choices": ["Lipid synthesis", "DNA storage", "Protein synthesis", "Cell division"],
      "correct_index": 2
    }
  ]
}
```

---

## Troubleshooting

**"Cannot connect to Ollama"**
→ Run `ollama serve` in a separate terminal before starting the backend.

**"No readable text found in PDF"**
→ The PDF is a scanned image. Use a PDF with selectable text, or run it through an OCR tool first.

**AI returns fewer than 10 questions**
→ Normal for very short documents. The validator accepts 5+ questions.

**CORS error in browser**
→ Make sure the backend is running on port 8000 and the frontend on port 5173.

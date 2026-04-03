# Quizify (Kuizu)

Generate quizzes from PDF/PPTX files and play them in either:
- **Solo mode** (single player), or
- **Multiplayer host/join mode** with a PIN and live leaderboard.

## Project Scope

Quizify is a full-stack app that:
- uploads course slides/documents (`.pdf`, `.pptx`)
- extracts text content on the backend
- uses an LLM to generate multiple-choice questions
- lets users review/edit quiz questions before starting
- supports live multiplayer sessions over WebSockets

The project includes:
- a **FastAPI backend** for file processing, quiz generation, and multiplayer sockets
- a **React + Vite frontend** for upload, preview, gameplay, host, and join flows

---

## Tech Stack

### Frontend
- React 18
- Vite 5
- qrcode.react (join URL QR code for multiplayer)

### Backend
- Python 3.10+
- FastAPI + Uvicorn
- pdfplumber (PDF extraction)
- python-pptx (PowerPoint extraction)
- requests (LLM API calls)
- python-dotenv (environment loading)
- json-repair (LLM JSON recovery)

### AI Providers
- **Groq** (default in code if no `.env` override)
- **Ollama** (local model option)

---

## Installation

### Prerequisites
- Node.js 18+
- Python 3.10+
- One AI backend configured:
  - Groq API key, or
  - Ollama installed locally

### 1) Backend setup

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

**Option A: Groq**
```env
AI_BACKEND=groq
GROQ_API_KEY=your_groq_api_key
# optional:
# GROQ_MODEL=llama-3.1-8b-instant
```

**Option B: Ollama**
```env
AI_BACKEND=ollama
OLLAMA_MODEL=llama3
# optional:
# OLLAMA_URL=http://localhost:11434/api/generate
```

If using Ollama, also run:
```bash
ollama pull llama3
ollama serve
```

Start backend:
```bash
cd backend
uvicorn main:app --reload
```
Backend runs at `http://localhost:8000`.

### 2) Frontend setup

```bash
cd frontend
npm install
npm run dev
```
Frontend runs at `http://localhost:5173`.

Open `http://localhost:5173`.

---

## Run/Build Commands

### Frontend
```bash
cd frontend
npm run dev
npm run build
```

### Backend
```bash
cd backend
uvicorn main:app --reload
```

---

## API and Realtime Endpoints

- `GET /health` — health check
- `POST /generate-quiz` — upload file and generate quiz
- `WS /ws/host` — host creates/controls game
- `WS /ws/join/{pin}/{name}` — player joins game

`/generate-quiz` constraints:
- file types: `.pdf`, `.pptx`
- max file size: `20 MB`
- `num_questions` supported up to `20`

---

## Repository Structure

```
Quizify/
├── backend/
│   ├── main.py
│   ├── multiplayer.py
│   ├── extractor.py
│   ├── quiz_generator.py
│   └── requirements.txt
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── Upload.jsx
│       ├── Preview.jsx
│       ├── Quiz.jsx
│       ├── Host.jsx
│       ├── Join.jsx
│       └── api.js
└── README.md
```

---

## Notes

- If the backend runs on a different host, set `VITE_BACKEND_URL` for the frontend.
- CORS is currently open (`allow_origins=["*"]`) in backend configuration.
- A Windows helper script (`start.bat`) is included for local startup convenience.

# Kuizu

Turn slides, PDFs, and notes into interactive quizzes in seconds. Play solo, host live multiplayer games, and share your creations with the community.

## Features
- 📄 **AI Quiz Generation**: Upload PDFs, PPTXs, or paste custom text/instructions.
- 🎮 **Multiplayer & Solo Modes**: Host live games with a PIN and real-time leaderboards, or practice solo with timers.
- 🌍 **Community Hub**: Publish quizzes to the "Discover" board and explore community content.
- 🛠️ **Edit & Customize**: Review, edit, and tweak generated questions before starting.
- 💾 **Account & Library**: Save your favorite quizzes and manage your profile.

## Tech Stack
- **Frontend**: React 18, Vite, React Router, WebSockets
- **Backend**: Python 3.10+, FastAPI, SQLite, WebSockets
- **AI Providers**: Groq API (default) or Ollama (local)

---

## How to Run Locally

### 1. Backend Setup
Requires Python 3.10+.

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

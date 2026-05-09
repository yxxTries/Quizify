# Kuizu

Turn slides, PDFs, and notes into interactive quizzes in seconds. Play solo, host live multiplayer games, and share your creations with the community.

## Features

- **AI Quiz Generation**: Upload PDFs, PPTXs, or paste custom text/instructions. Skip both for random trivia.
- **Multi-Step Wizard**: Guided creation flow — upload + prompt, question count, timer, then preview and edit.
- **Multiplayer & Solo Modes**: Host live games with a PIN and real-time leaderboards, or practice solo with timers.
- **Community Hub**: Spotify-style Discover feed with featured quizzes, genre rows, and community content.
- **Edit & Customize**: Review, edit, and tweak generated questions before starting. Regenerate with adjusted prompts.
- **Account & Library**: Save quizzes, publish to Discover, manage your profile and preferences.

## Tech Stack

- **Frontend**: React 18, Vite, React Router, WebSockets
- **Backend**: Python 3.10+, FastAPI, SQLite, WebSockets
- **AI**: Google Gemini (gemini-2.5-flash)

---

## How to Run Locally

### 1. Backend Setup

Requires Python 3.10+.

```bash
cd backend
pip install -r requirements.txt
```

Create `backend/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Start backend:

```bash
cd backend
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`.

### 2. Frontend Setup

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
npm run dev      # dev server
npm run build    # production build
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
- `POST /discover` — publish quiz to community
- `GET /games` — list saved games
- `POST /auth/register` / `POST /auth/login` — authentication

`/generate-quiz` constraints:
- file types: `.pdf`, `.pptx`
- max file size: `20 MB`
- `num_questions` supported up to `20`
- `num_options` supported: 2, 3, or 4

---

## Repository Structure

```
quiz-ai/
├── start.bat
├── backend/
│   ├── main.py
│   ├── multiplayer.py
│   ├── extractor.py
│   ├── quiz_generator.py
│   ├── requirements.txt
│   ├── controllers/
│   ├── core/
│   ├── middleware/
│   ├── routes/
│   ├── schemas/
│   └── services/
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── App.jsx
│       ├── CreateWizard.jsx
│       ├── CreateDashboard.jsx
│       ├── Quiz.jsx
│       ├── Host.jsx
│       ├── Join.jsx
│       ├── Discover.jsx
│       ├── MyGames.jsx
│       ├── MyProfile.jsx
│       ├── QuizPreview.jsx
│       ├── PlayQuizPage.jsx
│       ├── Welcome.jsx
│       ├── AuthModal.jsx
│       ├── SaveGameModal.jsx
│       ├── DiscoverPostModal.jsx
│       ├── EditMetaModal.jsx
│       ├── theme.js
│       ├── ThemeContext.jsx
│       ├── ThemeToggle.jsx
│       └── api.js
└── README.md
```

---

## Notes

- If the backend runs on a different host, set `VITE_BACKEND_URL` for the frontend.
- CORS origins are configured via `ALLOWED_ORIGINS` in the backend.
- A Windows helper script (`start.bat`) is included for local startup convenience.
- For deployment: frontend on Vercel (SPA via `vercel.json`), backend on Render or similar.

# Quizify (Kuizu) — Architecture Document

## 1. Project Overview

Quizify is a full-stack web application for AI-powered quiz generation, solo quiz taking, and real-time multiplayer quiz games. It consists of two services:

| Service | Path | Technology |
|---|---|---|
| Backend | `backend/` | Python FastAPI + SQLite + Google Gemini |
| Frontend | `frontend/` | React 18 + Vite (plain JavaScript) |

Users can upload files (PDF/PPTX) or write prompts, have Gemini generate quiz questions, edit them, play solo, host multiplayer games with friends via a PIN system, save quizzes to a library, and publish them to a community discover board.

---

## 2. Directory Structure

```
quiz-ai/
├── start.bat                    # Dev launcher (be + fe in separate shells)
├── backend/
│   ├── main.py                  # FastAPI entry, WebSocket endpoints, /generate-quiz
│   ├── multiplayer.py           # WebSocket room manager (singleton)
│   ├── quiz_generator.py        # Gemini API integration
│   ├── extractor.py             # PDF/PPTX text extraction
│   ├── requirements.txt
│   ├── users.db                 # SQLite database
│   ├── .env                     # API keys, model config
│   ├── controllers/             # Auth, discover, game controllers
│   ├── core/                    # Config, security (bcrypt, JWT)
│   ├── middleware/               # Auth dependency, rate limiter
│   ├── routes/                  # HTTP route definitions
│   ├── schemas/                 # Pydantic request/response models
│   └── services/                # Business logic + DB queries
├── frontend/
│   ├── index.html               # Vite entry, Google Fonts
│   ├── package.json
│   ├── vite.config.js           # Dev server on port 5173
│   ├── vercel.json              # SPA rewrite for Vercel
│   └── src/
│       ├── main.jsx             # ReactDOM entry + providers
│       ├── App.jsx              # Root component, router, global state, CSS
│       ├── api.js               # HTTP client + WebSocket URL builder
│       ├── theme.js             # Light/dark color palettes
│       ├── ThemeContext.jsx      # Theme React context
│       ├── ThemeToggle.jsx      # Sun/moon toggle
│       ├── AuthModal.jsx        # Sign In / Sign Up / Forgot Password
│       ├── Welcome.jsx          # Arcade-style landing page
│       ├── CreateWizard.jsx     # Multi-step quiz creation wizard (primary)
│       ├── CreateDashboard.jsx  # Legacy quiz generation + editor
│       ├── Quiz.jsx             # Core quiz-taking (solo + multiplayer)
│       ├── Host.jsx             # Host multiplayer lobby + live game
│       ├── Join.jsx             # Join multiplayer by PIN
│       ├── Discover.jsx         # Spotify-style community feed
│       ├── MyGames.jsx          # User's saved games library
│       ├── MyProfile.jsx        # Profile settings + preferences
│       ├── QuizPreview.jsx      # Quiz detail preview page
│       ├── PlayQuizPage.jsx     # Public quiz permalink (SEO)
│       ├── SaveGameModal.jsx    # Save-to-library modal
│       ├── DiscoverPostModal.jsx# Publish-to-discover modal
│       ├── EditMetaModal.jsx    # Edit title/category modal
│       └── Upload.jsx           # Legacy component
```

---

## 3. Tech Stack

### Backend
| Dependency | Purpose |
|---|---|
| FastAPI / Uvicorn | Web framework + ASGI server |
| Pydantic | Request/response validation |
| python-multipart | File upload parsing |
| pdfplumber | PDF text extraction |
| python-pptx | PPTX text extraction |
| requests | HTTP calls to Gemini API |
| json-repair | Fixes malformed JSON from LLM |
| bcrypt | Password hashing |
| PyJWT | JWT creation/verification |
| python-dotenv | .env loading |
| sqlite3 (built-in) | Database (no ORM) |

### Frontend
| Dependency | Purpose |
|---|---|
| React 18 | UI framework |
| Vite 5 | Build tool / dev server |
| react-router-dom 6 | Client-side routing |
| react-helmet-async | Dynamic `<head>` management |
| @formkit/auto-animate | List animation |
| qrcode.react | QR code for game PIN |
| Native `fetch` | HTTP requests (no Axios) |
| Native `WebSocket` | Real-time multiplayer |
| Inline CSS-in-JS | Styling (no CSS framework) |

---

## 4. Backend Architecture

### Layered Design

```
routes/          Thin — define HTTP methods + paths, call controllers
    ↓
controllers/     Request handling — read cookies, call services, return responses
    ↓
services/        Business logic — validation rules, DB queries
    ↓
core/            Primitives — config, bcrypt, JWT helpers
```

Middleware (`auth_middleware`, `rate_limit`) is injected at the route level via FastAPI `Depends()`.

### Module Responsibilities

| Module | Files | Responsibility |
|---|---|---|
| **Auth** | `routes/auth_routes.py`, `controllers/auth_controller.py`, `services/auth_service.py`, `services/user_service.py`, `schemas/auth.py` | Registration, login, logout, JWT refresh, password reset, profile updates, preferences |
| **Games** | `routes/game_routes.py`, `controllers/game_controller.py`, `services/game_service.py`, `schemas/game.py` | Save/load/list/delete games, pin/unpin, category change |
| **Discover** | `routes/discover_routes.py`, `controllers/discover_controller.py`, `services/discover_service.py` | List/create/delete discover posts, anti-spam cooldowns |
| **Quiz Gen** | `main.py` (POST /generate-quiz), `quiz_generator.py`, `extractor.py` | File text extraction → Gemini prompt → JSON parsing → validated quiz |
| **Multiplayer** | `main.py` (WebSocket), `multiplayer.py` | In-memory WebSocket rooms, PIN management, scoring, leaderboard |
| **Core** | `core/config.py`, `core/security.py` | JWT secrets, cookie names, CORS origins, bcrypt, JWT encode/decode |
| **Middleware** | `middleware/auth_middleware.py`, `middleware/rate_limit.py` | Cookie auth dependency, IP-based rate limiter (deque sliding window) |

### API Endpoints

| Method | Path | Auth | Purpose |
|---|---|---|---|
| `GET` | `/health` | No | Health check |
| `POST` | `/generate-quiz` | No | File upload + AI quiz generation |
| `WS` | `/ws/host` | No | Host creates/manages game room |
| `WS` | `/ws/join/{pin}/{name}` | No | Player joins game room |
| `POST` | `/auth/register` | No | Register |
| `POST` | `/auth/login` | No | Login |
| `POST` | `/auth/refresh` | Cookie | Refresh JWT |
| `POST` | `/auth/logout` | Cookie | Clear cookies |
| `GET` | `/auth/me` | Cookie | Get current user |
| `PATCH` | `/auth/me` | Cookie | Update profile |
| `POST` | `/auth/change-password` | Cookie | Change password |
| `POST` | `/auth/forgot-password` | No | Request password reset |
| `POST` | `/auth/reset-password` | No | Execute password reset |
| `GET` | `/auth/me/preferences` | Cookie | Get preferences |
| `PATCH` | `/auth/me/preferences` | Cookie | Update preferences |
| `GET` | `/games` | Cookie | List saved games |
| `POST` | `/games` | Cookie | Save game |
| `PATCH` | `/games/{id}/pin` | Cookie | Pin/unpin game |
| `PATCH` | `/games/{id}/category` | Cookie | Change category |
| `DELETE` | `/games/{id}` | Cookie | Delete game |
| `GET` | `/discover` | No | List discover posts |
| `POST` | `/discover` | Cookie | Create discover post |
| `DELETE` | `/discover/{id}` | Cookie | Delete own post |

### Rate Limiting

In-memory IP+path-based sliding window (deque implementation):

| Endpoint | Limit |
|---|---|
| `/auth/register` | 8 per 60s |
| `/auth/login` | 10 per 60s |
| `/auth/refresh` | 30 per 60s |
| `/auth/forgot-password` | 5 per 60s |
| `/auth/reset-password` | 10 per 60s |
| `/discover (POST)` | 6 per 600s |

Admin email `amil.shahul777@gmail.com` bypasses all generation and discover limits.

---

## 5. Database Schema (SQLite)

### `users`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | Auto-increment |
| `email` | TEXT UNIQUE NOT NULL | Lowercase |
| `username` | TEXT | 3-24 chars, alphanumeric + `_` |
| `password_hash` | TEXT NOT NULL | bcrypt |
| `created_at` | TEXT | ISO datetime |
| `reset_token_hash` | TEXT | SHA-256 of reset token |
| `reset_token_expires_at` | TEXT | ISO datetime |
| `auto_reveal` | INTEGER DEFAULT 1 | Boolean |

### `games`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK → users | |
| `title` | TEXT NOT NULL | |
| `category` | TEXT NOT NULL | |
| `quiz_json` | TEXT NOT NULL | JSON serialized quiz |
| `questions_count` | INTEGER | |
| `plays` | INTEGER DEFAULT 0 | |
| `pinned` | INTEGER DEFAULT 0 | Max 5 per user |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

### `discover_posts`
| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | |
| `user_id` | INTEGER FK → users | |
| `title` | TEXT NOT NULL | |
| `category` | TEXT NOT NULL | |
| `quiz_json` | TEXT NOT NULL | Quiz + discoverMeta |
| `questions_count` | INTEGER | |
| `plays` | INTEGER DEFAULT 0 | |
| `rating` | REAL DEFAULT 0 | |
| `difficulty` | TEXT DEFAULT 'Medium' | |
| `estimated_time` | TEXT DEFAULT '5 min' | |
| `created_at` | TEXT | |
| `updated_at` | TEXT | |

### Quiz JSON Structure
```json
{
  "questions": [{
    "question": "string",
    "choices": ["A", "B", "C", "D"],
    "correct_index": 0
  }],
  "timeControl": {
    "enabled": true,
    "mode": "per_question",
    "secondsPerQuestion": 20
  },
  "discoverMeta": {
    "title": "...",
    "author": "...",
    "category": "...",
    "difficulty": "Medium",
    "plays": 0
  }
}
```

---

## 6. Frontend Architecture

### Entry & Providers

```
main.jsx
  └── BrowserRouter
       └── HelmetProvider
            └── ThemeProvider (Context)
                 └── App.jsx  ← Root
```

### Routing Table

| Path | Component | Description |
|---|---|---|
| `/` | `CreateWizard` | Multi-step quiz creation wizard (default home) |
| `/create` | `CreateWizard` | Alias for quiz creation |
| `/home` | `CreateDashboard` | Legacy quiz generation + editor |
| `/quiz` | `Quiz` | Solo quiz-taking |
| `/host` | `Host` | Host multiplayer (lobby + live) |
| `/join/:pin?` | `Join` | Join multiplayer by PIN |
| `/play/:id` | `PlayQuizPage` | Public quiz permalink (SEO-friendly) |
| `/preview` | `QuizPreview` | Quiz detail preview (from Discover/MyGames) |
| `/discover` | `Discover` | Spotify-style community feed |
| `/games` | `MyGames` | Saved games library |
| `/profile` | `MyProfile` | Profile settings |

### State Management

No external state library. State is handled via:

1. **Lifted state in `App.jsx`** — `user`, `quiz`, `autoReveal`, `serverStatus`, `previewData`, `editingQuiz`, `quizSource`, modal visibility — passed down as props
2. **React Context** — `ThemeContext` for light/dark mode
3. **`sessionStorage`** — Active quiz, solo progress, multiplayer rejoin session
4. **`localStorage`** — Theme preference, generation attempt counter
5. **Component-local `useState` / `useRef`** — WebSocket state per component

### Navigation

The app uses a **side drawer** (hamburger toggle at top-left) as primary navigation across all wrapped pages (CreateWizard, Discover, MyGames, MyProfile, QuizPreview). Pages that don't use the drawer (Quiz, Host, Join) are full-screen game views. After finishing a quiz, users are redirected back to their origin page via `quizSource` state tracking.

### Styling

Inline CSS-in-JS with theme color keys. Components follow an arcade design language: pill-shaped buttons with `border-radius: 999px`, 3-4px bottom borders acting as 3D bases, offset box-shadow for depth, and the Syne display font at weight 700. Components compute styles via:

```js
const { colors } = useTheme();
const style = useMemo(() => ({
  background: colors.cream,
  color: colors.ink,
}), [colors]);
```

Global CSS injected via `<style>` template literals in `App.jsx`, including `.wiz-arcade` hover/active press effects. Theme CSS variables set on `document.documentElement`. Light/dark themes with identical key names.

---

## 7. Authentication Flow

**Dual HttpOnly JWT Cookie** approach (no Bearer headers, no token in JS):

### Login / Register
1. User submits email + password
2. Backend verifies, sets two cookies:
   - `quizify_access_token` — JWT (HS256, 15 min, `sub`=user_id, `type`="access")
   - `quizify_refresh_token` — JWT (HS256, 7 days, `sub`=user_id, `type`="refresh")

### Authenticated Requests
1. `get_current_user` FastAPI dependency reads `quizify_access_token` cookie
2. Decodes JWT, loads user from DB, injects into route

### Token Refresh
1. Frontend calls `POST /auth/refresh` (sends `quizify_refresh_token` cookie automatically)
2. Backend verifies refresh token, issues new access + refresh cookies
3. Frontend API client retries failed requests on 401 with a refresh call

### Logout
Backend sets both cookies to empty with `max_age=0`.

### Password Reset
1. `POST /auth/forgot-password` → backend generates `secrets.token_urlsafe(32)`, stores SHA-256 hash in DB with 20-min expiry
2. User receives token (in dev mode, returned directly in response)
3. `POST /auth/reset-password` with token + new password

---

## 8. Multiplayer Architecture

### ConnectionManager (Singleton)
Located in `multiplayer.py`. In-memory store of active rooms:

```
rooms: Dict[pin, Room]
  Room:
    host: WebSocket
    players: Dict[name, {socket, score, streak, connected}]
    game_state:
      quiz: dict
      current_question_index: int
      started: bool
      ended: bool
      question_started_at: float
      question_duration: int
      answer_ranks: list (who answered in what order)
```

### Host Protocol
1. Connect `ws://.../ws/host`
2. Send `{ type: "create", quiz }` → receive `{ type: "created", pin }`
3. As players join → receive `{ type: "player_joined", name }`
4. Send `{ type: "start" }` → broadcast start
5. Send `{ type: "next_question", index, startedAt, durationSeconds }` for each question
6. Send `{ type: "reveal_answer" }` → show correct answer
7. Send `{ type: "end_game" }` → final leaderboard

### Player Protocol
1. Connect `ws://.../ws/join/{pin}/{name}`
2. Server validates PIN, checks name conflicts, supports reconnection
3. Receive `{ type: "start", quiz }` when game begins
4. Receive `{ type: "next_question", index, ...timer }` for each question
5. Send `{ type: "answer_submit", questionIndex, optionIndex }`

### Scoring System
- **Speed ranks**: 1st correct = 1000pts, 2nd = 850pts, 3rd = 700pts, rest = 500pts
- **Streak multiplier**: `min(streak, 5) * 100` bonus per correct answer
- Leaderboard broadcast in real-time

---

## 9. Data Flow Patterns

### Quiz Generation Pipeline
```
User uploads file or types prompt
  → POST /generate-quiz (FormData)
  → extractor.py extracts text from PDF/PPTX
  → quiz_generator.py sends to Gemini API
  → json-repair fixes malformed JSON
  → Validate 5-20 questions, 4 choices each
  → Return quiz JSON to frontend
  → CreateDashboard renders question editor
```

### Solo Quiz Persistence
```
Quiz starts → saved to sessionStorage("kuizu_active_quiz")
  → Quiz.jsx saves progress: sessionStorage("kuizu_solo_{id}_{count}")
  → Survives page refresh
  → On completion: score screen + play count incremented
```

### Discover Publishing
```
User browses Discover feed (Spotify-style: hero, genre rows)
  → Clicks a quiz card → QuizPreview page (meta + questions + play/edit)
  → From preview: Play, Host, Edit (jumps to CreateWizard step 4), Delete, Save, or Post
  → "Create" button toggles navigating to CreateWizard for new quiz creation
```

### Smart Navigation
```
User starts a quiz from any origin (CreateWizard, Preview, Discover, PlayQuizPage)
  → `quizSource` state captures the current path
  → After quiz/host/join completes → redirect back to `quizSource`
  → No more blind redirects to a single home page
```

---

## 10. Key Design Decisions

| Decision | Rationale |
|---|---|---|
| **No ORM** | SQLite + raw `sqlite3` is sufficient; a single `_DB_LOCK` ensures thread safety |
| **Cookie-based JWT** | HttpOnly cookies auto-attach to requests, no token management in JS, more secure against XSS |
| **Inline CSS-in-JS** | No build-step CSS pipeline; theme colors flow directly into component styles |
| **Arcade design language** | Pill-shaped 3D buttons, consistent across all pages via shared `.wiz-arcade` class and Syne display font |
| **No TypeScript on frontend** | Simpler for rapid iteration; all `.jsx`/`.js` files |
| **sessionStorage persistence** | Quiz progress and multiplayer rejoin survive page refresh without server-side state |
| **In-memory WebSocket rooms** | Single server instance, no Redis needed; rooms disappear on server restart |
| **Gemini-only AI** | Hardcoded to `gemini-2.5-flash`; Groq/Ollama configs exist in `.env` but aren't wired up |
| **Admin bypass** | Fixed email `amil.shahul777@gmail.com` skips rate limits for testing |
| **Two-server deployment** | Frontend on Vercel (SPA), backend on separate server (Render/Railway); CORS configured accordingly |
| **Generic error messages** | API errors surface a unified "Backend error, please try again later" message to users |

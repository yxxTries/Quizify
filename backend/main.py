from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_text
from quiz_generator import generate_quiz
from multiplayer import manager
from core.config import ALLOWED_ORIGINS
from routes.auth_routes import router as auth_router
from services.user_service import init_user_db

app = FastAPI(title="Quiz AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_user_db()
app.include_router(auth_router)

ALLOWED_EXTENSIONS = {".pdf", ".pptx"}
MAX_FILE_SIZE_MB   = 20

@app.get("/health")
def health():
    return {"status": "ok"}


@app.websocket("/ws/host")
async def websocket_host(websocket: WebSocket):
    print("WebSocket connecting...")
    try:
        await websocket.accept()
        print("WebSocket accepted.")
    except Exception as e:
        print(f"Error accepting websocket: {e}")
        return
    try:
        data = await websocket.receive_json()
        if data.get("type") == "create":
            pin = manager.generate_pin()
            manager.rooms[pin] = {
                "host": websocket,
                "players": {},
                "scores": {},
                "streaks": {},
                "quiz": data.get("quiz")
            }
            await websocket.send_json({"type": "created", "pin": pin})

            # Keep connection alive and listen for host commands
            while True:
                msg = await websocket.receive_json()
                msg_type = msg.get("type")
                if msg_type == "start":
                    # Broadcast start and quiz to all players
                    quiz_data = manager.rooms[pin]["quiz"]
                    await manager.broadcast_to_players(pin, {
                        "type": "start",
                        "quiz": quiz_data
                    })
                elif msg_type in {"next_question", "end_game", "reveal_answer"}:
                    payload = {"type": msg_type}
                    if msg_type == "next_question":
                        payload["index"] = msg.get("index")
                    if msg_type == "reveal_answer":
                        payload["correct_answer"] = msg.get("correct_answer")
                    await manager.broadcast_to_players(pin, payload)
    except WebSocketDisconnect:
        # We need to find which room this host was running and close it
        for pin, room in list(manager.rooms.items()):
            if room["host"] == websocket:
                await manager.remove_host(pin)
                break

@app.websocket("/ws/join/{pin}/{name}")
async def websocket_join(websocket: WebSocket, pin: str, name: str):
    await websocket.accept()
    success = await manager.join_room(pin, name, websocket)
    if not success:
        await websocket.send_json({"type": "error", "message": "Room not found or game already started."})
        await websocket.close()
        return

    try:
        room = manager.ensure_room_state(pin)
        if room:
            room["scores"][name] = 0
            room["streaks"][name] = 0
            await manager.sync_leaderboard(pin)

        while True:
            data = await websocket.receive_json()
            if data.get("type") != "answer_submit":
                continue

            room = manager.ensure_room_state(pin)
            if not room:
                continue

            q_idx = data.get("questionIndex")
            o_idx = data.get("optionIndex")
            if not isinstance(q_idx, int) or not isinstance(o_idx, int):
                continue

            answer_ranks = room["answer_ranks"]
            answer_ranks[q_idx] = answer_ranks.get(q_idx, 0)

            quiz = room.get("quiz", {})
            questions = quiz.get("questions", [])

            if 0 <= q_idx < len(questions):
                correct_idx = questions[q_idx].get("correct_index")
                if correct_idx == o_idx:
                    rank = answer_ranks[q_idx] + 1
                    answer_ranks[q_idx] = rank

                    points = {1: 1000, 2: 850, 3: 700}.get(rank, 500)

                    streak = room["streaks"].get(name, 0) + 1
                    room["streaks"][name] = streak

                    # Streak multiplier (up to 5x)
                    multiplier = min(streak, 5) * 100
                    room["scores"][name] = room["scores"].get(name, 0) + points + multiplier
                else:
                    room["streaks"][name] = 0

            # Update leaderboard immediately (Quiz.jsx delays showing it until reveal)
            await manager.sync_leaderboard(pin)

            if "host" in room:
                try:
                    # Forward answer_submit to host for answer distribution
                    await room["host"].send_json({
                        "type": "answer_submit",
                        "name": name,
                        "questionIndex": q_idx,
                        "optionIndex": o_idx
                    })
                except Exception:
                    pass
    except WebSocketDisconnect:
        await manager.remove_player(pin, name)
        room = manager.get_room(pin)
        if room and "scores" in room and name in room["scores"]:
            del room["scores"][name]
            room.get("streaks", {}).pop(name, None)
            await manager.sync_leaderboard(pin)


@app.post("/generate-quiz")
async def generate_quiz_endpoint(
    file: UploadFile = File(None),
    num_questions: int = Form(10),
    custom_instructions: str = Form(None)
):
    if not file and not custom_instructions:
        raise HTTPException(status_code=400, detail="Must provide either a file or custom instructions.")

    # ── 1. Validate file type & size if provided ───────────────────────────
    text = ""
    if file:
        suffix = Path(file.filename).suffix.lower() # type: ignore
        if suffix not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{suffix}'. Please upload a .pdf or .pptx file.",
            )

        file_bytes = await file.read()
        size_mb = len(file_bytes) / (1024 * 1024)
        if size_mb > MAX_FILE_SIZE_MB:
            raise HTTPException(
                status_code=413,
                detail=f"File is {size_mb:.1f} MB. Maximum allowed size is {MAX_FILE_SIZE_MB} MB.",
            )
        
        try:
            text = extract_text(file_bytes, file.filename) # type: ignore
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    else:
        # If no file, we just use the custom instructions as the context text
        text = custom_instructions

    # Optional prompt length validation
    if custom_instructions and len(custom_instructions) > 4000:
        raise HTTPException(
            status_code=400,
            detail="Custom instructions must be 4000 characters or less."
        )

    # ── 4. Generate quiz ───────────────────────────────────────────────────
    try:
        quiz = generate_quiz(text, num_questions=num_questions, custom_instructions=custom_instructions)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return quiz

import os
import tempfile
from pathlib import Path

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from extractor import extract_text
from quiz_generator import generate_quiz
from multiplayer import manager

app = FastAPI(title="Quiz AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all origins so Vercel and local tunnels can access it
    allow_methods=["*"],
    allow_headers=["*"],
)

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
                "quiz": data.get("quiz")
            }
            await websocket.send_json({"type": "created", "pin": pin})

            # Keep connection alive and listen for host commands
            while True:
                msg = await websocket.receive_json()
                if msg.get("type") == "start":
                    # Broadcast start and quiz to all players
                    quiz_data = manager.rooms[pin]["quiz"]
                    await manager.broadcast_to_players(pin, {
                        "type": "start",
                        "quiz": quiz_data
                    })
                elif msg.get("type") == "next_question":
                    await manager.broadcast_to_players(pin, {
                        "type": "next_question",
                        "index": msg.get("index")
                    })
                elif msg.get("type") == "end_game":
                    await manager.broadcast_to_players(pin, {
                        "type": "end_game"
                    })
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
        room = manager.get_room(pin)
        if room:
            if "scores" not in room:
                room["scores"] = {}
            room["scores"][name] = 0
            scores = room["scores"]
            await manager.broadcast_to_players(pin, {"type": "leaderboard", "scores": scores})
            try:
                await room["host"].send_json({"type": "leaderboard", "scores": scores})
            except Exception:
                pass

        while True:
            data = await websocket.receive_json()
            if data.get("type") == "score_update":
                # Forward the score to the host and players
                room = manager.get_room(pin)
                if room:
                    room["scores"][name] = data.get("score", 0)
                    scores = room["scores"]
                    await manager.broadcast_to_players(pin, {"type": "leaderboard", "scores": scores})
                    if "host" in room:
                        try:
                            await room["host"].send_json({
                                "type": "leaderboard",
                                "scores": scores
                            })
                        except Exception:
                            pass
    except WebSocketDisconnect:
        await manager.remove_player(pin, name)
        room = manager.get_room(pin)
        if room and "scores" in room and name in room["scores"]:
            del room["scores"][name]
            scores = room["scores"]
            await manager.broadcast_to_players(pin, {"type": "leaderboard", "scores": scores})
            if "host" in room:
                try:
                    await room["host"].send_json({"type": "leaderboard", "scores": scores})
                except Exception:
                    pass


@app.post("/generate-quiz")
async def generate_quiz_endpoint(
    file: UploadFile = File(...),
    num_questions: int = Form(10),
):
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
        quiz = generate_quiz(text, num_questions=num_questions)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=500, detail=str(e))

    return quiz

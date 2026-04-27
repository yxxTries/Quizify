import React, { useState, useRef, useEffect } from "react";
import Quiz from "./Quiz.jsx";
import { buildWebSocketUrl } from "./api.js";
import { useTheme } from "./ThemeContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

const SESSION_KEY = "kuizu_mp_session";

function saveSession(pin, name) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify({ pin, name })); } catch {}
}
function clearSession() {
  try { sessionStorage.removeItem(SESSION_KEY); } catch {}
}
function loadSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}

export default function Join({ onExit, initialPin = "" }) {
  const { colors: C } = useTheme();
  const savedSession = loadSession();
  const [pin, setPin] = useState(initialPin || savedSession?.pin || "");
  const [name, setName] = useState(savedSession?.name || "");
  const [status, setStatus] = useState("login"); // login, joining, waiting, playing
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(null);
  const [leaderboard, setLeaderboard] = useState({});
  const [hostRevealed, setHostRevealed] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(null);
  const ws = useRef(null);

  // Auto-reconnect if there's a saved session
  useEffect(() => {
    if (savedSession?.pin && savedSession?.name) {
      connectToGame(savedSession.pin, savedSession.name);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectToGame = (gamePin, playerName) => {
    setError("");
    setStatus("joining");

    const socket = new WebSocket(buildWebSocketUrl(`/ws/join/${gamePin}/${playerName}`));
    ws.current = socket;

    socket.onopen = () => {
      saveSession(gamePin, playerName);
      setStatus("waiting");
    };

    socket.onmessage = (event) => {
      let data;
      try { data = JSON.parse(event.data); } catch { return; }
      if (data.type === "error") {
        setError(data.message);
        setStatus("login");
        clearSession();
        socket.close();
      } else if (data.type === "start") {
        setQuiz(data.quiz);
        setStatus("playing");
      } else if (data.type === "next_question") {
        setCurrentQuestionIndex(data.index);
        setHostRevealed(false);
        setQuestionTimer({
          questionIndex: data.index,
          startedAt: data.startedAt,
          durationSeconds: data.durationSeconds,
        });
        setStatus("playing");
      } else if (data.type === "reveal_answer") {
        setHostRevealed(true);
      } else if (data.type === "leaderboard") {
        setLeaderboard(data.scores);
      } else if (data.type === "end_game") {
        setQuestionTimer(null);
        setCurrentQuestionIndex(1000);
        clearSession();
      } else if (data.type === "host_disconnected") {
        clearSession();
      }
    };

    socket.onerror = () => {
      setStatus(s => {
        if (s !== "playing") {
          setError("Could not connect to game. Check PIN.");
          clearSession();
          return "login";
        }
        return s;
      });
    };
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || !name) return;
    connectToGame(pin, name);
  };

  const handleAnswerSubmit = (questionIndex, optionIndex) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "answer_submit", questionIndex, optionIndex }));
    }
  };

  if (status === "playing" && quiz && currentQuestionIndex !== null) {
    return (
      <div style={{ position: "relative" }}>
        {/* We reuse the Quiz component */}
        <Quiz
          quiz={quiz}
          onRestart={() => { clearSession(); if(ws.current) ws.current.close(); onExit(); }}
          onJoinNew={() => {
            clearSession();
            if(ws.current) ws.current.close();
            setStatus("login");
            setPin("");
            setName("");
            setQuiz(null);
            setCurrentQuestionIndex(0);
            setLeaderboard({});
            setQuestionTimer(null);
          }}
          onAnswerSubmit={handleAnswerSubmit}
          currentQuestionIndex={currentQuestionIndex}
          leaderboard={leaderboard}
          hostRevealed={hostRevealed}
          questionTimer={questionTimer}
        />
      </div>
    );
  }

  if (status === "playing" && quiz && currentQuestionIndex === null) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft, fontSize: 20, background: C.cream }}>
        Loading first question...
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "clamp(16px, 4vw, 24px)",
      background: "transparent",
      position: "relative",
    }}>
      <div style={{ position: "absolute", top: 16, right: 16, zIndex: 5 }}>
        <ThemeToggle />
      </div>
      <div style={{
        background: C.creamWarm,
        padding: "clamp(24px, 6vw, 48px)",
        borderRadius: "clamp(16px, 3vw, 24px)",
        width: "100%",
        maxWidth: "440px",
        textAlign: "center",
        boxShadow: `0 12px 48px ${C.shadow}`,
        border: `1px solid ${C.border}`,
        animation: "fadeInUp 0.6s ease"
      }}>

        {status === "waiting" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeIn 0.5s ease" }}>
            <div style={{
              background: C.blueSoft,
              color: C.blueDark,
              padding: "16px 32px",
              borderRadius: "20px",
              marginBottom: "32px",
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              border: `1px solid ${C.blue}`
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <h2 style={{ fontSize: "24px", margin: 0, fontFamily: "'Syne', sans-serif" }}>You're in!</h2>
            </div>

            <p style={{ fontSize: "20px", color: C.ink, margin: "0 0 40px 0", fontWeight: "500" }}>
              Waiting for the host to start...
            </p>

            <div style={{ position: "relative", width: "80px", height: "80px" }}>
               <div style={{
                 position: "absolute",
                 top: 0, left: 0, right: 0, bottom: 0,
                 borderRadius: "50%",
                 border: `4px solid ${C.blueSoft}`
               }} />
               <div style={{
                 position: "absolute",
                 top: 0, left: 0, right: 0, bottom: 0,
                 borderRadius: "50%",
                 border: "4px solid transparent",
                 borderTopColor: C.blueDark,
                 animation: "spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite"
               }} />
            </div>

            <button
               type="button"
               onClick={() => { clearSession(); if(ws.current) ws.current.close(); onExit(); }}
               style={{
                 marginTop: "48px",
                 padding: "12px 24px",
                 background: "transparent",
                 color: C.inkSoft,
                 border: "none",
                 cursor: "pointer",
                 fontSize: "16px",
                 textDecoration: "underline",
                 transition: "color 0.2s"
               }}
               onMouseOver={(e) => e.currentTarget.style.color = C.ink}
               onMouseOut={(e) => e.currentTarget.style.color = C.inkSoft}
            >
               Leave Game
            </button>
            
            <style>{`
              @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
          </div>
        ) : (
          <form onSubmit={handleJoin} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <h1 style={{ margin: "0 0 10px 0", fontSize: "clamp(26px, 7vw, 36px)", fontFamily: "'Syne', sans-serif", color: C.ink }}>Join Game</h1>

            <div style={{ position: "relative" }}>
              <input
                placeholder="Game PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                style={{
                  width: "100%",
                  padding: "clamp(14px, 4vw, 20px) clamp(16px, 4vw, 24px)",
                  borderRadius: "16px",
                  border: `2px solid ${C.border}`,
                  background: C.creamSoft,
                  color: C.ink,
                  fontSize: "clamp(16px, 4.5vw, 20px)",
                  textAlign: "center",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  letterSpacing: pin ? "4px" : "normal",
                  fontWeight: pin ? "bold" : "normal"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.blueDark; e.currentTarget.style.boxShadow = `0 0 0 4px ${C.blueSoft}`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            <div style={{ position: "relative" }}>
              <input
                placeholder="Nickname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                required
                style={{
                  width: "100%",
                  padding: "clamp(14px, 4vw, 20px) clamp(16px, 4vw, 24px)",
                  borderRadius: "16px",
                  border: `2px solid ${C.border}`,
                  background: C.creamSoft,
                  color: C.ink,
                  fontSize: "clamp(16px, 4.5vw, 20px)",
                  textAlign: "center",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  fontWeight: name ? "bold" : "normal"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = C.blueDark; e.currentTarget.style.boxShadow = `0 0 0 4px ${C.blueSoft}`; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>

            {error && (
              <div style={{
                background: C.coralSoft,
                border: `1px solid ${C.coral}`,
                color: C.coralDark,
                padding: "12px",
                borderRadius: "12px",
                fontSize: "16px",
                animation: "shake 0.4s ease"
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === "joining" || !pin || !name}
              style={{
                width: "100%",
                padding: "clamp(14px, 4vw, 20px)",
                background: (!pin || !name) ? C.border : C.blueDark,
                color: (!pin || !name) ? C.inkSoft : "#FFFFFF",
                border: "none",
                borderRadius: "16px",
                cursor: (status === "joining" || !pin || !name) ? "not-allowed" : "pointer",
                fontSize: "clamp(16px, 4.5vw, 20px)",
                fontWeight: "bold",
                marginTop: "10px",
                transition: "all 0.2s",
                boxShadow: (!pin || !name) ? "none" : `0 8px 24px ${C.shadow}`,
                opacity: status === "joining" ? 0.7 : 1
              }}
              onMouseOver={(e) => { if(pin && name && status !== "joining") e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseOut={(e) => { if(pin && name && status !== "joining") e.currentTarget.style.transform = "translateY(0)"; }}
            >
              {status === "joining" ? "Connecting..." : "Join Game"}
            </button>

            <button
               type="button"
               onClick={onExit}
               style={{
                 width: "100%",
                 padding: "16px",
                 background: "transparent",
                 color: C.inkSoft,
                 border: "2px solid transparent",
                 borderRadius: "16px",
                 cursor: "pointer",
                 fontSize: "18px",
                 fontWeight: "600",
                 transition: "all 0.2s",
               }}
               onMouseOver={(e) => { e.currentTarget.style.background = C.yellowSoft; e.currentTarget.style.color = C.ink; }}
               onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.inkSoft; }}
            >
               Back
            </button>
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-5px); }
                50% { transform: translateX(5px); }
                75% { transform: translateX(-5px); }
              }
              @keyframes fadeInUp {
                from { opacity: 0; transform: translateY(20px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </form>
        )}
      </div>
    </div>
  );
}

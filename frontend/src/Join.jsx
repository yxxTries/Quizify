import React, { useState, useRef } from "react";
import Quiz from "./Quiz.jsx";
import { buildWebSocketUrl } from "./api.js";

export default function Join({ onExit, initialPin = "" }) {
  const [pin, setPin] = useState(initialPin);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("login"); // login, joining, waiting, playing
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [leaderboard, setLeaderboard] = useState({});
  const [hostRevealed, setHostRevealed] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(null);
  const ws = useRef(null);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || !name) return;
    
    setError("");
    setStatus("joining");

    ws.current = new WebSocket(buildWebSocketUrl(`/ws/join/${pin}/${name}`));

    ws.current.onopen = () => {
      setStatus("waiting");
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "error") {
        setError(data.message);
        setStatus("login");
        ws.current.close();
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
      } else if (data.type === "reveal_answer") {
        setHostRevealed(true);
      } else if (data.type === "leaderboard") {
        setLeaderboard(data.scores);
      } else if (data.type === "end_game") {
        setQuestionTimer(null);
        setCurrentQuestionIndex(quiz?.questions?.length || 1000);
      }
    };
    
    ws.current.onerror = () => {
       if (status !== "playing") {
         setError("Could not connect to game. Check PIN.");
         setStatus("login");
       }
    };
  };

  const handleAnswerSubmit = (questionIndex, optionIndex) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "answer_submit", questionIndex, optionIndex }));
    }
  };

  if (status === "playing" && quiz) {
    return (
      <div style={{ position: "relative" }}>
        {/* We reuse the Quiz component */}
        <Quiz
          quiz={quiz}
          onRestart={() => { if(ws.current) ws.current.close(); onExit(); }}
          onJoinNew={() => {
            if(ws.current) ws.current.close();
            setStatus("login");
            setPin("");
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

  return (
    <div style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center", 
      padding: "20px",
      background: "transparent"
    }}>
      <div style={{ 
        background: "#252A4A", 
        padding: "48px", 
        borderRadius: "24px", 
        width: "100%", 
        maxWidth: "440px", 
        textAlign: "center",
        boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
        border: "1px solid #0F3460",
        animation: "fadeInUp 0.6s ease"
      }}>
        
        {status === "waiting" ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeIn 0.5s ease" }}>
            <div style={{ 
              background: "rgba(124, 111, 255, 0.1)", 
              color: "#00D2D3", 
              padding: "16px 32px", 
              borderRadius: "20px", 
              marginBottom: "32px",
              display: "inline-flex",
              alignItems: "center",
              gap: "12px",
              border: "1px solid rgba(124, 111, 255, 0.2)"
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <h2 style={{ fontSize: "24px", margin: 0, fontFamily: "'Syne', sans-serif" }}>You're in!</h2>
            </div>
            
            <p style={{ fontSize: "20px", color: "#F1F2F6", margin: "0 0 40px 0", fontWeight: "500" }}>
              Waiting for the host to start...
            </p>
            
            <div style={{ position: "relative", width: "80px", height: "80px" }}>
               <div style={{ 
                 position: "absolute",
                 top: 0, left: 0, right: 0, bottom: 0,
                 borderRadius: "50%", 
                 border: "4px solid rgba(124, 111, 255, 0.1)"
               }} />
               <div style={{ 
                 position: "absolute",
                 top: 0, left: 0, right: 0, bottom: 0,
                 borderRadius: "50%", 
                 border: "4px solid transparent",
                 borderTopColor: "#00D2D3", 
                 animation: "spin 1s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite" 
               }} />
            </div>
            
            <button
               type="button"
               onClick={() => { if(ws.current) ws.current.close(); onExit(); }}
               style={{ 
                 marginTop: "48px", 
                 padding: "12px 24px", 
                 background: "transparent", 
                 color: "#B0BAC3", 
                 border: "none", 
                 cursor: "pointer", 
                 fontSize: "16px", 
                 textDecoration: "underline",
                 transition: "color 0.2s"
               }}
               onMouseOver={(e) => e.currentTarget.style.color = "#F1F2F6"}
               onMouseOut={(e) => e.currentTarget.style.color = "#B0BAC3"}
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
            <h1 style={{ margin: "0 0 10px 0", fontSize: "36px", fontFamily: "'Syne', sans-serif", color: "#F1F2F6" }}>Join Game</h1>
            
            <div style={{ position: "relative" }}>
              <input 
                placeholder="Game PIN" 
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "20px 24px", 
                  borderRadius: "16px", 
                  border: "2px solid #0F3460", 
                  background: "#16213E", 
                  color: "#F1F2F6", 
                  fontSize: "20px", 
                  textAlign: "center",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  letterSpacing: pin ? "4px" : "normal",
                  fontWeight: pin ? "bold" : "normal"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#00D2D3"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124, 111, 255, 0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#0F3460"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            
            <div style={{ position: "relative" }}>
              <input 
                placeholder="Nickname" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                style={{ 
                  width: "100%", 
                  padding: "20px 24px", 
                  borderRadius: "16px", 
                  border: "2px solid #0F3460", 
                  background: "#16213E", 
                  color: "#F1F2F6", 
                  fontSize: "20px", 
                  textAlign: "center",
                  outline: "none",
                  transition: "all 0.2s",
                  boxSizing: "border-box",
                  fontWeight: name ? "bold" : "normal"
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#00D2D3"; e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124, 111, 255, 0.1)"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "#0F3460"; e.currentTarget.style.boxShadow = "none"; }}
              />
            </div>
            
            {error && (
              <div style={{ 
                background: "rgba(255, 77, 79, 0.1)", 
                border: "1px solid rgba(255, 77, 79, 0.3)", 
                color: "#FF6B6B", 
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
                padding: "20px", 
                background: (!pin || !name) ? "#0F3460" : "#00D2D3", 
                color: (!pin || !name) ? "#B0BAC3" : "#16213E", 
                border: "none", 
                borderRadius: "16px", 
                cursor: (status === "joining" || !pin || !name) ? "not-allowed" : "pointer", 
                fontSize: "20px",
                fontWeight: "bold",
                marginTop: "10px",
                transition: "all 0.2s",
                boxShadow: (!pin || !name) ? "none" : "0 8px 24px rgba(124, 111, 255, 0.3)",
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
                 color: "#B0BAC3", 
                 border: "2px solid transparent", 
                 borderRadius: "16px",
                 cursor: "pointer", 
                 fontSize: "18px", 
                 fontWeight: "600",
                 transition: "all 0.2s",
               }}
               onMouseOver={(e) => { e.currentTarget.style.background = "rgba(46, 46, 66, 0.5)"; e.currentTarget.style.color = "#F1F2F6"; }}
               onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#B0BAC3"; }}
            >
               Back to Home
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


import React, { useState, useRef } from "react";
import Quiz from "./Quiz.jsx";

export default function Join({ onExit }) {
  const [pin, setPin] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState("login"); // login, joining, waiting, playing
  const [quiz, setQuiz] = useState(null);
  const [error, setError] = useState("");
  const ws = useRef(null);

  const handleJoin = (e) => {
    e.preventDefault();
    if (!pin || !name) return;
    
    setError("");
    setStatus("joining");

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const url = `${protocol}//${hostname}:8000/ws/join/${pin}/${name}`;
    ws.current = new WebSocket(url);

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
      }
    };
    
    ws.current.onerror = () => {
       if (status !== "playing") {
         setError("Could not connect to game. Check PIN.");
         setStatus("login");
       }
    };
  };

  const handleScoreUpdate = (score) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "score_update", score }));
    }
  };

  if (status === "playing" && quiz) {
    return (
      <div style={{ position: "relative" }}>
        {/* We reuse the Quiz component */}
        <Quiz quiz={quiz} onRestart={() => { if(ws.current) ws.current.close(); onExit(); }} onScoreUpdate={handleScoreUpdate} />
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#12121c", padding: 40, borderRadius: 16, width: "100%", maxWidth: 400, textAlign: "center" }}>
        <h1 style={{ marginBottom: 30 }}>Join Game</h1>
        
        {status === "waiting" ? (
          <div>
            <h2 style={{ color: "#7c6fff", fontSize: 28, marginBottom: 16 }}>You're in!</h2>
            <p style={{ fontSize: 18, color: "#f0ede8" }}>Waiting for {name === "host" ? "something" : "the host"} to start...</p>
            <div style={{ marginTop: 30 }}>
               <div style={{ display: "inline-block", width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(124, 111, 255, 0.2)", borderTopColor: "#7c6fff", animation: "spin 1s linear infinite" }} />
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <form onSubmit={handleJoin}>
            <input 
              placeholder="Game PIN" 
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              style={{ width: "100%", padding: 16, marginBottom: 16, borderRadius: 8, border: "1px solid #2e2e42", background: "#0a0a0f", color: "#fff", fontSize: 20, textAlign: "center" }} 
            />
            <input 
              placeholder="Nickname" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 16, marginBottom: 16, borderRadius: 8, border: "1px solid #2e2e42", background: "#0a0a0f", color: "#fff", fontSize: 20, textAlign: "center" }}
            />
            {error && <p style={{ color: "#ff4d4f", marginBottom: 16 }}>{error}</p>}
            <button 
              type="submit"
              disabled={status === "joining"}
              style={{ width: "100%", padding: 16, background: "#7c6fff", color: "#fff", border: "none", borderRadius: 8, cursor: status === "joining" ? "wait" : "pointer", fontSize: 20 }}
            >
              {status === "joining" ? "Connecting..." : "Enter"}
            </button>
            <button
               type="button"
               onClick={onExit}
               style={{ width: "100%", padding: 16, background: "transparent", color: "#6b6b7e", border: "none", cursor: "pointer", fontSize: 16, marginTop: 10 }}
            >
               Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
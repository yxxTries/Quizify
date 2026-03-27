import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";

export default function Host({ quiz, onEnd }) {
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [status, setStatus] = useState("connecting"); // connecting, lobby, playing
  const ws = useRef(null);

    useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running in local Vite (localhost / 127.0.0.1) we point straight to 8000
    // We strip off the vite port (5173 / whatever) and explicitly replace with 8000
    const hostname = window.location.hostname;
    const url = `${protocol}//${hostname}:8000/ws/host`;
    ws.current = new WebSocket(url);
    
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: "create", quiz }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "created") {
        setPin(data.pin);
        setStatus("lobby");
      } else if (data.type === "player_joined") {
        setPlayers(p => [...p, data.name]);
        setScores(s => ({ ...s, [data.name]: 0 }));
      } else if (data.type === "player_left") {
        setPlayers(p => p.filter(name => name !== data.name));
      } else if (data.type === "score_update") {
        setScores(s => ({ ...s, [data.name]: data.score }));
      }
    };
    
    ws.current.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setStatus("error");
    }

    return () => ws.current?.close();
  }, [quiz]);

  const handleStart = () => {
    setStatus("playing");
    ws.current.send(JSON.stringify({ type: "start" }));
  };

  const joinUrl = `http://${window.location.host}`;

  return (
    <div style={{ padding: 40, textAlign: "center", minHeight: "100vh", display: "flex", flexDirection: "column", gap: 20 }}>
      <h1>{status === "lobby" ? "Game Lobby - Host" : "Game In Progress"}</h1>
      
      {status === "connecting" && <p>Connecting to server...</p>}

      {status === "error" && (
         <div style={{ color: "#ff4d4f" }}>
            <h2>Connection Error</h2>
            <p>Could not connect to the multiplayer server. Ensure the backend is running on port 8000.</p>
            <button onClick={onEnd} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #4a4a5e", color: "#f0ede8", borderRadius: 8, margin: "10px auto" }}>Go Back</button>
         </div>
      )}

      {status === "lobby" && pin && (
         <>
           <h2>Join at <span style={{color: "#7c6fff"}}>{joinUrl}</span></h2>
           <h3 style={{ fontSize: "48px", margin: "10px 0" }}>PIN: {pin}</h3>
           
           <div style={{ background: "#fff", padding: "16px", borderRadius: "16px", display: "inline-block", margin: "0 auto" }}>
             <QRCodeSVG value={joinUrl} size={256} />
           </div>

           <p style={{ marginTop: 20, fontSize: "20px" }}>{players.length} Player(s) joined</p>
           
           <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 20, minHeight: 40 }}>
             {players.map(p => (
               <span key={p} style={{ padding: "8px 16px", background: "#2e2e42", borderRadius: 8, fontSize: "18px" }}>
                 {p}
               </span>
             ))}
           </div>
           
           <button 
             onClick={handleStart} 
             disabled={players.length === 0}
             style={{ 
               padding: "16px 32px", 
               background: "#7c6fff", 
               color: "#fff", 
               border: "none", 
               borderRadius: 12, 
               cursor: players.length ? "pointer" : "not-allowed", 
               fontSize: "20px",
               maxWidth: "300px",
               margin: "0 auto",
               opacity: players.length ? 1 : 0.5
             }}
           >
              Start Game!
           </button>
           <button onClick={onEnd} style={{ padding: "8px 16px", background: "transparent", border: "1px solid #4a4a5e", color: "#f0ede8", borderRadius: 8, margin: "10px auto" }}>Quit</button>
         </>
      )}

      {status === "playing" && (
         <>
            <h2>Live Leaderboard</h2>
            <div style={{ maxWidth: "500px", width: "100%", margin: "0 auto" }}>
              {players.sort((a, b) => scores[b] - scores[a]).map((p, i) => (
                <div key={p} style={{ display: "flex", justifyContent: "space-between", background: "#1e1e2e", padding: "16px 24px", margin: "10px auto", borderRadius: 8, fontSize: "20px" }}>
                  <span>{i + 1}. {p}</span>
                  <span style={{ fontWeight: "bold" }}>{scores[p]} pts</span>
                </div>
              ))}
            </div>
            <button onClick={onEnd} style={{ padding: "12px 24px", marginTop: 40, background: "#2e2e42", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>End Game</button>
         </>
      )}
    </div>
  );
}

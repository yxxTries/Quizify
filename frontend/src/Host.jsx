import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import Quiz from "./Quiz.jsx";
import { buildWebSocketUrl } from "./api.js";
import { useTheme } from "./ThemeContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

function normalizeTimeControl(quiz) {
  const seconds = Number(quiz?.timeControl?.secondsPerQuestion);
  if (!quiz?.timeControl?.enabled || !Number.isFinite(seconds) || seconds < 5) {
    return null;
  }
  return {
    enabled: true,
    secondsPerQuestion: Math.min(120, Math.max(5, Math.round(seconds))),
  };
}

function truncateName(name, max = 16) {
  if (!name) return "";
  const arr = Array.from(name);
  if (arr.length <= max) return name;
  return arr.slice(0, max).join("") + "…";
}

export default function Host({ quiz, onEnd, autoReveal = true }) {
  const { colors: C } = useTheme();
  const [pin, setPin] = useState(null);
  const [players, setPlayers] = useState([]);
  const [scores, setScores] = useState({});
  const [streaks, setStreaks] = useState({});
  const [hostAnswers, setHostAnswers] = useState({});
  const [status, setStatus] = useState("connecting"); // connecting, lobby, playing
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showConnectionDetails, setShowConnectionDetails] = useState(false);
  const [copied, setCopied] = useState(false);
  const [questionTimer, setQuestionTimer] = useState(null);
  const ws = useRef(null);
  const timerSettings = normalizeTimeControl(quiz);

  useEffect(() => {
    ws.current = new WebSocket(buildWebSocketUrl("/ws/host"));
    
    ws.current.onopen = () => {
      ws.current.send(JSON.stringify({ type: "create", quiz }));
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "created") {
        setPin(data.pin);
        setStatus("lobby");
      } else if (data.type === "player_joined") {
        setPlayers(p => p.includes(data.name) ? p : [...p, data.name]);
        setScores(s => ({ ...s, [data.name]: 0 }));
        setStreaks(s => ({ ...s, [data.name]: 0 }));
      } else if (data.type === "player_left") {
        setPlayers(p => p.filter(name => name !== data.name));
      } else if (data.type === "leaderboard") {
        setScores(data.scores);
        if (data.streaks) setStreaks(data.streaks);
      } else if (data.type === "answer_submit") {
        setHostAnswers(prev => {
          const qIdx = String(data.questionIndex);
          const oIdx = String(data.optionIndex);
          const currentQ = prev[qIdx] || {};
          const currentO = currentQ[oIdx] || 0;
          return {
            ...prev,
            [qIdx]: {
              ...currentQ,
              [oIdx]: currentO + 1
            }
          };
        });
      }
    };

    ws.current.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setStatus("error");
    };

    return () => ws.current?.close();
  }, [quiz]);

  const handleStart = () => {
    setStatus("playing");
    setCurrentQuestionIndex(0);
    ws.current.send(JSON.stringify({ type: "start" }));
    const nextTimer = timerSettings
      ? {
          questionIndex: 0,
          startedAt: Date.now(),
          durationSeconds: timerSettings.secondsPerQuestion,
        }
      : null;
    setQuestionTimer(nextTimer);
    ws.current.send(JSON.stringify({
      type: "next_question",
      index: 0,
      startedAt: nextTimer?.startedAt || null,
      durationSeconds: nextTimer?.durationSeconds || null,
    }));
  };

  const handleHostNext = () => {
    ws.current.send(JSON.stringify({ type: "reveal_answer" }));
  };

  const handleNext = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx >= quiz.questions.length) {
      ws.current.send(JSON.stringify({ type: "end_game" }));
      setQuestionTimer(null);
      setStatus("results"); // Show the final leaderboard
    } else {
      setCurrentQuestionIndex(nextIdx);
      const nextTimer = timerSettings
        ? {
            questionIndex: nextIdx,
            startedAt: Date.now(),
            durationSeconds: timerSettings.secondsPerQuestion,
          }
        : null;
      setQuestionTimer(nextTimer);
      ws.current.send(JSON.stringify({
        type: "next_question",
        index: nextIdx,
        startedAt: nextTimer?.startedAt || null,
        durationSeconds: nextTimer?.durationSeconds || null,
      }));
    }
  };

  const joinUrl = `${window.location.protocol}//${window.location.host}/join/${pin}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(joinUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      padding: status === "playing" ? 0 : 40,
      textAlign: "center",
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      gap: status === "playing" ? 0 : 20,
      background: C.quizBg,
      color: C.quizText,
      position: "relative",
    }}>
      {status !== "playing" && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 5 }}>
          <ThemeToggle />
        </div>
      )}
      {status !== "playing" && <h1 style={{ color: C.quizText }}>{status === "lobby" ? "Game Lobby - Host" : "Kuizu"}</h1>}

      {status === "connecting" && <p style={{ color: C.quizTextSoft }}>Connecting to server...</p>}

      {status === "error" && (
         <div style={{ color: C.quizNegative }}>
            <h2>Connection Error</h2>
            <p>Could not connect to the multiplayer server. Ensure the backend is running on port 8000.</p>
            <button onClick={onEnd} style={{ padding: "8px 16px", background: "transparent", border: `1px solid ${C.quizCardBorder}`, color: C.quizText, borderRadius: 8, margin: "10px auto" }}>Go Back</button>
         </div>
      )}

      {status === "lobby" && pin && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '40px', animation: 'fadeIn 0.5s ease', width: '100%', maxWidth: '800px', margin: '0 auto' }}>

            <div style={{
              background: C.quizCard,
              border: `1px solid ${C.quizCardBorder}`,
              borderRadius: "24px",
              padding: "40px",
              width: "100%",
              boxShadow: `0 12px 48px ${C.shadow}`
            }}>
              <h2 style={{ margin: "0 0 24px 0", fontSize: "28px", color: C.quizText, fontFamily: "'Syne', sans-serif" }}>
                Invite Players
              </h2>

              {showConnectionDetails ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center', animation: 'slideDown 0.3s ease' }}>
                  <div style={{ background: "#FFFFFF", padding: "24px", borderRadius: "24px", display: "inline-block", boxShadow: `0 8px 24px ${C.shadow}` }}>
                    <QRCodeSVG value={joinUrl} size={220} />
                  </div>

                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: C.quizSubCard,
                    borderRadius: "16px",
                    padding: "16px 24px",
                    width: "100%",
                    maxWidth: "500px",
                    boxSizing: "border-box",
                    border: `1px solid ${C.quizSubCardBorder}`,
                  }}>
                    <div style={{ textAlign: "left" }}>
                      <span style={{ fontSize: "14px", color: C.quizTextSoft, textTransform: "uppercase", letterSpacing: "1.5px", fontWeight: "600" }}>Game PIN</span>
                      <div style={{ fontSize: "36px", fontWeight: "bold", color: C.quizText, letterSpacing: "8px", marginTop: "4px" }}>{pin}</div>
                    </div>
                    <button
                      onClick={handleCopyUrl}
                      style={{
                        background: copied ? C.quizAccentSoft : "transparent",
                        border: `2px solid ${C.quizAccent}`,
                        color: C.quizAccent,
                        padding: "12px 24px",
                        borderRadius: "12px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "16px",
                        transition: "all 0.2s"
                      }}
                      onMouseOver={(e) => { if(!copied) e.currentTarget.style.background = C.quizAccentSoft; }}
                      onMouseOut={(e) => { if(!copied) e.currentTarget.style.background = "transparent"; }}
                    >
                      {copied ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <button
                    onClick={() => setShowConnectionDetails(false)}
                    style={{
                      background: "transparent",
                      color: C.quizTextSoft,
                      border: "none",
                      cursor: "pointer",
                      padding: "8px",
                      marginTop: "8px",
                      fontSize: "16px",
                      textDecoration: "underline",
                      transition: "color 0.2s"
                    }}
                    onMouseOver={(e) => e.currentTarget.style.color = C.quizText}
                    onMouseOut={(e) => e.currentTarget.style.color = C.quizTextSoft}
                  >
                    Hide Connection Details
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConnectionDetails(true)}
                  style={{
                    background: C.quizSubCard,
                    color: C.quizText,
                    border: `1px solid ${C.quizSubCardBorder}`,
                    padding: "20px 40px",
                    borderRadius: "16px",
                    fontSize: "20px",
                    cursor: "pointer",
                    width: "100%",
                    maxWidth: "500px",
                    fontWeight: "bold",
                    transition: "all 0.2s",
                    boxShadow: `0 4px 16px ${C.shadow}`
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                  onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
                >
                  Show Joining Details
                </button>
              )}
            </div>

            <div style={{ width: "100%" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", padding: "0 8px" }}>
                <h3 style={{ fontSize: "24px", margin: 0, fontFamily: "'Syne', sans-serif", color: C.quizText }}>
                  Players ({players.length})
                </h3>
                <span style={{ color: C.quizTextSoft, fontSize: "16px", fontWeight: "500" }}>
                  {players.length === 0 ? "Waiting for players..." : "Ready to start"}
                </span>
              </div>

              <div style={{
                display: "flex",
                gap: "16px",
                flexWrap: "wrap",
                minHeight: "120px",
                background: C.quizSubCard,
                border: `2px dashed ${C.quizSubCardBorder}`,
                borderRadius: "20px",
                padding: "24px",
                justifyContent: players.length === 0 ? "center" : "flex-start",
                alignItems: "flex-start",
                alignContent: "flex-start"
              }}>
                {players.length === 0 && (
                  <div style={{ color: C.quizTextSoft, fontStyle: "italic", fontSize: "18px", alignSelf: "center", width: "100%" }}>
                    No one has joined yet.
                  </div>
                )}
                {players.map((p, i) => (
                  <span
                    key={p}
                    title={p}
                    style={{
                      padding: "12px 24px",
                      background: i % 2 === 0 ? C.quizAccent : "#FF9F43",
                      color: "#FFFFFF",
                      borderRadius: "16px",
                      fontSize: "18px",
                      fontWeight: "600",
                      animation: "scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                      boxShadow: `0 4px 16px ${C.shadow}`,
                      display: "inline-block",
                      maxWidth: "200px",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}
                  >
                    {truncateName(p, 12)}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "24px", marginTop: "10px", width: "100%", justifyContent: "center" }}>
              <button
                onClick={onEnd}
                style={{
                  padding: "18px 40px",
                  background: "transparent",
                  border: `2px solid ${C.quizNegative}`,
                  color: C.quizNegative,
                  borderRadius: "16px",
                  fontSize: "20px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = C.quizNegativeBg; }}
                onMouseOut={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                Quit Lobby
              </button>
              <button
                onClick={handleStart}
                style={{
                  padding: "18px 60px",
                  background: C.quizAccent,
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: "16px",
                  cursor: "pointer",
                  fontSize: "20px",
                  fontWeight: "bold",
                  boxShadow: `0 8px 32px ${C.shadow}`,
                  transition: "all 0.2s",
                  opacity: 1
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Start Game!
              </button>
            </div>
            
            <style>{`
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              @keyframes slideDown {
                from { opacity: 0; transform: translateY(-10px); }
                to { opacity: 1; transform: translateY(0); }
              }
              @keyframes scaleIn {
                from { opacity: 0; transform: scale(0.9); }
                to { opacity: 1; transform: scale(1); }
              }
            `}</style>
          </div>
      )}

      {status === "playing" && (
         <div style={{ flex: 1, position: "relative", textAlign: "left" }}>
            <Quiz
               quiz={quiz}
               isHostMode={true}
               onRestart={() => {
                 if(ws.current) ws.current.send(JSON.stringify({ type: "end_game" }));
                 onEnd();
               }}
               currentQuestionIndex={currentQuestionIndex}
               leaderboard={scores}
               streaks={streaks}
               hostAnswers={hostAnswers[currentQuestionIndex] || {}}
               onReveal={handleHostNext}
               triggerNextQuestion={handleNext}
               questionTimer={questionTimer}
               autoReveal={autoReveal}
            />
         </div>
      )}

      {status === "results" && (
         <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", animation: "slideUp 0.6s ease" }}>
           <h2 style={{ fontSize: "48px", marginBottom: "40px", color: C.quizText, fontFamily: "'Syne', sans-serif" }}>Final Leaderboard</h2>
           <div style={{ width: "100%", maxWidth: "600px", background: C.quizCard, border: `1px solid ${C.quizCardBorder}`, borderRadius: "16px", padding: "20px" }}>
             {Object.entries(scores)
               .sort(([, a], [, b]) => b - a)
               .map(([name, score], i) => {
                 let crownColor = "";
                 let textColor = C.quizTextSoft;
                 if (i === 0) { crownColor = "#D4AF37"; textColor = "#D4AF37"; }
                 else if (i === 1) { crownColor = "#A8A8A8"; textColor = "#A8A8A8"; }
                 else if (i === 2) { crownColor = "#B87333"; textColor = "#B87333"; }

                 return (
                   <div key={name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px", borderBottom: i < Object.entries(scores).length - 1 ? `1px solid ${C.quizSubCardBorder}` : "none", background: i === 0 ? C.quizAccentSoft : "transparent", borderRadius: "8px", marginBottom: "8px", gap: "16px" }}>
                     <div style={{ display: "flex", alignItems: "center", gap: "15px", minWidth: 0, flex: 1 }}>
                       <div style={{ width: "40px", display: "flex", justifyContent: "center", flexShrink: 0 }}>
                          {crownColor ? (
                            <svg width="32" height="32" viewBox="0 0 24 24" fill={crownColor} xmlns="http://www.w3.org/2000/svg">
                              <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5ZM19 19C19 19.5523 18.5523 20 18 20H6C5.44772 20 5 19.5523 5 19V18H19V19Z" />
                            </svg>
                          ) : (
                            <span style={{ fontSize: "24px", color: textColor }}>{i + 1}.</span>
                          )}
                       </div>
                       <span title={name} style={{ fontSize: "24px", fontWeight: i < 3 ? "bold" : "normal", color: i === 0 ? C.quizAccent : C.quizText, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{truncateName(name)}</span>
                     </div>
                     <span style={{ fontSize: "28px", fontWeight: "bold", color: textColor, flexShrink: 0 }}>{score} pts</span>
                   </div>
                 );
               })}
             {Object.keys(scores).length === 0 && <p style={{color: C.quizTextSoft }}>No final scores available.</p>}
           </div>
           <button onClick={onEnd} style={{ marginTop: 40, padding: "16px 32px", fontSize: "20px", background: "transparent", color: C.quizTextSoft, border: `1px solid ${C.quizCardBorder}`, borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
             Exit Game
           </button>
           <style>{`
             @keyframes slideUp {
               from { opacity:0; transform: translateY(16px); }
               to   { opacity:1; transform: translateY(0); }
             }
           `}</style>
         </div>
      )}
    </div>
  );
}

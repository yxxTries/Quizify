import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";

// Classic Kahoot-inspired answer colors
const CHOICE_COLORS = [
  { bg: "#e21b3c", hover: "#c5102e", label: "▲" }, // red    — triangle
  { bg: "#1368ce", hover: "#0d55a8", label: "◆" }, // blue   — diamond
  { bg: "#d89e00", hover: "#b88200", label: "●" }, // yellow — circle
  { bg: "#26890c", hover: "#1b6408", label: "■" }, // green  — square
];

function normalizeTimeControl(quiz) {
  const seconds = Number(quiz?.timeControl?.secondsPerQuestion);
  const enabled = Boolean(quiz?.timeControl?.enabled && Number.isFinite(seconds) && seconds >= 5);
  return {
    enabled,
    secondsPerQuestion: enabled ? Math.min(120, Math.max(5, Math.round(seconds))) : 0,
  };
}

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes > 0 ? `${minutes}:${String(seconds).padStart(2, "0")}` : `${seconds}s`;
}

const pbStyles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    boxSizing: "border-box",
  },
  textRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: "14px",
    fontWeight: "bold",
    color: "#B0BAC3",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontFamily: "'Syne', sans-serif",
  },
  track: {
    width: "100%",
    height: "8px",
    background: "#252A4A",
    borderRadius: "4px",
    overflow: "hidden",
    border: "1px solid #0F3460",
  },
  fill: {
    height: "100%",
    background: "linear-gradient(90deg, #6153cc, #00D2D3)",
    borderRadius: "4px",
    transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

function ProgressBar({ current, total }) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <div style={pbStyles.container}>
      <div style={pbStyles.track}>
        <div style={{ ...pbStyles.fill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScoreScreen({ score, total, onRestart, onJoinNew, leaderboard, isMultiplayer }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "🙂" : "😅";

  return (
    <div style={{ ...scoreStyles.wrap, padding: "40px", boxSizing: "border-box" }}>
      <div style={scoreStyles.emoji}>{emoji}</div>
      <h1 style={scoreStyles.h1}>Quiz complete!</h1>
      <div style={scoreStyles.scoreBox}>
        <span style={scoreStyles.scoreNum}>{score}</span>
        <span style={scoreStyles.scoreOf}>/ {total}</span>
      </div>
      <div style={scoreStyles.pct}>{pct}% correct</div>

      {isMultiplayer && leaderboard && Object.keys(leaderboard).length > 0 && (
        <div style={{ marginTop: "32px", width: "100%", maxWidth: "500px", background: "#252A4A", borderRadius: "16px", padding: "24px", border: "1px solid #0F3460", display: "flex", flexDirection: "column", gap: "8px", maxHeight: "40vh", overflowY: "auto" }}>
           <h2 style={{ color: "#F1F2F6", margin: "0 0 16px 0", fontSize: "24px", fontFamily: "'Syne', sans-serif", borderBottom: "1px solid #16213E", paddingBottom: "12px" }}>Final Leaderboard</h2>
           {Object.entries(leaderboard)
             .sort(([, a], [, b]) => b - a)
             .map(([name, pts], i) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "12px", borderBottom: i < Object.entries(leaderboard).length - 1 ? "1px solid #16213E" : "none", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span style={{ color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#B0BAC3", fontWeight: i < 3 ? "bold" : "normal", fontSize: "20px", width: "30px" }}>
                      {i + 1}.
                    </span>
                    <span style={{ color: i === 0 ? "#00D2D3" : "#F1F2F6", fontWeight: i < 3 ? "bold" : "normal", fontSize: "20px" }}>{name}</span>
                  </div>
                  <span style={{ color: "#B0BAC3", fontWeight: "bold", fontSize: "20px" }}>{pts} pts</span>
                </div>
             ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px", width: "100%", maxWidth: "320px" }}>
        {isMultiplayer && onJoinNew && (
          <button style={{...scoreStyles.btn, marginTop: 0, width: "100%", background: "#00D2D3", color: "#16213E", border: "none", boxSizing: "border-box"}} onClick={onJoinNew}>
            Join New Game →
          </button>
        )}
        <button style={{...scoreStyles.btn, marginTop: 0, width: "100%", boxSizing: "border-box", ...(isMultiplayer && onJoinNew ? { background: "#FF6B6B", color: "#F1F2F6", border: "none" } : {})}} onClick={onRestart}>
          {isMultiplayer ? "Exit Game" : "New Quiz →"}
        </button>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

const scoreStyles = {
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "80vh",
    gap: "16px",
    animation: "popIn 0.4s ease both",
  },
  emoji: { fontSize: "72px", lineHeight: 1 },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "40px",
    color: "#F1F2F6",
    margin: 0,
    letterSpacing: "-1px",
  },
  scoreBox: { display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" },
  scoreNum: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "72px",
    color: "#00D2D3",
    lineHeight: 1,
  },
  scoreOf: { fontSize: "28px", color: "#4a4a6a" },
  pct: { fontSize: "18px", color: "#B0BAC3" },
  btn: {
    marginTop: "24px",
    background: "#00D2D3",
    color: "#16213E",
    border: "none",
    borderRadius: "12px",
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
};

export default function Quiz({
  quiz,
  onRestart,
  onJoinNew,
  onAnswerSubmit,
  currentQuestionIndex = null,
  leaderboard = null,
  streaks = null,
  isHostMode = false,
  hostAnswers = {},
  triggerNextQuestion = null,
  hostRevealed = false,
  onReveal = null,
  questionTimer = null,
}) {
  const { questions } = quiz;
  const total = questions.length;
  const timerSettings = useMemo(() => normalizeTimeControl(quiz), [quiz]);

  const isMultiplayer = currentQuestionIndex !== null;

  const [leaderboardRef] = useAutoAnimate();

  const [localCurrent, setLocalCurrent] = useState(0);
  const current = isMultiplayer ? currentQuestionIndex : localCurrent;

  const [selected,  setSelected]  = useState(null);   // index of chosen answer 
  const [revealed,  setRevealed]  = useState(false);  // show correct/wrong     
  const [score,     setScore]     = useState(0);
  const [streak,    setStreak]    = useState(0);
  const [done,      setDone]      = useState(false);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [soloQuestionStartedAt, setSoloQuestionStartedAt] = useState(() => (
    !isMultiplayer && timerSettings.enabled ? Date.now() : null
  ));
  const [timeLeftMs, setTimeLeftMs] = useState(() => (
    timerSettings.enabled ? timerSettings.secondsPerQuestion * 1000 : 0
  ));

  const [lockedLeaderboard, setLockedLeaderboard] = useState(leaderboard || {});
  const [lockedStreaks, setLockedStreaks] = useState(streaks || {});
  const hostAdvanceTimeoutRef = useRef(null);
  const soloAdvanceTimeoutRef = useRef(null);

  useEffect(() => {
    if (revealed || done) {
      setLockedLeaderboard(leaderboard || {});
      setLockedStreaks(streaks || {});
    }
  }, [leaderboard, streaks, revealed, done]);

  // When host moves to the next question, reset selection state
  useEffect(() => {
    if (current < total) {
      if (hostAdvanceTimeoutRef.current) {
        window.clearTimeout(hostAdvanceTimeoutRef.current);
        hostAdvanceTimeoutRef.current = null;
      }
      if (soloAdvanceTimeoutRef.current) {
        window.clearTimeout(soloAdvanceTimeoutRef.current);
        soloAdvanceTimeoutRef.current = null;
      }
      setSelected(null);
      setRevealed(false);
      if (!isMultiplayer && timerSettings.enabled) {
        setSoloQuestionStartedAt(Date.now());
      }
    } else {
      setDone(true);
    }
  }, [current, total, isMultiplayer, timerSettings.enabled]);

  const activeTimer = useMemo(() => {
    if (!timerSettings.enabled || current >= total || done) {
      return null;
    }

    if (isMultiplayer) {
      if (!questionTimer?.startedAt || !questionTimer?.durationSeconds) {
        return null;
      }
      return {
        startedAt: Number(questionTimer.startedAt),
        durationSeconds: Number(questionTimer.durationSeconds),
      };
    }

    if (!soloQuestionStartedAt) {
      return null;
    }

    return {
      startedAt: soloQuestionStartedAt,
      durationSeconds: timerSettings.secondsPerQuestion,
    };
  }, [timerSettings, current, done, isMultiplayer, questionTimer, soloQuestionStartedAt]);

  useEffect(() => {
    if (!activeTimer) {
      setTimeLeftMs(0);
      return;
    }

    if (revealed || done) {
      return;
    }

    const tick = () => {
      const remaining = activeTimer.durationSeconds * 1000 - (Date.now() - activeTimer.startedAt);
      setTimeLeftMs(Math.max(0, remaining));
    };

    tick();
    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  }, [activeTimer, revealed, done]);

  useEffect(() => {
    return () => {
      if (hostAdvanceTimeoutRef.current) {
        window.clearTimeout(hostAdvanceTimeoutRef.current);
      }
      if (soloAdvanceTimeoutRef.current) {
        window.clearTimeout(soloAdvanceTimeoutRef.current);
      }
    };
  }, []);

  const q = questions[current < total ? current : total - 1] || questions[0];

  const showResults = isMultiplayer && !isHostMode ? hostRevealed : revealed;
  const timerExpired = Boolean(activeTimer && timeLeftMs <= 0);
  const timerText = activeTimer ? formatCountdown(timeLeftMs) : null;

  const revealAndAdvanceHost = () => {
    if (revealed) return;
    setRevealed(true);
    if (onReveal) {
      onReveal();
    }
    if (hostAdvanceTimeoutRef.current) {
      window.clearTimeout(hostAdvanceTimeoutRef.current);
    }
    hostAdvanceTimeoutRef.current = window.setTimeout(() => {
      if (triggerNextQuestion) {
        triggerNextQuestion();
      }
    }, 3000);
  };

  useEffect(() => {
    if (!timerExpired || revealed) {
      return;
    }

    if (isHostMode) {
      revealAndAdvanceHost();
      return;
    }

    setStreak(0);
    setRevealed(true);
    if (!isMultiplayer) {
      if (soloAdvanceTimeoutRef.current) {
        window.clearTimeout(soloAdvanceTimeoutRef.current);
      }
      soloAdvanceTimeoutRef.current = window.setTimeout(() => {
        handleNextLocal();
      }, 2200);
    }
  }, [timerExpired, revealed, isHostMode]);

  const handleSelect = (idx) => {
    if (revealed || isHostMode || timerExpired) return;
    setSelected(idx);
    setRevealed(true);
    let newScore = score;
    let newStreak = streak;
    if (idx === q.correct_index) {
       newScore += 1;
       newStreak += 1;
       setScore(newScore);
       setStreak(newStreak);
    } else {
       newStreak = 0;
       setStreak(newStreak);
    }
    if (onAnswerSubmit) {
       onAnswerSubmit(current, idx);
    }
  };

  const handleHostNext = () => {
    revealAndAdvanceHost();
  };

  const handleNextLocal = () => {
    if (localCurrent + 1 >= total) {
      setDone(true);
    } else {
      setLocalCurrent((c) => c + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  if (done) {
    return (
      <div style={styles.page}>
        <ScoreScreen score={score} total={total} onRestart={onRestart} onJoinNew={onJoinNew} leaderboard={lockedLeaderboard} isMultiplayer={isMultiplayer} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top bar (minimalist loading screen) */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.logo}>Kuizu</span>
            <div style={{ flex: 1, maxWidth: "1000px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto", gap: "16px" }}>
              <div style={{ width: "100%" }}>
                <ProgressBar current={current + (revealed ? 1 : 0)} total={total} />
              </div>
              <span style={{ color: "#B0BAC3", fontWeight: "bold", fontSize: "16px", whiteSpace: "nowrap", fontFamily: "'Syne', sans-serif" }}>
                {Math.min(current + (revealed || isHostMode ? 1 : 0), total)} / {total}
              </span>
              {activeTimer && (
                <span
                  style={{
                    ...styles.timerChip,
                    ...(timerExpired ? styles.timerChipExpired : {}),
                  }}
                >
                  {timerExpired ? "Time's up" : timerText}
                </span>
              )}
            </div>
            <span style={styles.scoreChip}>
              {isHostMode ? (
                showConfirmEnd ? (
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ color: "#F1F2F6", fontWeight: 500 }}>End Game?</span>
                    <span onClick={onRestart} style={{ cursor: "pointer", color: "#FF6B6B", fontWeight: 600 }}>Yes</span>
                    <span onClick={() => setShowConfirmEnd(false)} style={{ cursor: "pointer", color: "#00D2D3", fontWeight: 600 }}>No</span>
                  </div>
                ) : (
                  <span onClick={() => setShowConfirmEnd(true)} style={{ cursor: "pointer", color: "#FF6B6B", fontWeight: 600 }}>
                    End Game
                  </span>
                )
              ) : (
                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                  {!isMultiplayer && <span style={{ fontWeight: 600 }}>Score: {score}/{total}</span>}
                  {showConfirmEnd ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: "#F1F2F6", fontWeight: 500 }}>Leave?</span>
                      <span onClick={onRestart} style={{ cursor: "pointer", color: "#FF6B6B", fontWeight: 600 }}>Yes</span>
                      <span onClick={() => setShowConfirmEnd(false)} style={{ cursor: "pointer", color: "#00D2D3", fontWeight: 600 }}>No</span>
                    </div>
                  ) : (
                    <span onClick={() => setShowConfirmEnd(true)} style={{ cursor: 'pointer', color: '#FF6B6B', fontWeight: 600 }}>
                      Leave Game
                    </span>
                  )}
                </div>
              )}
            </span>
          </div>
        </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", width: "100%" }}>
        <main style={{...styles.main, overflowY: "auto"}}>
          {/* Question card */}
          <div style={styles.questionCard} key={current}>
            <div style={styles.qNumber}>Q{current + 1}</div>
            <p style={styles.questionText}>{q.question}</p>
          </div>

        {/* Answer grid */}
        <div style={{
          ...styles.grid,
          gridTemplateColumns: q.choices.length === 2 ? '1fr' : 'repeat(2, 1fr)',
        }}>
          {q.choices.map((choice, idx) => {
            const color = CHOICE_COLORS[idx];
            let bg = color.bg;
            let extra = {};
              let pct = 0;

              if (isHostMode && hostAnswers) {
                const values = Object.values(hostAnswers);
                const totalAnswers = values.reduce((a, b) => a + Number(b || 0), 0);
                if (totalAnswers > 0) {
                  const count = Number(hostAnswers[String(idx)] || 0);
                  pct = Math.round((count / totalAnswers) * 100);
                }
              }

              if (showResults) {
                if (idx === q.correct_index) {
                  bg = color.bg;
                  extra = { outline: "4px solid #16213E", outlineOffset: "2px", transform: "scale(1.03)" };
                } else if (idx === selected || isHostMode) {
                  bg = color.bg;
                  extra = { opacity: 0.65, filter: "grayscale(40%)" };
                } else {
                  bg = color.bg;
                  extra = { opacity: 0.5, filter: "grayscale(50%)" };
                }
              } else if (revealed && !isHostMode) {
                // User has answered but results not revealed yet
                if (idx === selected) {
                  extra = { outline: "4px solid #16213E", outlineOffset: "2px", transform: "scale(1.03)" };
                } else {
                  extra = { opacity: 0.5 };
                }
              }

              return (
                <button
                  key={idx}
                  style={{ ...styles.choiceBtn, background: bg, ...extra, position: "relative", overflow: "hidden" }}
                  onClick={() => handleSelect(idx)}
                  disabled={revealed || isHostMode || timerExpired}
                >
                  {isHostMode && showResults && (
                     <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: "rgba(255, 255, 255, 0.35)", zIndex: 1, transition: "width 0.6s ease-out" }} />
                  )}
                  <span style={{ ...styles.choiceShape, position: "relative", zIndex: 2 }}>
                    {showResults && idx === q.correct_index ? (
                      <span style={styles.tick}>&#10003;</span>
                    ) : showResults && !isHostMode && idx === selected && idx !== q.correct_index ? (
                      <span style={styles.cross}>&#10007;</span>
                    ) : (
                      color.label
                    )}
                  </span>
                  <span style={{ ...styles.choiceText, position: "relative", zIndex: 2, fontSize: choice.length > 50 ? "clamp(18px, 1.5vw, 24px)" : choice.length > 30 ? "clamp(24px, 2.5vw, 36px)" : undefined }}>{choice}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback + next */}
          {revealed && !isHostMode && (
            <div style={styles.feedbackRow} key={"fb-" + current}>
              {showResults ? (
                <>
                  <div style={selected === q.correct_index ? styles.feedbackCorrect : styles.feedbackWrong}>
                    {selected === q.correct_index
                      ? "\u2713 Correct!"
                      : `\u2717 The answer was: ${q.choices[q.correct_index]}`}   
                  </div>

                  {isMultiplayer ? (
                    <p style={{ textAlign: "center", color: "#B0BAC3", margin: "10px 0" }}>
                      Waiting for the host to start the next question...
                    </p>
                  ) : (
                    <button style={styles.nextBtn} onClick={handleNextLocal}>     
                      {localCurrent + 1 < total ? "Next question \u2192" : "See results \u2192"}
                    </button>
                  )}
                </>
              ) : (
                <div style={{...styles.feedbackCorrect, background: "#252A4A", color: "#00D2D3"}}>
                  Waiting for host to reveal the answer...
                </div>
              )}
            </div>
          )}

          {/* Host "Next Question" Action */}
          {isHostMode && !revealed && (
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <button
                style={{ padding: "16px 32px", fontSize: "20px", background: "#00D2D3", color: "#16213E", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                onClick={handleHostNext}
              >
                {timerExpired
                  ? (current + 1 === total ? "Time's Up: End Game" : "Time's Up: Next Question \u2192")
                  : (current + 1 === total ? "Reveal & End Game" : "Reveal & Next Question \u2192")}
              </button>
            </div>
          )}
        </main>
        
        {isHostMode && lockedLeaderboard && (
           <div style={{
              width: "clamp(300px, 25vw, 600px)",
              background: "#252A4A",
              border: "1px solid #0F3460",
              borderRadius: "clamp(16px, 1.5vw, 24px)",
              margin: "clamp(16px, 2vw, 32px) clamp(16px, 2vw, 32px) clamp(16px, 2vw, 32px) 0",
              display: "flex",
              flexDirection: "column",
              padding: "clamp(16px, 1.5vw, 24px)",
              boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto"
           }}>
              <h2 style={{ margin: "0 0 clamp(16px, 1.5vw, 24px) 0", fontSize: "clamp(24px, 2vw, 32px)", color: "#F1F2F6", fontFamily: "'Syne', sans-serif", borderBottom: "1px solid #16213E", paddingBottom: "clamp(12px, 1vw, 16px)" }}>
                Live Leaderboard
              </h2>
              <div ref={leaderboardRef} style={{ display: "flex", flexDirection: "column", gap: "clamp(12px, 1vw, 16px)" }}>
                {Object.entries(lockedLeaderboard)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, score], i) => {
                    const playerStreak = lockedStreaks && lockedStreaks[name] ? lockedStreaks[name] : 0;
                    const isOnStreak = playerStreak >= 2;
                    
                    return (
                      <div key={name} style={{ 
                        display: "flex", 
                        justifyContent: "space-between", 
                        alignItems: "center", 
                        padding: "20px", 
                        background: isOnStreak ? "linear-gradient(90deg, rgba(255,159,67,0.1), rgba(255,107,107,0.1))" : "#16213E", 
                        borderRadius: "16px",
                        border: isOnStreak ? "1px solid #FF9F43" : "1px solid #0F3460",
                        position: "relative",
                        animation: isOnStreak ? "firePulse 1.5s infinite alternate" : "none"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                          <span style={{ 
                            fontSize: "24px", 
                            fontWeight: "bold", 
                            color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : "#B0BAC3",
                            width: "36px"
                          }}>
                            {i + 1}.
                          </span>
                          <span style={{ fontSize: "24px", fontWeight: "600", color: "#F1F2F6" }}>
                            {name}
                          </span>
                          {isOnStreak && <span style={{ fontSize: "20px", filter: "drop-shadow(0 0 4px rgba(255,159,67,0.8))" }}>🔥 {playerStreak}</span>}
                        </div>
                        <span style={{ fontSize: "24px", fontWeight: "bold", color: "#00D2D3" }}>
                          {score}
                        </span>
                      </div>
                    );
                })}
              </div>
           </div>
        )}
      </div>

      <style>{`
        @keyframes firePulse {
          0% { box-shadow: 0 0 5px rgba(255, 107, 107, 0.2); border-color: rgba(255, 159, 67, 0.5); }
          100% { box-shadow: 0 0 15px rgba(255, 107, 107, 0.6); border-color: rgba(255, 159, 67, 1); }
        }
        @keyframes slideUp {
            from { opacity:0; transform: translateY(16px); }
            to   { opacity:1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1A1A2E",
    color: "#F1F2F6",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    padding: "clamp(12px, 1.5vw, 24px) 0",
    background: "#16213E",
    borderBottom: "1px solid #1e1e2e",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
    gap: "32px",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "24px",
    color: "#F1F2F6",
    letterSpacing: "-0.5px",
  },
  scoreChip: {
    background: "#1a1a2e",
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "14px",
    color: "#F1F2F6",
    fontWeight: 500,
  },
  timerChip: {
    background: "rgba(0, 210, 211, 0.12)",
    border: "1px solid rgba(0, 210, 211, 0.35)",
    borderRadius: "999px",
    padding: "10px 18px",
    color: "#c9fbff",
    fontWeight: 700,
    fontSize: "15px",
    whiteSpace: "nowrap",
    minWidth: "120px",
    textAlign: "center",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    flexShrink: 0,
  },
  timerChipExpired: {
    background: "rgba(255, 107, 107, 0.12)",
    border: "1px solid rgba(255, 107, 107, 0.4)",
    color: "#ffc3cb",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "clamp(24px, 4vh, 48px) clamp(16px, 2vw, 30px) clamp(30px, 5vh, 60px)",
    maxWidth: "1600px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  questionCard: {
    background: "#252A4A",
    border: "1px solid #0F3460",
    borderRadius: "clamp(20px, 2vw, 32px)",
    padding: "clamp(40px, 6vh, 100px) clamp(30px, 4vw, 60px)",
    width: "100%",
    marginBottom: "clamp(30px, 4vh, 60px)",
    animation: "slideUp 0.35s ease both",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
  },
  qNumber: {
    display: "inline-block",
    background: "rgba(124, 111, 255, 0.15)",
    padding: "clamp(6px, 1vh, 8px) clamp(16px, 2vw, 24px)",
    borderRadius: "20px",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(16px, 1.5vw, 20px)",
    color: "#00D2D3",
    marginBottom: "clamp(16px, 3vh, 32px)",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: "clamp(36px, 4vw, 64px)",
    fontWeight: 700,
    lineHeight: 1.3,
    margin: 0,
    color: "#F1F2F6",
    fontFamily: "'Syne', sans-serif",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "clamp(16px, 2vw, 32px)",
    width: "100%",
    marginBottom: "clamp(16px, 3vh, 32px)",
  },
  choiceBtn: {
    display: "flex",
    alignItems: "center",
    gap: "clamp(16px, 2vw, 32px)",
    padding: "clamp(24px, 4vh, 40px) clamp(24px, 3vw, 48px)",
    borderRadius: "clamp(16px, 1.5vw, 24px)",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "clamp(24px, 3.5vw, 56px)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    color: "#16213E",
    transition: "opacity 0.2s, transform 0.15s, outline 0.1s",
    height: "clamp(150px, 20vh, 240px)",
    maxHeight: "240px",
    overflow: "hidden",
  },
  choiceShape: {
    fontSize: "clamp(32px, 3vw, 48px)",
    flexShrink: 0,
    opacity: 0.85,
  },
  choiceText: {
    flex: 1,
    lineHeight: 1.3,
    wordBreak: "break-word",
    overflow: "hidden",
    textOverflow: "ellipsis",
    display: "-webkit-box",
    WebkitLineClamp: 4,
    WebkitBoxOrient: "vertical",
  },
  tick: {
    fontSize: "40px",
    fontWeight: 700,
    flexShrink: 0,
  },
  cross: {
    fontSize: "36px",
    flexShrink: 0,
    opacity: 0.7,
  },
  feedbackRow: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    animation: "slideUp 0.3s ease both",
  },
  feedbackCorrect: {
    background: "#0e2e0e",
    border: "1px solid #26890c",
    color: "#5dd85d",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 500,
    textAlign: "center",
  },
  feedbackWrong: {
    background: "#1e0e0e",
    border: "1px solid #6b1a1a",
    color: "#ff7070",
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 500,
    textAlign: "center",
  },
  nextBtn: {
    background: "#00D2D3",
    color: "#16213E",
    border: "none",
    borderRadius: "12px",
    padding: "16px",
    fontSize: "16px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    width: "100%",
  },
  miniLeaderboard: {
    background: "#1a1a2e",
    border: "1px solid #0F3460",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#F1F2F6",
  },
};


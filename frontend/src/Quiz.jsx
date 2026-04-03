import React, { useState } from "react";

// Classic Kahoot-inspired answer colors
const CHOICE_COLORS = [
  { bg: "#e21b3c", hover: "#c5102e", label: "▲" }, // red    — triangle
  { bg: "#1368ce", hover: "#0d55a8", label: "◆" }, // blue   — diamond
  { bg: "#d89e00", hover: "#b88200", label: "●" }, // yellow — circle
  { bg: "#26890c", hover: "#1b6408", label: "■" }, // green  — square
];

const pbStyles = {
  container: {
    padding: "0 32px",
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
    color: "#8e8ea0",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontFamily: "'Syne', sans-serif",
  },
  track: {
    width: "100%",
    height: "8px",
    background: "#181825",
    borderRadius: "4px",
    overflow: "hidden",
    border: "1px solid #2e2e42",
  },
  fill: {
    height: "100%",
    background: "linear-gradient(90deg, #6153cc, #7c6fff)",
    borderRadius: "4px",
    transition: "width 0.5s cubic-bezier(0.4, 0, 0.2, 1)",
  },
};

function ProgressBar({ current, total }) {
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  const remaining = total - current;
  return (
    <div style={pbStyles.container}>
      <div style={pbStyles.textRow}>
        <span style={{ color: "#7c6fff" }}>{current} Done</span>
        <span>{remaining} Left</span>
      </div>
      <div style={pbStyles.track}>
        <div style={{ ...pbStyles.fill, width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ScoreScreen({ score, total, onRestart }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "🙂" : "😅";

  return (
    <div style={scoreStyles.wrap}>
      <div style={scoreStyles.emoji}>{emoji}</div>
      <h1 style={scoreStyles.h1}>Quiz complete!</h1>
      <div style={scoreStyles.scoreBox}>
        <span style={scoreStyles.scoreNum}>{score}</span>
        <span style={scoreStyles.scoreOf}>/ {total}</span>
      </div>
      <div style={scoreStyles.pct}>{pct}% correct</div>
      <button style={scoreStyles.btn} onClick={onRestart}>
        Try another document →
      </button>
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
    color: "#f0ede8",
    margin: 0,
    letterSpacing: "-1px",
  },
  scoreBox: { display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" },
  scoreNum: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "72px",
    color: "#7c6fff",
    lineHeight: 1,
  },
  scoreOf: { fontSize: "28px", color: "#4a4a6a" },
  pct: { fontSize: "18px", color: "#6b6b7e" },
  btn: {
    marginTop: "24px",
    background: "#7c6fff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
};

export default function Quiz({ quiz, onRestart, onScoreUpdate, onAnswerSubmit, currentQuestionIndex = null, leaderboard = null, isHostMode = false, hostAnswers = {}, triggerNextQuestion = null }) {
  const { questions } = quiz;
  const total = questions.length;

  const isMultiplayer = currentQuestionIndex !== null;

  const [localCurrent, setLocalCurrent] = useState(0);
  const current = isMultiplayer ? currentQuestionIndex : localCurrent;

  const [selected,  setSelected]  = useState(null);   // index of chosen answer 
  const [revealed,  setRevealed]  = useState(false);  // show correct/wrong     
  const [score,     setScore]     = useState(0);
  const [done,      setDone]      = useState(false);

  // When host moves to the next question, reset selection state
  React.useEffect(() => {
    if (isMultiplayer) {
      if (current < total) {
        setSelected(null);
        setRevealed(false);
      } else {
        setDone(true);
      }
    }
  }, [current, total, isMultiplayer]);

  const q = questions[current < total ? current : total - 1] || questions[0];

  const handleSelect = (idx) => {
    if (revealed || isHostMode) return;
    setSelected(idx);
    setRevealed(true);
    let newScore = score;
    if (idx === q.correct_index) {
       newScore += 1;
       setScore(newScore);
    }
    if (onScoreUpdate) {
       onScoreUpdate(newScore);
    }
    if (onAnswerSubmit) {
       onAnswerSubmit(current, idx);
    }
  };

  const handleHostNext = () => {
    setRevealed(true);
    setTimeout(() => {
       if (triggerNextQuestion) {
          triggerNextQuestion();
       }
    }, 3000);
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
        <ScoreScreen score={score} total={total} onRestart={onRestart} />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top bar (minimalist loading screen) */}
      <header style={styles.header}>
        <div style={styles.headerTop}>
          <span style={styles.logo}>Kuizu</span>
          <span style={styles.scoreChip}>
            {isHostMode ? (
              <span onClick={onRestart} style={{ cursor: "pointer", color: "#ff4d4f", fontWeight: 600 }}>
                End Game
              </span>
            ) : (
              <span>🌟 {score}</span>
            )}
          </span>
        </div>
        <ProgressBar current={current + (revealed ? 1 : 0)} total={total} />
      </header>

      <main style={styles.main}>
        {/* Question card */}
        <div style={styles.questionCard} key={current}>
          <div style={styles.qNumber}>Q{current + 1}</div>
          <p style={styles.questionText}>{q.question}</p>
        </div>

        {/* Answer grid */}
        <div style={styles.grid}>
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

              if (revealed) {
                if (idx === q.correct_index) {
                  bg = color.bg;
                  extra = { outline: "4px solid #fff", outlineOffset: "2px", transform: "scale(1.03)" };
                } else if (idx === selected || isHostMode) {
                  bg = "#2a1a1a";
                  extra = { opacity: 0.6 };
                } else {
                  bg = "#141420";
                  extra = { opacity: 0.35 };
                }
              }

              return (
                <button
                  key={idx}
                  style={{ ...styles.choiceBtn, background: bg, ...extra, position: "relative", overflow: "hidden" }}
                  onClick={() => handleSelect(idx)}
                  disabled={revealed || isHostMode}
                >
                  {isHostMode && revealed && (
                     <div style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: `${pct}%`, background: "rgba(255, 255, 255, 0.15)", zIndex: 1, transition: "width 0.6s ease-out" }} />
                  )}
                  <span style={{ ...styles.choiceShape, position: "relative", zIndex: 2 }}>{color.label}</span>
                  <span style={{ ...styles.choiceText, position: "relative", zIndex: 2 }}>{choice}</span>
                  {isHostMode && revealed && (
                     <span style={{ position: "absolute", right: 20, zIndex: 2, fontWeight: "bold", fontSize: "18px", color: "rgba(255,255,255,0.8)" }}>{pct}%</span>
                  )}
                  {revealed && !isHostMode && idx === q.correct_index && (
                    <span style={{ ...styles.tick, zIndex: 2 }}>&#10003;</span>
                  )}
                  {revealed && !isHostMode && idx === selected && idx !== q.correct_index && (
                    <span style={{ ...styles.cross, zIndex: 2 }}>&#10007;</span>
                  )}
                  {isHostMode && revealed && idx === q.correct_index && (
                    <span style={{ ...styles.tick, zIndex: 2, position: "absolute", right: 70 }}>&#10003;</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Feedback + next */}
          {revealed && !isHostMode && (
            <div style={styles.feedbackRow} key={"fb-" + current}>
              <div style={selected === q.correct_index ? styles.feedbackCorrect : styles.feedbackWrong}>
                {selected === q.correct_index
                  ? "\u2713 Correct!"
                  : `\u2717 The answer was: ${q.choices[q.correct_index]}`}
              </div>

              {leaderboard ? (
                 <div style={styles.miniLeaderboard}>
                   <h4 style={{ margin: "0 0 10px 0" }}>Live Leaderboard</h4>
                   {Object.entries(leaderboard)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([name, s], i) => (
                        <div key={name} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", padding: "4px 0" }}>
                          <span>{i+1}. {name}</span>
                          <span>{s} pts</span>
                        </div>
                      ))}
                 </div>
              ) : null}

              {isMultiplayer ? (
                <p style={{ textAlign: "center", color: "#8e8ea0", margin: "10px 0" }}>
                  Waiting for the host to start the next question...
                </p>
              ) : (
                <button style={styles.nextBtn} onClick={handleNextLocal}>
                  {localCurrent + 1 < total ? "Next question \u2192" : "See results \u2192"}
                </button>
              )}
            </div>
          )}

          {/* Host "Next Question" Action */}
          {isHostMode && !revealed && (
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <button
                style={{ padding: "16px 32px", fontSize: "20px", background: "#7c6fff", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                onClick={handleHostNext}
              >
                {current + 1 === total ? "Reveal & End Game" : "Reveal & Next Question \u2192"}
              </button>
            </div>
          )}

          </main>
          <style>{`
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
    background: "#0a0a0f",
    color: "#f0ede8",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    padding: "24px 0",
    gap: "24px",
    background: "#12121c",
    borderBottom: "1px solid #1e1e2e",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 32px",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "24px",
    color: "#f0ede8",
    letterSpacing: "-0.5px",
  },
  scoreChip: {
    background: "#1a1a2e",
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "14px",
    color: "#f0ede8",
    fontWeight: 500,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "32px 20px 40px",
    maxWidth: "760px",
    margin: "0 auto",
    width: "100%",
    boxSizing: "border-box",
  },
  questionCard: {
    background: "#181825",
    border: "1px solid #2e2e42",
    borderRadius: "24px",
    padding: "48px 40px",
    width: "100%",
    marginBottom: "40px",
    animation: "slideUp 0.35s ease both",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow: "0 12px 48px rgba(0,0,0,0.3)",
  },
  qNumber: {
    display: "inline-block",
    background: "rgba(124, 111, 255, 0.15)",
    padding: "6px 16px",
    borderRadius: "20px",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "16px",
    color: "#7c6fff",
    marginBottom: "24px",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: "36px",
    fontWeight: 700,
    lineHeight: 1.3,
    margin: 0,
    color: "#f0ede8",
    fontFamily: "'Syne', sans-serif",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
    width: "100%",
    marginBottom: "20px",
  },
  choiceBtn: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "18px 20px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "15px",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 500,
    color: "#fff",
    transition: "opacity 0.2s, transform 0.15s, outline 0.1s",
    minHeight: "72px",
  },
  choiceShape: {
    fontSize: "18px",
    flexShrink: 0,
    opacity: 0.85,
  },
  choiceText: {
    flex: 1,
    lineHeight: 1.3,
  },
  tick: {
    fontSize: "22px",
    fontWeight: 700,
    flexShrink: 0,
  },
  cross: {
    fontSize: "20px",
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
    background: "#7c6fff",
    color: "#fff",
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
    border: "1px solid #2e2e42",
    borderRadius: "10px",
    padding: "12px 16px",
    color: "#f0ede8",
  },
};

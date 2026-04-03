import React, { useState } from "react";

// Classic Kahoot-inspired answer colors
const CHOICE_COLORS = [
  { bg: "#e21b3c", hover: "#c5102e", label: "▲" }, // red    — triangle
  { bg: "#1368ce", hover: "#0d55a8", label: "◆" }, // blue   — diamond
  { bg: "#d89e00", hover: "#b88200", label: "●" }, // yellow — circle
  { bg: "#26890c", hover: "#1b6408", label: "■" }, // green  — square
];

function ProgressBar({ current, total }) {
  const pct = ((current) / total) * 100;
  return (
    <div style={pbStyles.track}>
      <div style={{ ...pbStyles.fill, width: `${pct}%` }} />
    </div>
  );
}

const pbStyles = {
  track: {
    width: "100%",
    height: "4px",
    background: "#1e1e2e",
    borderRadius: "2px",
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    background: "#7c6fff",
    borderRadius: "2px",
    transition: "width 0.4s ease",
  },
};

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

export default function Quiz({ quiz, onRestart, onScoreUpdate, currentQuestionIndex = null, leaderboard = null }) {
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
    if (revealed) return;
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
      {/* Top bar */}
      <header style={styles.header}>
        <span style={styles.logo}>QuizAI</span>
        <span style={styles.counter}>
          Question <strong>{current + 1}</strong> / {total}
        </span>
        <span style={styles.scoreChip}>
          ⭐ {score}
        </span>
      </header>

      <ProgressBar current={current + (revealed ? 1 : 0)} total={total} />

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

            if (revealed) {
              if (idx === q.correct_index) {
                bg = color.bg;
                extra = { outline: "4px solid #fff", outlineOffset: "2px", transform: "scale(1.03)" };
              } else if (idx === selected) {
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
                style={{ ...styles.choiceBtn, background: bg, ...extra }}
                onClick={() => handleSelect(idx)}
                disabled={revealed}
              >
                <span style={styles.choiceShape}>{color.label}</span>
                <span style={styles.choiceText}>{choice}</span>
                {revealed && idx === q.correct_index && (
                  <span style={styles.tick}>&#10003;</span>
                )}
                {revealed && idx === selected && idx !== q.correct_index && (   
                  <span style={styles.cross}>&#10007;</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Feedback + next */}
        {revealed && (
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
    alignItems: "center",
    padding: "18px 32px",
    gap: "16px",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "20px",
    color: "#f0ede8",
    letterSpacing: "-0.5px",
    marginRight: "auto",
  },
  counter: {
    fontSize: "14px",
    color: "#8e8ea0",
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
    background: "#12121c",
    border: "1px solid #1e1e2e",
    borderRadius: "16px",
    padding: "28px 32px",
    width: "100%",
    marginBottom: "28px",
    animation: "slideUp 0.35s ease both",
    boxSizing: "border-box",
  },
  qNumber: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "13px",
    color: "#7c6fff",
    marginBottom: "10px",
    letterSpacing: "0.5px",
  },
  questionText: {
    fontSize: "22px",
    fontWeight: 500,
    lineHeight: 1.4,
    margin: 0,
    color: "#f0ede8",
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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { useTheme } from "./ThemeContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";

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

function truncateName(name, max = 16) {
  if (!name) return "";
  const arr = Array.from(name); // Safely array-ify emojis to prevent half-character breaks
  if (arr.length <= max) return name;
  return arr.slice(0, max).join("") + "…";
}

const pbStyles = {
  container: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "4px",
    width: "100%",
    boxSizing: "border-box",
    padding: "4px 0",
  },
  dot: {
    flexShrink: 0,
    borderRadius: "50%",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  }
};

function ProgressBar({ results, current }) {
  const { colors: C } = useTheme();
  const isFew = results.length < 6;

  return (
    <div style={{
      ...pbStyles.container,
      justifyContent: isFew ? "center" : "space-between",
      gap: isFew ? "clamp(16px, 4vw, 32px)" : "4px"
    }}>
      {results.map((res, i) => {
        let bgColor = C.quizCard;
        let border = `2px solid ${C.quizCardBorder}`;
        let transform = "scale(1)";
        let boxShadow = "none";

        const isCurrent = i === current;

        if (res === "correct") {
          bgColor = "#26890c";
          border = "2px solid #26890c";
        } else if (res === "wrong") {
          bgColor = "#e21b3c";
          border = "2px solid #e21b3c";
        } else if (res === "completed") {
          bgColor = C.quizAccent;
          border = `2px solid ${C.quizAccent}`;
        }

        if (isCurrent && res === "pending") {
          bgColor = "transparent";
          border = `2px solid ${C.quizAccent}`;
          transform = "scale(1.3)";
          boxShadow = `0 0 8px ${C.quizAccent}66`;
        } else if (isCurrent && res !== "pending") {
          transform = "scale(1.3)";
          boxShadow = `0 0 8px ${bgColor}88`;
        }
        
        return (
          <div key={i} style={{
            ...pbStyles.dot,
            width: "clamp(8px, 2vw, 12px)",
            height: "clamp(8px, 2vw, 12px)",
            background: bgColor,
            border: border,
            transform: transform,
            boxShadow: boxShadow
          }} />
        );
      })}
    </div>
  );
}

function ScoreScreen({ score, total, onRestart, onJoinNew, leaderboard, isMultiplayer, quiz, userSelections }) {
  const { colors: C } = useTheme();
  const scoreStyles = useMemo(() => buildScoreStyles(C), [C]);
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "🎉" : pct >= 40 ? "🙂" : "😅";

  const [copied, setCopied] = useState(false);

  const handleCopyQA = () => {
    const text = quiz.questions.map((q) => `Q: ${q.question}\nA: ${q.choices[q.correct_index]}`).join("\n\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={scoreStyles.wrap}>
      <div style={scoreStyles.emoji}>{emoji}</div>
      <h1 style={scoreStyles.h1}>Quiz complete!</h1>
      <div style={scoreStyles.scoreBox}>
        <span style={scoreStyles.scoreNum}>{score}</span>
        <span style={scoreStyles.scoreOf}>/ {total}</span>
      </div>
      <div style={scoreStyles.pct}>{pct}% correct</div>

      {isMultiplayer && leaderboard && Object.keys(leaderboard).length > 0 && (
        <div style={{ marginTop: "24px", width: "100%", maxWidth: "500px", background: C.quizCard, borderRadius: "16px", padding: "clamp(14px, 4vw, 24px)", border: `1px solid ${C.quizCardBorder}`, display: "flex", flexDirection: "column", gap: "8px", maxHeight: "40vh", overflowY: "auto" }}>
           <h2 style={{ color: C.quizText, margin: "0 0 16px 0", fontSize: "24px", fontFamily: "'Syne', sans-serif", borderBottom: `1px solid ${C.quizSubCardBorder}`, paddingBottom: "12px" }}>Final Leaderboard</h2>
           {Object.entries(leaderboard)
             .sort(([, a], [, b]) => b - a)
             .map(([name, pts], i) => (
                <div key={name} style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: i < Object.entries(leaderboard).length - 1 ? `1px solid ${C.quizSubCardBorder}` : "none", alignItems: "center", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0, flex: 1 }}>
                    <span style={{ color: i === 0 ? "#D4AF37" : i === 1 ? "#A8A8A8" : i === 2 ? "#B87333" : C.quizTextSoft, fontWeight: i < 3 ? "bold" : "normal", fontSize: "clamp(14px, 3.5vw, 20px)", width: "30px", flexShrink: 0 }}>
                      {i + 1}.
                    </span>
                    <span title={name} style={{ color: i === 0 ? C.quizAccent : C.quizText, fontWeight: i < 3 ? "bold" : "normal", fontSize: "clamp(14px, 3.5vw, 20px)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{truncateName(name)}</span>
                  </div>
                  <span style={{ color: C.quizTextSoft, fontWeight: "bold", fontSize: "clamp(14px, 3.5vw, 20px)", flexShrink: 0 }}>{pts} pts</span>
                </div>
             ))}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px", width: "100%", maxWidth: "320px" }}>
        {isMultiplayer && onJoinNew && (
          <button style={{...scoreStyles.btn, marginTop: 0, width: "100%", boxSizing: "border-box"}} onClick={onJoinNew}>
            Join New Game →
          </button>
        )}
        <button style={{...scoreStyles.btn, marginTop: 0, width: "100%", boxSizing: "border-box", ...(isMultiplayer && onJoinNew ? { background: C.quizNegative, color: "#FFFFFF", border: "none" } : {})}} onClick={onRestart}>
          {isMultiplayer ? "Exit Game" : "New Quiz →"}
        </button>
      </div>

      <div style={scoreStyles.reviewSection}>
        <div style={scoreStyles.reviewHeader}>
          <h2 style={scoreStyles.reviewTitle}>Quiz Review</h2>
          <button onClick={handleCopyQA} style={scoreStyles.copyBtn}>
            {copied ? "Copied!" : "Copy Q&A"}
          </button>
        </div>
        <div style={scoreStyles.reviewList}>
          {quiz.questions.map((q, i) => {
            const userSelectedIdx = userSelections[i];
            const isCorrect = userSelectedIdx === q.correct_index;
            const didNotAnswer = userSelectedIdx === null || userSelectedIdx === undefined;

            return (
              <div key={i} style={scoreStyles.reviewCard}>
                <p style={scoreStyles.reviewQ}><span style={scoreStyles.reviewQNum}>Q{i+1}.</span> {q.question}</p>
                <div style={scoreStyles.reviewAnswers}>
                  <div style={scoreStyles.correctAnswer}>
                    <span style={scoreStyles.answerLabel}>Correct Answer:</span> {q.choices[q.correct_index]}
                  </div>
                  <div style={isCorrect ? scoreStyles.userCorrect : scoreStyles.userWrong}>
                    <span style={scoreStyles.answerLabel}>Your Answer:</span> {didNotAnswer ? "No answer" : q.choices[userSelectedIdx]}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <style>{`@keyframes popIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }`}</style>
    </div>
  );
}

const buildScoreStyles = (C) => ({
  wrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: "100vh",
    padding: "clamp(40px, 10vh, 80px) clamp(20px, 5vw, 40px)",
    boxSizing: "border-box",
    gap: "16px",
    animation: "popIn 0.4s ease both",
    background: C.quizBg,
    color: C.quizText,
  },
  emoji: { fontSize: "72px", lineHeight: 1 },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(28px, 6vw, 40px)",
    color: C.quizText,
    margin: 0,
    letterSpacing: "-1px",
  },
  scoreBox: { display: "flex", alignItems: "baseline", gap: "6px", marginTop: "8px" },
  scoreNum: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(48px, 10vw, 72px)",
    color: C.quizAccent,
    lineHeight: 1,
  },
  scoreOf: { fontSize: "28px", color: C.quizTextMuted },
  pct: { fontSize: "18px", color: C.quizTextSoft },
  btn: {
    marginTop: "24px",
    background: C.quizAccent,
    color: C.quizBg,
    border: "none",
    borderRadius: "12px",
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
  },
  reviewSection: {
    width: "100%",
    maxWidth: "800px",
    marginTop: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  reviewHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: `1px solid ${C.quizCardBorder}`,
    paddingBottom: "12px",
  },
  reviewTitle: {
    color: C.quizText,
    margin: 0,
    fontSize: "24px",
    fontFamily: "'Syne', sans-serif",
  },
  copyBtn: {
    background: "transparent",
    color: C.quizAccent,
    border: `1px solid ${C.quizAccent}`,
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s",
  },
  reviewList: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  reviewCard: {
    background: C.quizCard,
    border: `1px solid ${C.quizCardBorder}`,
    borderRadius: "12px",
    padding: "20px",
    textAlign: "left",
  },
  reviewQ: {
    margin: "0 0 16px 0",
    fontSize: "18px",
    color: C.quizText,
    fontWeight: 600,
    lineHeight: 1.4,
  },
  reviewQNum: {
    color: C.quizAccent,
    marginRight: "8px",
  },
  reviewAnswers: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  correctAnswer: {
    background: C.quizPositiveBg,
    border: `1px solid ${C.quizPositive}`,
    color: C.quizPositive,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "15px",
  },
  userCorrect: {
    background: C.quizAccentSoft,
    border: `1px solid ${C.quizAccent}`,
    color: C.quizAccent,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "15px",
  },
  userWrong: {
    background: C.quizNegativeBg,
    border: `1px solid ${C.quizNegative}`,
    color: C.quizNegative,
    padding: "10px 14px",
    borderRadius: "8px",
    fontSize: "15px",
  },
  answerLabel: {
    fontWeight: 700,
    marginRight: "6px",
    opacity: 0.85,
  }
});

function getSoloSessionKey(quiz) {
  // Stable key based on quiz identity so different quizzes don't share state
  const id = quiz?.id || quiz?.title || "";
  const count = quiz?.questions?.length || 0;
  return `kuizu_solo_${id}_${count}`;
}

function loadSoloSession(quiz) {
  try {
    const raw = sessionStorage.getItem(getSoloSessionKey(quiz));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveSoloSession(quiz, state) {
  try {
    sessionStorage.setItem(getSoloSessionKey(quiz), JSON.stringify(state));
  } catch {}
}

function clearSoloSession(quiz) {
  try { sessionStorage.removeItem(getSoloSessionKey(quiz)); } catch {}
}

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
  autoReveal = true,
}) {
  const { colors: C } = useTheme();
  const styles = useMemo(() => buildStyles(C), [C]);
  const { questions } = quiz;
  const total = questions.length;
  const timerSettings = useMemo(() => normalizeTimeControl(quiz), [quiz]);

  const isMultiplayer = currentQuestionIndex !== null;

  const [leaderboardRef] = useAutoAnimate();

  // Restore solo session from sessionStorage if available
  const savedSolo = !isMultiplayer ? loadSoloSession(quiz) : null;

  const [localCurrent, setLocalCurrent] = useState(() => savedSolo?.localCurrent ?? 0);
  const current = isMultiplayer ? currentQuestionIndex : localCurrent;

  const [selected,  setSelected]  = useState(null);
  const [revealed,  setRevealed]  = useState(false);
  const [score,     setScore]     = useState(() => savedSolo?.score ?? 0);
  const [streak,    setStreak]    = useState(() => savedSolo?.streak ?? 0);
  const [done,      setDone]      = useState(() => !isMultiplayer && (savedSolo?.localCurrent ?? 0) >= total);
  const [showConfirmEnd, setShowConfirmEnd] = useState(false);
  const [soloQuestionStartedAt, setSoloQuestionStartedAt] = useState(() => (
    !isMultiplayer && timerSettings.enabled ? Date.now() : null
  ));
  const [timeLeftMs, setTimeLeftMs] = useState(() => (
    timerSettings.enabled ? timerSettings.secondsPerQuestion * 1000 : 0
  ));

  const [userSelections, setUserSelections] = useState(() =>
    savedSolo?.userSelections ?? new Array(total).fill(null)
  );
  const [results, setResults] = useState(() =>
    savedSolo?.results ?? new Array(total).fill("pending")
  );

  const [lockedLeaderboard, setLockedLeaderboard] = useState(leaderboard || {});
  const [lockedStreaks, setLockedStreaks] = useState(streaks || {});
  const hostAdvanceTimeoutRef = useRef(null);
  const soloAdvanceTimeoutRef = useRef(null);
  const timerFiredForRef = useRef(-1);

  useEffect(() => {
    setLockedLeaderboard(leaderboard || {});
    setLockedStreaks(streaks || {});
  }, [leaderboard, streaks]);

  // When question changes, reset all per-question state
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
      timerFiredForRef.current = -1;
      setSelected(null);
      setRevealed(false);
      if (timerSettings.enabled) {
        setTimeLeftMs(timerSettings.secondsPerQuestion * 1000);
        if (!isMultiplayer) {
          setSoloQuestionStartedAt(Date.now());
        }
      }
    } else {
      setDone(true);
    }
  }, [current, total, isMultiplayer, timerSettings.enabled, timerSettings.secondsPerQuestion]);

  // Persist solo progress so refreshes/accidental navigation can resume
  useEffect(() => {
    if (isMultiplayer) return;
    if (done) {
      clearSoloSession(quiz);
    } else {
      saveSoloSession(quiz, { localCurrent, score, streak, userSelections, results });
    }
  }, [isMultiplayer, localCurrent, score, streak, userSelections, results, done, quiz]);

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

    // In solo, stop ticking after reveal (no point counting down). In multiplayer, keep running.
    if (!isMultiplayer && (revealed || done)) {
      return;
    }

    if (done) {
      return;
    }

    const calc = () => Math.max(0, activeTimer.durationSeconds * 1000 - (Date.now() - activeTimer.startedAt));

    setTimeLeftMs(calc());
    const intervalId = window.setInterval(() => setTimeLeftMs(calc()), 200);
    return () => window.clearInterval(intervalId);
  }, [activeTimer, revealed, done, isMultiplayer]);

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
  
  useEffect(() => {
    if (showResults && current < total) {
      setResults(prev => {
        const next = [...prev];
        if (isHostMode) {
          next[current] = "completed";
        } else if (selected === q.correct_index) {
          next[current] = "correct";
        } else {
          next[current] = "wrong";
        }
        return next;
      });
    }
  }, [showResults, isHostMode, selected, current, q, total]);

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
    // Prevent firing more than once per question
    if (timerFiredForRef.current === current) {
      return;
    }
    timerFiredForRef.current = current;

    if (isHostMode) {
      if (autoReveal) revealAndAdvanceHost();
      return;
    }

    setStreak(0);
    setSoloQuestionStartedAt(null);

    if (autoReveal) {
      setRevealed(true);
    }

    if (!isMultiplayer) {
      if (soloAdvanceTimeoutRef.current) {
        window.clearTimeout(soloAdvanceTimeoutRef.current);
      }
      soloAdvanceTimeoutRef.current = window.setTimeout(() => {
        setLocalCurrent((c) => c + 1);
      }, 2200);
    }
  }, [timerExpired, revealed, isHostMode, autoReveal, current]);

  const handleSelect = (idx) => {
    if (revealed || isHostMode || timerExpired) return;
    setSelected(idx);
    setRevealed(true);
    setUserSelections(prev => {
       const next = [...prev];
       next[current] = idx;
       return next;
    });
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
    if (!isMultiplayer) {
      if (soloAdvanceTimeoutRef.current) {
        window.clearTimeout(soloAdvanceTimeoutRef.current);
      }
      soloAdvanceTimeoutRef.current = window.setTimeout(() => {
        setLocalCurrent((c) => c + 1);
      }, 2000);
    }
  };

  const handleHostNext = () => {
    revealAndAdvanceHost();
  };

  if (done) {
    return (
      <div style={styles.page}>
        <ScoreScreen
          score={score}
          total={total}
          onRestart={onRestart}
          onJoinNew={onJoinNew}
          leaderboard={lockedLeaderboard}
          isMultiplayer={isMultiplayer}
          quiz={quiz}
          userSelections={userSelections}
        />
      </div>
    );
  }

  return (
    <div style={styles.page}>
      {/* Top bar (minimalist loading screen) */}
      <header style={styles.header}>
        <div style={styles.headerTop} className="quiz-header-top">
          <span style={styles.logo}>Kuizu</span>
            <div style={{ flex: 1, maxWidth: "1000px", display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto", gap: "16px" }} className="quiz-progress-row">
              <div style={{ width: "100%" }}>
                <ProgressBar results={results} current={current} />
              </div>
              <span style={{ color: C.quizTextSoft, fontWeight: "bold", fontSize: "16px", whiteSpace: "nowrap", fontFamily: "'Syne', sans-serif" }}>
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
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ThemeToggle size={36} />
              <span style={styles.scoreChip}>
                {isHostMode ? (
                  showConfirmEnd ? (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{ color: C.quizText, fontWeight: 500 }}>End Game?</span>
                      <span onClick={onRestart} style={{ cursor: "pointer", color: C.quizNegative, fontWeight: 600 }}>Yes</span>
                      <span onClick={() => setShowConfirmEnd(false)} style={{ cursor: "pointer", color: C.quizAccent, fontWeight: 600 }}>No</span>
                    </div>
                  ) : (
                    <span onClick={() => setShowConfirmEnd(true)} style={{ cursor: "pointer", color: C.quizNegative, fontWeight: 600 }}>
                      End Game
                    </span>
                  )
                ) : (
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    {!isMultiplayer && <span style={{ fontWeight: 600 }}>Score: {score}/{total}</span>}
                    {showConfirmEnd ? (
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: C.quizText, fontWeight: 500 }}>Leave?</span>
                        <span onClick={() => { if (!isMultiplayer) clearSoloSession(quiz); onRestart(); }} style={{ cursor: "pointer", color: C.quizNegative, fontWeight: 600 }}>Yes</span>
                        <span onClick={() => setShowConfirmEnd(false)} style={{ cursor: "pointer", color: C.quizAccent, fontWeight: 600 }}>No</span>
                      </div>
                    ) : (
                      <span onClick={() => setShowConfirmEnd(true)} style={{ cursor: 'pointer', color: C.quizNegative, fontWeight: 600 }}>
                        Leave Game
                      </span>
                    )}
                  </div>
                )}
              </span>
            </div>
          </div>
        </header>

      <div style={{ display: "flex", flex: 1, overflow: "hidden", width: "100%" }} className="quiz-layout">
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
        }} className="quiz-choices-grid">
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
                  extra = { outline: `4px solid ${C.quizText}`, outlineOffset: "2px", transform: "scale(1.03)" };
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
                  extra = { outline: `4px solid ${C.quizText}`, outlineOffset: "2px", transform: "scale(1.03)" };
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
                <span style={{ ...styles.choiceText, position: "relative", zIndex: 2, fontSize: choice.length > 50 ? "clamp(14px, 3.5vw, 24px)" : choice.length > 30 ? "clamp(16px, 4vw, 36px)" : undefined }}>{choice}</span>
                </button>
              );
            })}
          </div>

          {/* Feedback + next */}
          {revealed && !isHostMode && (
            <div style={styles.feedbackRow} key={"fb-" + current}>
              {showResults ? (
                <>
                  {isMultiplayer && (
                    <p style={{ textAlign: "center", color: C.quizTextSoft, margin: "10px 0" }}>
                      Waiting for the host to start the next question...
                    </p>
                  )}
                </>
              ) : (
                <div style={{...styles.feedbackCorrect, background: C.quizCard, color: C.quizAccent, border: `1px solid ${C.quizCardBorder}`}}>
                  Waiting for host to reveal the answer...
                </div>
              )}
            </div>
          )}

          {/* Host "Next Question" Action */}
          {isHostMode && !revealed && (
            <div style={{ textAlign: "center", marginTop: 30 }}>
              <button
                style={{ padding: "16px 32px", fontSize: "20px", background: C.quizAccent, color: C.quizBg, border: "none", borderRadius: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
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
              background: C.quizCard,
              border: `1px solid ${C.quizCardBorder}`,
              borderRadius: "clamp(16px, 1.5vw, 24px)",
              margin: "clamp(16px, 2vw, 32px) clamp(16px, 2vw, 32px) clamp(16px, 2vw, 32px) 0",
              display: "flex",
              flexDirection: "column",
              padding: "clamp(16px, 1.5vw, 24px)",
              boxShadow: `0 12px 48px ${C.shadow}`,
              maxHeight: "calc(100vh - 160px)",
              overflowY: "auto"
           }} className="host-leaderboard">
              <h2 style={{ margin: "0 0 clamp(16px, 1.5vw, 24px) 0", fontSize: "clamp(24px, 2vw, 32px)", color: C.quizText, fontFamily: "'Syne', sans-serif", borderBottom: `1px solid ${C.quizSubCardBorder}`, paddingBottom: "clamp(12px, 1vw, 16px)" }}>
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
                        padding: "clamp(12px, 2vw, 20px)",
                        background: isOnStreak ? "linear-gradient(90deg, rgba(255,159,67,0.18), rgba(255,107,107,0.18))" : C.quizSubCard,
                        borderRadius: "16px",
                        border: isOnStreak ? "1px solid #FF9F43" : `1px solid ${C.quizSubCardBorder}`,
                        position: "relative",
                        animation: isOnStreak ? "firePulse 1.5s infinite alternate" : "none"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "clamp(8px, 1.5vw, 16px)", minWidth: 0 }}>
                          <span style={{
                            fontSize: "clamp(16px, 2.5vw, 24px)",
                            fontWeight: "bold",
                            color: i === 0 ? "#D4AF37" : i === 1 ? "#A8A8A8" : i === 2 ? "#B87333" : C.quizTextSoft,
                            flexShrink: 0,
                          }}>
                            {i + 1}.
                          </span>
                          <span title={name} style={{ fontSize: "clamp(16px, 2.5vw, 24px)", fontWeight: "600", color: C.quizText, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {truncateName(name)}
                          </span>
                          {isOnStreak && <span style={{ fontSize: "clamp(14px, 2vw, 20px)", filter: "drop-shadow(0 0 4px rgba(255,159,67,0.8))", flexShrink: 0 }}>🔥 {playerStreak}</span>}
                        </div>
                        <span style={{ fontSize: "clamp(16px, 2.5vw, 24px)", fontWeight: "bold", color: C.quizAccent, flexShrink: 0 }}>
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
        @media (max-width: 768px) {
          .quiz-choices-grid { grid-template-columns: 1fr !important; }
          .quiz-layout {
            flex-direction: column !important;
            overflow-y: auto !important;
          }
          .host-leaderboard {
            width: calc(100% - 32px) !important;
            margin: 16px !important;
            max-height: none !important;
          }
          .quiz-header-top {
            flex-direction: column !important;
            gap: 12px !important;
            padding: 12px 16px !important;
          }
          .quiz-progress-row { width: 100% !important; }
        }
        `}</style>
      </div>
    );
  }

const buildStyles = (C) => ({
  page: {
    minHeight: "100vh",
    background: C.quizBg,
    color: C.quizText,
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    padding: "clamp(12px, 1.5vw, 24px) 0",
    background: C.quizHeader,
    borderBottom: `1px solid ${C.quizCardBorder}`,
    boxShadow: `0 4px 20px ${C.shadow}`,
  },
  headerTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 clamp(16px, 3vw, 32px)",
    gap: "clamp(12px, 2vw, 32px)",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "24px",
    color: C.quizText,
    letterSpacing: "-0.5px",
  },
  scoreChip: {
    background: C.quizSubCard,
    borderRadius: "20px",
    padding: "6px 14px",
    fontSize: "14px",
    color: C.quizText,
    fontWeight: 500,
  },
  timerChip: {
    background: C.quizAccentSoft,
    border: `1px solid ${C.quizAccent}`,
    borderRadius: "999px",
    padding: "10px 18px",
    color: C.quizAccent,
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
    background: C.quizNegativeBg,
    border: `1px solid ${C.quizNegative}`,
    color: C.quizNegative,
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
    background: C.quizCard,
    border: `1px solid ${C.quizCardBorder}`,
    borderRadius: "clamp(20px, 2vw, 32px)",
    padding: "clamp(24px, 4vh, 100px) clamp(16px, 4vw, 60px)",
    width: "100%",
    marginBottom: "clamp(20px, 4vh, 60px)",
    animation: "slideUp 0.35s ease both",
    boxSizing: "border-box",
    textAlign: "center",
    boxShadow: `0 12px 48px ${C.shadow}`,
  },
  qNumber: {
    display: "inline-block",
    background: C.quizAccentSoft,
    padding: "clamp(6px, 1vh, 8px) clamp(16px, 2vw, 24px)",
    borderRadius: "20px",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "clamp(16px, 1.5vw, 20px)",
    color: C.quizAccent,
    marginBottom: "clamp(16px, 3vh, 32px)",
    letterSpacing: "1px",
    textTransform: "uppercase",
  },
  questionText: {
    fontSize: "clamp(24px, 5vw, 64px)",
    fontWeight: 700,
    lineHeight: 1.3,
    margin: 0,
    color: C.quizText,
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
    gap: "clamp(12px, 2vw, 32px)",
    padding: "clamp(16px, 2vh, 40px) clamp(16px, 2vw, 48px)",
    borderRadius: "clamp(16px, 1.5vw, 24px)",
    border: "none",
    cursor: "pointer",
    textAlign: "left",
    fontSize: "clamp(18px, 4vw, 56px)",
    fontFamily: "'DM Sans', sans-serif",
    fontWeight: 600,
    color: "#FFFFFF",
    transition: "opacity 0.2s, transform 0.15s, outline 0.1s",
    minHeight: "clamp(70px, 12vh, 240px)",
    overflow: "hidden",
  },
  choiceShape: {
    fontSize: "clamp(24px, 4vw, 48px)",
    flexShrink: 0,
    opacity: 0.9,
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
    background: C.quizPositiveBg,
    border: `1px solid ${C.quizPositive}`,
    color: C.quizPositive,
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 500,
    textAlign: "center",
  },
  feedbackWrong: {
    background: C.quizNegativeBg,
    border: `1px solid ${C.quizNegative}`,
    color: C.quizNegative,
    borderRadius: "10px",
    padding: "14px 20px",
    fontSize: "15px",
    fontWeight: 500,
    textAlign: "center",
  },
  nextBtn: {
    background: C.quizAccent,
    color: C.quizBg,
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
    background: C.quizSubCard,
    border: `1px solid ${C.quizSubCardBorder}`,
    borderRadius: "10px",
    padding: "12px 16px",
    color: C.quizText,
  },
});

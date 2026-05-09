import React, { useState, useMemo } from "react";
import { FONTS } from "./theme.js";
import { useTheme } from "./ThemeContext.jsx";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

export default function QuizPreview({ data, user, onPlay, onHost, onEdit, onDelete, onSave, onPostDiscover, onRequireAuth }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => buildStyles(COLORS), [COLORS]);
  const [showAnswers, setShowAnswers] = useState(false);

  if (!data) return null;

  const { quiz, title, category, author, questions_count, difficulty, estimated_time, plays, source, ownerId } = data;
  const questions = quiz?.questions || [];
  const timeControl = quiz?.timeControl;
  const timerSeconds = timeControl?.enabled ? timeControl.secondsPerQuestion : null;
  const loggedIn = Boolean(user);
  const isOwner = loggedIn && user.id === ownerId;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .preview-question-card {
          background: ${COLORS.creamSoft};
          border: 1px solid ${COLORS.border};
          border-bottom: 4px solid ${COLORS.border};
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 5px 0 ${COLORS.borderSoft}, 0 5px 14px rgba(42,51,64,0.05);
          animation: fadeUp 0.3s ease both;
        }
        .preview-choice {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 600;
          border: 1px solid ${COLORS.border};
          border-bottom: 3px solid ${COLORS.border};
          background: ${COLORS.creamWarm};
          color: ${COLORS.inkSoft};
          box-shadow: 0 3px 0 ${COLORS.borderSoft};
        }
        .preview-choice.correct {
          background: ${COLORS.sageSoft};
          border-color: ${COLORS.sageDark};
          border-bottom-color: ${COLORS.sageDark};
          color: ${COLORS.quizPositive};
          box-shadow: 0 3px 0 ${COLORS.sageDark};
        }
        @media (max-width: 600px) {
          .preview-actions { flex-wrap: wrap; }
          .preview-meta { flex-wrap: wrap; gap: 8px; }
        }
        .wiz-arcade { outline: none; }
        .wiz-arcade:hover {
          transform: translateY(-3px) !important;
        }
        .wiz-arcade:active:not(:disabled) {
          transform: translateY(2px) !important;
          border-bottom-width: 2px !important;
          box-shadow: 0 2px 0 rgba(0,0,0,0.15), 0 3px 8px rgba(42,51,64,0.08) !important;
        }
        .wiz-arcade:disabled:hover {
          transform: none !important;
        }
      `}</style>

      {/* Header */}
      <div style={styles.header}>
        <div style={styles.titleRow}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <span style={styles.categoryBadge}>{category || "General"}</span>
              {source === "discover" && difficulty && (
                <span style={styles.diffBadge}>{difficulty}</span>
              )}
            </div>
            <h1 style={styles.title}>{title || "Untitled Quiz"}</h1>
            <div style={styles.metaRow}>
              {author && <span style={styles.metaItem}>{author}</span>}
              <span style={styles.metaItem}>{questions_count || questions.length} questions</span>
              {estimated_time && <span style={styles.metaItem}>{estimated_time}</span>}
              {timerSeconds && <span style={styles.metaItem}>{timerSeconds}s per question</span>}
              {typeof plays === "number" && <span style={styles.metaItem}>{plays} plays</span>}
              {isOwner && <span style={{ ...styles.metaItem, color: COLORS.sageDark, fontWeight: 700 }}>Yours</span>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="preview-actions" style={styles.actions}>
          <button className="wiz-arcade" style={styles.btnPlay} onClick={() => onPlay(quiz)}>
            Play
          </button>
          <button className="wiz-arcade" style={styles.btnHost} onClick={() => onHost(quiz)}>
            Host
          </button>
          {isOwner && (
            <button className="wiz-arcade" style={styles.btnGhost} onClick={() => onEdit(data)}>
              Edit
            </button>
          )}
          {isOwner && (
            <button className="wiz-arcade" style={styles.btnDelete} onClick={() => onDelete(data)}>
              Delete
            </button>
          )}
          {source === "discover" && loggedIn && !isOwner && (
            <button className="wiz-arcade" style={styles.btnGhost} onClick={() => onSave(quiz)}>
              Save
            </button>
          )}
          {source === "mygames" && loggedIn && isOwner && (
            <button className="wiz-arcade" style={styles.btnGhost} onClick={() => onPostDiscover(quiz)}>
              Post
            </button>
          )}
        </div>
      </div>

      {/* Toggle + Question list */}
      <div style={styles.body}>
        <div style={styles.bodyHeader}>
          <h2 style={styles.sectionTitle}>Questions</h2>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: COLORS.inkSoft }}>Show Answers</span>
            <div
              style={{ width: 42, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", display: "flex", alignItems: "center", transition: "background 0.15s", background: showAnswers ? COLORS.sageDark : COLORS.borderSoft }}
              onClick={() => setShowAnswers((v) => !v)}
              role="switch"
              aria-checked={showAnswers}
            >
              <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: COLORS.creamSoft, transition: "transform 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: showAnswers ? "translateX(20px)" : "translateX(2px)" }} />
            </div>
          </label>
        </div>

        <div style={styles.questionList}>
          {questions.map((q, i) => (
            <div key={q._id || uid()} className="preview-question-card" style={i > 0 ? { animationDelay: `${i * 0.04}s` } : {}}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: showAnswers ? 8 : 0 }}>
                <span style={styles.qNum}>Q{i + 1}</span>
                <p style={styles.qText}>{q.question}</p>
              </div>
              {showAnswers && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8, paddingLeft: 40 }}>
                  {q.choices.map((c, j) => (
                    <div key={j} className={`preview-choice ${j === q.correct_index ? "correct" : ""}`}>
                      <span style={{ fontWeight: 700, minWidth: 18, textAlign: "center", fontSize: 12 }}>
                        {j === q.correct_index ? "✓" : String.fromCharCode(65 + j)}
                      </span>
                      <span>{c}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const buildStyles = (COLORS) => ({
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    padding: "40px clamp(16px, 4vw, 40px) 80px",
    maxWidth: 900,
    margin: "0 auto",
  },
  header: {
    animation: "fadeUp 0.3s ease both",
    marginBottom: 32,
  },
  titleRow: {
    marginBottom: 20,
  },
  categoryBadge: {
    display: "inline-block",
    background: COLORS.yellow,
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
    borderBottom: `2px solid ${COLORS.yellowDark}`,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  diffBadge: {
    display: "inline-block",
    background: COLORS.blueSoft,
    color: COLORS.blueDark,
    fontSize: 12,
    fontWeight: 700,
    padding: "4px 12px",
    borderRadius: 999,
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: "clamp(24px, 5vw, 36px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: "10px 0 8px",
    lineHeight: 1.15,
  },
  metaRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 16,
    marginTop: 4,
  },
  metaItem: {
    fontSize: 13,
    color: COLORS.inkSoft,
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    gap: 10,
    flexWrap: "wrap",
  },
  btnPlay: {
    background: COLORS.sageDark,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: "4px solid #375031",
    borderRadius: 999,
    padding: "12px 28px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: "0 5px 0 #375031, 0 8px 18px rgba(55,80,49,0.25)",
  },
  btnHost: {
    background: COLORS.coral,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `4px solid ${COLORS.coralDark}`,
    borderRadius: 999,
    padding: "12px 28px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 ${COLORS.coralDark}, 0 8px 18px rgba(215,121,102,0.25)`,
  },
  btnGhost: {
    background: COLORS.creamSoft,
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "12px 22px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 6px 14px rgba(42,51,64,0.06)`,
  },
  btnDelete: {
    background: COLORS.coralSoft,
    color: COLORS.coralDark,
    border: `1px solid ${COLORS.coral}`,
    borderBottom: `4px solid ${COLORS.coralDark}`,
    borderRadius: 999,
    padding: "12px 22px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 ${COLORS.coralDark}, 0 6px 14px rgba(215,121,102,0.15)`,
  },
  body: {
    animation: "fadeUp 0.4s ease both",
  },
  bodyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  questionList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  qNum: {
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 13,
    color: COLORS.ink,
    background: COLORS.yellow,
    padding: "3px 10px",
    borderRadius: 999,
    borderBottom: `2px solid ${COLORS.yellowDark}`,
    boxShadow: `0 3px 0 ${COLORS.yellowDark}`,
    flexShrink: 0,
    marginTop: 1,
  },
  qText: {
    fontSize: 15,
    fontWeight: 500,
    lineHeight: 1.5,
    color: COLORS.ink,
    margin: 0,
    flex: 1,
  },
});

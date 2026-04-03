import React, { useState, useRef, useCallback, useEffect } from "react";

// ─────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function cloneQuestions(questions) {
  return questions.map((q) => ({ ...q, _id: uid(), choices: [...q.choices] }));
}

function validateCard(q) {
  const errors = {};
  if (!q.question.trim()) errors.question = "Question text cannot be empty.";
  q.choices.forEach((c, i) => {
    if (!c.trim()) errors[`choice_${i}`] = "Cannot be empty.";
  });
  if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 3) {
    errors.correct_index = "Select a correct answer.";
  }
  return errors; // empty = valid
}

function hasErrors(errors) {
  return Object.keys(errors).length > 0;
}

// ─────────────────────────────────────────────
// QuestionCard
// ─────────────────────────────────────────────

function QuestionCard({
  q,
  index,
  total,
  showAnswers,
  isEditing,
  validationErrors,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragOver,
  isDragging,
}) {
  const [draft, setDraft] = useState(null);
  const [localErrors, setLocalErrors] = useState({});
  const questionRef = useRef();

  // When entering edit mode, initialise draft from current q
  useEffect(() => {
    if (isEditing) {
      setDraft({ question: q.question, choices: [...q.choices], correct_index: q.correct_index });
      setLocalErrors({});
      setTimeout(() => questionRef.current?.focus(), 50);
    }
  }, [isEditing]);

  const handleSave = () => {
    const errs = validateCard(draft);
    if (hasErrors(errs)) {
      setLocalErrors(errs);
      return;
    }
    setLocalErrors({});
    onSave(draft);
  };

  const handleCancel = () => {
    setLocalErrors({});
    onCancel();
  };

  const cardErrors = isEditing ? localErrors : (validationErrors || {});
  const hasCardError = hasErrors(cardErrors);

  return (
    <div
      draggable={!isEditing}
      onDragStart={(e) => !isEditing && onDragStart(e, index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDrop={(e) => { e.preventDefault(); onDrop(index); }}
      onDragEnd={onDragEnd}
      style={{
        ...cardStyles.card,
        ...(isEditing ? cardStyles.cardEditing : {}),
        ...(hasCardError && !isEditing ? cardStyles.cardError : {}),
        ...(isDragOver ? cardStyles.cardDragOver : {}),
        opacity: isDragging ? 0.45 : 1,
        cursor: isEditing ? "default" : "grab",
        transform: isDragOver ? "scale(1.01)" : "scale(1)",
      }}
    >
      {/* Drag indicator line on top when drag over */}
      {isDragOver && <div style={cardStyles.dropLine} />}

      {/* Card header row */}
      <div style={cardStyles.headerRow}>
        <span style={cardStyles.qLabel}>Q{index + 1}</span>
        {!isEditing && (
          <div style={cardStyles.actions}>
            <button
              title="Edit"
              style={cardStyles.iconBtn}
              onClick={() => onEdit(index)}
            >✏️</button>
            <button
              title="Delete"
              style={{ ...cardStyles.iconBtn, ...cardStyles.deleteBtn }}
              onClick={() => onDelete(index)}
            >🗑</button>
          </div>
        )}
      </div>

      {/* ── READ-ONLY ── */}
      {!isEditing && (
        <>
          <p style={cardStyles.questionText}>{q.question}</p>
          {showAnswers && (
            <div style={cardStyles.choiceList}>
              {q.choices.map((c, i) => (
                <div
                  key={i}
                  style={{
                    ...cardStyles.choiceRow,
                    ...(i === q.correct_index ? cardStyles.choiceCorrect : cardStyles.choiceNeutral),
                  }}
                >
                  <span style={cardStyles.choiceDot}>
                    {i === q.correct_index ? "✓" : String.fromCharCode(65 + i)}
                  </span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          {/* Global validation errors shown on card */}
          {hasCardError && (
            <div style={cardStyles.errorBanner}>
              {Object.values(cardErrors).map((msg, i) => (
                <div key={i}>⚠ {msg}</div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── EDIT MODE ── */}
      {isEditing && draft && (
        <div style={cardStyles.editBody}>
          {/* Question textarea */}
          <label style={cardStyles.fieldLabel}>Question</label>
          <textarea
            ref={questionRef}
            style={{
              ...cardStyles.textarea,
              ...(localErrors.question ? cardStyles.inputError : {}),
            }}
            value={draft.question}
            onChange={(e) => setDraft({ ...draft, question: e.target.value })}
            rows={3}
            placeholder="Enter question text…"
          />
          {localErrors.question && <div style={cardStyles.fieldError}>{localErrors.question}</div>}

          {/* Choices */}
          <label style={{ ...cardStyles.fieldLabel, marginTop: "16px" }}>
            Answer Choices &nbsp;
            <span style={cardStyles.fieldHint}>(select the correct one)</span>
          </label>
          {draft.choices.map((choice, i) => (
            <div key={i} style={cardStyles.choiceEditRow}>
              <input
                type="radio"
                name={`correct-${q._id}`}
                checked={draft.correct_index === i}
                onChange={() => setDraft({ ...draft, correct_index: i })}
                style={cardStyles.radio}
                title="Mark as correct"
              />
              <input
                type="text"
                value={choice}
                onChange={(e) => {
                  const updated = [...draft.choices];
                  updated[i] = e.target.value;
                  setDraft({ ...draft, choices: updated });
                }}
                style={{
                  ...cardStyles.choiceInput,
                  ...(localErrors[`choice_${i}`] ? cardStyles.inputError : {}),
                  ...(draft.correct_index === i ? cardStyles.choiceInputCorrect : {}),
                }}
                placeholder={`Choice ${String.fromCharCode(65 + i)}`}
              />
              {localErrors[`choice_${i}`] && (
                <span style={cardStyles.inlineError}>{localErrors[`choice_${i}`]}</span>
              )}
            </div>
          ))}

          {/* Save / Cancel */}
          <div style={cardStyles.editFooter}>
            <button style={cardStyles.cancelLink} onClick={handleCancel}>Cancel</button>
            <button style={cardStyles.saveBtn} onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

const cardStyles = {
  card: {
    position: "relative",
    background: "#12121c",
    border: "1px solid #1e1e2e",
    borderRadius: "16px",
    padding: "22px 24px",
    marginBottom: "12px",
    transition: "border-color 0.2s, opacity 0.15s, transform 0.15s, box-shadow 0.2s",
    userSelect: "none",
  },
  cardEditing: {
    borderLeft: "3px solid #7c6fff",
    borderColor: "#7c6fff",
    boxShadow: "0 0 0 1px #7c6fff33",
    cursor: "default",
  },
  cardError: {
    borderColor: "#c0392b",
    boxShadow: "0 0 0 1px #c0392b44",
  },
  cardDragOver: {
    borderColor: "#7c6fff",
    background: "#16162a",
  },
  dropLine: {
    position: "absolute",
    top: "-7px",
    left: "0",
    right: "0",
    height: "3px",
    background: "#7c6fff",
    borderRadius: "2px",
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
  },
  qLabel: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "12px",
    color: "#7c6fff",
    letterSpacing: "0.5px",
  },
  actions: {
    display: "flex",
    gap: "6px",
  },
  iconBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: "16px",
    padding: "4px 6px",
    borderRadius: "6px",
    opacity: 0.9,
    transition: "opacity 0.15s, background 0.15s",
  },
  deleteBtn: {
    opacity: 1,
    color: "#ff4d4f",
  },
  questionText: {
    fontSize: "17px",
    fontWeight: 500,
    lineHeight: 1.45,
    color: "#f0ede8",
    marginBottom: "14px",
    userSelect: "text",
  },
  choiceList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  choiceRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 14px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 400,
  },
  choiceCorrect: {
    background: "#0e2e18",
    border: "1px solid #26890c",
    color: "#5dd87a",
  },
  choiceNeutral: {
    background: "#18181f",
    border: "1px solid #1e1e2e",
    color: "#9090a8",
  },
  choiceDot: {
    fontWeight: 700,
    fontSize: "13px",
    minWidth: "16px",
    textAlign: "center",
  },
  errorBanner: {
    marginTop: "12px",
    background: "#1e0f0f",
    border: "1px solid #5a2020",
    color: "#ff7070",
    borderRadius: "8px",
    padding: "10px 14px",
    fontSize: "13px",
    lineHeight: 1.6,
  },
  // Edit mode
  editBody: {
    display: "flex",
    flexDirection: "column",
    userSelect: "text",
  },
  fieldLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#6b6b7e",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    marginBottom: "8px",
  },
  fieldHint: {
    textTransform: "none",
    fontWeight: 400,
    color: "#4a4a5e",
    letterSpacing: 0,
  },
  textarea: {
    width: "100%",
    background: "#0a0a0f",
    border: "1px solid #2e2e42",
    borderRadius: "10px",
    color: "#f0ede8",
    fontSize: "16px",
    lineHeight: 1.5,
    padding: "12px 14px",
    resize: "vertical",
    outline: "none",
    transition: "border-color 0.2s",
  },
  choiceEditRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "8px",
  },
  radio: {
    accentColor: "#7c6fff",
    width: "16px",
    height: "16px",
    flexShrink: 0,
    cursor: "pointer",
  },
  choiceInput: {
    flex: 1,
    background: "#0a0a0f",
    border: "1px solid #2e2e42",
    borderRadius: "8px",
    color: "#f0ede8",
    fontSize: "14px",
    padding: "9px 12px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  choiceInputCorrect: {
    borderColor: "#26890c",
    background: "#0a1a0e",
  },
  inputError: {
    borderColor: "#c0392b",
  },
  fieldError: {
    fontSize: "12px",
    color: "#ff7070",
    marginTop: "4px",
    marginBottom: "4px",
  },
  inlineError: {
    fontSize: "12px",
    color: "#ff7070",
    whiteSpace: "nowrap",
  },
  editFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: "16px",
    marginTop: "20px",
    paddingTop: "16px",
    borderTop: "1px solid #1e1e2e",
  },
  cancelLink: {
    background: "none",
    border: "none",
    color: "#6b6b7e",
    fontSize: "14px",
    cursor: "pointer",
    padding: "8px 4px",
    textDecoration: "underline",
  },
  saveBtn: {
    background: "#7c6fff",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 28px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
  },
};

// ─────────────────────────────────────────────
// Preview (main component)
// ─────────────────────────────────────────────

export default function Preview({ quiz, onStart, onBack, intent = "solo" }) {
  const [questions, setQuestions]       = useState(() => cloneQuestions(quiz.questions));
  const [showAnswers, setShowAnswers]   = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [globalErrors, setGlobalErrors] = useState({}); // { _id: { field: msg } }
  const [errorBanner, setErrorBanner]   = useState("");

  // Drag state
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // ── Auto-save helper ──
  // Returns true if save succeeded, false if it had errors (and keeps card open)
  const trySaveCurrentCard = useCallback((currentDraft) => {
    if (editingIndex === null) return true;
    const q = questions[editingIndex];
    // If it's a brand-new blank card with no content at all, just remove it
    if (!q.question && q.choices.every((c) => !c)) {
      setQuestions((prev) => prev.filter((_, i) => i !== editingIndex));
      setEditingIndex(null);
      return true;
    }
    // Otherwise validate
    const errs = validateCard(currentDraft || q);
    if (hasErrors(errs)) return false; // caller decides what to do
    // Apply draft
    if (currentDraft) {
      setQuestions((prev) => prev.map((item, i) =>
        i === editingIndex ? { ...item, ...currentDraft } : item
      ));
    }
    setEditingIndex(null);
    return true;
  }, [editingIndex, questions]);

  // ── Edit ──
  const handleEdit = (index) => {
    if (editingIndex === index) return;
    if (editingIndex !== null) {
      // auto-save current card; if fails, block opening new card
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) return; // keep broken card focused
      setEditingIndex(null);
    }
    setEditingIndex(index);
    setGlobalErrors({});
    setErrorBanner("");
  };

  // ── Save ──
  const handleSave = (index, draft) => {
    setQuestions((prev) => prev.map((item, i) =>
      i === index ? { ...item, ...draft } : item
    ));
    setEditingIndex(null);
  };

  // ── Cancel ──
  const handleCancel = (index) => {
    const q = questions[index];
    // New blank card (question text empty, all choices empty) → remove
    if (!q.question.trim() && q.choices.every((c) => !c.trim())) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
    }
    setEditingIndex(null);
  };

  // ── Delete ──
  const handleDelete = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
  };

  // ── Add question ──
  const handleAdd = () => {
    // auto-save current if needed
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) return;
      setEditingIndex(null);
    }
    const blank = {
      _id: uid(),
      question: "",
      choices: ["", "", "", ""],
      correct_index: 0,
    };
    setQuestions((prev) => [...prev, blank]);
    setEditingIndex(questions.length); // index of new card
    setGlobalErrors({});
    setErrorBanner("");
  };

  // ── Drag & Drop ──
  const handleDragStart = (e, index) => {
    dragIndex.current = index;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (index) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    setDragOverIndex(index);
  };
  const handleDrop = (index) => {
    if (dragIndex.current === null || dragIndex.current === index) return;
    const reordered = [...questions];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(index, 0, moved);
    setQuestions(reordered);
    // Fix editingIndex after reorder
    if (editingIndex !== null) {
      if (editingIndex === dragIndex.current) setEditingIndex(index);
      else if (editingIndex > dragIndex.current && editingIndex <= index) setEditingIndex(editingIndex - 1);
      else if (editingIndex < dragIndex.current && editingIndex >= index) setEditingIndex(editingIndex + 1);
    }
    dragIndex.current = null;
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIndex(null);
  };

  // ── Start Quiz validation ──
  const handleStart = () => {
    // Close any open card first (auto-save)
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) {
        setErrorBanner("Save or fix the open question before starting.");
        return;
      }
      setEditingIndex(null);
    }

    if (questions.length === 0) {
      setErrorBanner("Add at least one question before starting.");
      return;
    }

    const newErrors = {};
    let firstErrorIndex = null;
    questions.forEach((q, i) => {
      const errs = validateCard(q);
      if (hasErrors(errs)) {
        newErrors[q._id] = errs;
        if (firstErrorIndex === null) firstErrorIndex = i;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setGlobalErrors(newErrors);
      setErrorBanner(`Fix ${Object.keys(newErrors).length} question${Object.keys(newErrors).length > 1 ? "s" : ""} before starting.`);
      // Scroll to first broken card
      setTimeout(() => {
        const cards = document.querySelectorAll("[data-card-index]");
        if (cards[firstErrorIndex]) {
          cards[firstErrorIndex].scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return;
    }

    // Strip internal _id before passing to quiz
    const clean = questions.map(({ _id, ...rest }) => rest);
    onStart({ questions: clean });
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <span style={styles.logo}>Kuizu</span>
        <span style={styles.title}>Review Questions</span>
        <button style={styles.startBtn} onClick={handleStart}>
          {intent === "host" ? "Create Lobby \u2192" : "Start Quiz \u2192"}
        </button>
      </header>

      {/* Error banner */}
      {errorBanner && (
        <div style={styles.errorBanner}>
          &#9888; {errorBanner}
        </div>
      )}

      <main style={styles.main}>
        {/* Controls row */}
        <div style={styles.controlsRow}>
          <span style={styles.countLabel}>
            {questions.length} question{questions.length !== 1 ? "s" : ""}
          </span>
          <label style={styles.toggleLabel}>
            <span style={styles.toggleText}>Show answers</span>
            <div
              style={{
                ...styles.toggle,
                ...(showAnswers ? styles.toggleOn : styles.toggleOff),
              }}
              onClick={() => setShowAnswers((v) => !v)}
              role="switch"
              aria-checked={showAnswers}
              tabIndex={0}
              onKeyDown={(e) => e.key === " " && setShowAnswers((v) => !v)}
            >
              <div style={{
                ...styles.toggleKnob,
                transform: showAnswers ? "translateX(20px)" : "translateX(2px)",
              }} />
            </div>
          </label>
        </div>

        {/* Card list */}
        <div style={styles.cardList}>
          {questions.map((q, i) => (
            <div key={q._id} data-card-index={i}>
              <QuestionCard
                q={q}
                index={i}
                total={questions.length}
                showAnswers={showAnswers}
                isEditing={editingIndex === i}
                validationErrors={globalErrors[q._id]}
                onEdit={handleEdit}
                onSave={(draft) => handleSave(i, draft)}
                onCancel={() => handleCancel(i)}
                onDelete={handleDelete}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                isDragOver={dragOverIndex === i}
                isDragging={dragIndex.current === i}
              />
            </div>
          ))}
        </div>

        {/* Add question */}
        <button style={styles.addBtn} onClick={handleAdd}>
          + Add Question
        </button>

        {/* Back link */}
        <button style={styles.backLink} onClick={onBack}>
          &larr; Upload a different file
        </button>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        textarea:focus, input[type="text"]:focus {
          border-color: #7c6fff !important;
          box-shadow: 0 0 0 2px #7c6fff22;
        }
        button[data-iconbtn]:hover { opacity: 1 !important; background: #1e1e2e; }
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
    borderBottom: "1px solid #1e1e2e",
    gap: "16px",
    position: "sticky",
    top: 0,
    background: "#0a0a0f",
    zIndex: 10,
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "20px",
    color: "#f0ede8",
    letterSpacing: "-0.5px",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    color: "#f0ede8",
    letterSpacing: "-0.3px",
  },
  startBtn: {
    background: "#7c6fff",
    color: "#fff",
    border: "none",
    borderRadius: "10px",
    padding: "10px 22px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  errorBanner: {
    background: "#1e0f0f",
    border: "1px solid #5a2020",
    borderLeft: "4px solid #c0392b",
    color: "#ff7070",
    padding: "12px 32px",
    fontSize: "14px",
    fontWeight: 500,
  },
  main: {
    flex: 1,
    maxWidth: "720px",
    width: "100%",
    margin: "0 auto",
    padding: "32px 20px 60px",
    animation: "fadeUp 0.4s ease both",
  },
  controlsRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "20px",
  },
  countLabel: {
    fontSize: "13px",
    color: "#6b6b7e",
    fontWeight: 500,
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    userSelect: "none",
  },
  toggleText: {
    fontSize: "13px",
    color: "#8e8ea0",
  },
  toggle: {
    width: "42px",
    height: "24px",
    borderRadius: "12px",
    cursor: "pointer",
    position: "relative",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
  },
  toggleOn:  { background: "#7c6fff" },
  toggleOff: { background: "#2e2e42" },
  toggleKnob: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#fff",
    transition: "transform 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
  },
  addBtn: {
    width: "100%",
    background: "transparent",
    border: "2px dashed #2e2e42",
    borderRadius: "14px",
    color: "#6b6b7e",
    fontSize: "14px",
    fontWeight: 500,
    padding: "16px",
    cursor: "pointer",
    marginTop: "4px",
    marginBottom: "24px",
    transition: "border-color 0.2s, color 0.2s",
    fontFamily: "'DM Sans', sans-serif",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#4a4a5e",
    fontSize: "13px",
    cursor: "pointer",
    display: "block",
    margin: "0 auto",
    textDecoration: "underline",
    padding: "4px",
  },
};

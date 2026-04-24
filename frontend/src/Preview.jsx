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
    background: "#16213E",
    border: "1px solid #2B5A8A",
    borderRadius: "16px",
    padding: "22px 24px",
    marginBottom: "12px",
    transition: "border-color 0.2s, opacity 0.15s, transform 0.15s, box-shadow 0.2s",
    userSelect: "none",
  },
  cardEditing: {
    borderLeft: "3px solid #00D2D3",
    borderColor: "#00D2D3",
    boxShadow: "0 0 0 1px #00D2D333",
    cursor: "default",
  },
  cardError: {
    borderColor: "#c0392b",
    boxShadow: "0 0 0 1px #c0392b44",
  },
  cardDragOver: {
    borderColor: "#00D2D3",
    background: "#1A1A2E",
  },
  dropLine: {
    position: "absolute",
    top: "-7px",
    left: "0",
    right: "0",
    height: "3px",
    background: "#00D2D3",
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
    color: "#00D2D3",
    background: "rgba(0, 210, 211, 0.15)",
    padding: "4px 10px",
    borderRadius: "12px",
    letterSpacing: "0.5px",
  },
  actions: {
    display: "flex",
    gap: "6px",
  },
  iconBtn: {
    background: "rgba(15, 52, 96, 0.55)",
    border: "1px solid #2B5A8A",
    color: "#E2E8F0",
    cursor: "pointer",
    fontSize: "14px",
    padding: "6px 10px",
    borderRadius: "8px",
    opacity: 0.9,
    transition: "opacity 0.15s, background 0.15s",
  },
  deleteBtn: {
    background: "rgba(255, 107, 107, 0.1)",
    border: "1px solid rgba(255, 107, 107, 0.3)",
    opacity: 1,
    color: "#FF6B6B",
  },
  questionText: {
    fontSize: "17px",
    fontWeight: 500,
    lineHeight: 1.45,
    color: "#F1F2F6",
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
    background: "#1A2235",
    border: "1px solid #2B5A8A",
    color: "#B0BAC3",
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
    color: "#B0BAC3",
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
    background: "#1A1A2E",
    border: "1px solid #0F3460",
    borderRadius: "10px",
    color: "#F1F2F6",
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
    accentColor: "#00D2D3",
    width: "16px",
    height: "16px",
    flexShrink: 0,
    cursor: "pointer",
  },
  choiceInput: {
    flex: 1,
    background: "#1A1A2E",
    border: "1px solid #0F3460",
    borderRadius: "8px",
    color: "#F1F2F6",
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
    color: "#B0BAC3",
    fontSize: "14px",
    cursor: "pointer",
    padding: "8px 4px",
    textDecoration: "underline",
  },
  saveBtn: {
    background: "#00D2D3",
    color: "#16213E",
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
// Timer settings helpers (mirrors Upload.jsx)
// ─────────────────────────────────────────────

const TIMER_PRESETS = [
  { id: "quick",    label: "Quick",    seconds: 10 },
  { id: "standard", label: "Standard", seconds: 20 },
  { id: "thinker",  label: "Thinker",  seconds: 30 },
  { id: "extended", label: "Extended", seconds: 45 },
];

function normalizeTimeControl(value) {
  const seconds = Number(value?.secondsPerQuestion);
  const matchingPreset = TIMER_PRESETS.find((p) => p.seconds === seconds);
  return {
    enabled: Boolean(value?.enabled && Number.isFinite(seconds) && seconds >= 5 && seconds <= 120),
    preset: matchingPreset ? matchingPreset.id : "standard",
    secondsPerQuestion: Number.isFinite(seconds) ? Math.max(5, Math.min(120, Math.round(seconds))) : 20,
  };
}

function buildTimeControlPayload(value) {
  if (!value?.enabled) return { enabled: false };
  return {
    enabled: true,
    mode: "per_question",
    secondsPerQuestion: Math.max(5, Math.min(120, Math.round(Number(value.secondsPerQuestion) || 20))),
  };
}

function formatTimerSummary(value) {
  if (!value?.enabled) return "Off";
  return `${Math.round(value.secondsPerQuestion)}s / question`;
}

// ─────────────────────────────────────────────
// SettingsPanel (right sidebar)
// ─────────────────────────────────────────────

function SettingsPanel({ timeControl, onTimeControlChange, onSaveGame, saveLoading, saveMessage, onPostDiscover, discoverLoading, discoverMessage, loggedIn, onRequireAuth }) {
  return (
    <aside style={settingsStyles.panel} className="preview-sidebar">
      <p style={settingsStyles.heading}>Settings</p>

      {/* Save Game */}
      <div style={settingsStyles.row}>
        <div style={settingsStyles.rowTop}>
          <span style={settingsStyles.rowLabel}>Save Game</span>
        </div>
        {loggedIn ? (
          <>
            <button
              type="button"
              style={settingsStyles.actionBtn}
              disabled={saveLoading}
              onClick={onSaveGame}
            >
              {saveLoading ? "Saving…" : "Save to My Games"}
            </button>
            {saveMessage && (
              <p style={{ ...settingsStyles.feedback, color: saveMessage.startsWith("Could") ? "#ff7070" : "#00D2D3" }}>
                {saveMessage}
              </p>
            )}
          </>
        ) : (
          <button type="button" style={settingsStyles.signInBtn} onClick={onRequireAuth}>
            Sign in to save
          </button>
        )}
      </div>

      {/* Post to Discover */}
      <div style={settingsStyles.row}>
        <div style={settingsStyles.rowTop}>
          <span style={settingsStyles.rowLabel}>Post to Discover</span>
        </div>
        <p style={settingsStyles.rowHint}>Share this quiz publicly with the community.</p>
        {loggedIn ? (
          <>
            <button
              type="button"
              style={{ ...settingsStyles.actionBtn, ...settingsStyles.discoverBtn }}
              disabled={discoverLoading}
              onClick={onPostDiscover}
            >
              {discoverLoading ? "Posting…" : "Publish"}
            </button>
            {discoverMessage && (
              <p style={{ ...settingsStyles.feedback, color: discoverMessage.startsWith("Could") ? "#ff7070" : "#00D2D3" }}>
                {discoverMessage}
              </p>
            )}
          </>
        ) : (
          <button type="button" style={settingsStyles.signInBtn} onClick={onRequireAuth}>
            Sign in to publish
          </button>
        )}
      </div>

      {/* Timer row */}
      <div style={settingsStyles.row}>
        <div style={settingsStyles.rowTop}>
          <span style={settingsStyles.rowLabel}>Timer</span>
          <span style={settingsStyles.rowValue}>{formatTimerSummary(timeControl)}</span>
        </div>

        {loggedIn ? (
          <>
            <div style={settingsStyles.modeRow}>
              <button
                type="button"
                style={{ ...settingsStyles.modeBtn, ...(!timeControl.enabled ? settingsStyles.modeBtnActive : {}) }}
                onClick={() => onTimeControlChange((prev) => ({ ...prev, enabled: false }))}
              >
                Off
              </button>
              <button
                type="button"
                style={{ ...settingsStyles.modeBtn, ...(timeControl.enabled ? settingsStyles.modeBtnActive : {}) }}
                onClick={() =>
                  onTimeControlChange((prev) => ({
                    ...prev,
                    enabled: true,
                    preset: prev.preset || "standard",
                    secondsPerQuestion: prev.secondsPerQuestion || 20,
                  }))
                }
              >
                On
              </button>
            </div>

            {timeControl.enabled && (
              <>
                <div style={settingsStyles.presetGrid}>
                  {TIMER_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      style={{
                        ...settingsStyles.presetBtn,
                        ...(timeControl.preset === preset.id ? settingsStyles.presetBtnActive : {}),
                      }}
                      onClick={() =>
                        onTimeControlChange({ enabled: true, preset: preset.id, secondsPerQuestion: preset.seconds })
                      }
                    >
                      <span style={settingsStyles.presetName}>{preset.label}</span>
                      <span style={settingsStyles.presetSec}>{preset.seconds}s</span>
                    </button>
                  ))}
                </div>

                <div style={settingsStyles.customRow}>
                  <button
                    type="button"
                    style={{
                      ...settingsStyles.customBtn,
                      ...(timeControl.preset === "custom" ? settingsStyles.customBtnActive : {}),
                    }}
                    onClick={() => onTimeControlChange((prev) => ({ ...prev, enabled: true, preset: "custom" }))}
                  >
                    Custom
                  </button>
                  <input
                    type="number"
                    min={5}
                    max={120}
                    value={timeControl.secondsPerQuestion}
                    disabled={timeControl.preset !== "custom"}
                    onChange={(e) =>
                      onTimeControlChange({
                        enabled: true,
                        preset: "custom",
                        secondsPerQuestion: Math.max(5, Math.min(120, Number(e.target.value) || 5)),
                      })
                    }
                    style={{
                      ...settingsStyles.customInput,
                      ...(timeControl.preset !== "custom" ? settingsStyles.customInputDisabled : {}),
                    }}
                  />
                  <span style={settingsStyles.customSuffix}>s</span>
                </div>
              </>
            )}
          </>
        ) : (
          <button type="button" style={settingsStyles.signInBtn} onClick={onRequireAuth}>
            Sign in to use timer
          </button>
        )}
      </div>
    </aside>
  );
}

const settingsStyles = {
  panel: {
    width: "100%",
    maxWidth: "400px",
    flexShrink: 0,
    paddingTop: "32px",
    paddingLeft: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    position: "sticky",
    top: "61px",
    alignSelf: "flex-start",
  },
  heading: {
    margin: 0,
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "11px",
    color: "#00D2D3",
    textTransform: "uppercase",
    letterSpacing: "0.8px",
  },
  row: {
    background: "#16213E",
    border: "1px solid #2B5A8A",
    borderLeft: "4px solid #00D2D3",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  rowTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    fontSize: "12px",
    fontWeight: 600,
    color: "#B0BAC3",
  },
  rowValue: {
    fontSize: "11px",
    color: "#00D2D3",
    fontWeight: 600,
  },
  modeRow: {
    display: "flex",
    gap: "6px",
  },
  modeBtn: {
    flex: 1,
    padding: "6px 0",
    borderRadius: "7px",
    border: "1px solid #0F3460",
    background: "#1A1A2E",
    color: "#B0BAC3",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  modeBtnActive: {
    background: "#00D2D3",
    color: "#16213E",
    borderColor: "#00D2D3",
  },
  presetGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "5px",
  },
  presetBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "8px 4px",
    borderRadius: "8px",
    border: "1px solid #0F3460",
    background: "#1A1A2E",
    color: "#B0BAC3",
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
    gap: "1px",
  },
  presetBtnActive: {
    background: "rgba(0,210,211,0.1)",
    borderColor: "#00D2D3",
    color: "#00D2D3",
  },
  presetName: {
    fontSize: "11px",
    fontWeight: 600,
  },
  presetSec: {
    fontSize: "10px",
    opacity: 0.65,
  },
  customRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  customBtn: {
    flex: "0 0 auto",
    padding: "6px 8px",
    borderRadius: "7px",
    border: "1px solid #0F3460",
    background: "#1A1A2E",
    color: "#B0BAC3",
    fontSize: "11px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  customBtnActive: {
    background: "rgba(0,210,211,0.1)",
    borderColor: "#00D2D3",
    color: "#00D2D3",
  },
  customInput: {
    width: "60px",
    background: "#1A1A2E",
    border: "1px solid #0F3460",
    borderRadius: "7px",
    color: "#F1F2F6",
    fontSize: "12px",
    padding: "6px 6px",
    outline: "none",
    fontFamily: "'DM Sans', sans-serif",
    minWidth: 0,
  },
  customInputDisabled: {
    opacity: 0.35,
    cursor: "not-allowed",
  },
  customSuffix: {
    fontSize: "11px",
    color: "#B0BAC3",
  },
  actionBtn: {
    width: "100%",
    padding: "8px 0",
    borderRadius: "8px",
    border: "1px solid #0F3460",
    background: "#1A1A2E",
    color: "#B0BAC3",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
    fontFamily: "'DM Sans', sans-serif",
  },
  discoverBtn: {
    borderColor: "rgba(0,210,211,0.3)",
    color: "#00D2D3",
    background: "rgba(0,210,211,0.06)",
  },
  rowHint: {
    margin: 0,
    fontSize: "11px",
    color: "#6a6a8a",
    lineHeight: 1.4,
  },
  feedback: {
    margin: 0,
    fontSize: "11px",
    fontWeight: 600,
  },
  signInBtn: {
    width: "100%",
    padding: "8px 0",
    borderRadius: "8px",
    border: "1px dashed #2a2a4a",
    background: "transparent",
    color: "#6a6a9a",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    transition: "all 0.15s",
  },
};

// ─────────────────────────────────────────────
// Preview (main component)
// ─────────────────────────────────────────────

export default function Preview({ quiz, onStart, onBack, intent = "solo", onSaveGame, onPostDiscover, user, onRequireAuth }) {
  const [questions, setQuestions]         = useState(() => cloneQuestions(quiz.questions));
  const [showAnswers, setShowAnswers]     = useState(false);
  const [editingIndex, setEditingIndex]   = useState(null);
  const [globalErrors, setGlobalErrors]   = useState({});
  const [errorBanner, setErrorBanner]     = useState("");
  const [saveLoading, setSaveLoading]     = useState(false);
  const [saveMessage, setSaveMessage]     = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState("");
  const [timeControl, setTimeControl]     = useState(() => normalizeTimeControl(quiz?.timeControl));
  const discoverMeta = quiz?.discoverMeta || null;

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

    // Strip internal _id before passing to quiz, preserve all other quiz fields (e.g. timeControl)
    const clean = questions.map(({ _id, ...rest }) => rest);
    onStart({ ...quiz, questions: clean, timeControl: buildTimeControlPayload(timeControl) });
  };

  const handleSaveGame = async () => {
    if (!onSaveGame) {
      return;
    }

    if (questions.length === 0) {
      setErrorBanner("Add at least one question before saving.");
      return;
    }

    const newErrors = {};
    questions.forEach((q) => {
      const errs = validateCard(q);
      if (hasErrors(errs)) {
        newErrors[q._id] = errs;
      }
    });
    if (Object.keys(newErrors).length > 0) {
      setGlobalErrors(newErrors);
      setErrorBanner("Fix question issues before saving.");
      return;
    }

    const clean = questions.map(({ _id, ...rest }) => rest);
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const title = discoverMeta?.title || fallbackTitle;
    const category = discoverMeta?.category || "General";

    setSaveLoading(true);
    setSaveMessage("");
    try {
      await onSaveGame({
        title,
        category,
        quiz: { ...quiz, questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: discoverMeta || undefined },
      });
      setSaveMessage("Saved to My Games.");
    } catch (err) {
      setSaveMessage(err?.message || "Could not save game.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePostToDiscover = async () => {
    if (!onPostDiscover) return;

    if (questions.length === 0) {
      setErrorBanner("Add at least one question before posting.");
      return;
    }

    const newErrors = {};
    questions.forEach((q) => {
      const errs = validateCard(q);
      if (hasErrors(errs)) newErrors[q._id] = errs;
    });
    if (Object.keys(newErrors).length > 0) {
      setGlobalErrors(newErrors);
      setErrorBanner("Fix question issues before posting.");
      return;
    }

    const clean = questions.map(({ _id, ...rest }) => rest);
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const title = discoverMeta?.title || fallbackTitle;
    const category = discoverMeta?.category || "General";

    setDiscoverLoading(true);
    setDiscoverMessage("");
    try {
      await onPostDiscover({
        title,
        category,
        quiz: { ...quiz, questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: discoverMeta || undefined },
      });
      setDiscoverMessage("Posted to Discover!");
    } catch (err) {
      setDiscoverMessage(err?.message || "Could not post to Discover.");
    } finally {
      setDiscoverLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header} className="preview-header">
        <span style={styles.logo}>Kuizu</span>
        <span style={styles.title}>Review Questions</span>
        <div style={styles.headerActions}>
          <button style={styles.startBtn} onClick={handleStart}>
            {intent === "host" ? "Create Lobby \u2192" : "Start Quiz \u2192"}
          </button>
        </div>
      </header>

      {/* Error banner */}
      {errorBanner && (
        <div style={styles.errorBanner}>
          &#9888; {errorBanner}
        </div>
      )}

      <div style={styles.body} className="preview-body">
      <main style={styles.main} className="preview-main">
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

        {discoverMeta && (
          <section style={styles.discoverSummary}>
            <div style={styles.discoverHeaderRow}>
              <div style={styles.authorWrap}>
                <div style={styles.authorIcon} aria-hidden="true">
                  {discoverMeta.author?.slice(0, 1)?.toUpperCase() || "?"}
                </div>
                <div>
                  <p style={styles.authorName}>{discoverMeta.author}</p>
                  <p style={styles.authorMeta}>Community creator</p>
                </div>
              </div>
              <span style={styles.communityBadge}>Community Quiz</span>
            </div>

            <h2 style={styles.discoverTitle}>{discoverMeta.title}</h2>

            <div style={styles.discoverStatsGrid}>
              <p style={styles.discoverStat}>Category: <span style={styles.discoverStatValue}>{discoverMeta.category}</span></p>
              <p style={styles.discoverStat}>Difficulty: <span style={styles.discoverStatValue}>{discoverMeta.difficulty}</span></p>
              <p style={styles.discoverStat}>Est. Time: <span style={styles.discoverStatValue}>{discoverMeta.estimatedTime}</span></p>
              <p style={styles.discoverStat}>Plays: <span style={styles.discoverStatValue}>{discoverMeta.plays}</span></p>
              <p style={styles.discoverStat}>Rating: <span style={styles.discoverStatValue}>{Number(discoverMeta.rating || 0).toFixed(1)} / 5</span></p>
            </div>
          </section>
        )}

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

      <SettingsPanel
        timeControl={timeControl}
        onTimeControlChange={setTimeControl}
        onSaveGame={handleSaveGame}
        saveLoading={saveLoading}
        saveMessage={saveMessage}
        onPostDiscover={handlePostToDiscover}
        discoverLoading={discoverLoading}
        discoverMessage={discoverMessage}
        loggedIn={Boolean(user)}
        onRequireAuth={onRequireAuth}
      />
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        textarea:focus, input[type="text"]:focus {
          border-color: #00D2D3 !important;
          box-shadow: 0 0 0 2px #00D2D322;
        }
        button[data-iconbtn]:hover { opacity: 1 !important; background: #1e1e2e; }
        @media (max-width: 1024px) {
          .preview-body {
            flex-direction: column-reverse !important;
            align-items: center !important;
            padding: 0 16px !important;
          }
          .preview-main {
            width: 100% !important;
            padding-top: 20px !important;
          }
          .preview-sidebar {
            position: relative !important;
            top: 0 !important;
            max-width: 100% !important;
            padding-left: 0 !important;
            padding-top: 20px !important;
          }
        }
        @media (max-width: 600px) {
          .preview-header {
            padding: 14px 16px !important;
          }
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
  body: {
    display: "flex",
    flex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "0 20px",
  },
  header: {
    display: "flex",
    alignItems: "center",
    padding: "18px 32px",
    borderBottom: "1px solid #1e1e2e",
    gap: "16px",
    position: "sticky",
    top: 0,
    background: "#1A1A2E",
    zIndex: 10,
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "20px",
    color: "#F1F2F6",
    letterSpacing: "-0.5px",
  },
  title: {
    flex: 1,
    textAlign: "center",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 700,
    fontSize: "18px",
    color: "#F1F2F6",
    letterSpacing: "-0.3px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  headerActions: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  saveBtn: {
    background: "rgba(20, 45, 78, 0.95)",
    color: "#d8e7fb",
    border: "1px solid #3f6c9b",
    borderRadius: "10px",
    padding: "10px 16px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
  },
  startBtn: {
    background: "#00D2D3",
    color: "#16213E",
    border: "none",
    borderRadius: "10px",
    padding: "10px 22px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: "nowrap",
    boxShadow: "0 4px 14px rgba(0, 210, 211, 0.35)",
  },
  saveBanner: {
    background: "#10243d",
    border: "1px solid #35618f",
    color: "#8fe0ff",
    padding: "10px 32px",
    fontSize: "13px",
    fontWeight: 600,
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
    width: "100%",
    maxWidth: "720px",
    flexShrink: 0,
    padding: "32px 0 60px",
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
    color: "#B0BAC3",
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
    color: "#B0BAC3",
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
  toggleOn:  { background: "#00D2D3" },
  toggleOff: { background: "#0F3460" },
  toggleKnob: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#16213E",
    transition: "transform 0.2s",
    boxShadow: "0 1px 4px rgba(0,0,0,0.4)",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
  },
  discoverSummary: {
    border: "1px solid #0F3460",
    background: "#20233D",
    borderRadius: "14px",
    padding: "14px",
    marginBottom: "14px",
  },
  discoverHeaderRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
    flexWrap: "wrap",
  },
  authorWrap: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  authorIcon: {
    width: "38px",
    height: "38px",
    borderRadius: "999px",
    background: "#00D2D3",
    color: "#0E1A2B",
    display: "grid",
    placeItems: "center",
    fontWeight: 800,
    fontSize: "16px",
  },
  authorName: {
    margin: 0,
    fontSize: "14px",
    fontWeight: 700,
    color: "#F1F2F6",
  },
  authorMeta: {
    margin: "2px 0 0 0",
    color: "#B0BAC3",
    fontSize: "12px",
  },
  communityBadge: {
    border: "1px solid #2B5A8A",
    borderRadius: "999px",
    padding: "4px 10px",
    fontSize: "11px",
    fontWeight: 700,
    color: "#00D2D3",
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  discoverTitle: {
    margin: "12px 0 10px 0",
    fontSize: "22px",
    lineHeight: 1.2,
    color: "#F1F2F6",
    fontFamily: "'Syne', sans-serif",
  },
  discoverStatsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: "8px",
  },
  discoverStat: {
    margin: 0,
    color: "#B0BAC3",
    fontSize: "13px",
  },
  discoverStatValue: {
    color: "#F1F2F6",
    fontWeight: 700,
  },
  addBtn: {
    width: "100%",
    background: "rgba(0, 210, 211, 0.05)",
    border: "2px dashed #00D2D3",
    borderRadius: "14px",
    color: "#00D2D3",
    fontSize: "15px",
    fontWeight: 600,
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
    color: "#7a7a9a",
    fontSize: "13px",
    cursor: "pointer",
    display: "block",
    margin: "0 auto",
    textDecoration: "underline",
    padding: "4px",
  },
};

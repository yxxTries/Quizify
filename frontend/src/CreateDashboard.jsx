import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { generateQuiz } from "./api.js";
import { COLORS, FONTS } from "./theme.js";
import DiscoverPostModal from "./DiscoverPostModal.jsx";
import SaveGameModal from "./SaveGameModal.jsx";

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const ALLOWED = [".pdf", ".pptx"];

const TIMER_PRESETS = [
  { id: "quick", label: "Quick", seconds: 10 },
  { id: "standard", label: "Standard", seconds: 20 },
  { id: "thinker", label: "Thinker", seconds: 30 },
  { id: "extended", label: "Extended", seconds: 45 },
];

const RATE_LIMIT = { max: 4, windowMs: 20 * 60 * 1000 };
const RATE_KEY = "kuizu_gen_attempts";

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function cloneQuestions(questions) {
  return (questions || []).map((q) => ({
    ...q,
    _id: uid(),
    choices: [...(q.choices || [])],
  }));
}

function validateCard(q) {
  const errors = {};
  if (!q.question?.trim()) errors.question = "Question text cannot be empty.";
  q.choices.forEach((c, i) => {
    if (!c.trim()) errors[`choice_${i}`] = "Cannot be empty.";
  });
  if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 3) {
    errors.correct_index = "Select a correct answer.";
  }
  return errors;
}

function hasErrors(errs) {
  return Object.keys(errs).length > 0;
}

function fileIsValid(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return ALLOWED.some((ext) => name.endsWith(ext));
}

function normalizeTimeControl(value) {
  if (value == null) return { enabled: true, preset: "quick", secondsPerQuestion: 10 };
  const seconds = Number(value?.secondsPerQuestion);
  const matchingPreset = TIMER_PRESETS.find((p) => p.seconds === seconds);
  const preset = value?.preset === "custom" ? "custom" : (matchingPreset ? matchingPreset.id : "custom");
  return {
    enabled: Boolean(value?.enabled && Number.isFinite(seconds) && seconds >= 5 && seconds <= 120),
    preset: preset,
    secondsPerQuestion: Number.isFinite(seconds) ? Math.max(5, Math.min(120, Math.round(seconds))) : 10,
  };
}

function buildTimeControlPayload(value) {
  if (!value?.enabled) return { enabled: false };
  return {
    enabled: true,
    mode: "per_question",
    secondsPerQuestion: Math.max(5, Math.min(120, Math.round(Number(value.secondsPerQuestion) || 10))),
  };
}

function readAttempts() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    const cutoff = Date.now() - RATE_LIMIT.windowMs;
    return arr.filter((t) => typeof t === "number" && t > cutoff);
  } catch {
    return [];
  }
}

function recordAttempt() {
  const fresh = [...readAttempts(), Date.now()];
  try {
    localStorage.setItem(RATE_KEY, JSON.stringify(fresh));
  } catch {
    // best-effort
  }
  return fresh;
}

// ──────────────────────────────────────────────
// QuestionCard (themed for cream UI)
// ──────────────────────────────────────────────

function QuestionCard({
  q,
  index,
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
      {isDragOver && <div style={cardStyles.dropLine} />}

      <div style={cardStyles.headerRow}>
        <span style={cardStyles.qLabel}>Q{index + 1}</span>
        {!isEditing && (
          <div style={cardStyles.actions}>
            <button title="Edit" style={cardStyles.iconBtn} onClick={() => onEdit(index)}>✏️</button>
            <button
              title="Delete"
              style={{ ...cardStyles.iconBtn, ...cardStyles.deleteBtn }}
              onClick={() => onDelete(index)}
            >🗑</button>
          </div>
        )}
      </div>

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
          {hasCardError && (
            <div style={cardStyles.errorBanner}>
              {Object.values(cardErrors).map((msg, i) => (
                <div key={i}>⚠ {msg}</div>
              ))}
            </div>
          )}
        </>
      )}

      {isEditing && draft && (
        <div style={cardStyles.editBody}>
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

          <div style={cardStyles.editFooter}>
            <button style={cardStyles.cancelLink} onClick={handleCancel}>Cancel</button>
            <button style={cardStyles.saveBtn} onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────
// CreateDashboard
// ──────────────────────────────────────────────

export default function CreateDashboard({
  user,
  initialQuiz,
  onPlay,
  onHost,
  onSaveGame,
  onPostDiscover,
  onRequireAuth,
}) {
  // Generation inputs
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [numQuestions, setNumQuestions] = useState(initialQuiz?.questions?.length || 5);
  const [timeControl, setTimeControl] = useState(() => normalizeTimeControl(initialQuiz?.timeControl));
  const inputRef = useRef();
  const promptRef = useRef(null);

  // Generation state
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(() => readAttempts());

  // Quiz / question state
  const [quizMeta, setQuizMeta] = useState(initialQuiz || null);
  const [questions, setQuestions] = useState(() => cloneQuestions(initialQuiz?.questions));
  const [editingIndex, setEditingIndex] = useState(null);
  const [globalErrors, setGlobalErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);

  // Save / publish state
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState("");
  const [postDraft, setPostDraft] = useState(null);
  const [saveDraft, setSaveDraft] = useState(null);

  // Drag state
  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  // Tooltip state for disabled buttons
  const [tooltip, setTooltip] = useState(null);

  // Keep attempts fresh (for displaying remaining count)
  useEffect(() => {
    const id = setInterval(() => setAttempts(readAttempts()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => Math.max(0, RATE_LIMIT.max - attempts.length), [attempts]);
  const isUnlimited = user?.email === "amil.shahul777@gmail.com";
  const rateLimited = !isUnlimited && remaining === 0;
  const hasContent = questions.length > 0;
  const loggedIn = Boolean(user);

  // Auto-resize prompt textarea
  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = "auto";
      promptRef.current.style.height = `${promptRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  // ── File handling ──
  const pickFile = (f) => {
    setError("");
    if (!fileIsValid(f)) {
      setError("Only .pdf and .pptx files are supported.");
      return;
    }
    if (f.size > 20 * 1024 * 1024) {
      setError("File exceeds the 20MB limit.");
      return;
    }
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  // ── Generate ──
  const handleGenerate = async () => {
    if (loading) return;
    if (!file && !prompt.trim()) {
      const dummyQuestions = Array.from({ length: numQuestions }, (_, i) => ({
        question: `Question ${i + 1}`,
        choices: ["Option A", "Option B", "Option C", "Option D"],
        correct_index: 0
      }));
      const dummyQuiz = {
        questions: dummyQuestions,
        timeControl: buildTimeControlPayload(timeControl),
      };
      setQuizMeta(dummyQuiz);
      setQuestions(cloneQuestions(dummyQuestions));
      setEditingIndex(null);
      setError("");
      setErrorBanner("");
      setGlobalErrors({});
      return;
    }
    if (rateLimited) {
      setError(`Rate limit reached. Try again in ~${Math.ceil(RATE_LIMIT.windowMs / 60000)} min.`);
      return;
    }

    setLoading(true);
    setError("");
    setErrorBanner("");
    setGlobalErrors({});

    const steps = [
      "Reading your document…",
      "Extracting text…",
      "Asking the AI to write questions…",
      "Polishing the quiz…",
    ];
    let stepIdx = 0;
    setProgress(steps[stepIdx]);
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProgress(steps[stepIdx]);
    }, 3000);

    try {
      const next = recordAttempt();
      setAttempts(next);
      const quiz = await generateQuiz(file, numQuestions, prompt);
      setQuizMeta({ ...quiz, timeControl: buildTimeControlPayload(timeControl) });
      setQuestions(cloneQuestions(quiz.questions));
      setEditingIndex(null);
    } catch (err) {
      setError(err?.message || "Generation failed.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
      setProgress("");
    }
  };

  // ── Reset (clears questions + file, keeps prompt) ──
  const handleReset = () => {
    setFile(null);
    setQuestions([]);
    setQuizMeta(null);
    setEditingIndex(null);
    setGlobalErrors({});
    setErrorBanner("");
    setError("");
    setSaveMessage("");
    setDiscoverMessage("");
  };

  // ── Question editing ──
  const handleEdit = (index) => {
    if (editingIndex === index) return;
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) return;
      setEditingIndex(null);
    }
    setEditingIndex(index);
    setGlobalErrors({});
    setErrorBanner("");
  };

  const handleSaveCard = (index, draft) => {
    setQuestions((prev) => prev.map((item, i) => (i === index ? { ...item, ...draft } : item)));
    setEditingIndex(null);
  };

  const handleCancelCard = (index) => {
    const q = questions[index];
    if (!q.question.trim() && q.choices.every((c) => !c.trim())) {
      setQuestions((prev) => prev.filter((_, i) => i !== index));
    }
    setEditingIndex(null);
  };

  const handleDelete = (index) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    else if (editingIndex !== null && editingIndex > index) setEditingIndex(editingIndex - 1);
  };

  const handleAdd = () => {
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) return;
      setEditingIndex(null);
    }
    const blank = { _id: uid(), question: "", choices: ["", "", "", ""], correct_index: 0 };
    setQuestions((prev) => [...prev, blank]);
    setEditingIndex(questions.length);
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

  // ── Validation gate for actions ──
  const validateAll = () => {
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      const errs = validateCard(q);
      if (hasErrors(errs)) {
        setErrorBanner("Save or fix the open question first.");
        return null;
      }
      setEditingIndex(null);
    }
    if (questions.length === 0) {
      setErrorBanner("Add at least one question first.");
      return null;
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
      setErrorBanner(`Fix ${Object.keys(newErrors).length} question${Object.keys(newErrors).length > 1 ? "s" : ""} first.`);
      setTimeout(() => {
        const cards = document.querySelectorAll("[data-card-index]");
        if (cards[firstErrorIndex]) {
          cards[firstErrorIndex].scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 50);
      return null;
    }
    return questions.map(({ _id, ...rest }) => rest);
  };

  // ── Play / Host ──
  const handlePlaySolo = () => {
    const clean = validateAll();
    if (!clean) return;
    onPlay({ ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl) });
  };

  const handleHostMultiplayer = () => {
    const clean = validateAll();
    if (!clean) return;
    onHost({ ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl) });
  };

  // ── Save / Publish ──
  const handleSaveClick = () => {
    if (!loggedIn) return;
    const clean = validateAll();
    if (!clean) return;
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const meta = quizMeta?.discoverMeta;
    setSaveDraft({
      title: meta?.title || fallbackTitle,
      category: meta?.category || "General",
      quiz: { ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: meta || undefined },
      questionCount: clean.length,
    });
  };

  const handleConfirmSave = async ({ title, category }) => {
    if (!saveDraft) return;
    setSaveLoading(true);
    setSaveMessage("");
    try {
      await onSaveGame({
        title,
        category,
        quiz: saveDraft.quiz,
      });
      setSaveMessage("Saved to My Games.");
      setSaveDraft(null);
    } catch (err) {
      setSaveMessage(err?.message || "Could not save.");
    } finally {
      setSaveLoading(false);
    }
  };

  const handlePostDiscoverClick = () => {
    if (!loggedIn) return;
    const clean = validateAll();
    if (!clean) return;
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const meta = quizMeta?.discoverMeta;
    setPostDraft({
      title: meta?.title || fallbackTitle,
      category: meta?.category || "General",
      quiz: { ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: meta || undefined },
      questionCount: clean.length,
    });
  };

  const handleConfirmPost = async ({ title, category }) => {
    if (!postDraft) return;
    setDiscoverLoading(true);
    setDiscoverMessage("");
    try {
      await onPostDiscover({
        title,
        category,
        quiz: postDraft.quiz,
      });
      setDiscoverMessage("Posted to Discover!");
      setPostDraft(null);
    } catch (err) {
      setDiscoverMessage(err?.message || "Could not post.");
    } finally {
      setDiscoverLoading(false);
    }
  };

  // ── Tooltip wrapper for disabled actions ──
  const lockedTip = (text) => {
    if (loggedIn) return null;
    return tooltip === text ? (
      <div style={styles.tooltip}>{text}</div>
    ) : null;
  };

  return (
    <div style={styles.page} className="dash-page">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .dash-action-bar { display: flex; gap: 10px; align-items: center; }
        .dash-action-bar button:disabled { cursor: not-allowed; }
        .dash-locked { position: relative; }
        .dash-grid {
          display: grid;
          grid-template-columns: ${hasContent ? "minmax(320px, 380px) 1fr" : "1fr"};
          gap: 24px;
          width: 100%;
          max-width: ${hasContent ? "1280px" : "720px"};
          margin: 0 auto;
          padding: 20px clamp(16px, 4vw, 32px) 60px;
        }
        .dash-toolbar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 16px;
          padding: 14px 18px;
          background: ${COLORS.creamSoft};
          border: 1px solid ${COLORS.border};
          border-radius: 14px;
          margin-bottom: 16px;
        }
        .dash-toolbar > .group {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .dash-toolbar .divider {
          width: 1px;
          height: 22px;
          background: ${COLORS.border};
        }
        input[type=range].cream-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 140px;
          height: 4px;
          background: ${COLORS.borderSoft};
          border-radius: 2px;
          outline: none;
        }
        input[type=range].cream-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${COLORS.blue};
          border: 2px solid ${COLORS.creamSoft};
          cursor: pointer;
        }
        input[type=range].cream-slider::-moz-range-thumb {
          width: 16px; height: 16px; border-radius: 50%;
          background: ${COLORS.blue}; border: 2px solid ${COLORS.creamSoft}; cursor: pointer;
        }
        textarea:focus, input[type="text"]:focus {
          border-color: ${COLORS.blueDark} !important;
          box-shadow: 0 0 0 3px ${COLORS.blueSoft};
          outline: none;
        }
        @media (max-width: 1024px) {
          .dash-grid {
            grid-template-columns: 1fr !important;
            max-width: 720px !important;
          }
        }
        @media (max-width: 768px) {
          .dash-page { padding-top: 124px !important; }
          .dash-grid {
            padding-bottom: 100px !important;
          }
        }
        @media (max-width: 600px) {
          .dash-toolbar { gap: 12px; padding: 12px; }
          .dash-action-bar { flex-wrap: wrap; }
        }
      `}</style>

      <div className="dash-grid">
        {/* ───────── Left column: prompt + file + generate ───────── */}
        <section style={styles.leftCol}>
          <div style={styles.panel}>
            <h2 style={styles.panelTitle}>Build a Quiz</h2>
            <p style={styles.panelSub}>
              Drop a file, write a prompt — or both — then generate.
            </p>

            {/* File drop */}
            <div
              style={{
                ...styles.dropzone,
                ...(dragging ? styles.dropzoneDragging : {}),
                ...(file ? styles.dropzoneHasFile : {}),
              }}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onClick={() => !loading && inputRef.current.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.pptx"
                style={{ display: "none" }}
                onChange={(e) => pickFile(e.target.files[0])}
              />
              {file ? (
                <div style={styles.fileInfo}>
                  <span style={styles.fileIcon}>{file.name.endsWith(".pdf") ? "📄" : "📊"}</span>
                  <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                    <div style={styles.fileName}>{file.name}</div>
                    <div style={styles.fileSize}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </div>
                  {!loading && (
                    <button
                      style={styles.clearBtn}
                      onClick={(e) => { e.stopPropagation(); setFile(null); setError(""); }}
                    >✕</button>
                  )}
                </div>
              ) : (
                <div style={styles.dropPrompt}>
                  <div style={styles.dropIcon}>＋</div>
                  <div style={styles.dropText}>{dragging ? "Drop file here" : "Upload document"}</div>
                  <div style={styles.dropMeta}>PDF, PPTX (max 20MB)</div>
                </div>
              )}
            </div>

            {/* Prompt */}
            <div style={styles.promptWrap}>
              <div style={styles.promptHeader}>
                <span style={styles.label}>Prompt / Context</span>
                <span style={{
                  ...styles.counter,
                  color: prompt.length >= 4000 ? COLORS.coralDark : COLORS.inkMuted,
                }}>
                  {prompt.length} / 4000
                </span>
              </div>
              <textarea
                ref={promptRef}
                style={{
                  ...styles.textarea,
                  borderColor: prompt.length >= 4000 ? COLORS.coral : COLORS.border,
                }}
                value={prompt}
                maxLength={4000}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                placeholder="Steer the quiz: topic, focus areas, tone, difficulty…"
                rows={1}
              />
            </div>

            {error && <div style={styles.errorBox}>⚠ {error}</div>}

            <div style={styles.generateRow}>
              <button
                style={{
                  ...styles.generateBtn,
                  ...((loading || rateLimited) ? styles.generateBtnDisabled : {}),
                }}
                onClick={handleGenerate}
                disabled={loading || rateLimited}
              >
                {loading ? (
                  <span style={styles.loadingRow}>
                    <span style={styles.spinner} />
                    {progress || "Working…"}
                  </span>
                ) : hasContent ? "Regenerate" : "Generate Quiz"}
              </button>
              {hasContent && (
                <button style={styles.resetBtn} onClick={handleReset} disabled={loading}>
                  Reset
                </button>
              )}
            </div>

            {!hasContent && (
              <div style={styles.initialSettings}>
                <div style={styles.settingGroup}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={styles.label}>Question Count</span>
                    <span style={styles.countPill}>{numQuestions}</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={20}
                    step={1}
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    disabled={loading}
                    className="cream-slider"
                    style={{ width: "100%" }}
                  />
                </div>

                <div style={styles.settingGroup}>
                  <span style={styles.label}>Timer</span>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <button
                      type="button"
                      style={{ ...styles.toolBtn, ...(!timeControl.enabled ? styles.toolBtnActive : {}) }}
                      onClick={() => setTimeControl((p) => ({ ...p, enabled: false }))}
                    >Off</button>
                    {TIMER_PRESETS.map((preset) => (
                      <button key={preset.id} type="button" style={{ ...styles.toolBtn, ...(timeControl.enabled && timeControl.preset === preset.id ? styles.toolBtnActive : {}) }} onClick={() => setTimeControl({ enabled: true, preset: preset.id, secondsPerQuestion: preset.seconds })}>
                        {preset.label} · {preset.seconds}s
                      </button>
                    ))}
                    <button
                      type="button"
                      style={{ ...styles.toolBtn, ...(timeControl.enabled && timeControl.preset === "custom" ? styles.toolBtnActive : {}) }}
                      onClick={() => setTimeControl((p) => ({ ...p, enabled: true, preset: "custom" }))}
                    >
                      Custom
                    </button>
                    {timeControl.enabled && timeControl.preset === "custom" && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <input
                          type="number"
                          min={5}
                          max={120}
                          value={timeControl.secondsPerQuestion}
                          onChange={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Number(e.target.value) }))}
                          onBlur={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Math.max(5, Math.min(120, Number(e.target.value) || 5)) }))}
                          disabled={loading}
                          style={{
                            width: 50, padding: "4px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`,
                            background: COLORS.creamSoft, color: COLORS.ink, fontSize: 12, outline: "none", fontFamily: "inherit"
                          }}
                        />
                        <span style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>s</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <p style={styles.rateText}>
              {isUnlimited ? "Unlimited generations available" : `${remaining} of ${RATE_LIMIT.max} generations left this 20-min window`}
            </p>
          </div>
        </section>

        {/* ───────── Right column: live question list ───────── */}
        {hasContent && (
          <section style={styles.rightCol}>
            {/* Toolbar above questions */}
            <div className="dash-toolbar">
              <div className="group">
                <span style={styles.label}>Question Count</span>
                <input
                  type="range"
                  min={5}
                  max={20}
                  step={1}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Number(e.target.value))}
                  disabled={loading}
                  className="cream-slider"
                />
                <span style={styles.countPill}>{numQuestions}</span>
              </div>

              <div className="divider" />

              <div className="group">
                <span style={styles.label}>Timer</span>
                <button
                  type="button"
                  style={{
                    ...styles.toolBtn,
                    ...(!timeControl.enabled ? styles.toolBtnActive : {}),
                  }}
                  onClick={() => setTimeControl((p) => ({ ...p, enabled: false }))}
                >Off</button>
                {TIMER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    style={{
                      ...styles.toolBtn,
                      ...(timeControl.enabled && timeControl.preset === preset.id ? styles.toolBtnActive : {}),
                    }}
                    onClick={() => setTimeControl({ enabled: true, preset: preset.id, secondsPerQuestion: preset.seconds })}
                  >
                    {preset.label} · {preset.seconds}s
                  </button>
                ))}
                <button
                  type="button"
                  style={{
                    ...styles.toolBtn,
                    ...(timeControl.enabled && timeControl.preset === "custom" ? styles.toolBtnActive : {}),
                  }}
                  onClick={() => setTimeControl((p) => ({ ...p, enabled: true, preset: "custom" }))}
                >Custom</button>
                {timeControl.enabled && timeControl.preset === "custom" && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input
                      type="number"
                      min={5} max={120} value={timeControl.secondsPerQuestion}
                      onChange={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Number(e.target.value) }))}
                      onBlur={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Math.max(5, Math.min(120, Number(e.target.value) || 5)) }))}
                      disabled={loading}
                      style={{ width: 50, padding: "4px 8px", borderRadius: 8, border: `1px solid ${COLORS.border}`, background: COLORS.creamSoft, color: COLORS.ink, fontSize: 12, outline: "none", fontFamily: "inherit" }}
                    />
                    <span style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>s</span>
                  </div>
                )}
              </div>

              <div className="divider" />

              <div className="group">
                <label style={styles.toggleLabel}>
                  <span style={styles.label}>Show answers</span>
                  <div
                    style={{ ...styles.toggle, ...(showAnswers ? styles.toggleOn : styles.toggleOff) }}
                    onClick={() => setShowAnswers((v) => !v)}
                    role="switch"
                    aria-checked={showAnswers}
                  >
                    <div style={{ ...styles.toggleKnob, transform: showAnswers ? "translateX(20px)" : "translateX(2px)" }} />
                  </div>
                </label>
              </div>
            </div>

            {errorBanner && <div style={styles.errorBox}>⚠ {errorBanner}</div>}
            {(saveMessage || discoverMessage) && (
              <div style={styles.infoBox}>{saveMessage || discoverMessage}</div>
            )}

            <div style={styles.cardList}>
              {questions.map((q, i) => (
                <div key={q._id} data-card-index={i}>
                  <QuestionCard
                    q={q}
                    index={i}
                    showAnswers={showAnswers}
                    isEditing={editingIndex === i}
                    validationErrors={globalErrors[q._id]}
                    onEdit={handleEdit}
                    onSave={(draft) => handleSaveCard(i, draft)}
                    onCancel={() => handleCancelCard(i)}
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

            <button style={styles.addBtn} onClick={handleAdd}>+ Add Question</button>
          </section>
        )}
      </div>

      {/* ───────── Action bar (fixed top-right, also mounted in nav by App) ───────── */}
      <ActionBar
        loggedIn={loggedIn}
        canPlay={hasContent && !loading}
        hasContent={hasContent}
        onPlay={handlePlaySolo}
        onHost={handleHostMultiplayer}
        onSave={handleSaveClick}
        onPostDiscover={handlePostDiscoverClick}
        onRequireAuth={onRequireAuth}
        saveLoading={saveLoading}
        discoverLoading={discoverLoading}
      />

      <DiscoverPostModal
        open={Boolean(postDraft)}
        initialTitle={postDraft?.title || ""}
        initialCategory={postDraft?.category || "General"}
        questionCount={postDraft?.questionCount || 0}
        loading={discoverLoading}
        onClose={() => {
          if (!discoverLoading) setPostDraft(null);
        }}
        onConfirm={handleConfirmPost}
      />

      <SaveGameModal
        open={Boolean(saveDraft)}
        initialTitle={saveDraft?.title || ""}
        initialCategory={saveDraft?.category || "General"}
        questionCount={saveDraft?.questionCount || 0}
        loading={saveLoading}
        onClose={() => {
          if (!saveLoading) setSaveDraft(null);
        }}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}

// ──────────────────────────────────────────────
// ActionBar — fixed top-right, with disabled tooltips
// ──────────────────────────────────────────────

function ActionBar({ loggedIn, canPlay, hasContent, onPlay, onHost, onSave, onPostDiscover, onRequireAuth, saveLoading, discoverLoading }) {
  const [hovered, setHovered] = useState(null);
  const actionBarRight = loggedIn ? 70 : 124;

  if (!hasContent) return null;

  const renderLockableBtn = (key, label, baseStyle, onClick, loading) => {
    const locked = !loggedIn;
    return (
      <span
        style={{ position: "relative", display: "inline-block" }}
        onMouseEnter={() => locked && setHovered(key)}
        onMouseLeave={() => setHovered(null)}
      >
        <button
          style={{
            ...baseStyle,
            ...(locked ? styles.actionBtnDisabled : {}),
            ...(loading ? { opacity: 0.7 } : {}),
          }}
          onClick={() => {
            if (locked) { onRequireAuth?.(); return; }
            onClick();
          }}
          disabled={loading}
        >
          {loading ? "…" : label}
        </button>
        {locked && hovered === key && (
          <div style={styles.tooltip}>Sign in to use</div>
        )}
      </span>
    );
  };

  return (
    <div className="action-bar" style={{ ...styles.actionBar, right: actionBarRight }}>
      <button
        style={{
          ...styles.actionBtnPrimary,
          ...(!canPlay ? styles.actionBtnDisabled : {}),
        }}
        onClick={onPlay}
        disabled={!canPlay}
      >
        ▶ Play
      </button>
      <button
        style={{
          ...styles.actionBtnCoral,
          ...(!canPlay ? styles.actionBtnDisabled : {}),
        }}
        onClick={onHost}
        disabled={!canPlay}
      >
        Host
      </button>
      {renderLockableBtn("save", "Save", styles.actionBtnGhost, onSave, saveLoading)}
      {renderLockableBtn("discover", "Post", styles.actionBtnGhost, onPostDiscover, discoverLoading)}
    </div>
  );
}

// ──────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────

const styles = {
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    paddingTop: 70,
  },
  leftCol: {
    animation: "fadeUp 0.3s ease both",
  },
  rightCol: {
    animation: "fadeUp 0.4s ease both",
  },
  panel: {
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 18,
    padding: 22,
    position: "sticky",
    top: 84,
  },
  panelTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: 800,
    color: COLORS.ink,
    margin: 0,
  },
  panelSub: {
    fontSize: 13,
    color: COLORS.inkMuted,
    margin: "6px 0 18px",
  },
  dropzone: {
    border: `1px dashed ${COLORS.inkMuted}`,
    borderRadius: 12,
    background: "transparent",
    padding: 24,
    cursor: "pointer",
    minHeight: 90,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  dropzoneDragging: {
    borderColor: COLORS.blueDark,
    background: COLORS.creamWarm,
  },
  dropzoneHasFile: {
    borderStyle: "solid",
    borderColor: COLORS.sageDark,
    background: COLORS.sageSoft,
  },
  dropPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    textAlign: "center",
  },
  dropIcon: {
    fontSize: 20,
    color: COLORS.inkMuted,
    lineHeight: 1,
  },
  dropText: {
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.ink,
  },
  dropMeta: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  fileIcon: {
    fontSize: 22,
  },
  fileName: {
    fontWeight: 600,
    fontSize: 14,
    color: COLORS.ink,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileSize: {
    fontSize: 12,
    color: COLORS.inkMuted,
  },
  clearBtn: {
    background: "transparent",
    border: `1px solid ${COLORS.border}`,
    color: COLORS.inkSoft,
    width: 28,
    height: 28,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 13,
  },
  promptWrap: {
    marginTop: 14,
  },
  promptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.inkSoft,
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  counter: {
    fontSize: 11,
    fontWeight: 600,
  },
  textarea: {
    width: "100%",
    minHeight: 48,
    background: COLORS.creamSoft,
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "12px 14px",
    fontSize: 14,
    lineHeight: 1.5,
    resize: "none",
    overflow: "hidden",
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  errorBox: {
    background: COLORS.coralSoft,
    border: `1px solid ${COLORS.coral}`,
    color: COLORS.coralDark,
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    margin: "12px 0",
    fontWeight: 600,
  },
  infoBox: {
    background: COLORS.sageSoft,
    border: `1px solid ${COLORS.sage}`,
    color: "#3F6B38",
    borderRadius: 10,
    padding: "10px 14px",
    fontSize: 13,
    marginBottom: 12,
    fontWeight: 600,
  },
  initialSettings: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
    marginTop: 20,
    paddingTop: 16,
    borderTop: `1px solid ${COLORS.border}`,
  },
  settingGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  generateRow: {
    display: "flex",
    gap: 10,
    marginTop: 16,
  },
  generateBtn: {
    flex: 1,
    background: COLORS.blue,
    color: COLORS.creamSoft,
    border: "none",
    borderRadius: 12,
    padding: "13px 18px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.15s, transform 0.05s",
  },
  generateBtnDisabled: {
    opacity: 0.55,
    cursor: "not-allowed",
  },
  resetBtn: {
    background: "transparent",
    color: COLORS.coralDark,
    border: `1px solid ${COLORS.coral}`,
    borderRadius: 12,
    padding: "13px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  rateText: {
    fontSize: 11,
    color: COLORS.inkMuted,
    marginTop: 10,
    textAlign: "center",
  },
  loadingRow: {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
  },
  spinner: {
    width: 14,
    height: 14,
    border: `2px solid ${COLORS.creamSoft}`,
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
  countPill: {
    background: COLORS.yellowSoft,
    color: COLORS.ink,
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    border: `1px solid ${COLORS.yellowDark}`,
  },
  toolBtn: {
    background: COLORS.creamSoft,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "background 0.12s",
  },
  toolBtnActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
  },
  toggleLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
  },
  toggle: {
    width: 42,
    height: 22,
    borderRadius: 11,
    cursor: "pointer",
    position: "relative",
    display: "flex",
    alignItems: "center",
    transition: "background 0.15s",
  },
  toggleOn: { background: COLORS.sageDark },
  toggleOff: { background: COLORS.borderSoft },
  toggleKnob: {
    position: "absolute",
    width: 18,
    height: 18,
    borderRadius: "50%",
    background: COLORS.creamSoft,
    transition: "transform 0.15s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
  },
  addBtn: {
    width: "100%",
    background: COLORS.yellowSoft,
    border: `2px dashed ${COLORS.yellowDark}`,
    borderRadius: 14,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: 700,
    padding: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    marginTop: 4,
  },
  // Action bar
  actionBar: {
    position: "fixed",
    top: 14,
    right: 70,
    zIndex: 45,
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  actionBtnPrimary: {
    background: COLORS.sageDark,
    color: COLORS.creamSoft,
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: 40,
  },
  actionBtnCoral: {
    background: COLORS.coral,
    color: COLORS.creamSoft,
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: 40,
  },
  actionBtnGhost: {
    background: "transparent",
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "10px 14px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: "inherit",
    minHeight: 40,
  },
  actionBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  tooltip: {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    background: COLORS.ink,
    color: COLORS.creamSoft,
    padding: "5px 10px",
    fontSize: 11,
    fontWeight: 600,
    borderRadius: 6,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    zIndex: 60,
  },
};

const cardStyles = {
  card: {
    position: "relative",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 14,
    padding: "18px 20px",
    marginBottom: 10,
    transition: "border-color 0.15s, opacity 0.15s, transform 0.15s, box-shadow 0.15s",
    userSelect: "none",
  },
  cardEditing: {
    borderLeft: `3px solid ${COLORS.blue}`,
    borderColor: COLORS.blueDark,
    boxShadow: `0 0 0 1px ${COLORS.blueSoft}`,
  },
  cardError: {
    borderColor: COLORS.coral,
    boxShadow: `0 0 0 1px ${COLORS.coralSoft}`,
  },
  cardDragOver: {
    borderColor: COLORS.blueDark,
    background: COLORS.blueSoft,
  },
  dropLine: {
    position: "absolute",
    top: -7,
    left: 0,
    right: 0,
    height: 3,
    background: COLORS.blueDark,
    borderRadius: 2,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  qLabel: {
    fontFamily: FONTS.display,
    fontWeight: 700,
    fontSize: 12,
    color: COLORS.ink,
    background: COLORS.yellow,
    padding: "3px 10px",
    borderRadius: 10,
    letterSpacing: 0.5,
  },
  actions: {
    display: "flex",
    gap: 6,
  },
  iconBtn: {
    background: COLORS.creamWarm,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.inkSoft,
    cursor: "pointer",
    fontSize: 13,
    padding: "5px 9px",
    borderRadius: 8,
    transition: "background 0.12s",
  },
  deleteBtn: {
    background: COLORS.coralSoft,
    borderColor: COLORS.coral,
    color: COLORS.coralDark,
  },
  questionText: {
    fontSize: 16,
    fontWeight: 500,
    lineHeight: 1.45,
    color: COLORS.ink,
    marginBottom: 10,
    userSelect: "text",
  },
  choiceList: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  choiceRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 13,
  },
  choiceCorrect: {
    background: COLORS.sageSoft,
    border: `1px solid ${COLORS.sageDark}`,
    color: "#3F6B38",
  },
  choiceNeutral: {
    background: COLORS.creamWarm,
    border: `1px solid ${COLORS.border}`,
    color: COLORS.inkSoft,
  },
  choiceDot: {
    fontWeight: 700,
    fontSize: 12,
    minWidth: 16,
    textAlign: "center",
  },
  errorBanner: {
    marginTop: 10,
    background: COLORS.coralSoft,
    border: `1px solid ${COLORS.coral}`,
    color: COLORS.coralDark,
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 12,
    lineHeight: 1.5,
  },
  editBody: {
    display: "flex",
    flexDirection: "column",
    userSelect: "text",
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.inkSoft,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  fieldHint: {
    textTransform: "none",
    fontWeight: 400,
    color: COLORS.inkMuted,
  },
  textarea: {
    width: "100%",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 10,
    color: COLORS.ink,
    fontSize: 15,
    lineHeight: 1.5,
    padding: "10px 12px",
    resize: "vertical",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  choiceEditRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  radio: {
    accentColor: COLORS.sageDark,
    width: 16,
    height: 16,
    flexShrink: 0,
    cursor: "pointer",
  },
  choiceInput: {
    flex: 1,
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 8,
    color: COLORS.ink,
    fontSize: 13,
    padding: "8px 11px",
    outline: "none",
    fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  choiceInputCorrect: {
    borderColor: COLORS.sageDark,
    background: COLORS.sageSoft,
  },
  inputError: {
    borderColor: COLORS.coral,
  },
  fieldError: {
    fontSize: 11,
    color: COLORS.coralDark,
    marginTop: 3,
    marginBottom: 3,
  },
  inlineError: {
    fontSize: 11,
    color: COLORS.coralDark,
    whiteSpace: "nowrap",
  },
  editFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 14,
    marginTop: 16,
    paddingTop: 12,
    borderTop: `1px solid ${COLORS.borderSoft}`,
  },
  cancelLink: {
    background: "none",
    border: "none",
    color: COLORS.inkMuted,
    fontSize: 13,
    cursor: "pointer",
    padding: "6px 4px",
    textDecoration: "underline",
    fontFamily: "inherit",
  },
  saveBtn: {
    background: COLORS.sageDark,
    color: COLORS.creamSoft,
    border: "none",
    borderRadius: 10,
    padding: "9px 22px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "inherit",
  },
};

import React, { useState, useRef, useCallback, useEffect, useMemo } from "react";
import { generateQuiz } from "./api.js";
import { FONTS } from "./theme.js";
import { useTheme } from "./ThemeContext.jsx";
import DiscoverPostModal from "./DiscoverPostModal.jsx";
import SaveGameModal from "./SaveGameModal.jsx";

const ALLOWED = [".pdf", ".pptx"];

const TIMER_PRESETS = [
  { id: "quick", label: "Quick", seconds: 10 },
  { id: "standard", label: "Standard", seconds: 20 },
  { id: "thinker", label: "Thinker", seconds: 30 },
  { id: "extended", label: "Extended", seconds: 45 },
];

const RATE_LIMIT = { max: 4, windowMs: 20 * 60 * 1000 };
const RATE_KEY = "kuizu_gen_attempts";

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
  if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index >= q.choices.length) {
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
  try { localStorage.setItem(RATE_KEY, JSON.stringify(fresh)); } catch {}
  return fresh;
}

// ─── Random question pool (used when no file or prompt) ───

const RANDOM_QUESTION_POOL = [
  { question: "What is the largest planet in our solar system?", choices: ["Earth", "Jupiter", "Saturn", "Mars"], correct_index: 1 },
  { question: "Which element has the chemical symbol 'O'?", choices: ["Osmium", "Oxygen", "Gold", "Oganesson"], correct_index: 1 },
  { question: "In what year did World War II end?", choices: ["1943", "1944", "1945", "1946"], correct_index: 2 },
  { question: "What is the capital of Japan?", choices: ["Seoul", "Beijing", "Bangkok", "Tokyo"], correct_index: 3 },
  { question: "Which language has the most native speakers?", choices: ["English", "Spanish", "Mandarin Chinese", "Hindi"], correct_index: 2 },
  { question: "How many continents are there on Earth?", choices: ["5", "6", "7", "8"], correct_index: 2 },
  { question: "Which artist painted the Mona Lisa?", choices: ["Michelangelo", "Raphael", "Donatello", "Leonardo da Vinci"], correct_index: 3 },
  { question: "What is the speed of light in a vacuum (km/s)?", choices: ["~150,000", "~300,000", "~450,000", "~600,000"], correct_index: 1 },
  { question: "Which ocean is the largest by surface area?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], correct_index: 3 },
  { question: "What does 'HTTP' stand for?", choices: ["HyperText Transfer Protocol", "High Tech Transfer Platform", "Hyper Transfer Text Protocol", "Home Tool Transfer Page"], correct_index: 0 },
  { question: "Which planet is closest to the Sun?", choices: ["Venus", "Earth", "Mercury", "Mars"], correct_index: 2 },
  { question: "Who wrote 'Romeo and Juliet'?", choices: ["Charles Dickens", "Jane Austen", "William Shakespeare", "Mark Twain"], correct_index: 2 },
  { question: "What is the main gas found in Earth's atmosphere?", choices: ["Oxygen", "Hydrogen", "Nitrogen", "Carbon Dioxide"], correct_index: 2 },
  { question: "In which country would you find the Great Barrier Reef?", choices: ["Brazil", "Australia", "Mexico", "Thailand"], correct_index: 1 },
  { question: "What is the hardest natural substance on Earth?", choices: ["Quartz", "Topaz", "Diamond", "Corundum"], correct_index: 2 },
  { question: "Which year did the Berlin Wall fall?", choices: ["1987", "1988", "1989", "1990"], correct_index: 2 },
  { question: "What is the smallest bone in the human body?", choices: ["Femur", "Stapes", "Radius", "Phalanx"], correct_index: 1 },
  { question: "Which country invented pizza?", choices: ["France", "Greece", "Italy", "Spain"], correct_index: 2 },
  { question: "How many hearts does an octopus have?", choices: ["1", "2", "3", "4"], correct_index: 2 },
  { question: "What is the chemical formula for water?", choices: ["CO₂", "NaCl", "H₂O", "O₂"], correct_index: 2 },
  { question: "Which animal is known as the 'King of the Jungle'?", choices: ["Tiger", "Elephant", "Lion", "Gorilla"], correct_index: 2 },
  { question: "What year did the first moon landing occur?", choices: ["1965", "1967", "1969", "1971"], correct_index: 2 },
  { question: "Which country has the largest population?", choices: ["United States", "Indonesia", "China", "India"], correct_index: 3 },
  { question: "What is the boiling point of water in Celsius?", choices: ["90°C", "100°C", "110°C", "120°C"], correct_index: 1 },
  { question: "Which sport is played at Wimbledon?", choices: ["Cricket", "Tennis", "Golf", "Rugby"], correct_index: 1 },
  { question: "What type of animal is a dolphin?", choices: ["Fish", "Reptile", "Mammal", "Amphibian"], correct_index: 2 },
  { question: "In which continent is the Sahara Desert located?", choices: ["Asia", "South America", "Australia", "Africa"], correct_index: 3 },
  { question: "What is the currency of the United Kingdom?", choices: ["Euro", "Dollar", "Pound Sterling", "Yen"], correct_index: 2 },
  { question: "Which vitamin is produced when skin is exposed to sunlight?", choices: ["Vitamin A", "Vitamin B", "Vitamin C", "Vitamin D"], correct_index: 3 },
  { question: "How many players are on a standard football (soccer) team?", choices: ["9", "10", "11", "12"], correct_index: 2 },
];

function pickRandomQuestions(count, numOptions) {
  const shuffled = [...RANDOM_QUESTION_POOL].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, shuffled.length));
  return picked.map((q) => {
    const choices = q.choices.slice(0, Math.min(numOptions, q.choices.length));
    const correct = Math.min(q.correct_index, choices.length - 1);
    return { question: q.question, choices, correct_index: correct };
  });
}

// ─── Step Indicator ───

function StepDots({ current, total }) {
  const { colors: COLORS } = useTheme();
  return (
    <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 32 }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 32 : 12,
          height: 12,
          borderRadius: 6,
          background: i <= current ? COLORS.blue : COLORS.borderSoft,
          transition: "all 0.25s ease",
        }} />
      ))}
    </div>
  );
}

// ─── QuestionCard (from CreateDashboard, themed) ───

function QuestionCard({
  q, index, showAnswers, isEditing, validationErrors,
  onEdit, onSave, onCancel, onDelete, onDragStart, onDragOver, onDrop, onDragEnd,
  isDragOver, isDragging,
}) {
  const { colors: COLORS } = useTheme();
  const cardStyles = useMemo(() => buildCardStyles(COLORS), [COLORS]);
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
    if (hasErrors(errs)) { setLocalErrors(errs); return; }
    setLocalErrors({});
    onSave(draft);
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
            <button title="Delete" style={{ ...cardStyles.iconBtn, ...cardStyles.deleteBtn }} onClick={() => onDelete(index)}>🗑</button>
          </div>
        )}
      </div>
      {!isEditing && (
        <>
          <p style={cardStyles.questionText}>{q.question}</p>
          {showAnswers && (
            <div style={cardStyles.choiceList}>
              {q.choices.map((c, i) => (
                <div key={i} style={{ ...cardStyles.choiceRow, ...(i === q.correct_index ? cardStyles.choiceCorrect : cardStyles.choiceNeutral) }}>
                  <span style={cardStyles.choiceDot}>{i === q.correct_index ? "✓" : String.fromCharCode(65 + i)}</span>
                  <span>{c}</span>
                </div>
              ))}
            </div>
          )}
          {hasCardError && (
            <div style={cardStyles.errorBanner}>
              {Object.values(cardErrors).map((msg, i) => <div key={i}>⚠ {msg}</div>)}
            </div>
          )}
        </>
      )}
      {isEditing && draft && (
        <div style={cardStyles.editBody}>
          <label style={cardStyles.fieldLabel}>Question</label>
          <textarea ref={questionRef} style={{ ...cardStyles.textarea, ...(localErrors.question ? cardStyles.inputError : {}) }} value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} rows={3} placeholder="Enter question text…" />
          {localErrors.question && <div style={cardStyles.fieldError}>{localErrors.question}</div>}
          <label style={{ ...cardStyles.fieldLabel, marginTop: "16px" }}>Answer Choices <span style={cardStyles.fieldHint}>(select the correct one)</span></label>
          {draft.choices.map((choice, i) => (
            <div key={i} style={cardStyles.choiceEditRow}>
              <input type="radio" name={`correct-${q._id}`} checked={draft.correct_index === i} onChange={() => setDraft({ ...draft, correct_index: i })} style={cardStyles.radio} title="Mark as correct" />
              <input type="text" value={choice} onChange={(e) => { const updated = [...draft.choices]; updated[i] = e.target.value; setDraft({ ...draft, choices: updated }); }} style={{ ...cardStyles.choiceInput, ...(localErrors[`choice_${i}`] ? cardStyles.inputError : {}), ...(draft.correct_index === i ? cardStyles.choiceInputCorrect : {}) }} placeholder={`Choice ${String.fromCharCode(65 + i)}`} />
              {localErrors[`choice_${i}`] && <span style={cardStyles.inlineError}>{localErrors[`choice_${i}`]}</span>}
              {draft.choices.length > 2 && (
                <button title="Remove option" style={cardStyles.removeChoiceBtn} onClick={() => { const updated = draft.choices.filter((_, j) => j !== i); let newCorrect = draft.correct_index; if (newCorrect === i) newCorrect = 0; else if (newCorrect > i) newCorrect -= 1; setDraft({ ...draft, choices: updated, correct_index: newCorrect }); }}>✕</button>
              )}
            </div>
          ))}
          {draft.choices.length < 4 && (
            <button style={cardStyles.addChoiceBtn} onClick={() => setDraft({ ...draft, choices: [...draft.choices, ""] })}>＋ Add Option</button>
          )}
          <div style={cardStyles.editFooter}>
            <button style={cardStyles.cancelLink} onClick={onCancel}>Cancel</button>
            <button style={cardStyles.saveBtn} onClick={handleSave}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Wizard ───

const TOTAL_STEPS = 4;

export default function CreateWizard({ user, onPlay, onHost, onSaveGame, onPostDiscover, onRequireAuth, onExit, initialQuiz }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => buildStyles(COLORS), [COLORS]);

  const [step, setStep] = useState(initialQuiz?.questions?.length ? 4 : 1);
  const [file, setFile] = useState(null);
  const [prompt, setPrompt] = useState("");
  const [dragging, setDragging] = useState(false);
  const [numQuestions, setNumQuestions] = useState(initialQuiz?.questions?.length || 5);
  const [numOptions, setNumOptions] = useState(initialQuiz?.questions?.[0]?.choices?.length || 4);
  const [timeControl, setTimeControl] = useState(() => normalizeTimeControl(initialQuiz?.timeControl || null));
  const inputRef = useRef();
  const promptRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(() => readAttempts());

  const [quizMeta, setQuizMeta] = useState(initialQuiz || null);
  const [questions, setQuestions] = useState(() => cloneQuestions(initialQuiz?.questions) || []);
  const [editingIndex, setEditingIndex] = useState(null);
  const [globalErrors, setGlobalErrors] = useState({});
  const [errorBanner, setErrorBanner] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverMessage, setDiscoverMessage] = useState("");
  const [postDraft, setPostDraft] = useState(null);
  const [saveDraft, setSaveDraft] = useState(null);

  const dragIndex = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setAttempts(readAttempts()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => Math.max(0, RATE_LIMIT.max - attempts.length), [attempts]);
  const isUnlimited = user?.email === "amil.shahul777@gmail.com";
  const rateLimited = !isUnlimited && remaining === 0;
  const hasContent = questions.length > 0;
  const loggedIn = Boolean(user);

  useEffect(() => {
    if (promptRef.current) {
      promptRef.current.style.height = "auto";
      promptRef.current.style.height = `${promptRef.current.scrollHeight}px`;
    }
  }, [prompt]);

  const pickFile = (f) => {
    setError("");
    if (!fileIsValid(f)) { setError("Only .pdf and .pptx files are supported."); return; }
    if (f.size > 20 * 1024 * 1024) { setError("File exceeds the 20MB limit."); return; }
    setFile(f);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  const handleGenerate = async () => {
    if (loading) return;
    if (!file && !prompt.trim()) {
      const randomQuestions = pickRandomQuestions(numQuestions, numOptions);
      const quiz = { questions: randomQuestions, timeControl: buildTimeControlPayload(timeControl) };
      setQuizMeta(quiz);
      setQuestions(cloneQuestions(randomQuestions));
      setEditingIndex(null);
      setError("");
      setErrorBanner("");
      setGlobalErrors({});
      setStep(4);
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

    const steps = ["Reading your document…", "Extracting text…", "Asking the AI to write questions…", "Polishing the quiz…"];
    let stepIdx = 0;
    setProgress(steps[stepIdx]);
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1);
      setProgress(steps[stepIdx]);
    }, 3000);

    try {
      const next = recordAttempt();
      setAttempts(next);
      const quiz = await generateQuiz(file, numQuestions, prompt, numOptions);
      setQuizMeta({ ...quiz, timeControl: buildTimeControlPayload(timeControl) });
      setQuestions(cloneQuestions(quiz.questions));
      setEditingIndex(null);
      setStep(4);
    } catch (err) {
      setError(err?.message || "Generation failed.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
      setProgress("");
    }
  };

  const handleNext = () => {
    setError("");
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      handleGenerate();
    }
  };

  const handleBack = () => {
    setError("");
    if (step > 1) setStep(step - 1);
  };

  // ── Question editing (step 4) ──
  const handleEdit = (index) => {
    if (editingIndex === index) return;
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      if (hasErrors(validateCard(q))) return;
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

  const handleDragStart = (e, index) => { dragIndex.current = index; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (index) => { if (dragIndex.current !== null && dragIndex.current !== index) setDragOverIndex(index); };
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
  const handleDragEnd = () => { dragIndex.current = null; setDragOverIndex(null); };

  const validateAll = () => {
    if (editingIndex !== null) {
      const q = questions[editingIndex];
      if (hasErrors(validateCard(q))) { setErrorBanner("Save or fix the open question first."); return null; }
      setEditingIndex(null);
    }
    if (questions.length === 0) { setErrorBanner("Add at least one question first."); return null; }
    const newErrors = {};
    questions.forEach((q, i) => {
      const errs = validateCard(q);
      if (hasErrors(errs)) newErrors[q._id] = errs;
    });
    if (Object.keys(newErrors).length > 0) { setGlobalErrors(newErrors); setErrorBanner(`Fix ${Object.keys(newErrors).length} question${Object.keys(newErrors).length > 1 ? "s" : ""} first.`); return null; }
    return questions.map(({ _id, ...rest }) => rest);
  };

  const handlePlaySolo = () => { const clean = validateAll(); if (!clean) return; onPlay({ ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl) }); };
  const handleHostMultiplayer = () => { const clean = validateAll(); if (!clean) return; onHost({ ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl) }); };

  const handleSaveClick = () => {
    if (!loggedIn) return;
    const clean = validateAll(); if (!clean) return;
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const meta = quizMeta?.discoverMeta;
    setSaveDraft({ title: meta?.title || fallbackTitle, category: meta?.category || "General", quiz: { ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: meta || undefined }, questionCount: clean.length });
  };

  const handleConfirmSave = async ({ title, category }) => {
    if (!saveDraft) return;
    setSaveLoading(true); setSaveMessage("");
    try { await onSaveGame({ title, category, quiz: saveDraft.quiz }); setSaveMessage("Saved to My Games."); setSaveDraft(null); }
    catch (err) { setSaveMessage(err?.message || "Could not save."); }
    finally { setSaveLoading(false); }
  };

  const handlePostDiscoverClick = () => {
    if (!loggedIn) return;
    const clean = validateAll(); if (!clean) return;
    const fallbackTitle = clean[0]?.question?.slice(0, 60) || "Untitled Quiz";
    const meta = quizMeta?.discoverMeta;
    setPostDraft({ title: meta?.title || fallbackTitle, category: meta?.category || "General", quiz: { ...(quizMeta || {}), questions: clean, timeControl: buildTimeControlPayload(timeControl), discoverMeta: meta || undefined }, questionCount: clean.length });
  };

  const handleConfirmPost = async ({ title, category }) => {
    if (!postDraft) return;
    setDiscoverLoading(true); setDiscoverMessage("");
    try { await onPostDiscover({ title, category, quiz: postDraft.quiz }); setDiscoverMessage("Posted to Discover!"); setPostDraft(null); }
    catch (err) { setDiscoverMessage(err?.message || "Could not post."); }
    finally { setDiscoverLoading(false); }
  };

  const isLastStep = step === TOTAL_STEPS;

  return (
    <div style={styles.page}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideRight {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        input[type=range].wizard-slider {
          -webkit-appearance: none; appearance: none;
          width: 100%; height: 6px;
          background: ${COLORS.borderSoft};
          border-radius: 3px; outline: none;
        }
        input[type=range].wizard-slider::-webkit-slider-thumb {
          -webkit-appearance: none; appearance: none;
          width: 22px; height: 22px; border-radius: 50%;
          background: ${COLORS.blue};
          border: 2px solid ${COLORS.creamSoft};
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(42,51,64,0.15);
        }
        input[type=range].wizard-slider::-moz-range-thumb {
          width: 22px; height: 22px; border-radius: 50%;
          background: ${COLORS.blue}; border: 2px solid ${COLORS.creamSoft}; cursor: pointer;
        }
        textarea:focus, input[type=text]:focus, input[type=number]:focus {
          border-color: ${COLORS.blueDark} !important;
          box-shadow: 0 0 0 3px ${COLORS.blueSoft};
          outline: none;
        }
        @media (max-width: 768px) {
          .wizard-step1-grid { grid-template-columns: 1fr !important; }
          .wizard-step4-grid { grid-template-columns: 1fr !important; }
          .wizard-page { padding-top: 16px !important; padding-bottom: 100px !important; }
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

      {!isLastStep && (
        <div style={{ ...styles.header, marginBottom: 24 }}>
          <StepDots current={step - 1} total={TOTAL_STEPS - 1} />
        </div>
      )}

      {/* ── Step 1: Upload + Prompt ── */}
      {step === 1 && (
        <div style={{ ...styles.stepPanel, animation: "fadeUp 0.35s ease both" }}>
          <h2 style={styles.stepTitle}>Create a Quiz</h2>
          <p style={styles.stepSub}>Upload a file, write a prompt — or skip both for random trivia.</p>
          <div className="wizard-step1-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 8 }}>
            {/* Upload */}
            <div style={styles.fieldCard}>
              <div style={styles.fieldLabel}>Upload Document</div>
              <div
                style={{ ...styles.dropzone, ...(dragging ? styles.dropzoneDragging : {}), ...(file ? styles.dropzoneHasFile : {}) }}
                onDrop={onDrop}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onClick={() => inputRef.current?.click()}
              >
                <input ref={inputRef} type="file" accept=".pdf,.pptx" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files[0])} />
                {file ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 12, width: "100%" }}>
                    <span style={{ fontSize: 22 }}>{file.name.endsWith(".pdf") ? "📄" : "📊"}</span>
                    <div style={{ flex: 1, textAlign: "left", overflow: "hidden" }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.ink, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
                      <div style={{ fontSize: 12, color: COLORS.inkMuted }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    <button style={{ background: "transparent", border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft, width: 28, height: 28, borderRadius: 8, cursor: "pointer", fontSize: 13 }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, textAlign: "center" }}>
                    <div style={{ fontSize: 24, color: COLORS.inkMuted, lineHeight: 1 }}>＋</div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.ink }}>{dragging ? "Drop file here" : "Click or drag file"}</div>
                    <div style={{ fontSize: 12, color: COLORS.inkMuted }}>PDF, PPTX (max 20MB)</div>
                  </div>
                )}
              </div>
            </div>
            {/* Prompt */}
            <div style={styles.fieldCard}>
              <div style={{ ...styles.fieldLabel, display: "flex", justifyContent: "space-between" }}>
                <span>Prompt / Context</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: prompt.length >= 4000 ? COLORS.coralDark : COLORS.inkMuted }}>{prompt.length} / 4000</span>
              </div>
              <textarea
                ref={promptRef}
                style={{ ...styles.textarea, borderColor: prompt.length >= 4000 ? COLORS.coral : COLORS.border }}
                value={prompt}
                maxLength={4000}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Steer the quiz: topic, focus areas, tone, difficulty…"
                rows={1}
              />
            </div>
          </div>
          {error && <div style={styles.errorBox}>⚠ {error}</div>}
          <div style={styles.stepNav}>
            <button style={styles.btnNext} className="wiz-arcade" onClick={handleNext}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Step 2: Question Count ── */}
      {step === 2 && (
        <div style={{ ...styles.stepPanel, animation: "fadeUp 0.35s ease both" }}>
          <h2 style={styles.stepTitle}>How many questions?</h2>
          <p style={styles.stepSub}>Choose the number of questions and answer options.</p>
          <div style={styles.bigSliderWrap}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <span style={styles.fieldLabel}>Questions</span>
              <span style={{ ...styles.countPill, fontSize: 28, padding: "6px 20px" }}>{numQuestions}</span>
            </div>
            <input type="range" min={5} max={20} step={1} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="wizard-slider" />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: COLORS.inkMuted, fontWeight: 600 }}>
              <span>5</span><span>20</span>
            </div>
          </div>
          <div style={{ marginTop: 32 }}>
            <span style={styles.fieldLabel}>Options per Question</span>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              {[2, 3, 4].map((n) => (
                <button key={n} type="button" className="wiz-arcade" style={{ ...styles.optionBtn, ...(numOptions === n ? styles.optionBtnActive : {}) }} onClick={() => setNumOptions(n)}>
                  {n} Options
                </button>
              ))}
            </div>
          </div>
          <div style={styles.stepNav}>
            <button style={styles.btnBack} className="wiz-arcade" onClick={handleBack}>← Back</button>
            <button style={styles.btnNext} className="wiz-arcade" onClick={handleNext}>Next →</button>
          </div>
        </div>
      )}

      {/* ── Step 3: Timer ── */}
      {step === 3 && (
        <div style={{ ...styles.stepPanel, animation: "fadeUp 0.35s ease both" }}>
          <h2 style={styles.stepTitle}>Set a timer</h2>
          <p style={styles.stepSub}>How much time per question?</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
            <button type="button" className="wiz-arcade" style={{ ...styles.timerBtn, ...(!timeControl.enabled ? styles.timerBtnActive : {}) }} onClick={() => setTimeControl((p) => ({ ...p, enabled: false }))}>No Timer</button>
            {TIMER_PRESETS.map((preset) => (
              <button key={preset.id} type="button" className="wiz-arcade" style={{ ...styles.timerBtn, ...(timeControl.enabled && timeControl.preset === preset.id ? styles.timerBtnActive : {}) }} onClick={() => setTimeControl({ enabled: true, preset: preset.id, secondsPerQuestion: preset.seconds })}>
                {preset.label}
                <span style={{ fontSize: 12, display: "block", fontWeight: 400, opacity: 0.8 }}>{preset.seconds}s</span>
              </button>
            ))}
            <button type="button" className="wiz-arcade" style={{ ...styles.timerBtn, ...(timeControl.enabled && timeControl.preset === "custom" ? styles.timerBtnActive : {}) }} onClick={() => setTimeControl((p) => ({ ...p, enabled: true, preset: "custom" }))}>
              Custom
              {timeControl.enabled && timeControl.preset === "custom" && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 4 }} onClick={(e) => e.stopPropagation()}>
                  <input type="number" min={5} max={120} value={timeControl.secondsPerQuestion} onChange={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Number(e.target.value) }))} onBlur={(e) => setTimeControl(p => ({ ...p, secondsPerQuestion: Math.max(5, Math.min(120, Number(e.target.value) || 5)) }))} style={{ width: 48, padding: "4px 8px", borderRadius: 6, border: `1px solid ${COLORS.border}`, background: COLORS.creamSoft, color: COLORS.ink, fontSize: 13, fontFamily: "inherit", textAlign: "center" }} />
                  <span style={{ fontSize: 12, color: COLORS.inkSoft, fontWeight: 600 }}>s</span>
                </div>
              )}
            </button>
          </div>
          <p style={{ fontSize: 12, color: COLORS.inkMuted, marginTop: 16, fontWeight: 600 }}>
            {isUnlimited ? "Unlimited generations available" : `${remaining} of ${RATE_LIMIT.max} generations left`}
          </p>
          <div style={styles.stepNav}>
            <button style={styles.btnBack} className="wiz-arcade" onClick={handleBack}>← Back</button>
            <button style={{ ...styles.btnNext, ...(rateLimited ? styles.btnDisabled : {}) }} className="wiz-arcade" onClick={handleNext} disabled={rateLimited}>
              {loading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}><span style={styles.spinner} />{progress || "Working…"}</span> : "Generate Quiz"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 4: Preview ── */}
      {step === 4 && (
        <div style={{ animation: "fadeUp 0.35s ease both", width: "100%", maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px, 4vw, 32px) 80px" }}>
          {(saveMessage || discoverMessage) && <div style={{ ...styles.errorBox, ...styles.infoBox }}>{saveMessage || discoverMessage}</div>}
          {errorBanner && <div style={styles.errorBox}>⚠ {errorBanner}</div>}
          {error && <div style={styles.errorBox}>⚠ {error}</div>}

          <div className="wizard-step4-grid" style={{ display: "grid", gridTemplateColumns: sidebarOpen ? "320px 1fr" : "0px 1fr", gap: 24, transition: "grid-template-columns 0.25s ease" }}>
            {/* Left panel: reprompt + file attach */}
            <div style={{ ...styles.sidebar, overflow: sidebarOpen ? "visible" : "hidden", padding: sidebarOpen ? 20 : 0, opacity: sidebarOpen ? 1 : 0, transition: "opacity 0.2s ease, padding 0.25s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: COLORS.inkSoft, textTransform: "uppercase", letterSpacing: 0.5 }}>Refine</span>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={styles.fieldLabel}>Reprompt</div>
                <textarea
                  style={{ ...styles.textarea, minHeight: 100 }}
                  value={prompt}
                  maxLength={4000}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Adjust the prompt and regenerate…"
                />
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={styles.fieldLabel}>Attach File</div>
                <div
                  style={{ ...styles.dropzone, ...(file ? styles.dropzoneHasFile : {}), padding: 14 }}
                  onDrop={onDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onClick={() => inputRef.current?.click()}
                >
                  <input ref={inputRef} type="file" accept=".pdf,.pptx" style={{ display: "none" }} onChange={(e) => pickFile(e.target.files[0])} />
                  {file ? (
                    <div style={{ fontSize: 12, fontWeight: 600, color: COLORS.quizPositive, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{file.name.endsWith(".pdf") ? "📄" : "📊"}</span>
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                      <button style={{ background: "transparent", border: "none", color: COLORS.coralDark, cursor: "pointer", fontSize: 14, lineHeight: 1 }} onClick={(e) => { e.stopPropagation(); setFile(null); }}>✕</button>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: COLORS.inkMuted, textAlign: "center" }}>Click or drop PDF/PPTX</div>
                  )}
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={styles.fieldLabel}>Questions</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input type="range" min={5} max={20} step={1} value={numQuestions} onChange={(e) => setNumQuestions(Number(e.target.value))} className="wizard-slider" style={{ width: "100%" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.ink, minWidth: 20, textAlign: "right" }}>{numQuestions}</span>
                </div>
              </div>
              <button
                style={{ ...styles.btnNext, width: "100%", ...(loading || rateLimited ? styles.btnDisabled : {}) }}
                className="wiz-arcade"
                onClick={handleGenerate}
                disabled={loading || rateLimited}
              >
                {loading ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={styles.spinner} />{progress || "Working…"}</span> : "Regenerate"}
              </button>
              <div style={{ marginTop: 20, paddingTop: 16, borderTop: `1px solid ${COLORS.border}` }}>
                <div style={styles.fieldLabel}>Timer</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                  <button type="button" className="wiz-arcade" style={{ ...styles.toolBtnSm, ...(!timeControl.enabled ? styles.toolBtnSmActive : {}) }} onClick={() => setTimeControl((p) => ({ ...p, enabled: false }))}>Off</button>
                  {TIMER_PRESETS.map((preset) => (
                    <button key={preset.id} type="button" className="wiz-arcade" style={{ ...styles.toolBtnSm, ...(timeControl.enabled && timeControl.preset === preset.id ? styles.toolBtnSmActive : {}) }} onClick={() => setTimeControl({ enabled: true, preset: preset.id, secondsPerQuestion: preset.seconds })}>{preset.seconds}s</button>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <div style={styles.fieldLabel}>Options</div>
                <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                  {[2, 3, 4].map((n) => (
                    <button key={n} type="button" className="wiz-arcade" style={{ ...styles.toolBtnSm, ...(numOptions === n ? styles.toolBtnSmActive : {}) }} onClick={() => setNumOptions(n)}>{n}</button>
                  ))}
                </div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: COLORS.inkSoft }}>Show Answers</span>
                <div style={{ width: 42, height: 22, borderRadius: 11, cursor: "pointer", position: "relative", display: "flex", alignItems: "center", transition: "background 0.15s", background: showAnswers ? COLORS.sageDark : COLORS.borderSoft }} onClick={() => setShowAnswers((v) => !v)} role="switch" aria-checked={showAnswers}>
                  <div style={{ position: "absolute", width: 18, height: 18, borderRadius: "50%", background: COLORS.creamSoft, transition: "transform 0.15s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)", transform: showAnswers ? "translateX(20px)" : "translateX(2px)" }} />
                </div>
              </label>
            </div>

            {/* Right: question list + actions */}
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <button
                  className="wiz-arcade"
                  style={{ background: COLORS.creamWarm, border: `1px solid ${COLORS.border}`, borderBottom: `4px solid ${COLORS.border}`, borderRadius: 999, padding: "9px 18px", cursor: "pointer", fontWeight: 700, fontSize: 13, color: COLORS.ink, fontFamily: FONTS.display, letterSpacing: 0.5, boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 6px 14px rgba(42,51,64,0.06)`, transition: "transform 0.12s ease, box-shadow 0.12s ease" }}
                  onClick={() => setSidebarOpen((v) => !v)}
                >
                  {sidebarOpen ? "◀ Hide" : "▶ Refine"}
                </button>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <button className="wiz-arcade" style={{ ...styles.actionBtnPrimary, ...(loading ? styles.actionBtnDisabled : {}) }} onClick={handlePlaySolo} disabled={loading}>Play</button>
                  <button className="wiz-arcade" style={{ ...styles.actionBtnCoral, ...(loading ? styles.actionBtnDisabled : {}) }} onClick={handleHostMultiplayer} disabled={loading}>Host</button>
                  <button className="wiz-arcade" style={{ ...styles.actionBtnGhost, ...(!loggedIn ? styles.actionBtnDisabled : {}) }} onClick={() => { if (!loggedIn) { onRequireAuth?.(); return; } handleSaveClick(); }} disabled={saveLoading}>{saveLoading ? "…" : "Save"}</button>
                  <button className="wiz-arcade" style={{ ...styles.actionBtnGhost, ...(!loggedIn ? styles.actionBtnDisabled : {}) }} onClick={() => { if (!loggedIn) { onRequireAuth?.(); return; } handlePostDiscoverClick(); }} disabled={discoverLoading}>{discoverLoading ? "…" : "Post"}</button>
                </div>
              </div>

              <div style={styles.cardList}>
                {questions.map((q, i) => (
                  <div key={q._id} data-card-index={i}>
                    <QuestionCard
                      q={q} index={i} showAnswers={showAnswers} isEditing={editingIndex === i}
                      validationErrors={globalErrors[q._id]} onEdit={handleEdit}
                      onSave={(draft) => handleSaveCard(i, draft)} onCancel={() => handleCancelCard(i)}
                      onDelete={handleDelete} onDragStart={handleDragStart} onDragOver={handleDragOver}
                      onDrop={handleDrop} onDragEnd={handleDragEnd}
                      isDragOver={dragOverIndex === i} isDragging={dragIndex.current === i}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <button
                  className="wiz-arcade"
                  style={{ background: COLORS.creamWarm, border: `1px solid ${COLORS.border}`, borderBottom: `4px solid ${COLORS.border}`, borderRadius: 999, color: COLORS.ink, fontSize: 14, fontWeight: 700, padding: "12px 22px", cursor: "pointer", fontFamily: FONTS.display, letterSpacing: 0.5, boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 6px 14px rgba(42,51,64,0.06)`, transition: "transform 0.12s ease, box-shadow 0.12s ease" }}
                  onClick={() => { setStep(1); }}
                >← Back to Start</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <DiscoverPostModal
        open={Boolean(postDraft)}
        initialTitle={postDraft?.title || ""}
        initialCategory={postDraft?.category || "General"}
        questionCount={postDraft?.questionCount || 0}
        loading={discoverLoading}
        onClose={() => { if (!discoverLoading) setPostDraft(null); }}
        onConfirm={handleConfirmPost}
      />
      <SaveGameModal
        open={Boolean(saveDraft)}
        initialTitle={saveDraft?.title || ""}
        initialCategory={saveDraft?.category || "General"}
        questionCount={saveDraft?.questionCount || 0}
        loading={saveLoading}
        onClose={() => { if (!saveLoading) setSaveDraft(null); }}
        onConfirm={handleConfirmSave}
      />
    </div>
  );
}

// ─── Styles ───

const buildStyles = (COLORS) => ({
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "48px clamp(16px, 3vw, 24px) 60px",
  },
  header: {
    width: "100%",
    maxWidth: 900,
    padding: "0 clamp(16px, 4vw, 24px)",
  },
  stepPanel: {
    width: "100%",
    maxWidth: 900,
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 20,
    padding: "clamp(24px, 4vw, 40px) clamp(20px, 5vw, 48px)",
  },
  stepTitle: {
    fontFamily: FONTS.display,
    fontSize: "clamp(24px, 4vw, 32px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  stepSub: {
    fontSize: 14,
    color: COLORS.inkMuted,
    margin: "6px 0 16px",
    fontWeight: 500,
  },
  fieldCard: {
    display: "flex",
    flexDirection: "column",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.inkSoft,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  dropzone: {
    border: `1px dashed ${COLORS.inkMuted}`,
    borderRadius: 14,
    background: "transparent",
    padding: "clamp(20px, 3vw, 32px)",
    cursor: "pointer",
    minHeight: 150,
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
  textarea: {
    width: "100%",
    minHeight: 150,
    background: COLORS.creamSoft,
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 12,
    padding: "14px 16px",
    fontSize: 15,
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
    fontWeight: 600,
    margin: "16px 0 0",
  },
  infoBox: {
    background: COLORS.sageSoft,
    border: `1px solid ${COLORS.sage}`,
    color: COLORS.quizPositive,
  },
  stepNav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 32,
    paddingTop: 20,
    borderTop: `1px solid ${COLORS.border}`,
  },
  btnBack: {
    background: COLORS.creamWarm,
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "14px 28px",
    fontWeight: 700,
    fontSize: 15,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
    boxShadow: `0 6px 0 ${COLORS.borderSoft}, 0 8px 20px rgba(42, 51, 64, 0.08)`,
  },
  btnNext: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `4px solid ${COLORS.blueDark}`,
    borderRadius: 999,
    padding: "14px 40px",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    fontFamily: FONTS.display,
    textTransform: "uppercase",
    letterSpacing: 1,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    marginLeft: "auto",
    boxShadow: `0 6px 0 ${COLORS.blueDark}, 0 10px 24px rgba(90, 127, 168, 0.3)`,
  },
  btnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
  },
  bigSliderWrap: {
    marginTop: 16,
  },
  countPill: {
    background: COLORS.yellow,
    color: COLORS.ink,
    fontSize: 14,
    fontWeight: 700,
    padding: "4px 14px",
    borderRadius: 999,
    border: `1px solid ${COLORS.yellowDark}`,
  },
  optionBtn: {
    flex: 1,
    background: COLORS.creamSoft,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "16px 20px",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "all 0.12s ease",
    boxShadow: `0 6px 0 ${COLORS.borderSoft}, 0 8px 20px rgba(42, 51, 64, 0.06)`,
  },
  optionBtnActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 6px 0 ${COLORS.blueDark}, 0 10px 24px rgba(90, 127, 168, 0.3)`,
  },
  timerBtn: {
    background: COLORS.creamSoft,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "16px 24px",
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "all 0.12s ease",
    textAlign: "center",
    minWidth: 100,
    boxShadow: `0 6px 0 ${COLORS.borderSoft}, 0 8px 20px rgba(42, 51, 64, 0.06)`,
  },
  timerBtnActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 6px 0 ${COLORS.blueDark}, 0 10px 24px rgba(90, 127, 168, 0.3)`,
  },
  spinner: {
    width: 14,
    height: 14,
    border: `2px solid ${COLORS.creamSoft}`,
    borderTopColor: "transparent",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  sidebar: {
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    position: "sticky",
    top: 20,
    alignSelf: "start",
  },
  toolBtnSm: {
    background: COLORS.creamWarm,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "7px 14px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
    transition: "transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease",
    boxShadow: `0 4px 0 ${COLORS.borderSoft}, 0 4px 10px rgba(42, 51, 64, 0.05)`,
  },
  toolBtnSmActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 4px 0 ${COLORS.blueDark}, 0 6px 14px rgba(90, 127, 168, 0.25)`,
  },
  cardList: {
    display: "flex",
    flexDirection: "column",
  },
  actionBtnPrimary: {
    background: COLORS.sageDark,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `4px solid #375031`,
    borderRadius: 999,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    minHeight: 40,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 #375031, 0 8px 18px rgba(55, 80, 49, 0.25)`,
  },
  actionBtnCoral: {
    background: COLORS.coral,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `4px solid ${COLORS.coralDark}`,
    borderRadius: 999,
    padding: "10px 22px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    minHeight: 40,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 ${COLORS.coralDark}, 0 8px 18px rgba(215, 121, 102, 0.25)`,
  },
  actionBtnGhost: {
    background: COLORS.creamSoft,
    color: COLORS.ink,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "10px 18px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    minHeight: 40,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 6px 14px rgba(42, 51, 64, 0.06)`,
  },
  actionBtnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
});

const buildCardStyles = (COLORS) => ({
  card: {
    position: "relative",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 18,
    padding: "18px 20px",
    marginBottom: 10,
    transition: "border-color 0.15s, opacity 0.15s, transform 0.15s, box-shadow 0.15s",
    userSelect: "none",
    boxShadow: `0 6px 0 ${COLORS.borderSoft}, 0 6px 16px rgba(42, 51, 64, 0.06)`,
  },
  cardEditing: {
    borderLeft: `4px solid ${COLORS.blue}`,
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 6px 0 ${COLORS.blueDark}, 0 8px 20px rgba(90, 127, 168, 0.2)`,
  },
  cardError: {
    borderColor: COLORS.coral,
    borderBottomColor: COLORS.coralDark,
    boxShadow: `0 6px 0 ${COLORS.coralDark}, 0 6px 16px rgba(215, 121, 102, 0.15)`,
  },
  cardDragOver: {
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    background: COLORS.blueSoft,
    boxShadow: `0 6px 0 ${COLORS.blueDark}, 0 8px 20px rgba(90, 127, 168, 0.2)`,
  },
  dropLine: {
    position: "absolute", top: -7, left: 0, right: 0, height: 4, background: COLORS.blueDark, borderRadius: 2,
  },
  headerRow: {
    display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8,
  },
  qLabel: {
    fontFamily: FONTS.display, fontWeight: 700, fontSize: 13, color: COLORS.ink,
    background: COLORS.yellow, padding: "4px 12px", borderRadius: 999, letterSpacing: 0.5,
    borderBottom: `3px solid ${COLORS.yellowDark}`,
    boxShadow: `0 4px 0 ${COLORS.yellowDark}, 0 4px 10px rgba(232, 199, 107, 0.25)`,
  },
  actions: { display: "flex", gap: 6 },
  iconBtn: {
    background: COLORS.creamWarm, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft,
    cursor: "pointer", fontSize: 13, padding: "6px 10px", borderRadius: 999, transition: "all 0.12s ease",
    fontFamily: FONTS.display, fontWeight: 700,
    borderBottom: `3px solid ${COLORS.border}`,
    boxShadow: `0 4px 0 ${COLORS.borderSoft}, 0 3px 8px rgba(42,51,64,0.05)`,
  },
  deleteBtn: {
    background: COLORS.coralSoft, borderColor: COLORS.coral, color: COLORS.coralDark,
    borderBottomColor: COLORS.coralDark,
    boxShadow: `0 4px 0 ${COLORS.coralDark}, 0 3px 8px rgba(215,121,102,0.15)`,
  },
  questionText: {
    fontSize: 16, fontWeight: 500, lineHeight: 1.45, color: COLORS.ink, marginBottom: 10, userSelect: "text",
  },
  choiceList: { display: "flex", flexDirection: "column", gap: 6 },
  choiceRow: {
    display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 999, fontSize: 13,
    borderBottom: `3px solid ${COLORS.border}`,
    transition: "all 0.12s ease",
  },
  choiceCorrect: {
    background: COLORS.sageSoft, border: `1px solid ${COLORS.sageDark}`, color: COLORS.quizPositive,
    borderBottomColor: COLORS.sageDark,
    boxShadow: `0 4px 0 ${COLORS.sageDark}, 0 3px 10px rgba(130,168,123,0.2)`,
  },
  choiceNeutral: {
    background: COLORS.creamWarm, border: `1px solid ${COLORS.border}`, color: COLORS.inkSoft,
    borderBottomColor: COLORS.border,
    boxShadow: `0 4px 0 ${COLORS.borderSoft}, 0 2px 6px rgba(42,51,64,0.04)`,
  },
  choiceDot: { fontWeight: 700, fontSize: 12, minWidth: 16, textAlign: "center" },
  errorBanner: {
    marginTop: 10, background: COLORS.coralSoft, border: `1px solid ${COLORS.coral}`,
    color: COLORS.coralDark, borderRadius: 10, padding: "8px 12px", fontSize: 12, lineHeight: 1.5,
    borderBottom: `3px solid ${COLORS.coralDark}`,
  },
  editBody: { display: "flex", flexDirection: "column", userSelect: "text" },
  fieldLabel: {
    fontSize: 11, fontWeight: 700, color: COLORS.inkSoft, letterSpacing: 0.4,
    textTransform: "uppercase", marginBottom: 6,
  },
  fieldHint: { textTransform: "none", fontWeight: 400, color: COLORS.inkMuted },
  textarea: {
    width: "100%", background: COLORS.creamSoft, border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 12, color: COLORS.ink, fontSize: 15, lineHeight: 1.5,
    padding: "10px 12px", resize: "vertical", outline: "none", fontFamily: "inherit",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  choiceEditRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  radio: { accentColor: COLORS.sageDark, width: 16, height: 16, flexShrink: 0, cursor: "pointer" },
  choiceInput: {
    flex: 1, background: COLORS.creamSoft, border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999, color: COLORS.ink, fontSize: 13, padding: "9px 14px",
    outline: "none", fontFamily: "inherit", transition: "border-color 0.15s, box-shadow 0.15s",
  },
  choiceInputCorrect: { borderColor: COLORS.sageDark, borderBottomColor: COLORS.sageDark, background: COLORS.sageSoft },
  addChoiceBtn: {
    background: COLORS.creamWarm, border: `2px dashed ${COLORS.border}`,
    borderBottom: `3px dashed ${COLORS.border}`,
    borderRadius: 999, color: COLORS.inkMuted, fontSize: 13, fontWeight: 700,
    padding: "8px 12px", cursor: "pointer", fontFamily: FONTS.display, marginTop: 4, letterSpacing: 0.3,
    transition: "all 0.12s ease",
  },
  removeChoiceBtn: {
    background: COLORS.coralSoft, border: `1px solid ${COLORS.coral}`, color: COLORS.coralDark,
    width: 28, height: 28, borderRadius: 999, cursor: "pointer", fontSize: 12, flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontWeight: 700, borderBottom: `3px solid ${COLORS.coralDark}`,
    boxShadow: `0 3px 0 ${COLORS.coralDark}, 0 3px 6px rgba(215,121,102,0.12)`,
    transition: "all 0.12s ease",
  },
  inputError: { borderColor: COLORS.coral, borderBottomColor: COLORS.coralDark },
  fieldError: { fontSize: 11, color: COLORS.coralDark, marginTop: 3, marginBottom: 3 },
  inlineError: { fontSize: 11, color: COLORS.coralDark, whiteSpace: "nowrap" },
  editFooter: {
    display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 14,
    marginTop: 16, paddingTop: 12, borderTop: `1px solid ${COLORS.borderSoft}`,
  },
  cancelLink: {
    background: "none", border: "none", color: COLORS.inkMuted, fontSize: 13,
    cursor: "pointer", padding: "6px 4px", textDecoration: "underline", fontFamily: "inherit",
    fontWeight: 700,
  },
  saveBtn: {
    background: COLORS.sageDark, color: COLORS.creamSoft, border: "none",
    borderBottom: `3px solid #375031`,
    borderRadius: 999, padding: "9px 22px", fontSize: 13, fontWeight: 700,
    cursor: "pointer", fontFamily: FONTS.display, letterSpacing: 0.5,
    boxShadow: `0 4px 0 #375031, 0 5px 12px rgba(55,80,49,0.2)`,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
  },
});

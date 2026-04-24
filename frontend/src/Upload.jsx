﻿import React, { useState, useRef, useCallback, useEffect } from "react";
import { generateQuiz, getMyGames } from "./api.js";

const ALLOWED = [".pdf", ".pptx"];

const TIMER_PRESETS = [
  { id: "quick", label: "Quick", seconds: 10 },
  { id: "standard", label: "Standard", seconds: 20 },
  { id: "thinker", label: "Thinker", seconds: 30 },
  { id: "extended", label: "Extended", seconds: 45 },
];

const LOCKED_FEATURES = [
  "⏱️ Question Timers",
  "💾 Save Quizzes",
  "🌍 Publish to Discover",
  "📌 Pin Favorites",
];

function normalizeTimeControl(value) {
  const seconds = Number(value?.secondsPerQuestion);
  const matchingPreset = TIMER_PRESETS.find((preset) => preset.seconds === seconds);
  return {
    enabled: Boolean(value?.enabled && Number.isFinite(seconds) && seconds >= 5 && seconds <= 120),
    preset: matchingPreset ? matchingPreset.id : "standard",
    secondsPerQuestion: Number.isFinite(seconds) ? Math.max(5, Math.min(120, Math.round(seconds))) : 20,
  };
}

function buildTimeControlPayload(value) {
  if (!value?.enabled) {
    return { enabled: false };
  }

  return {
    enabled: true,
    mode: "per_question",
    secondsPerQuestion: Math.max(5, Math.min(120, Math.round(Number(value.secondsPerQuestion) || 20))),
  };
}

function formatTimerSummary(value) {
  if (!value?.enabled) {
    return "Off";
  }
  return `${Math.round(value.secondsPerQuestion)}s / question`;
}

function fileIsValid(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return ALLOWED.some((ext) => name.endsWith(ext));
}

export default function Upload({ onQuizReady, onHostReady, user, onPlayPinned }) {
  const [dragging, setDragging]       = useState(false);
  const [file, setFile]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [progress, setProgress]       = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [prompt, setPrompt]           = useState("");
  const [pinnedGames, setPinnedGames] = useState([]);
  const [timeControl, setTimeControl] = useState(() => normalizeTimeControl({ enabled: false }));
  const [featureIndex, setFeatureIndex] = useState(0);
  const inputRef                      = useRef();
  const username = user?.username || user?.email?.split("@")[0] || "";

  useEffect(() => {
    if (user) {
      getMyGames()
        .then((payload) => setPinnedGames((payload?.games ?? []).filter((g) => g.pinned)))
        .catch((err) => console.error("Failed to load pinned games:", err));
    } else {
      const interval = setInterval(() => {
        setFeatureIndex((prev) => (prev + 1) % LOCKED_FEATURES.length);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [user]);

  const pickFile = (f) => {
    setError("");
    if (!fileIsValid(f)) {
      setError("Only .pdf and .pptx files are supported.");
      return;
    }
    // 20 MB size limit check (20 * 1024 * 1024)
    if (f.size > 20 * 1024 * 1024) {
      setError("File exceeds the 20MB limit.");
      return;
    }
    setFile(f);
  };

  const onInputChange = (e) => pickFile(e.target.files[0]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    pickFile(e.dataTransfer.files[0]);
  }, []);

  const onDragOver  = (e) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = ()  => setDragging(false);

  const handleSubmit = async (isHost = false) => {
    if (!file && !prompt.trim()) {
      const dummyQuestions = Array.from({ length: numQuestions }, (_, i) => ({
        question: `Question ${i + 1}`,
        choices: ["Option a", "Option b", "Option c", "Option d"],
        correct_index: 0
      }));
      const dummyQuiz = {
        questions: dummyQuestions,
        timeControl: buildTimeControlPayload(timeControl),
      };
      if (isHost) {
        onHostReady(dummyQuiz);
      } else {
        onQuizReady(dummyQuiz);
      }
      return;
    }
    setLoading(true);
    setError("");

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
      const quiz = await generateQuiz(file, numQuestions, prompt);
      const enrichedQuiz = {
        ...quiz,
        timeControl: buildTimeControlPayload(timeControl),
      };
      clearInterval(ticker);
      if (isHost) {
        onHostReady(enrichedQuiz);
      } else {
        onQuizReady(enrichedQuiz);
      }
    } catch (err) {
      clearInterval(ticker);
      setError(err.message);
    } finally {
      setLoading(false);
      setProgress("");
    }
  };

  return (
    <div style={styles.page}>
      {/* Header */}
      <header style={styles.header}>
        <span style={styles.logo}>Kuizu</span>
        <span style={styles.tagline}>slides → quiz in seconds</span>
      </header>

      <main style={styles.main}>
        {!user && (
          <>
            <h1 style={styles.h1}>
              Drop your deck.<br />
              <span style={styles.accent}>Get a quiz.</span>
            </h1>
            <p style={styles.sub}>
              Upload a PDF or PowerPoint to get a quiz made by Kuizu. You can edit it as you like before playing.
            </p>
          </>
        )}
        {user && (
          <div style={styles.userGreeting}>
            <p style={styles.userGreetingEyebrow}>Welcome back</p>
            <h1 style={styles.userGreetingTitle}>Hi {username || "there"}, build your next quiz.</h1>
            <p style={styles.userGreetingText}>
              Choose the question count and timer up front, then generate and review before you play.
            </p>
          </div>
        )}
        
        <div style={styles.cardContainer}>
          {/* Left Column */}
          <div style={styles.leftColumn}>
            {/* Drop zone */}
            <div
              style={{
                ...styles.dropzone,
                ...(dragging ? styles.dropzoneDragging : {}),
                ...(file ? styles.dropzoneHasFile : {}),
              }}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => !loading && inputRef.current.click()}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".pdf,.pptx"
                style={{ display: "none" }}
                onChange={onInputChange}
              />

              {file ? (
                <div style={styles.fileInfo}>
                  <span style={styles.fileIcon}>{file.name.endsWith(".pdf") ? "📄" : "📊"}</span>
                  <div style={{ flex: 1, textAlign: "left" }}>
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
                  <div style={styles.dropIcon}>⬆</div>
                  <div style={styles.dropText}>
                    {dragging ? "Drop it!" : "Drag & drop or click to browse"}
                  </div>
                  <div style={styles.dropMeta}>PDF · PPTX · max 20 MB</div>
                </div>
              )}
            </div>

            {/* Custom Prompt Section */}
            <div style={styles.promptWrap}>
              <div style={styles.promptHeader}>
                <span style={styles.promptLabel}>Prompt / Context Text</span>
                <span style={{
                  ...styles.promptCounter, 
                  color: prompt.length >= 4000 ? "#FF6B6B" : "#B0BAC3"
                }}>
                  {prompt.length} / 4000
                </span>
              </div>
              <textarea
                style={{
                  ...styles.promptInput,
                  borderColor: prompt.length >= 4000 ? "#FF6B6B" : "#0F3460",
                }}
                value={prompt}
                maxLength={4000}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={loading}
                onFocus={(e) => {
                  if (prompt.length < 4000) {
                    e.currentTarget.style.borderColor = "#00D2D3";
                    e.currentTarget.style.boxShadow = "0 0 0 4px rgba(124, 111, 255, 0.1)";
                  }
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = prompt.length >= 4000 ? "#FF6B6B" : "#0F3460";
                  e.currentTarget.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Error */}
            {error && <div style={styles.error}>{error}</div>}

            {/* Submit Actions */}
            <div style={styles.btnGroup}>
              <button
                style={{
                  ...styles.btn,
                  ...(loading ? styles.btnDisabled : {}),
                }}
                onClick={() => handleSubmit(false)}
                disabled={loading}
              >
                {loading ? (
                  <span style={styles.loadingRow}>
                    <span style={styles.spinner} />
                    {progress}
                  </span>
                ) : file || prompt.trim() ? "Play Solo" : "Play empty quiz Solo"}
              </button>
              
              <button
                style={{
                  ...styles.btnSecondary,
                  ...(loading ? styles.btnSecondaryDisabled : {}),
                }}
                onClick={() => handleSubmit(true)}
                disabled={loading}
              >
                {loading ? "Generating Quiz..." : file || prompt.trim() ? "Host Multiplayer" : "Host empty Multiplayer quiz"}
              </button>
            </div>

            <p style={styles.hint}>
              Runs locally / Groq API · No data stored · Free
            </p>
          </div>

          {/* Right Column */}
          <div style={styles.rightColumn}>
            {/* Question count slider */}
            <div style={styles.sliderWrap}>
              <div style={styles.sliderHeader}>
                <span style={styles.sliderLabel}>Number of questions</span>
                <span style={styles.sliderValue}>{numQuestions}</span>
              </div>
              <input
                type="range"
                min={5}
                max={20}
                step={1}
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
                disabled={loading}
                style={styles.slider}
              />
              <div style={styles.sliderTicks}>
                <div style={{ position: "relative", width: "100%", height: "12px" }}>
                  <span style={{ position: "absolute", left: "8px", transform: "translateX(-50%)" }}>5</span>
                  <span style={{ position: "absolute", left: "calc(8px + (100% - 16px) * 0.3333)", transform: "translateX(-50%)" }}>10</span>
                  <span style={{ position: "absolute", left: "calc(8px + (100% - 16px) * 0.6666)", transform: "translateX(-50%)" }}>15</span>
                  <span style={{ position: "absolute", left: "calc(100% - 8px)", transform: "translateX(-50%)" }}>20</span>
                </div>
              </div>
            </div>

            {!user && (
              <div style={styles.lockedFeaturesCard}>
                <div style={styles.lockedFeaturesIcon}>
                  <div key={featureIndex} style={styles.lockedFeatureText}>
                    {LOCKED_FEATURES[featureIndex]}
                  </div>
                </div>
                <div style={styles.lockedFeaturesContent}>
                  <div style={styles.lockedFeaturesTitle}>Log in to access more features</div>
                  <div style={styles.lockedFeaturesText}>
                    Use timer controls and more once you are signed in.
                  </div>
                </div>
              </div>
            )}

            {user && (
              <div style={styles.timerWrap}>
                <div style={styles.timerHeader}>
                  <span style={styles.sliderLabel}>Question timer</span>
                  <span style={styles.timerValue}>{formatTimerSummary(timeControl)}</span>
                </div>

                <div style={styles.timerModeRow}>
                  <button
                    type="button"
                    onClick={() => setTimeControl((prev) => ({ ...prev, enabled: false }))}
                    style={{
                      ...styles.timerModeBtn,
                      ...(!timeControl.enabled ? styles.timerModeBtnActive : {}),
                    }}
                    disabled={loading}
                  >
                    Off
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTimeControl((prev) => ({
                        ...prev,
                        enabled: true,
                        preset: prev.preset || "standard",
                        secondsPerQuestion: prev.secondsPerQuestion || 20,
                      }))
                    }
                    style={{
                      ...styles.timerModeBtn,
                      ...(timeControl.enabled ? styles.timerModeBtnActive : {}),
                    }}
                    disabled={loading}
                  >
                    On
                  </button>
                </div>

                {timeControl.enabled && (
                  <>
                    <div style={styles.timerPresetGrid}>
                      {TIMER_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setTimeControl({
                              enabled: true,
                              preset: preset.id,
                              secondsPerQuestion: preset.seconds,
                            })
                          }
                          style={{
                            ...styles.timerPresetBtn,
                            ...(timeControl.preset === preset.id ? styles.timerPresetBtnActive : {}),
                          }}
                          disabled={loading}
                        >
                          <span style={styles.timerPresetName}>{preset.label}</span>
                          <span style={styles.timerPresetSeconds}>{preset.seconds}s</span>
                        </button>
                      ))}
                    </div>

                    <div style={styles.customTimerRow}>
                      <button
                        type="button"
                        onClick={() =>
                          setTimeControl((prev) => ({
                            ...prev,
                            enabled: true,
                            preset: "custom",
                          }))
                        }
                        style={{
                          ...styles.customTimerBtn,
                          ...(timeControl.preset === "custom" ? styles.customTimerBtnActive : {}),
                        }}
                        disabled={loading}
                      >
                        Custom
                      </button>
                      <input
                        type="number"
                        min={5}
                        max={120}
                        value={timeControl.secondsPerQuestion}
                        onChange={(e) =>
                          setTimeControl({
                            enabled: true,
                            preset: "custom",
                            secondsPerQuestion: Math.max(5, Math.min(120, Number(e.target.value) || 5)),
                          })
                        }
                        disabled={loading || timeControl.preset !== "custom"}
                        style={{
                          ...styles.customTimerInput,
                          ...(timeControl.preset !== "custom" ? styles.customTimerInputDisabled : {}),
                        }}
                      />
                      <span style={styles.customTimerText}>seconds per question</span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Pinned Quizzes */}
            {user && pinnedGames.length > 0 && (
              <div style={styles.pinnedWrap}>
                <div style={styles.pinnedHeader}>Pinned Quizzes</div>
                <div style={styles.pinnedList}>
                  {pinnedGames.map((game) => (
                    <div
                      key={game.id}
                      style={styles.pinnedItem}
                      onClick={() => onPlayPinned?.(game.quiz)}
                    >
                      <div style={styles.pinnedItemTitle}>{game.title}</div>
                      <div style={styles.pinnedItemMeta}>
                        {game.questions_count} Qs &bull; {game.category || "Quiz"}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

        <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(15px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type=range] {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: #0F3460;
          border-radius: 2px;
          outline: none;
          cursor: pointer;
        }
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00D2D3;
          cursor: pointer;
          border: 2px solid #1A1A2E;
          box-shadow: 0 0 0 2px #00D2D344;
        }
        input[type=range]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #00D2D3;
          cursor: pointer;
          border: 2px solid #1A1A2E;
        }
        input[type=range]:disabled {
          opacity: 0.4;
          cursor: not-allowed;
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
    alignItems: "center",
    gap: "12px",
    padding: "24px 40px",
    borderBottom: "1px solid #1e1e2e",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "22px",
    color: "#F1F2F6",
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: "13px",
    color: "#B0BAC3",
    fontWeight: 400,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "clamp(20px, 4vh, 60px) 24px",
    animation: "fadeUp 0.5s ease both",
    width: "100%",
    boxSizing: "border-box",
  },
  cardContainer: {
    display: "flex",
    flexDirection: "row",
    gap: "clamp(20px, 4vh, 40px)",
    width: "100%",
    maxWidth: "1000px",
    alignItems: "stretch",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  leftColumn: {
    flex: "1 1 500px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  rightColumn: {
    flex: "1 1 350px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  userGreeting: {
    width: "100%",
    maxWidth: "1000px",
    marginBottom: "clamp(16px, 3vh, 28px)",
    textAlign: "center",
  },
  userGreetingEyebrow: {
    margin: 0,
    color: "#87f4ee",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px",
  },
  userGreetingTitle: {
    margin: "8px 0 10px 0",
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(32px, 4.5vw, 48px)",
    lineHeight: 1.08,
    color: "#F1F2F6",
    letterSpacing: "-1px",
  },
  userGreetingText: {
    margin: 0,
    color: "#B0BAC3",
    fontSize: "16px",
    lineHeight: 1.55,
  },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(36px, 5vw, 56px)",
    lineHeight: 1.1,
    textAlign: "center",
    marginBottom: "clamp(10px, 2vh, 20px)",
    color: "#F1F2F6",
    letterSpacing: "-1.5px",
  },
  accent: {
    color: "#00D2D3",
  },
  sub: {
    fontSize: "17px",
    color: "#B0BAC3",
    textAlign: "center",
    maxWidth: "480px",
    lineHeight: 1.6,
    marginBottom: "clamp(20px, 4vh, 40px)",
  },
  dropzone: {
    width: "100%",
    maxWidth: "520px",
    minHeight: "clamp(120px, 18vh, 180px)",
    border: "2px dashed #0F3460",
    borderRadius: "16px",
    background: "#16213E",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    marginBottom: "clamp(12px, 2.5vh, 20px)",
    padding: "clamp(16px, 3vh, 28px)",
    boxSizing: "border-box",
  },
  dropzoneDragging: {
    borderColor: "#00D2D3",
    background: "#1A1A2E",
  },
  dropzoneHasFile: {
    bordercolor: "#F1F2F6",
    borderStyle: "solid",
  },
  dropPrompt: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    pointerEvents: "none",
  },
  dropIcon: {
    fontSize: "32px",
    color: "#F1F2F6",
  },
  dropText: {
    fontSize: "16px",
    color: "#B0BAC3",
    fontWeight: 500,
  },
  dropMeta: {
    fontSize: "13px",
    color: "#F1F2F6",
  },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    width: "100%",
  },
  fileIcon: {
    fontSize: "32px",
    flexShrink: 0,
  },
  fileName: {
    fontSize: "15px",
    fontWeight: 500,
    color: "#F1F2F6",
    wordBreak: "break-all",
  },
  fileSize: {
    fontSize: "13px",
    color: "#B0BAC3",
    marginTop: "2px",
  },
  clearBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#B0BAC3",
    cursor: "pointer",
    fontSize: "18px",
    padding: "4px 8px",
    flexShrink: 0,
    lineHeight: 1,
  },
  sliderWrap: {
    width: "100%",
    maxWidth: "520px",
    marginBottom: "clamp(12px, 2.5vh, 20px)",
    background: "#16213E",
    border: "1px solid #1e1e2e",
    borderRadius: "14px",
    padding: "clamp(14px, 2.5vh, 18px) 22px",
    boxSizing: "border-box",
  },
  sliderHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: "14px",
  },
  sliderLabel: {
    fontSize: "14px",
    color: "#B0BAC3",
    fontWeight: 500,
  },
  sliderValue: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "22px",
    color: "#00D2D3",
    lineHeight: 1,
  },
  slider: {
    display: "block",
    width: "100%",
    marginBottom: "8px",
  },
  sliderTicks: {
    position: "relative",
    fontSize: "12px",
    color: "#F1F2F6",
    paddingTop: "2px",
  },
  timerWrap: {
    width: "100%",
    maxWidth: "520px",
    marginBottom: "clamp(12px, 2.5vh, 20px)",
    background: "#16213E",
    border: "1px solid #1e1e2e",
    borderRadius: "14px",
    padding: "clamp(14px, 2.5vh, 18px) 22px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    gap: "clamp(10px, 2vh, 14px)",
  },
  lockedFeaturesCard: {
    width: "100%",
    maxWidth: "520px",
    marginBottom: "clamp(12px, 2.5vh, 20px)",
    background: "#16213E",
    border: "1px solid #2B5A8A",
    borderRadius: "12px",
    padding: "clamp(20px, 4vh, 32px) 24px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "clamp(12px, 2.5vh, 20px)",
    flex: 1,
  },
  lockedFeaturesIcon: {
    flexShrink: 0,
    width: "180px",
    height: "48px",
    borderRadius: "16px",
    background: "#122038",
    border: "1px solid #2B5A8A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#8deeed",
    fontSize: "13px",
    fontWeight: 700,
    letterSpacing: "0.3px",
    overflow: "hidden",
  },
  lockedFeatureText: {
    animation: "slideInUp 0.4s ease-out forwards",
    whiteSpace: "nowrap",
  },
  lockedFeaturesContent: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    alignItems: "center",
    textAlign: "center",
  },
  lockedFeaturesTitle: {
    color: "#F1F2F6",
    fontSize: "16px",
    fontWeight: 700,
    lineHeight: 1.35,
  },
  lockedFeaturesText: {
    color: "#9bb1cb",
    fontSize: "14px",
    lineHeight: 1.45,
  },
  timerHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "baseline",
    gap: "12px",
    flexWrap: "wrap",
  },
  timerValue: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "18px",
    color: "#00D2D3",
    lineHeight: 1,
  },
  timerModeRow: {
    display: "flex",
    gap: "10px",
  },
  timerModeBtn: {
    flex: 1,
    border: "1px solid #365d86",
    background: "transparent",
    color: "#b7c8dc",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  timerModeBtnActive: {
    background: "#00D2D3",
    color: "#122038",
    borderColor: "#00D2D3",
  },
  timerPresetGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: "10px",
  },
  timerPresetBtn: {
    border: "1px solid #304f75",
    background: "#111d31",
    color: "#d9ebff",
    borderRadius: "12px",
    padding: "12px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "5px",
    textAlign: "left",
  },
  timerPresetBtnActive: {
    background: "linear-gradient(180deg, rgba(0, 210, 211, 0.18) 0%, rgba(0, 210, 211, 0.06) 100%)",
    borderColor: "#56d8d8",
  },
  timerPresetName: {
    fontSize: "14px",
    fontWeight: 700,
  },
  timerPresetSeconds: {
    fontSize: "12px",
    color: "#9bb7d4",
  },
  customTimerRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap",
  },
  customTimerBtn: {
    border: "1px solid #365d86",
    background: "transparent",
    color: "#b7c8dc",
    borderRadius: "10px",
    padding: "10px 12px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  customTimerBtnActive: {
    background: "#1c3455",
    color: "#F1F2F6",
    borderColor: "#58a9d2",
  },
  customTimerInput: {
    width: "100px",
    borderRadius: "10px",
    border: "1px solid #365d86",
    background: "#111d31",
    color: "#F1F2F6",
    padding: "10px 12px",
    fontSize: "14px",
    outline: "none",
  },
  customTimerInputDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  customTimerText: {
    fontSize: "12px",
    color: "#90a9c5",
  },
  promptWrap: {
    width: "100%",
    maxWidth: "520px",
    marginBottom: "clamp(12px, 2.5vh, 20px)",
    background: "#252A4A",
    border: "1px solid #0F3460",
    borderRadius: "16px",
    padding: "clamp(16px, 2.5vh, 20px)",
    boxSizing: "border-box",
    boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
    animation: "fadeUp 0.6s ease both",
  },
  promptHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "12px",
  },
  promptLabel: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#F1F2F6",
    fontFamily: "'Syne', sans-serif",
  },
  promptCounter: {
    fontSize: "13px",
    fontWeight: 500,
    transition: "color 0.2s ease",
  },
  promptInput: {
    width: "100%",
    minHeight: "clamp(60px, 10vh, 80px)",
    background: "#16213E",
    borderStyle: "solid", borderWidth: "2px", bordercolor: "#F1F2F6",
    borderRadius: "12px",
    padding: "clamp(12px, 2vh, 16px)",
    color: "#F1F2F6",
    fontSize: "15px",
    fontFamily: "'DM Sans', sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  error: {
    background: "#1e0f0f",
    border: "1px solid #5a2020",
    color: "#ff7070",
    borderRadius: "10px",
    padding: "12px 18px",
    fontSize: "14px",
    maxWidth: "520px",
    width: "100%",
    marginBottom: "16px",
    boxSizing: "border-box",
  },
  btnGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    width: "100%",
    maxWidth: "520px",
    marginBottom: "clamp(12px, 2.5vh, 16px)",
  },
  btn: {
    background: "#00D2D3",
    color: "#16213E",
    border: "none",
    borderRadius: "12px",
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s, transform 0.1s",
  },
  btnDisabled: {
    background: "#2a2a3e",
    color: "#4a4a5e",
    cursor: "not-allowed",
  },
  btnSecondary: {
    background: "transparent",
    color: "#FF9F43",
      border: "2px solid #FF9F43",
    borderRadius: "12px",
    padding: "14px 40px",
    fontSize: "16px",
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    width: "100%",
    transition: "background 0.2s, color 0.2s",
  },
  btnSecondaryDisabled: {
    borderColor: "#2a2a3e",
    color: "#4a4a5e",
    cursor: "not-allowed",
  },
  loadingRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
  },
  spinner: {
    display: "inline-block",
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.2)",
    borderTopColor: "#16213E",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  hint: {
    fontSize: "13px",
    color: "#F1F2F6",
  },
  pinnedWrap: {
    width: "100%",
    maxWidth: "520px",
    background: "transparent",
    borderTop: "1px solid #1e1e2e",
    paddingTop: "clamp(16px, 3vh, 24px)",
    boxSizing: "border-box",
    marginTop: "clamp(12px, 2.5vh, 20px)",
  },
  pinnedHeader: {
    fontSize: "13px",
    fontWeight: 700,
    color: "#B0BAC3",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    marginBottom: "16px",
  },
  pinnedList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  pinnedItem: {
    background: "#16213E",
    border: "1px solid #2B5A8A",
    borderRadius: "10px",
    padding: "16px",
    cursor: "pointer",
    transition: "background 0.2s, transform 0.2s",
  },
  pinnedItemTitle: {
    fontSize: "15px",
    fontWeight: 600,
    color: "#F1F2F6",
    marginBottom: "4px",
  },
  pinnedItemMeta: {
    fontSize: "13px",
    color: "#00D2D3",
  },
};

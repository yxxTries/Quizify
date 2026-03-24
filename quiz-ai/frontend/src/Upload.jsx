import React, { useState, useRef, useCallback } from "react";
import { generateQuiz } from "./api.js";

const ALLOWED = [".pdf", ".pptx"];

function fileIsValid(file) {
  if (!file) return false;
  const name = file.name.toLowerCase();
  return ALLOWED.some((ext) => name.endsWith(ext));
}

export default function Upload({ onQuizReady }) {
  const [dragging, setDragging]   = useState(false);
  const [file, setFile]           = useState(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [progress, setProgress]   = useState("");
  const inputRef                  = useRef();

  const pickFile = (f) => {
    setError("");
    if (!fileIsValid(f)) {
      setError("Only .pdf and .pptx files are supported.");
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

  const handleSubmit = async () => {
    if (!file) return;
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
      const quiz = await generateQuiz(file);
      clearInterval(ticker);
      onQuizReady(quiz);
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
        <span style={styles.logo}>QuizAI</span>
        <span style={styles.tagline}>slides → quiz in seconds</span>
      </header>

      <main style={styles.main}>
        <h1 style={styles.h1}>
          Drop your deck.<br />
          <span style={styles.accent}>Get a quiz.</span>
        </h1>
        <p style={styles.sub}>
          Upload a PDF or PowerPoint. The AI reads it and writes 10 questions — instantly.
        </p>

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
              <div>
                <div style={styles.fileName}>{file.name}</div>
                <div style={styles.fileSize}>{(file.size / 1024).toFixed(0)} KB</div>
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

        {/* Error */}
        {error && <div style={styles.error}>{error}</div>}

        {/* Submit */}
        <button
          style={{
            ...styles.btn,
            ...((!file || loading) ? styles.btnDisabled : {}),
          }}
          onClick={handleSubmit}
          disabled={!file || loading}
        >
          {loading ? (
            <span style={styles.loadingRow}>
              <span style={styles.spinner} />
              {progress}
            </span>
          ) : "Generate Quiz →"}
        </button>

        <p style={styles.hint}>
          Runs locally · No data stored · Free
        </p>
      </main>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
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
    gap: "12px",
    padding: "24px 40px",
    borderBottom: "1px solid #1e1e2e",
  },
  logo: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "22px",
    color: "#f0ede8",
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: "13px",
    color: "#6b6b7e",
    fontWeight: 400,
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "60px 24px",
    animation: "fadeUp 0.5s ease both",
  },
  h1: {
    fontFamily: "'Syne', sans-serif",
    fontWeight: 800,
    fontSize: "clamp(36px, 6vw, 64px)",
    lineHeight: 1.1,
    textAlign: "center",
    marginBottom: "20px",
    color: "#f0ede8",
    letterSpacing: "-1.5px",
  },
  accent: {
    color: "#7c6fff",
  },
  sub: {
    fontSize: "17px",
    color: "#8e8ea0",
    textAlign: "center",
    maxWidth: "480px",
    lineHeight: 1.6,
    marginBottom: "40px",
  },
  dropzone: {
    width: "100%",
    maxWidth: "520px",
    minHeight: "180px",
    border: "2px dashed #2e2e42",
    borderRadius: "16px",
    background: "#12121c",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color 0.2s, background 0.2s",
    marginBottom: "20px",
    padding: "28px",
    boxSizing: "border-box",
  },
  dropzoneDragging: {
    borderColor: "#7c6fff",
    background: "#16162a",
  },
  dropzoneHasFile: {
    borderColor: "#3d3d5c",
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
    color: "#3d3d5c",
  },
  dropText: {
    fontSize: "16px",
    color: "#6b6b7e",
    fontWeight: 500,
  },
  dropMeta: {
    fontSize: "13px",
    color: "#3d3d5c",
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
    color: "#f0ede8",
    wordBreak: "break-all",
  },
  fileSize: {
    fontSize: "13px",
    color: "#6b6b7e",
    marginTop: "2px",
  },
  clearBtn: {
    marginLeft: "auto",
    background: "none",
    border: "none",
    color: "#6b6b7e",
    cursor: "pointer",
    fontSize: "18px",
    padding: "4px 8px",
    flexShrink: 0,
    lineHeight: 1,
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
  btn: {
    background: "#7c6fff",
    color: "#fff",
    border: "none",
    borderRadius: "12px",
    padding: "16px 40px",
    fontSize: "16px",
    fontWeight: 500,
    fontFamily: "'DM Sans', sans-serif",
    cursor: "pointer",
    maxWidth: "520px",
    width: "100%",
    transition: "background 0.2s, transform 0.1s",
    marginBottom: "16px",
  },
  btnDisabled: {
    background: "#2a2a3e",
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
    borderTopColor: "#fff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
    flexShrink: 0,
  },
  hint: {
    fontSize: "13px",
    color: "#3d3d5c",
  },
};

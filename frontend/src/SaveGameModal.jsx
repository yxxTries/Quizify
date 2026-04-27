import React, { useEffect, useState, useMemo } from "react";
import { FONTS } from "./theme.js";
import { useTheme } from "./ThemeContext.jsx";

const CATEGORIES = [
  "Science",
  "History",
  "Math",
  "Gaming",
  "Language",
  "Business",
  "General",
  "Other",
];

export default function SaveGameModal({
  open,
  initialTitle,
  initialCategory,
  questionCount,
  loading,
  onClose,
  onConfirm,
}) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);
  const [title, setTitle] = useState(initialTitle || "");
  const [category, setCategory] = useState(initialCategory || "General");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initialTitle || "");
    setCategory(initialCategory || "General");
    setError("");
  }, [open, initialTitle, initialCategory]);

  if (!open) {
    return null;
  }

  const handleConfirm = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Choose a title before saving.");
      return;
    }

    try {
      setError("");
      await onConfirm({
        title: cleanTitle,
        category,
      });
    } catch (err) {
      setError(err?.message || "Could not save to Library.");
    }
  };

  return (
    <div style={styles.overlay} onClick={loading ? undefined : onClose}>
      <style>{`
        .modal-input:focus {
          border-color: ${COLORS.blueDark} !important;
          box-shadow: 0 0 0 3px ${COLORS.blueSoft} !important;
        }
      `}</style>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <p style={styles.kicker}>Save Quiz</p>
        <h2 style={styles.title}>Save to My Games</h2>
        <p style={styles.body}>
          Keep this quiz in your personal library to play or host later.
        </p>

        <div style={styles.form}>
          <label style={styles.label}>
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={120}
              style={styles.input}
              placeholder="Quiz title"
              className="modal-input"
            />
          </label>

          <label style={styles.label}>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={styles.select}
              className="modal-input"
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div style={styles.guidelines}>
          <p style={styles.guideline}>Private: Only you can see this until you post it.</p>
          <p style={styles.guideline}>Questions: {questionCount}</p>
          <p style={styles.guideline}>You can edit the topic and questions later.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          <button type="button" onClick={onClose} disabled={loading} style={styles.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading} style={styles.primary}>
            {loading ? "Saving..." : "Save Game"}
          </button>
        </div>
      </div>
    </div>
  );
}

const getStyles = (COLORS) => ({
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(42, 51, 64, 0.72)",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    zIndex: 100,
  },
  modal: {
    width: "100%",
    maxWidth: "520px",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderRadius: "18px",
    padding: "22px",
    color: COLORS.ink,
    boxShadow: "0 22px 60px rgba(42, 51, 64, 0.15)",
    fontFamily: FONTS.body,
  },
  kicker: {
    margin: 0,
    color: COLORS.blueDark,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  title: {
    margin: "10px 0 8px",
    fontSize: "28px",
    lineHeight: 1.1,
    fontFamily: FONTS.display,
  },
  body: {
    margin: 0,
    color: COLORS.inkSoft,
    fontSize: "14px",
  },
  form: {
    display: "grid",
    gap: "14px",
    marginTop: "18px",
  },
  label: {
    display: "grid",
    gap: "8px",
    fontSize: "13px",
    color: COLORS.ink,
    fontWeight: 700,
  },
  input: {
    borderRadius: "10px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cream,
    color: COLORS.ink,
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  select: {
    borderRadius: "10px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.cream,
    color: COLORS.ink,
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
    fontFamily: "inherit",
  },
  guidelines: {
    marginTop: "16px",
    padding: "14px",
    borderRadius: "12px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.creamWarm,
    display: "grid",
    gap: "6px",
  },
  guideline: {
    margin: 0,
    color: COLORS.inkSoft,
    fontSize: "13px",
  },
  error: {
    marginTop: "14px",
    borderRadius: "10px",
    border: `1px solid ${COLORS.coral}`,
    background: COLORS.coralSoft,
    color: COLORS.coralDark,
    padding: "10px 12px",
    fontSize: "13px",
    fontWeight: 600,
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
  },
  secondary: {
    borderRadius: "10px",
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.ink,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
  primary: {
    borderRadius: "10px",
    border: "none",
    background: COLORS.sageDark,
    color: COLORS.creamSoft,
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    fontFamily: "inherit",
  },
});
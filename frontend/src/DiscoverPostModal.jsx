import React, { useEffect, useState } from "react";

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

export default function DiscoverPostModal({
  open,
  initialTitle,
  initialCategory,
  questionCount,
  loading,
  onClose,
  onConfirm,
}) {
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
      setError("Choose a title before publishing.");
      return;
    }

    try {
      setError("");
      await onConfirm({
        title: cleanTitle,
        category,
      });
    } catch (err) {
      setError(err?.message || "Could not publish to Discover.");
    }
  };

  return (
    <div style={styles.overlay} onClick={loading ? undefined : onClose}>
      <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
        <p style={styles.kicker}>Publish to Discover</p>
        <h2 style={styles.title}>Share this quiz on the community board</h2>
        <p style={styles.body}>
          Your post will be public. Pick how it should appear, then confirm publish.
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
            />
          </label>

          <label style={styles.label}>
            Category
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              style={styles.select}
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
          <p style={styles.guideline}>Public post: visible to everyone in Discover.</p>
          <p style={styles.guideline}>Questions: {questionCount}</p>
          <p style={styles.guideline}>If you publish duplicates or too fast, posting will be blocked.</p>
          <p style={styles.guideline}>You can delete your own Discover posts later.</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.actions}>
          <button type="button" onClick={onClose} disabled={loading} style={styles.secondary}>
            Cancel
          </button>
          <button type="button" onClick={handleConfirm} disabled={loading} style={styles.primary}>
            {loading ? "Publishing..." : "Publish Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(7, 11, 20, 0.72)",
    display: "grid",
    placeItems: "center",
    padding: "20px",
    zIndex: 100,
  },
  modal: {
    width: "100%",
    maxWidth: "520px",
    background: "linear-gradient(180deg, #1c2341 0%, #121933 100%)",
    border: "1px solid #35567d",
    borderRadius: "18px",
    padding: "22px",
    color: "#f1f2f6",
    boxShadow: "0 22px 60px rgba(0, 0, 0, 0.42)",
  },
  kicker: {
    margin: 0,
    color: "#89f7ef",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.8px",
    textTransform: "uppercase",
  },
  title: {
    margin: "10px 0 8px",
    fontSize: "28px",
    lineHeight: 1.1,
  },
  body: {
    margin: 0,
    color: "#b6c3d8",
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
    color: "#d4e6fb",
    fontWeight: 700,
  },
  input: {
    borderRadius: "10px",
    border: "1px solid #375a83",
    background: "#0f172d",
    color: "#f1f2f6",
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
  },
  select: {
    borderRadius: "10px",
    border: "1px solid #375a83",
    background: "#0f172d",
    color: "#f1f2f6",
    padding: "11px 12px",
    fontSize: "14px",
    outline: "none",
  },
  guidelines: {
    marginTop: "16px",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #294a70",
    background: "rgba(12, 25, 46, 0.72)",
    display: "grid",
    gap: "6px",
  },
  guideline: {
    margin: 0,
    color: "#aecaeb",
    fontSize: "13px",
  },
  error: {
    marginTop: "14px",
    borderRadius: "10px",
    border: "1px solid #834045",
    background: "#2c1418",
    color: "#ffb7bf",
    padding: "10px 12px",
    fontSize: "13px",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "10px",
    marginTop: "18px",
  },
  secondary: {
    borderRadius: "10px",
    border: "1px solid #3b618f",
    background: "transparent",
    color: "#d3e5f8",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  primary: {
    borderRadius: "10px",
    border: "1px solid #54bea1",
    background: "#1ca37f",
    color: "#f4fffc",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
};

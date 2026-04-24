import React, { useEffect, useMemo, useState } from "react";
import { deleteDiscoverPost, getDiscoverPosts } from "./api";

const CATEGORIES = [
  "All",
  "Science",
  "History",
  "Math",
  "Gaming",
  "Language",
  "Business",
  "General",
  "Other",
];

export default function Discover({ onBack, onPlay, user, onRequireAuth }) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setError("");
      try {
        const payload = await getDiscoverPosts();
        if (!cancelled) {
          setPosts(Array.isArray(payload?.posts) ? payload.posts : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not load discover posts.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredQuizzes = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return posts.filter((quiz) => {
      const categoryMatch = category === "All" || quiz.category === category;
      const textMatch =
        !normalized ||
        quiz.title.toLowerCase().includes(normalized) ||
        quiz.author.toLowerCase().includes(normalized);

      return categoryMatch && textMatch;
    });
  }, [category, posts, search]);

  const handleDeletePost = async (event, post) => {
    event.stopPropagation();
    if (!user) {
      onRequireAuth?.();
      return;
    }
    if (!window.confirm(`Delete "${post.title}" from Discover?`)) {
      return;
    }

    setDeleteLoadingId(post.id);
    setFeedback("");
    try {
      await deleteDiscoverPost(post.id);
      setPosts((prev) => prev.filter((item) => item.id !== post.id));
      setFeedback(`Deleted "${post.title}" from Discover.`);
    } catch (err) {
      setFeedback(err?.message || "Could not delete Discover post.");
    } finally {
      setDeleteLoadingId(null);
    }
  };

  return (
    <div style={styles.page} className="discover-page">
      <style>{`
        @media (max-width: 768px) {
          .discover-page { padding-top: 116px !important; }
          .discover-header { flex-direction: column-reverse !important; align-items: stretch !important; }
          .discover-back-btn { width: 100% !important; text-align: center; }
        }
      `}</style>
      <div style={styles.container}>
        <header style={styles.header} className="discover-header">
          <div>
            <h1 style={styles.title}>Discover Community Quizzes</h1>
            <p style={styles.subtitle}>
              Browse public quizzes shared by the community.
            </p>
          </div>
          <button type="button" onClick={onBack} style={styles.backButton} className="discover-back-btn">
            Back to Home
          </button>
        </header>

        <section style={styles.controlsRow}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or creator"
            style={styles.searchInput}
          />

          <div style={styles.categoriesWrap}>
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                style={{
                  ...styles.categoryChip,
                  ...(category === item ? styles.categoryChipActive : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        {feedback && <div style={styles.feedbackBanner}>{feedback}</div>}

        <section style={styles.grid}>
          {loading && (
            <div style={styles.emptyState}>
              <h2 style={styles.emptyTitle}>Loading quizzes...</h2>
            </div>
          )}

          {!loading && error && (
            <div style={styles.emptyState}>
              <h2 style={styles.emptyTitle}>Could not load discover</h2>
              <p style={styles.emptyText}>{error}</p>
            </div>
          )}

          {!loading && !error && filteredQuizzes.length === 0 && (
            <div style={styles.emptyState}>
              <h2 style={styles.emptyTitle}>No quizzes found</h2>
              <p style={styles.emptyText}>Try another category or search term.</p>
            </div>
          )}

          {!loading && !error && filteredQuizzes.map((quiz) => (
            <article key={quiz.id} style={styles.card} onClick={() => onPlay(quiz.quiz)}>
              <div style={styles.cardTop}>
                <span style={styles.cardCategory}>{quiz.category}</span>
              </div>

              <h3 style={styles.cardTitle}>{quiz.title}</h3>

              <p style={styles.cardMeta}>by {quiz.author}</p>
              <p style={styles.cardMeta}>{quiz.plays} plays</p>
              <p style={styles.cardMeta}>{quiz.questions_count} questions</p>
              <p style={styles.cardMeta}>Estimated time: {quiz.estimated_time}</p>
              <p style={styles.cardMeta}>Rating: {quiz.rating.toFixed(1)} / 5</p>
              <div style={styles.cardActions}>
                <button
                  type="button"
                  style={styles.secondaryAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(quiz.quiz);
                  }}
                >
                  Play Quiz
                </button>
                {user?.id === quiz.user_id && (
                  <button
                    type="button"
                    style={styles.deleteAction}
                    onClick={(event) => handleDeletePost(event, quiz)}
                    disabled={deleteLoadingId === quiz.id}
                  >
                    {deleteLoadingId === quiz.id ? "Deleting..." : "Delete"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1A1A2E",
    color: "#F1F2F6",
    padding: "clamp(16px, 4vw, 32px) clamp(14px, 3vw, 20px)",
  },
  container: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "clamp(20px, 5vw, 34px)",
    lineHeight: 1.1,
    margin: 0,
    color: "#F1F2F6",
  },
  subtitle: {
    marginTop: "8px",
    color: "#B0BAC3",
    maxWidth: "740px",
    fontSize: "clamp(13px, 3vw, 15px)",
  },
  backButton: {
    border: "1px solid #2B5A8A",
    background: "rgba(15, 52, 96, 0.55)",
    color: "#E2E8F0",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    minHeight: 44,
    whiteSpace: "nowrap",
    alignSelf: "flex-start",
  },
  controlsRow: {
    border: "1px solid #0F3460",
    background: "#20233D",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  searchInput: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #2B5A8A",
    background: "#151B33",
    color: "#F1F2F6",
    padding: "12px 14px",
    outline: "none",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  categoriesWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  categoryChip: {
    border: "1px solid #2B5A8A",
    background: "transparent",
    color: "#B0BAC3",
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
  },
  categoryChipActive: {
    background: "#00D2D3",
    color: "#101A2B",
    borderColor: "#00D2D3",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
    gap: "12px",
  },
  feedbackBanner: {
    borderRadius: "12px",
    border: "1px solid #2f8f74",
    background: "#143226",
    color: "#9ff0cf",
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  emptyState: {
    gridColumn: "1 / -1",
    border: "1px dashed #2B5A8A",
    borderRadius: "14px",
    padding: "24px",
    textAlign: "center",
    background: "#20233D",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "20px",
  },
  emptyText: {
    marginTop: "8px",
    color: "#B0BAC3",
  },
  card: {
    background: "#252A4A",
    border: "1px solid #0F3460",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
    height: "100%",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  cardCategory: {
    color: "#00D2D3",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  difficultyBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "12px",
    fontWeight: 700,
  },
  cardTitle: {
    margin: 0,
    fontSize: "19px",
    lineHeight: 1.2,
    minHeight: "46px",
  },
  cardMeta: {
    margin: 0,
    color: "#B0BAC3",
    fontSize: "13px",
  },
  cardActions: {
    marginTop: "auto",
    display: "flex",
    gap: "8px",
    alignItems: "stretch",
  },
  secondaryAction: {
    flex: 1,
    borderRadius: "10px",
    border: "1px solid #2B5A8A",
    background: "transparent",
    color: "#B0BAC3",
    padding: "11px 10px",
    cursor: "pointer",
    fontWeight: 600,
    minHeight: "44px",
    fontSize: "14px",
  },
  deleteAction: {
    flex: 1,
    borderRadius: "10px",
    border: "1px solid #854151",
    background: "rgba(97, 27, 41, 0.35)",
    color: "#ffc3cb",
    padding: "11px 10px",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: "44px",
    fontSize: "14px",
  },
};

import React, { useEffect, useMemo, useState } from "react";
import EditMetaModal from "./EditMetaModal.jsx";
import { deleteDiscoverPost, getDiscoverPosts, updateDiscoverPost } from "./api";
import { useTheme } from "./ThemeContext.jsx";

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
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");
  const [showMyPosts, setShowMyPosts] = useState(false);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteLoadingId, setDeleteLoadingId] = useState(null);
  const [feedback, setFeedback] = useState("");
  const [editingPost, setEditingPost] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

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
      if (showMyPosts && quiz.user_id !== user?.id) return false;
      const categoryMatch = category === "All" || quiz.category === category;
      const textMatch =
        !normalized ||
        quiz.title.toLowerCase().includes(normalized) ||
        quiz.author.toLowerCase().includes(normalized);

      return categoryMatch && textMatch;
    });
  }, [category, posts, search, showMyPosts, user]);

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

  const handleConfirmEdit = async ({ title, category }) => {
    if (!editingPost) return;
    setEditLoading(true);
    setFeedback("");
    try {
      const updated = await updateDiscoverPost(editingPost.id, { title, category });
      setPosts((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingPost(null);
      setFeedback(`Updated "${title}".`);
    } catch (err) {
      setFeedback(err?.message || "Could not update post.");
      throw err;
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div style={styles.page} className="discover-page">
      <style>{`
        @media (max-width: 768px) {
          .discover-page { padding-top: 124px !important; }
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
            Back
          </button>
        </header>

        <section style={styles.controlsRow}>
          <div style={styles.searchRow}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or creator"
              style={styles.searchInput}
            />
            {user && (
              <label style={styles.myPostsToggle}>
                <input
                  type="checkbox"
                  checked={showMyPosts}
                  onChange={(e) => setShowMyPosts(e.target.checked)}
                  style={{ accentColor: COLORS.blueDark, width: "16px", height: "16px" }}
                />
                My Posts Only
              </label>
            )}
          </div>

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
                  Play
                </button>
                {user?.id === quiz.user_id && (
                  <button
                    type="button"
                    style={styles.secondaryAction}
                    onClick={(event) => { event.stopPropagation(); setEditingPost(quiz); }}
                  >
                    Edit
                  </button>
                )}
                {user?.id === quiz.user_id && (
                  <button
                    type="button"
                    style={styles.deleteAction}
                    onClick={(event) => handleDeletePost(event, quiz)}
                    disabled={deleteLoadingId === quiz.id}
                  >
                    {deleteLoadingId === quiz.id ? "..." : "Delete"}
                  </button>
                )}
              </div>
            </article>
          ))}
        </section>
      </div>

      <EditMetaModal
        open={Boolean(editingPost)}
        initialTitle={editingPost?.title || ""}
        initialCategory={editingPost?.category || "General"}
        loading={editLoading}
        onClose={() => !editLoading && setEditingPost(null)}
        onConfirm={handleConfirmEdit}
        type="discover"
      />
    </div>
  );
}

const getStyles = (COLORS) => ({
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    padding: "80px clamp(14px, 3vw, 20px) clamp(16px, 4vw, 32px)",
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
    color: COLORS.ink,
  },
  subtitle: {
    marginTop: "8px",
    color: COLORS.inkSoft,
    maxWidth: "740px",
    fontSize: "clamp(13px, 3vw, 15px)",
  },
  backButton: {
    border: `1px solid ${COLORS.border}`,
    background: COLORS.creamWarm,
    color: COLORS.ink,
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
    minHeight: 44,
    whiteSpace: "nowrap",
    alignSelf: "flex-start",
  },
  controlsRow: {
    border: `1px solid ${COLORS.border}`,
    background: COLORS.creamSoft,
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  searchRow: {
    display: "flex",
    gap: "12px",
    width: "100%",
    flexWrap: "wrap",
  },
  searchInput: {
    flex: 1,
    minWidth: "220px",
    borderRadius: "10px",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.borderSoft,
    color: COLORS.ink,
    padding: "12px 14px",
    outline: "none",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  myPostsToggle: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    color: COLORS.inkSoft,
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    whiteSpace: "nowrap",
    padding: "12px 14px",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "10px",
    background: COLORS.borderSoft,
  },
  categoriesWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  categoryChip: {
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.inkSoft,
    borderRadius: "999px",
    padding: "10px 14px",
    fontSize: "14px",
    cursor: "pointer",
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "1 1 auto",
  },
  categoryChipActive: {
    background: COLORS.blueDark,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
    gap: "12px",
  },
  feedbackBanner: {
    borderRadius: "12px",
    border: `1px solid ${COLORS.sageDark}`,
    background: COLORS.sageSoft,
    color: COLORS.sage,
    padding: "12px 14px",
    fontSize: "14px",
    fontWeight: 600,
  },
  emptyState: {
    gridColumn: "1 / -1",
    border: `1px dashed ${COLORS.border}`,
    borderRadius: "14px",
    padding: "24px",
    textAlign: "center",
    background: COLORS.creamSoft,
  },
  emptyTitle: {
    margin: 0,
    fontSize: "20px",
  },
  emptyText: {
    marginTop: "8px",
    color: COLORS.inkSoft,
  },
  card: {
    background: COLORS.creamWarm,
    border: `1px solid ${COLORS.border}`,
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
    color: COLORS.blueDark,
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  cardMeta: {
    margin: 0,
    color: COLORS.inkSoft,
    fontSize: "13px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
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
    border: `1px solid ${COLORS.border}`,
    background: "transparent",
    color: COLORS.inkSoft,
    padding: "11px 10px",
    cursor: "pointer",
    fontWeight: 600,
    minHeight: "44px",
    fontSize: "14px",
  },
  deleteAction: {
    flex: 1,
    borderRadius: "10px",
    border: `1px solid ${COLORS.coralDark}`,
    background: COLORS.coralSoft,
    color: COLORS.coral,
    padding: "11px 10px",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: "44px",
    fontSize: "14px",
  },
});

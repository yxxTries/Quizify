import React, { useEffect, useMemo, useState } from "react";
import DiscoverPostModal from "./DiscoverPostModal.jsx";
import { getMyGames, setMyGamePinned, deleteMyGame, updateMyGameCategory, createDiscoverPost } from "./api";

const MAX_PINNED_GAMES = 5;

const AVAILABLE_TOPICS = [
  "Science",
  "History",
  "Math",
  "Gaming",
  "Language",
  "Business",
  "General",
  "Other",
];

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyGames({ onBack, username, onPlay, onRequireAuth, onEdit }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [pinMessage, setPinMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [editingTopicId, setEditingTopicId] = useState(null);
  const [postMessage, setPostMessage] = useState("");
  const [postDraft, setPostDraft] = useState(null);
  const [postLoading, setPostLoading] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadGames() {
      setLoading(true);
      setError("");
      setAuthRequired(false);

      try {
        const payload = await getMyGames();
        if (!cancelled) {
          setGames(Array.isArray(payload?.games) ? payload.games : []);
        }
      } catch (err) {
        const message = err?.message || "Could not load your games.";
        if (!cancelled) {
          if (/auth|401|required|token/i.test(message)) {
            setAuthRequired(true);
          } else {
            setError(message);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadGames();

    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(() => {
    const base = new Set(games.map((game) => game.category));
    return ["All", ...Array.from(base).sort((a, b) => a.localeCompare(b))];
  }, [games]);

  const sortedGames = useMemo(() => {
    const next = [...games];
    if (sortBy === "title") {
      next.sort((a, b) => a.title.localeCompare(b.title));
      return next;
    }
    if (sortBy === "plays") {
      next.sort((a, b) => b.plays - a.plays);
      return next;
    }
    if (sortBy === "questions") {
      next.sort((a, b) => b.questions_count - a.questions_count);
      return next;
    }
    if (sortBy === "category") {
      next.sort((a, b) => a.category.localeCompare(b.category));
      return next;
    }
    next.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    return next;
  }, [games, sortBy]);

  const filteredGames = useMemo(() => {
    const term = search.trim().toLowerCase();
    return sortedGames.filter((game) => {
      const categoryMatch = categoryFilter === "All" || game.category === categoryFilter;
      const searchMatch =
        term.length === 0 ||
        game.title.toLowerCase().includes(term) ||
        game.category.toLowerCase().includes(term);
      return categoryMatch && searchMatch;
    });
  }, [categoryFilter, search, sortedGames]);

  const pinnedGames = useMemo(() => games.filter((game) => game.pinned), [games]);

  const togglePin = async (game) => {
    setPinMessage("");

    if (!game.pinned && pinnedGames.length >= MAX_PINNED_GAMES) {
      setPinMessage(`You can only pin up to ${MAX_PINNED_GAMES} games.`);
      return;
    }

    try {
      const updated = await setMyGamePinned(game.id, !game.pinned);
      setGames((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setPinMessage(err?.message || "Could not update pin state.");
    }
  };

  const toggleMenu = (e, gameId) => {
    e.stopPropagation();
    setOpenMenuId(prev => prev === gameId ? null : gameId);
  };

  const handleDelete = async (e, gameId) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!window.confirm("Are you sure you want to delete this game?")) return;
    
    try {
      await deleteMyGame(gameId);
      setGames(prev => prev.filter(g => g.id !== gameId));
    } catch (err) {
      alert(err.message || "Could not delete game");
    }
  };

  const handleEdit = (e, game) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (onEdit) onEdit(game);
  };

  const handlePostDiscover = (e, game) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setPinMessage("");
    setPostMessage("");
    setPostDraft({
      title: game.title,
      category: game.category,
      quiz: game.quiz,
      questionCount: game.questions_count,
    });
  };

  const handleConfirmPost = async ({ title, category }) => {
    if (!postDraft) return;
    setPostLoading(true);
    try {
      await createDiscoverPost({
        title,
        category,
        quiz: postDraft.quiz,
      });
      setPostMessage(`Posted "${title}" to Discover.`);
      setPostDraft(null);
    } catch (err) {
      setPostMessage(err?.message || "Could not post to Discover.");
      throw err;
    } finally {
      setPostLoading(false);
    }
  };

  const startTopicEdit = (e, gameId) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingTopicId(gameId);
  };

  const handleTopicSave = async (e, game, newTopic) => {
    e.stopPropagation();
    setEditingTopicId(null);
    if (!newTopic || newTopic === game.category) return;
    try {
      const updated = await updateMyGameCategory(game.id, newTopic);
      setGames((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      alert(err.message || "Could not change topic");
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <p style={styles.kicker}>Library</p>
            <h1 style={styles.title}>My Games</h1>
            <p style={styles.subtitle}>
              {username ? `${username}, here` : "Here"} are your saved quiz sets.
            </p>
          </div>

          <button type="button" onClick={onBack} style={styles.backBtn}>
            Back to Home
          </button>
        </header>

        {authRequired && (
          <div style={styles.authPrompt}>
            <h2 style={styles.authTitle}>Sign in to view your saved games</h2>
            <p style={styles.authText}>Your collection is account-specific and protected.</p>
            <button type="button" onClick={onRequireAuth} style={styles.authBtn}>Sign In</button>
          </div>
        )}

        {!authRequired && (
          <>
            <section style={styles.controls}>
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search saved games..."
                style={styles.searchInput}
              />

              <div style={styles.sortRow}>
                <label style={styles.sortLabel}>
                  Sort by
                  <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={styles.selectInput}>
                    <option value="recent">Recently Updated</option>
                    <option value="title">Title (A-Z)</option>
                    <option value="plays">Most Played</option>
                    <option value="questions">Most Questions</option>
                    <option value="category">Topic (A-Z)</option>
                  </select>
                </label>
              </div>

              <div style={styles.filterRow}>
                {categories.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setCategoryFilter(filter)}
                    style={{
                      ...styles.filterBtn,
                      ...(categoryFilter === filter ? styles.filterBtnActive : {}),
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div style={styles.pinStatusWrap}>
                <p style={styles.pinStatus}>Pinned: {pinnedGames.length}/{MAX_PINNED_GAMES}</p>
                {(pinMessage || postMessage) && <p style={styles.pinMessage}>{pinMessage || postMessage}</p>}
              </div>
            </section>

            {pinnedGames.length > 0 && (
              <section>
                <h2 style={styles.sectionTitle}>Pinned Games</h2>
                <div style={styles.grid}>
                  {pinnedGames.map((game) => (
<article key={`pinned-${game.id}`} style={{ ...styles.card, ...styles.pinnedCard }} onClick={() => editingTopicId !== game.id && onPlay(game.quiz)}>
                    <div style={styles.cardTop}>
                      {editingTopicId === game.id ? (
                        <select
                          style={styles.inlineSelect}
                          value={game.category}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => handleTopicSave(e, game, e.target.value)}
                          onBlur={(e) => setEditingTopicId(null)}
                          autoFocus
                        >
                          {AVAILABLE_TOPICS.map((t) => (
                            <option key={t} value={t}>{t}</option>
                          ))}
                        </select>
                      ) : (
                        <span style={styles.category}>{game.category}</span>
                      )}
                        <span style={styles.pinBadge}>Pinned</span>
                      </div>

                      <h3 style={styles.cardTitle}>{game.title}</h3>

                      <div style={styles.metaGrid}>
                        <p style={styles.metaItem}>Questions: <span style={styles.metaValue}>{game.questions_count}</span></p>
                        <p style={styles.metaItem}>Plays: <span style={styles.metaValue}>{game.plays}</span></p>
                        <p style={styles.metaItem}>Updated: <span style={styles.metaValue}>{formatDate(game.updated_at)}</span></p>
                      </div>

                      <div style={styles.actions}>
                        <button type="button" style={styles.secondaryAction} onClick={(event) => { event.stopPropagation(); onPlay(game.quiz); }}>Play</button>
                        <button type="button" style={styles.pinActionActive} onClick={(event) => { event.stopPropagation(); togglePin(game); }}>Unpin</button>
                        <div style={{ position: "relative" }}>
                          <button type="button" style={styles.menuIconBtn} onClick={(e) => toggleMenu(e, game.id)}>
                            &#8942;
                          </button>
                          {openMenuId === game.id && (
                            <div style={styles.dropdownMenu}>
                              <button type="button" style={styles.dropdownItem} onClick={(e) => handleEdit(e, game)}>Edit</button>
                              <button type="button" style={styles.dropdownItem} onClick={(e) => startTopicEdit(e, game.id)}>Change Topic</button>
                              <button type="button" style={styles.dropdownItem} onClick={(e) => handlePostDiscover(e, game)}>Post to Discover</button>
                              <button type="button" style={{...styles.dropdownItem, color: "#ff6b81"}} onClick={(e) => handleDelete(e, game.id)}>Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            <section style={styles.grid}>
              {loading && <div style={styles.emptyState}><h2 style={styles.emptyTitle}>Loading games...</h2></div>}
              {!loading && error && <div style={styles.emptyState}><h2 style={styles.emptyTitle}>Could not load games</h2><p style={styles.emptyText}>{error}</p></div>}
              {!loading && !error && filteredGames.length === 0 && (
                <div style={styles.emptyState}>
                  <h2 style={styles.emptyTitle}>No saved games found</h2>
                  <p style={styles.emptyText}>Save a quiz from the preview screen to see it here.</p>
                </div>
              )}

              {!loading && !error && filteredGames.map((game) => (
                <article key={game.id} style={styles.card} onClick={() => editingTopicId !== game.id && onPlay(game.quiz)}>
                  <div style={styles.cardTop}>
                    {editingTopicId === game.id ? (
                      <select
                        style={styles.inlineSelect}
                        value={game.category}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleTopicSave(e, game, e.target.value)}
                        onBlur={(e) => setEditingTopicId(null)}
                        autoFocus
                      >
                        {AVAILABLE_TOPICS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <span style={styles.category}>{game.category}</span>
                    )}
                    {game.pinned ? <span style={styles.pinBadge}>Pinned</span> : <span style={styles.pinBadgeMuted}>Saved</span>}
                  </div>

                  <h3 style={styles.cardTitle}>{game.title}</h3>

                  <div style={styles.metaGrid}>
                    <p style={styles.metaItem}>Questions: <span style={styles.metaValue}>{game.questions_count}</span></p>
                    <p style={styles.metaItem}>Plays: <span style={styles.metaValue}>{game.plays}</span></p>
                    <p style={styles.metaItem}>Updated: <span style={styles.metaValue}>{formatDate(game.updated_at)}</span></p>
                  </div>

                  <div style={styles.actions}>
                    <button type="button" style={styles.secondaryAction} onClick={(event) => { event.stopPropagation(); onPlay(game.quiz); }}>Play</button>
                    <button
                      type="button"
                      onClick={(event) => { event.stopPropagation(); togglePin(game); }}
                      style={game.pinned ? styles.pinActionActive : styles.pinAction}
                    >
                      {game.pinned ? "Unpin" : "Pin"}
                    </button>

                    <div style={{ position: "relative" }}>
                      <button type="button" style={styles.menuIconBtn} onClick={(e) => toggleMenu(e, game.id)}>
                        &#8942;
                      </button>
                      {openMenuId === game.id && (
                        <div style={styles.dropdownMenu}>
                          <button type="button" style={styles.dropdownItem} onClick={(e) => handleEdit(e, game)}>Edit</button>
                          <button type="button" style={styles.dropdownItem} onClick={(e) => startTopicEdit(e, game.id)}>Change Topic</button>
                          <button type="button" style={styles.dropdownItem} onClick={(e) => handlePostDiscover(e, game)}>Post to Discover</button>
                          <button type="button" style={{...styles.dropdownItem, color: "#ff6b81"}} onClick={(e) => handleDelete(e, game.id)}>Delete</button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>

      <DiscoverPostModal
        open={Boolean(postDraft)}
        initialTitle={postDraft?.title || ""}
        initialCategory={postDraft?.category || "General"}
        questionCount={postDraft?.questionCount || 0}
        loading={postLoading}
        onClose={() => {
          if (!postLoading) {
            setPostDraft(null);
          }
        }}
        onConfirm={handleConfirmPost}
      />
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "#161b33",
    color: "#f1f2f6",
    overflow: "hidden",
    padding: "34px 20px",
  },
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1080px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  menuIconBtn: {
    background: "transparent",
    border: "none",
    color: "#b6c3d8",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0 8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    bottom: "100%",
    marginBottom: "5px",
    background: "#1e2541",
    border: "1px solid #2e3b5e",
    borderRadius: "8px",
    padding: "4px 0",
    minWidth: "160px",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
  },
  dropdownItem: {
    background: "transparent",
    border: "none",
    color: "#f1f2f6",
    padding: "10px 16px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  kicker: {
    color: "#83f8f5",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    fontSize: "40px",
    lineHeight: 1.05,
    marginTop: "6px",
  },
  subtitle: {
    marginTop: "10px",
    color: "#b6c3d8",
    maxWidth: "760px",
    fontSize: "15px",
  },
  backBtn: {
    border: "1px solid #3f6c9b",
    background: "#142138",
    color: "#d8e7fb",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  controls: {
    border: "1px solid #2f4e74",
    background: "#142138",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  searchInput: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #365883",
    background: "#0f1a2f",
    color: "#f1f2f6",
    padding: "11px 13px",
    outline: "none",
    fontSize: "15px",
  },
  sortRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sortLabel: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    color: "#b9cae0",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  selectInput: {
    borderRadius: "8px",
    border: "1px solid #365883",
    background: "#0f1a2f",
    color: "#f1f2f6",
    padding: "8px 10px",
    fontSize: "13px",
    fontWeight: 600,
    outline: "none",
  },
  filterRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  filterBtn: {
    border: "1px solid #3c638f",
    background: "transparent",
    color: "#b9cae0",
    borderRadius: "999px",
    padding: "7px 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
  },
  filterBtnActive: {
    background: "#00d2d3",
    borderColor: "#00d2d3",
    color: "#14203a",
  },
  pinStatusWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  pinStatus: {
    color: "#99b8d8",
    fontSize: "13px",
    fontWeight: 700,
  },
  pinMessage: {
    color: "#ffb4be",
    fontSize: "13px",
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: "22px",
    marginBottom: "12px",
    color: "#def0ff",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
    gap: "14px",
  },
  emptyState: {
    gridColumn: "1 / -1",
    border: "1px dashed #3b628f",
    borderRadius: "14px",
    background: "#142138",
    textAlign: "center",
    padding: "26px",
  },
  emptyTitle: {
    fontSize: "22px",
  },
  emptyText: {
    marginTop: "8px",
    color: "#b6c3d8",
  },
  card: {
    borderRadius: "14px",
    border: "1px solid #355980",
    background: "#16213E",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    cursor: "pointer",
  },
  pinnedCard: {
    border: "1px solid #4c78a6",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  category: {
    color: "#80ece9",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  pinBadge: {
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "4px 8px",
    border: "1px solid #67aacb",
    color: "#a7f4f0",
    background: "rgba(0, 210, 211, 0.12)",
  },
  pinBadgeMuted: {
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "4px 8px",
    border: "1px solid #3f6b97",
    color: "#a8c2df",
  },
  cardTitle: {
    fontSize: "20px",
    lineHeight: 1.2,
    minHeight: "48px",
  },
  metaGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaItem: {
    fontSize: "13px",
    color: "#9eb1ca",
  },
  metaValue: {
    color: "#eaf3ff",
    fontWeight: 600,
  },
  actions: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
  },
  secondaryAction: {
    flex: 1,
    borderRadius: "9px",
    border: "1px solid #3d6794",
    background: "transparent",
    color: "#c9dff8",
    padding: "8px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  pinAction: {
    flex: 1,
    borderRadius: "9px",
    border: "1px solid #4f77a4",
    background: "rgba(0, 210, 211, 0.14)",
    color: "#aaf4f0",
    padding: "8px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  pinActionActive: {
    flex: 1,
    borderRadius: "9px",
    border: "1px solid #6c8cb0",
    background: "rgba(93, 132, 174, 0.2)",
    color: "#e0eeff",
    padding: "8px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
  },
  authPrompt: {
    border: "1px solid #3b628f",
    borderRadius: "14px",
    background: "#142138",
    textAlign: "center",
    padding: "28px",
  },
  authTitle: {
    fontSize: "24px",
  },
  authText: {
    marginTop: "8px",
    color: "#b6c3d8",
  },
  authBtn: {
    marginTop: "14px",
    border: "1px solid #67aacb",
    borderRadius: "10px",
    background: "#00d2d3",
    color: "#15253d",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
  },
  inlineSelect: {
    padding: "4px 8px",
    borderRadius: "4px",
    background: "#2f3640",
    color: "#fff",
    border: "1px solid #718093",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    cursor: "pointer",
  }
};

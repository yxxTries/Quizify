import React, { useEffect, useMemo, useState } from "react";
import DiscoverPostModal from "./DiscoverPostModal.jsx";
import EditMetaModal from "./EditMetaModal.jsx";
import { getMyGames, setMyGamePinned, deleteMyGame, updateMyGame, createDiscoverPost } from "./api";

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

function GameCard({ game, isPinned, onPlay, onTogglePin, onToggleMenu, onEdit, onPostDiscover, onDelete, openMenuId }) {
  return (
    <article
      style={isPinned ? { ...styles.card, ...styles.pinnedCard } : styles.card}
      onClick={() => onPlay(game.quiz)}
    >
      <div style={styles.cardTop}>
        <span style={styles.category}>{game.category}</span>
        {isPinned
          ? <span style={styles.pinBadge}>Pinned</span>
          : game.pinned
            ? <span style={styles.pinBadge}>Pinned</span>
            : <span style={styles.pinBadgeMuted}>Saved</span>
        }
      </div>

      <h3 style={styles.cardTitle}>{game.title}</h3>

      <div style={styles.metaGrid}>
        <p style={styles.metaItem}>Questions: <span style={styles.metaValue}>{game.questions_count}</span></p>
        <p style={styles.metaItem}>Plays: <span style={styles.metaValue}>{game.plays}</span></p>
        <p style={styles.metaItem}>Updated: <span style={styles.metaValue}>{formatDate(game.updated_at)}</span></p>
      </div>

      <div style={styles.actions}>
        <button type="button" style={styles.secondaryAction} onClick={(e) => { e.stopPropagation(); onPlay(game.quiz); }}>Play</button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onTogglePin(game); }}
          style={game.pinned ? styles.pinActionActive : styles.pinAction}
        >
          {game.pinned ? "Unpin" : "Pin"}
        </button>
        <div style={{ position: "relative" }}>
          <button type="button" style={styles.menuIconBtn} onClick={(e) => onToggleMenu(e, game.id)}>
            &#8942;
          </button>
          {openMenuId === game.id && (
            <div style={styles.dropdownMenu}>
              <button type="button" style={styles.dropdownItem} onClick={(e) => onEdit(e, game)}>Edit Settings</button>
              <button type="button" style={styles.dropdownItem} onClick={(e) => onPostDiscover(e, game)}>Post to Discover</button>
              <button type="button" style={{ ...styles.dropdownItem, color: "#D77966" }} onClick={(e) => onDelete(e, game.id)}>Delete</button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MyGames({ onBack, username, onPlay, onRequireAuth }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [authRequired, setAuthRequired] = useState(false);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("recent");
  const [pinMessage, setPinMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [postMessage, setPostMessage] = useState("");
  const [postDraft, setPostDraft] = useState(null);
  const [postLoading, setPostLoading] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [editLoading, setEditLoading] = useState(false);

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
      setError(err.message || "Could not delete game");
    }
  };

  const handleEditClick = (e, game) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setEditingGame(game);
  };

  const handleConfirmEdit = async ({ title, category }) => {
    if (!editingGame) return;
    setEditLoading(true);
    try {
      const updated = await updateMyGame(editingGame.id, { title, category });
      setGames((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setEditingGame(null);
    } catch (err) {
      setError(err.message || "Could not update game details");
      throw err;
    } finally {
      setEditLoading(false);
    }
  }

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

  return (
    <div style={styles.page} className="mygames-page">
      <style>{`
        @media (max-width: 768px) {
          .mygames-page { padding-top: 124px !important; }
          .mygames-header { flex-direction: column-reverse !important; align-items: stretch !important; }
          .mygames-back-btn { width: 100% !important; text-align: center; }
        }
      `}</style>
      <div style={styles.container}>
        <header style={styles.header} className="mygames-header">
          <div>
            <p style={styles.kicker}>Library</p>
            <h1 style={styles.title}>My Games</h1>
            <p style={styles.subtitle}>
              {username ? `${username}, here` : "Here"} are your saved quiz sets.
            </p>
          </div>

          <button type="button" onClick={onBack} style={styles.backBtn} className="mygames-back-btn">
            Back
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
                    <GameCard
                      key={`pinned-${game.id}`}
                      game={game}
                      isPinned
                      onPlay={onPlay}
                      onTogglePin={togglePin}
                      onToggleMenu={toggleMenu}
                      onEdit={handleEditClick}
                      onPostDiscover={handlePostDiscover}
                      onDelete={handleDelete}
                      openMenuId={openMenuId}
                    />
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
                <GameCard
                  key={game.id}
                  game={game}
                  isPinned={false}
                  onPlay={onPlay}
                  onTogglePin={togglePin}
                  onToggleMenu={toggleMenu}
                  onEdit={handleEditClick}
                  onPostDiscover={handlePostDiscover}
                  onDelete={handleDelete}
                  openMenuId={openMenuId}
                />
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

      <EditMetaModal
        open={Boolean(editingGame)}
        initialTitle={editingGame?.title || ""}
        initialCategory={editingGame?.category || "General"}
        loading={editLoading}
        onClose={() => !editLoading && setEditingGame(null)}
        onConfirm={handleConfirmEdit}
        type="game"
      />
    </div>
  );
}

const styles = {
  page: {
    position: "relative",
    minHeight: "100vh",
    background: "#EFE7CF",
    color: "#2A3340",
    overflow: "hidden",
    padding: "80px clamp(14px, 3vw, 20px) clamp(16px, 4vw, 34px)",
  },
  container: {
    position: "relative",
    zIndex: 1,
    width: "100%",
    maxWidth: "1080px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  menuIconBtn: {
    background: "transparent",
    border: "none",
    color: "#8A95A3",
    fontSize: "24px",
    cursor: "pointer",
    padding: "0 10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "44px",
    minWidth: "44px",
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    bottom: "100%",
    marginBottom: "5px",
    background: "#EFE7CF",
    border: "1px solid #E5DCC2",
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
    color: "#2A3340",
    padding: "10px 16px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: "14px",
    transition: "background 0.2s",
    width: "100%",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  kicker: {
    color: "#7FA3C9",
    textTransform: "uppercase",
    letterSpacing: "1.2px",
    fontSize: "12px",
    fontWeight: 700,
  },
  title: {
    fontSize: "clamp(26px, 6vw, 40px)",
    lineHeight: 1.05,
    marginTop: "6px",
  },
  subtitle: {
    marginTop: "10px",
    color: "#8A95A3",
    maxWidth: "760px",
    fontSize: "15px",
  },
  backBtn: {
    border: "1px solid #E5DCC2",
    background: "#FFFCF0",
    color: "#2A3340",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 700,
    minHeight: 44,
    whiteSpace: "nowrap",
  },
  controls: {
    border: "1px solid #E5DCC2",
    background: "#FFFCF0",
    borderRadius: "16px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  searchInput: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #E5DCC2",
    background: "#FBF6E9",
    color: "#2A3340",
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
    color: "#8A95A3",
    fontSize: "13px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.6px",
  },
  selectInput: {
    borderRadius: "8px",
    border: "1px solid #E5DCC2",
    background: "#FBF6E9",
    color: "#2A3340",
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
    border: "1px solid #5A7FA8",
    background: "transparent",
    color: "#8A95A3",
    borderRadius: "999px",
    padding: "10px 14px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 600,
    minHeight: 44,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "1 1 auto",
  },
  filterBtnActive: {
    background: "#5A7FA8",
    borderColor: "#5A7FA8",
    color: "#EFE7CF",
  },
  pinStatusWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "8px",
  },
  pinStatus: {
    color: "#8A95A3",
    fontSize: "13px",
    fontWeight: 700,
  },
  pinMessage: {
    color: "#E89B8C",
    fontSize: "13px",
    fontWeight: 700,
  },
  sectionTitle: {
    fontSize: "22px",
    marginBottom: "12px",
    color: "#2A3340",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 250px), 1fr))",
    gap: "12px",
  },
  emptyState: {
    gridColumn: "1 / -1",
    border: "1px dashed #E5DCC2",
    borderRadius: "14px",
    background: "#FFFCF0",
    textAlign: "center",
    padding: "26px",
  },
  emptyTitle: {
    fontSize: "22px",
  },
  emptyText: {
    marginTop: "8px",
    color: "#8A95A3",
  },
  card: {
    borderRadius: "14px",
    border: "1px solid #5A7FA8",
    background: "#FFFCF0",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "9px",
    cursor: "pointer",
  },
  pinnedCard: {
    border: "1px solid #5A7FA8",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  category: {
    color: "#7FA3C9",
    fontSize: "12px",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  pinBadge: {
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "4px 8px",
    border: "1px solid #8A95A3",
    color: "#7FA3C9",
    background: "rgba(127, 163, 201, 0.12)",
  },
  pinBadgeMuted: {
    fontSize: "12px",
    fontWeight: 700,
    borderRadius: "999px",
    padding: "4px 8px",
    border: "1px solid #5A7FA8",
    color: "#8A95A3",
  },
  cardTitle: {
    fontSize: "20px",
    lineHeight: 1.2,
    minHeight: "48px",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  metaGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  metaItem: {
    fontSize: "13px",
    color: "#8A95A3",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  metaValue: {
    color: "#2A3340",
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
    border: "1px solid #5A7FA8",
    background: "transparent",
    color: "#D8E4F0",
    padding: "11px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    minHeight: "44px",
  },
  pinAction: {
    flex: 1,
    borderRadius: "9px",
    border: "1px solid #5A7FA8",
    background: "rgba(127, 163, 201, 0.14)",
    color: "#7FA3C9",
    padding: "11px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    minHeight: "44px",
  },
  pinActionActive: {
    flex: 1,
    borderRadius: "9px",
    border: "1px solid #5A7FA8",
    background: "rgba(127, 163, 201, 0.2)",
    color: "#2A3340",
    padding: "11px 9px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "13px",
    minHeight: "44px",
  },
  authPrompt: {
    border: "1px solid #E5DCC2",
    borderRadius: "14px",
    background: "#FFFCF0",
    textAlign: "center",
    padding: "28px",
  },
  authTitle: {
    fontSize: "24px",
  },
  authText: {
    marginTop: "8px",
    color: "#8A95A3",
  },
  authBtn: {
    marginTop: "14px",
    border: "1px solid #8A95A3",
    borderRadius: "10px",
    background: "#5A7FA8",
    color: "#EFE7CF",
    fontWeight: 700,
    padding: "10px 14px",
    cursor: "pointer",
    width: "100%",
  },
  inlineSelect: {
    padding: "4px 8px",
    borderRadius: "4px",
    background: "#FFFCF0",
    color: "#2A3340",
    border: "1px solid #E5DCC2",
    outline: "none",
    fontFamily: "inherit",
    fontSize: "0.85rem",
    cursor: "pointer",
  }
};

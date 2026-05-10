import React, { useEffect, useMemo, useState } from "react";
import DiscoverPostModal from "./DiscoverPostModal.jsx";
import EditMetaModal from "./EditMetaModal.jsx";
import { getMyGames, setMyGamePinned, deleteMyGame, updateMyGame, createDiscoverPost } from "./api";
import { useTheme } from "./ThemeContext.jsx";
import { FONTS } from "./theme.js";

const MAX_PINNED_GAMES = 5;

const CATEGORY_COLORS = {
  Science:  { gradient: "linear-gradient(135deg, #7FA3C9 0%, #4A7FA0 100%)", bg: "#D8E4F0", accent: "#5A7FA8", text: "#FFFFFF" },
  History:  { gradient: "linear-gradient(135deg, #F0D78C 0%, #C9A84C 100%)", bg: "#FCEFC4", accent: "#C9A84C", text: "#FFFFFF" },
  Math:     { gradient: "linear-gradient(135deg, #E89B8C 0%, #C06050 100%)", bg: "#F6D6CD", accent: "#C06050", text: "#FFFFFF" },
  Gaming:   { gradient: "linear-gradient(135deg, #B19CD9 0%, #7B4FA0 100%)", bg: "#D9CCF0", accent: "#7B4FA0", text: "#FFFFFF" },
  Language: { gradient: "linear-gradient(135deg, #6BBFA0 0%, #3A7B5A 100%)", bg: "#CCE8DA", accent: "#3A7B5A", text: "#FFFFFF" },
  Business: { gradient: "linear-gradient(135deg, #4A6FA5 0%, #1E3A6A 100%)", bg: "#CCD8E8", accent: "#1E3A6A", text: "#FFFFFF" },
  General:  { gradient: "linear-gradient(135deg, #A8C3A0 0%, #6B8A60 100%)", bg: "#DFEAD9", accent: "#6B8A60", text: "#FFFFFF" },
  default:  { gradient: "linear-gradient(135deg, #C4A882 0%, #8B6B4A 100%)", bg: "#E8DCC8", accent: "#8B6B4A", text: "#FFFFFF" },
};

function getCategoryColor(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS.default;
}

function formatDate(isoDate) {
  const date = new Date(isoDate);
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function GameCard({ game, isPinned, onPlay, onTogglePin, onToggleMenu, onEdit, onPostDiscover, onDelete, openMenuId, styles, COLORS }) {
  const catColor = getCategoryColor(game.category);
  const title = game.title || "Untitled";
  return (
    <article
      className="wiz-arcade"
      style={isPinned ? { ...styles.card, ...styles.pinnedCard } : styles.card}
      onClick={() => onPlay(game)}
    >
      <div style={{ ...styles.cardTop, background: catColor.gradient }}>
        <span style={styles.cardCategory}>{game.category}</span>
        {isPinned || game.pinned ? (
          <span style={styles.pinBadge}>Pinned</span>
        ) : (
          <span style={styles.pinBadgeMuted}>Saved</span>
        )}
      </div>

      <div style={styles.cardBody}>
        <h3 style={styles.cardTitle}>{title}</h3>

        <div style={styles.cardMeta}>
          <span>{game.questions_count || 0} Q</span>
          <span>{game.plays || 0} plays</span>
          <span>{formatDate(game.updated_at)}</span>
        </div>

        <div style={styles.cardFooter}>
          <button
            className="wiz-arcade"
            style={styles.playBtn}
            onClick={(e) => { e.stopPropagation(); onPlay(game); }}
          >Play</button>
          <button
            className="wiz-arcade"
            onClick={(e) => { e.stopPropagation(); onTogglePin(game); }}
            style={game.pinned ? styles.pinBtnActive : styles.pinBtn}
          >{game.pinned ? "Unpin" : "Pin"}</button>
          <div style={{ position: "relative" }}>
            <button
              className="wiz-arcade"
              style={styles.menuBtn}
              onClick={(e) => onToggleMenu(e, game.id)}
            >&#8942;</button>
            {openMenuId === game.id && (
              <div style={styles.dropdownMenu}>
                <button type="button" style={styles.dropdownItem} onClick={(e) => onEdit(e, game)}>Edit Settings</button>
                <button type="button" style={styles.dropdownItem} onClick={(e) => onPostDiscover(e, game)}>Post to Discover</button>
                <button type="button" style={{ ...styles.dropdownItem, color: COLORS.coralDark }} onClick={(e) => onDelete(e, game.id)}>Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function MyGames({ user, username, onPlay, onRequireAuth }) {
  const { colors: COLORS } = useTheme();
  const styles = useMemo(() => getStyles(COLORS), [COLORS]);
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
    if (!user) {
      setLoading(false);
      return;
    }

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
          if (/sign in|auth|401|required|token/i.test(message)) {
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
  }, [user]);

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
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @media (max-width: 768px) {
          .mygames-page { padding-top: 72px !important; padding-bottom: 100px !important; }
          .mygames-header { flex-direction: column-reverse !important; align-items: stretch !important; }
          .mygames-title { font-size: 28px !important; }
        }
        @media (max-width: 520px) {
          .mygames-grid { grid-template-columns: 1fr !important; }
          .mygames-title { font-size: 24px !important; }
        }
        .mygames-scroll::-webkit-scrollbar { height: 4px; }
        .mygames-scroll::-webkit-scrollbar-track { background: transparent; }
        .mygames-scroll::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 2px; }
      `}</style>
      <div style={styles.container}>
        <header style={styles.header} className="mygames-header">
          <div>
            <p style={styles.kicker}>Library</p>
            <h1 className="mygames-title" style={styles.title}>My Games</h1>
            <p style={styles.subtitle}>
              {username ? `${username}, here` : "Here"} are your saved quiz sets.
            </p>
          </div>
        </header>

        {(!user || authRequired) && (
          <div style={styles.authPrompt}>
            <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }}></div>
            <h2 style={styles.authTitle}>Sign in to view your saved games</h2>
            <p style={styles.authText}>Your collection is account-specific and protected.</p>
            <button type="button" className="wiz-arcade" onClick={onRequireAuth} style={styles.authBtn}>Sign In</button>
          </div>
        )}

        {user && !authRequired && (
          <>
            <section style={styles.controls}>
              <div style={{ display: "flex", gap: 10, alignItems: "stretch" }}>
                <div style={styles.searchWrap}>
                  <span style={styles.searchIcon}>/</span>
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search saved games..."
                    style={styles.searchInput}
                  />
                  {search && (
                    <button style={styles.searchClear} onClick={() => setSearch("")}>✕</button>
                  )}
                </div>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} style={styles.sortSelect}>
                  <option value="recent">Recently Updated</option>
                  <option value="title">Title (A-Z)</option>
                  <option value="plays">Most Played</option>
                  <option value="questions">Most Questions</option>
                  <option value="category">Topic (A-Z)</option>
                </select>
              </div>

              <div className="mygames-scroll" style={styles.filterRow}>
                {categories.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className="wiz-arcade"
                    onClick={() => setCategoryFilter(filter)}
                    style={{
                      ...styles.filterChip,
                      ...(categoryFilter === filter ? styles.filterChipActive : {}),
                    }}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              <div style={styles.pinStatusWrap}>
                <span style={styles.pinStatus}>Pinned: {pinnedGames.length}/{MAX_PINNED_GAMES}</span>
                {(pinMessage || postMessage) && <span style={styles.pinMessage}>{pinMessage || postMessage}</span>}
              </div>
            </section>

            {pinnedGames.length > 0 && (
              <section style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h2 style={styles.sectionTitle}>Pinned Games</h2>
                </div>
                <div className="mygames-grid" style={styles.grid}>
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
                      styles={styles}
                      COLORS={COLORS}
                    />
                  ))}
                </div>
              </section>
            )}

            <section style={styles.section}>
              <div style={styles.sectionHeader}>
                <h2 style={styles.sectionTitle}>All Games</h2>
              </div>
              {loading && <div style={styles.emptyState}><h3 style={styles.emptyTitle}>Loading games...</h3></div>}
              {!loading && error && <div style={styles.emptyState}><h3 style={styles.emptyTitle}>Could not load games</h3><p style={styles.emptyText}>{error}</p></div>}
              {!loading && !error && filteredGames.length === 0 && (
                <div style={styles.emptyState}>
                  <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.3 }}>--</div>
                  <h3 style={styles.emptyTitle}>No saved games found</h3>
                  <p style={styles.emptyText}>Generate a quiz and save it to see it here.</p>
                </div>
              )}
              {!loading && !error && (
                <div className="mygames-grid" style={styles.grid}>
                  {filteredGames.map((game) => (
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
                      styles={styles}
                      COLORS={COLORS}
                    />
                  ))}
                </div>
              )}
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

const getStyles = (COLORS) => ({
  page: {
    minHeight: "100vh",
    background: COLORS.cream,
    color: COLORS.ink,
    fontFamily: FONTS.body,
    padding: "72px clamp(16px, 4vw, 40px) 80px",
    overflowX: "hidden",
  },
  container: {
    width: "100%",
    maxWidth: 1280,
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: 28,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
    animation: "fadeUp 0.35s ease both",
  },
  kicker: {
    color: COLORS.blue,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    fontSize: 12,
    fontWeight: 700,
    fontFamily: FONTS.display,
  },
  title: {
    fontFamily: FONTS.display,
    fontSize: "clamp(28px, 5vw, 40px)",
    fontWeight: 700,
    color: COLORS.ink,
    lineHeight: 1.05,
    margin: "6px 0 0",
  },
  subtitle: {
    marginTop: 8,
    color: COLORS.inkSoft,
    fontSize: 15,
    fontWeight: 500,
  },

  // ── Controls ──
  controls: {
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 16,
    padding: "clamp(14px, 3vw, 20px)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
    animation: "fadeUp 0.4s ease both",
    boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 4px 12px rgba(42,51,64,0.04)`,
  },
  searchWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    background: COLORS.cream,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "0 16px",
    boxShadow: `0 3px 0 ${COLORS.borderSoft}`,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    color: COLORS.inkSoft,
    opacity: 0.75,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    border: "none",
    background: "transparent",
    color: COLORS.ink,
    padding: "12px 0",
    fontSize: 15,
    outline: "none",
    fontFamily: "inherit",
    fontWeight: 600,
  },
  searchClear: {
    background: COLORS.borderSoft,
    border: "none",
    borderRadius: 999,
    width: 24,
    height: 24,
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
    color: COLORS.inkMuted,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sortSelect: {
    borderRadius: 999,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    background: COLORS.cream,
    color: COLORS.ink,
    padding: "8px 14px",
    fontSize: 13,
    fontWeight: 600,
    outline: "none",
    fontFamily: "inherit",
    cursor: "pointer",
    boxShadow: `0 3px 0 ${COLORS.borderSoft}`,
    minWidth: 150,
  },
  filterRow: {
    display: "flex",
    gap: 8,
    overflowX: "auto",
    paddingBottom: 4,
  },
  filterChip: {
    flexShrink: 0,
    background: COLORS.cream,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    transition: "all 0.12s ease",
    boxShadow: `0 3px 0 ${COLORS.borderSoft}`,
    whiteSpace: "nowrap",
  },
  filterChipActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 3px 0 ${COLORS.blueDark}, 0 4px 10px rgba(90,127,168,0.25)`,
  },
  pinStatusWrap: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  pinStatus: {
    color: COLORS.inkMuted,
    fontSize: 12,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  pinMessage: {
    color: COLORS.coralDark,
    fontSize: 12,
    fontWeight: 700,
  },

  // ── Section ──
  section: {
    animation: "fadeUp 0.5s ease both",
  },
  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
  },
  sectionTitle: {
    fontFamily: FONTS.display,
    fontSize: "clamp(18px, 3vw, 22px)",
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },

  // ── Grid ──
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 240px), 1fr))",
    gap: 14,
  },

  // ── Card ──
  card: {
    display: "flex",
    flexDirection: "column",
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 16,
    overflow: "hidden",
    cursor: "pointer",
    boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 6px 16px rgba(42,51,64,0.06)`,
    transition: "transform 0.15s ease, box-shadow 0.15s ease",
    minWidth: 0,
  },
  pinnedCard: {
    borderColor: COLORS.blueDark,
    borderBottomColor: COLORS.blueDark,
    boxShadow: `0 5px 0 ${COLORS.blueDark}, 0 8px 20px rgba(90,127,168,0.2)`,
  },
  cardTop: {
    height: 64,
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "12px 14px 0",
    minWidth: 0,
  },
  cardCategory: {
    fontSize: 11,
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: 1,
    color: "#FFFFFF",
    fontFamily: FONTS.display,
    textShadow: "0 1px 3px rgba(0,0,0,0.2)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    maxWidth: 140,
  },
  pinBadge: {
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 999,
    padding: "3px 8px",
    color: "#FFFFFF",
    background: "rgba(255,255,255,0.25)",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  },
  pinBadgeMuted: {
    fontSize: 10,
    fontWeight: 700,
    borderRadius: 999,
    padding: "3px 8px",
    color: "rgba(255,255,255,0.7)",
    background: "rgba(255,255,255,0.12)",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    whiteSpace: "nowrap",
  },
  cardBody: {
    padding: "12px 14px 14px",
    display: "flex",
    flexDirection: "column",
    flex: 1,
    minWidth: 0,
    overflow: "hidden",
  },
  cardTitle: {
    fontFamily: FONTS.display,
    fontSize: 15,
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 6px",
    lineHeight: 1.25,
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
    overflowWrap: "break-word",
  },
  cardMeta: {
    display: "flex",
    gap: 10,
    fontSize: 12,
    fontWeight: 600,
    color: COLORS.inkSoft,
    flexWrap: "wrap",
    overflow: "hidden",
    marginBottom: 12,
  },
  cardFooter: {
    display: "flex",
    gap: 6,
    alignItems: "center",
    marginTop: "auto",
    minWidth: 0,
  },
  playBtn: {
    flex: 1,
    background: COLORS.sageDark,
    color: COLORS.ink,
    border: "none",
    borderBottom: "3px solid #375031",
    borderRadius: 999,
    padding: "7px 12px",
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    boxShadow: "0 3px 0 #375031, 0 3px 8px rgba(55,80,49,0.2)",
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    textAlign: "center",
  },
  pinBtn: {
    background: COLORS.cream,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999,
    padding: "7px 10px",
    fontWeight: 700,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
    boxShadow: `0 3px 0 ${COLORS.borderSoft}`,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    whiteSpace: "nowrap",
  },
  pinBtnActive: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `3px solid ${COLORS.blueDark}`,
    borderRadius: 999,
    padding: "7px 10px",
    fontWeight: 700,
    fontSize: 11,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.3,
    boxShadow: `0 3px 0 ${COLORS.blueDark}, 0 3px 8px rgba(90,127,168,0.2)`,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
    whiteSpace: "nowrap",
  },
  menuBtn: {
    background: COLORS.cream,
    color: COLORS.inkSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `3px solid ${COLORS.border}`,
    borderRadius: 999,
    width: 34,
    height: 34,
    fontSize: 18,
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: FONTS.display,
    padding: 0,
    boxShadow: `0 3px 0 ${COLORS.borderSoft}`,
    transition: "transform 0.12s ease",
    flexShrink: 0,
  },
  dropdownMenu: {
    position: "absolute",
    right: 0,
    bottom: "100%",
    marginBottom: 6,
    background: COLORS.creamSoft,
    border: `1px solid ${COLORS.border}`,
    borderBottom: `4px solid ${COLORS.border}`,
    borderRadius: 10,
    padding: "4px 0",
    minWidth: 170,
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    boxShadow: `0 5px 0 ${COLORS.borderSoft}, 0 8px 20px rgba(42,51,64,0.12)`,
  },
  dropdownItem: {
    background: "transparent",
    border: "none",
    color: COLORS.ink,
    padding: "10px 16px",
    textAlign: "left",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background 0.15s",
    width: "100%",
    fontFamily: "inherit",
  },

  // ── Empty / Auth ──
  emptyState: {
    gridColumn: "1 / -1",
    border: `1px dashed ${COLORS.border}`,
    borderRadius: 14,
    background: COLORS.creamSoft,
    textAlign: "center",
    padding: "40px 20px",
    animation: "fadeUp 0.4s ease both",
  },
  emptyTitle: {
    fontFamily: FONTS.display,
    fontSize: 20,
    fontWeight: 700,
    color: COLORS.ink,
    margin: 0,
  },
  emptyText: {
    marginTop: 8,
    color: COLORS.inkMuted,
    fontSize: 14,
  },
  authPrompt: {
    textAlign: "center",
    padding: "60px 20px",
    animation: "fadeUp 0.4s ease both",
    border: `1px solid ${COLORS.border}`,
    borderRadius: 16,
    background: COLORS.creamSoft,
  },
  authTitle: {
    fontFamily: FONTS.display,
    fontSize: 22,
    fontWeight: 700,
    color: COLORS.ink,
    margin: "0 0 8px",
  },
  authText: {
    color: COLORS.inkMuted,
    margin: "0 0 16px",
    fontSize: 14,
  },
  authBtn: {
    background: COLORS.blue,
    color: COLORS.creamSoft,
    border: "none",
    borderBottom: `4px solid ${COLORS.blueDark}`,
    borderRadius: 999,
    padding: "12px 32px",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
    fontFamily: FONTS.display,
    letterSpacing: 0.5,
    boxShadow: `0 5px 0 ${COLORS.blueDark}, 0 6px 16px rgba(90,127,168,0.25)`,
    transition: "transform 0.12s ease, box-shadow 0.12s ease",
  },
});

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate, useSearchParams, useParams, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Welcome from "./Welcome.jsx";
import CreateDashboard from "./CreateDashboard.jsx";
import CreateWizard from "./CreateWizard.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";
import Discover from "./Discover.jsx";
import MyGames from "./MyGames.jsx";
import MyProfile from "./MyProfile.jsx";
import PlayQuizPage from "./PlayQuizPage.jsx";
import QuizPreview from "./QuizPreview.jsx";
import AuthModal from "./AuthModal.jsx";
import { FONTS } from "./theme.js";
import { useTheme } from "./ThemeContext.jsx";
import ThemeToggle from "./ThemeToggle.jsx";
import { getCurrentUser, logout, saveMyGame, checkHealth, createDiscoverPost, getPreferences, deleteMyGame, deleteDiscoverPost } from "./api";

const buildGlobalStyle = (COLORS) => `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${COLORS.cream};
    color: ${COLORS.ink};
    font-family: ${FONTS.body};
    -webkit-font-smoothing: antialiased;
    transition: background 0.2s ease, color 0.2s ease;
  }
  button { font-family: inherit; }
  input  { font-family: inherit; font-size: max(16px, 1em); color: ${COLORS.ink}; }
  textarea { font-family: inherit; font-size: max(16px, 1em); color: ${COLORS.ink}; }
  select { font-family: inherit; color: ${COLORS.ink}; }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${FONTS.display};
  }
  @media (max-width: 520px) {
    .quiz-grid { grid-template-columns: 1fr !important; }
  }

  .nav-drawer-toggle {
    position: fixed;
    top: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    border-radius: 12px;
    border: 1px solid ${COLORS.border};
    background: ${COLORS.creamSoft};
    color: ${COLORS.ink};
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 51;
    transition: background 0.15s ease;
  }
  .nav-drawer-toggle:hover { background: ${COLORS.yellowSoft}; }

  .nav-drawer-overlay {
    position: fixed;
    inset: 0;
    background: rgba(42, 51, 64, 0.45);
    z-index: 48;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.25s ease;
  }
  .nav-drawer-overlay.open {
    opacity: 1;
    pointer-events: auto;
  }

  .nav-drawer {
    position: fixed;
    top: 0;
    left: 0;
    width: 280px;
    height: 100vh;
    background: ${COLORS.creamSoft};
    border-right: 1px solid ${COLORS.border};
    z-index: 49;
    display: flex;
    flex-direction: column;
    padding: 20px;
    gap: 4px;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
    overflow-y: auto;
  }
  .nav-drawer.open {
    transform: translateX(0);
  }

  .nav-drawer-wordmark {
    font-family: ${FONTS.display};
    font-size: 26px;
    font-weight: 700;
    color: ${COLORS.ink};
    letter-spacing: -0.5px;
    line-height: 1;
    cursor: pointer;
    padding: 8px 6px 20px 6px;
    margin-bottom: 12px;
    border-bottom: 1px solid ${COLORS.border};
  }

  .nav-drawer-item {
    width: 100%;
    text-align: left;
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: ${COLORS.ink};
    cursor: pointer;
    font-size: 15px;
    font-weight: 600;
    transition: background 0.12s ease;
  }
  .nav-drawer-item:hover { background: ${COLORS.yellowSoft}; }
  .nav-drawer-item.active {
    background: ${COLORS.sage};
    color: ${COLORS.ink};
    font-weight: 700;
  }

  .nav-drawer-section {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: ${COLORS.inkMuted};
    padding: 20px 16px 8px 16px;
  }

  .desktop-wordmark { display: none; }
  .desktop-header-bg { display: none; }
  .nav-buttons-container { display: none; }
  .profile-controls-desktop { display: none; }

  @media (max-width: 768px) {
    .nav-buttons-container { display: none !important; }
    .profile-controls-desktop { display: none !important; }
    .desktop-header-bg { display: none !important; }
    .desktop-wordmark { display: none !important; }
    .action-bar {
      position: fixed !important;
      top: auto !important;
      bottom: 12px !important;
      right: 12px !important;
      left: 12px !important;
      flex-wrap: wrap !important;
      justify-content: center !important;
      background: ${COLORS.creamSoft} !important;
      padding: 10px !important;
      border-radius: 14px !important;
      border: 1px solid ${COLORS.border} !important;
      box-shadow: 0 6px 20px rgba(42,51,64,0.10) !important;
    }

    .mobile-header {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; right: 0;
      background: ${COLORS.creamSoft};
      border-bottom: 1px solid ${COLORS.border};
      z-index: 40;
      transition: box-shadow 0.2s ease;
    }
    .mobile-header.scrolled {
      box-shadow: 0 4px 16px rgba(42, 51, 64, 0.08);
    }

    .mobile-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      gap: 10px;
    }
    .mobile-wordmark {
      font-family: ${FONTS.display};
      font-size: 20px;
      font-weight: 700;
      color: ${COLORS.ink};
      letter-spacing: 1px;
      line-height: 1;
    }

    .mobile-auth-btn {
      padding: 9px 18px;
      background: ${COLORS.yellow};
      color: ${COLORS.ink};
      border: 1px solid ${COLORS.yellowDark};
      border-radius: 8px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      min-height: 40px;
      white-space: nowrap;
    }
    .mobile-avatar-btn {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: ${COLORS.blue};
      color: ${COLORS.creamSoft};
      border: 1px solid ${COLORS.blueDark};
      font-family: inherit;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .mobile-nav-grid {
      display: flex;
      flex-wrap: nowrap;
      justify-content: center;
      overflow-x: auto;
      gap: 8px;
      padding: 0 14px 12px;
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
    .mobile-nav-grid::-webkit-scrollbar {
      display: none;
    }
    .mobile-nav-btn {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      padding: 0 18px;
      border-radius: 10px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      border: 1px solid ${COLORS.border};
      background: ${COLORS.cream};
      color: ${COLORS.ink};
      transition: opacity 0.15s;
    }
    .mobile-nav-btn:active { opacity: 0.75; }
    .mobile-nav-btn-active {
      background: ${COLORS.sage};
      color: ${COLORS.ink};
      border-color: ${COLORS.sageDark};
      font-weight: 700;
    }
    .mobile-nav-btn-home {
      border-radius: 22px;
    }
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
`;

function JoinRoute({ onExit }) {
  const { pin } = useParams();
  return <Join initialPin={pin || ""} onExit={onExit} />;
}

const QUIZ_SESSION_KEY = "kuizu_active_quiz";

function loadQuizSession() {
  try { return JSON.parse(sessionStorage.getItem(QUIZ_SESSION_KEY) || "null"); } catch { return null; }
}
function saveQuizSession(quiz) {
  try { if (quiz) sessionStorage.setItem(QUIZ_SESSION_KEY, JSON.stringify(quiz)); } catch {}
}
function clearQuizSession() {
  try { sessionStorage.removeItem(QUIZ_SESSION_KEY); } catch {}
}

export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { colors: COLORS } = useTheme();
  const globalStyle = useMemo(() => buildGlobalStyle(COLORS), [COLORS]);
  const [quiz, setQuiz] = useState(() => loadQuizSession());
  const [intent, setIntent] = useState("solo");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [autoReveal, setAutoReveal] = useState(true);
  const [authBooting, setAuthBooting] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking");
  const [adBlockerWarning, setAdBlockerWarning] = useState(false);
  const failCountRef = useRef(0);
  const healthIntervalRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);
  const [editingQuiz, setEditingQuiz] = useState(null);
  const [quizSource, setQuizSource] = useState("/");
  const location = useLocation();
  const profileMenuRef = useRef(null);

  const username = user?.username || user?.email?.split("@")[0] || "";

  const profileInitial = useMemo(() => {
    if (username) return username[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return "P";
  }, [username, user]);

  // Server health check
  useEffect(() => {
    let cancelled = false;

    function clearPolling() {
      if (healthIntervalRef.current) {
        clearInterval(healthIntervalRef.current);
        healthIntervalRef.current = null;
      }
    }

    async function checkServer() {
      try {
        const isHealthy = await checkHealth();
        if (cancelled) return;
        if (isHealthy) {
          failCountRef.current = 0;
          setAdBlockerWarning(false);
          clearPolling();
          setServerStatus("ready");
          return;
        }
      } catch (e) {}

      if (cancelled) return;
      failCountRef.current += 1;
      setServerStatus("waking");

      if (failCountRef.current >= 5) {
        setAdBlockerWarning(true);
      }

      if (!healthIntervalRef.current) {
        healthIntervalRef.current = setInterval(async () => {
          try {
            const healthy = await checkHealth();
            if (healthy) {
              failCountRef.current = 0;
              setAdBlockerWarning(false);
              clearPolling();
              if (!cancelled) setServerStatus("ready");
            } else {
              failCountRef.current += 1;
              if (failCountRef.current >= 5) {
                setAdBlockerWarning(true);
              }
            }
          } catch (e) {
            failCountRef.current += 1;
            if (failCountRef.current >= 5) {
              setAdBlockerWarning(true);
            }
          }
        }, 3000);
      }
    }

    checkServer();
    return () => {
      cancelled = true;
      clearPolling();
    };
  }, []);

  // Auth bootstrap
  useEffect(() => {
    if (serverStatus !== "ready") return;
    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
          try {
            const prefs = await getPreferences();
            if (!cancelled) setAutoReveal(prefs.auto_reveal);
          } catch {}
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setAuthBooting(false);
      }
    }

    bootstrapAuth();
    return () => { cancelled = true; };
  }, [serverStatus]);

  // Profile menu outside-click
  useEffect(() => {
    function handleOutsideClick(event) {
      if (!profileMenuRef.current) return;
      if (!profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Legacy ?pin= query support
  useEffect(() => {
    const pin = searchParams.get("pin");
    if (pin) navigate(`/join/${pin}`);
  }, [searchParams, navigate]);

  const handlePlay = (quizData) => {
    setQuiz(quizData);
    saveQuizSession(quizData);
    setIntent("solo");
    setQuizSource(location.pathname);
    navigate("/quiz");
  };

  const handleHostStart = (quizData) => {
    setQuiz(quizData);
    saveQuizSession(quizData);
    setIntent("host");
    setQuizSource(location.pathname);
    navigate("/host");
  };

  const handleLogout = async () => {
    try { await logout(); } catch {}
    setUser(null);
    setAutoReveal(true);
    setIsProfileMenuOpen(false);
    navigate("/");
  };

  const handleAuthSuccess = async (nextUser) => {
    setUser(nextUser);
    setIsProfileMenuOpen(false);
    navigate("/");
    try {
      const prefs = await getPreferences();
      setAutoReveal(prefs.auto_reveal);
    } catch {}
  };

  const handleSaveGame = async (payload) => {
    if (!user) {
      setIsAuthOpen(true);
      throw new Error("Please sign in to save games.");
    }
    return saveMyGame(payload);
  };

  const handlePostDiscover = async (payload) => {
    if (!user) {
      setIsAuthOpen(true);
      throw new Error("Please sign in to post on Discover.");
    }
    return createDiscoverPost(payload);
  };

  const handlePreviewPlay = (quizData) => {
    setQuiz(quizData);
    saveQuizSession(quizData);
    setIntent("solo");
    setQuizSource("/preview");
    navigate("/quiz");
  };

  const handlePreviewHost = (quizData) => {
    setQuiz(quizData);
    saveQuizSession(quizData);
    setIntent("host");
    setQuizSource("/preview");
    navigate("/host");
  };

  const handlePreviewEdit = (data) => {
    setEditingQuiz({ ...data.quiz, questions: data.quiz?.questions || [] });
    navigate("/create");
    setTimeout(() => setEditingQuiz(null), 0);
  };

  const handlePreviewDelete = async (data) => {
    if (!window.confirm("Delete this quiz?")) return;
    try {
      if (data.source === "mygames") {
        await deleteMyGame(data.gameId);
      } else if (data.source === "discover") {
        await deleteDiscoverPost(data.postId);
      }
    } catch {}
    navigate(data.source === "mygames" ? "/games" : "/discover");
  };

  const handlePreviewSave = async (quizData) => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      await saveMyGame({ title: previewData?.title || "Saved Quiz", category: previewData?.category || "General", quiz: quizData });
    } catch {}
  };

  const handlePreviewPostDiscover = async (quizData) => {
    if (!user) { setIsAuthOpen(true); return; }
    try {
      await createDiscoverPost({ title: previewData?.title || "Posted Quiz", category: previewData?.category || "General", quiz: quizData });
    } catch {}
  };

  if (serverStatus !== "ready") {
    return (
      <>
        <style>{globalStyle}</style>
        <style>{`
          .blackout-container {
            position: fixed; inset: 0; background: ${COLORS.cream}; color: ${COLORS.ink};
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 9999; padding: 0 24px;
          }
          .blackout-title {
            font-family: ${FONTS.display};
            font-size: 3.5rem; letter-spacing: 2px; margin-bottom: 1rem;
          }
          .blackout-text {
            font-family: ${FONTS.body};
            font-size: 1.1rem; color: ${COLORS.inkMuted}; animation: pulse 2s infinite;
          }
          .adblock-warning {
            font-family: ${FONTS.body};
            font-size: 0.95rem; color: ${COLORS.coralDark}; text-align: center;
            max-width: 420px; line-height: 1.5; margin-top: 24px;
            padding: 16px 20px; border: 1px solid ${COLORS.coral};
            background: ${COLORS.coralSoft}; border-radius: 12px; animation: none;
          }
          .retry-btn {
            margin-top: 20px; padding: 12px 32px; font-family: inherit; font-size: 14px;
            font-weight: 700; border: none; border-radius: 10px; cursor: pointer;
            background: ${COLORS.sageDark}; color: ${COLORS.creamSoft};
          }
          .retry-btn:hover { opacity: 0.85; }
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}</style>
        <div className="blackout-container">
          <h1 className="blackout-title">Kuizu</h1>
          <p className="blackout-text">
            Please wait while the servers wake up. ETA ~50s
          </p>
          {adBlockerWarning && (
            <div className="adblock-warning">
              It looks like an ad blocker or browser extension may be blocking the connection to our servers.
              Try disabling your ad blocker or whitelisting this site, then click Retry.
            </div>
          )}
          <button className="retry-btn" onClick={() => {
            failCountRef.current = 0;
            setAdBlockerWarning(false);
            setServerStatus("checking");
            if (healthIntervalRef.current) {
              clearInterval(healthIntervalRef.current);
              healthIntervalRef.current = null;
            }
            window.location.reload();
          }}>
            Retry
          </button>
        </div>
      </>
    );
  }

  const pageMeta = {
    "/": {
      title: "Discover Free Quizzes & Trivia Games — Kuizu",
      description: "Browse hundreds of community-made quizzes on math, science, history, trivia, and more. Play solo or with friends — all free.",
      robots: "index, follow",
      schemaType: "discover",
    },
    "/create": {
      title: "Kuizu — Free AI Quiz Maker | Turn Slides Into Quizzes",
      description: "Create and share AI-generated quizzes from PDFs, PPTX, or text. Play solo or host live multiplayer games — free Kahoot alternative.",
      robots: "index, follow",
      schemaType: "home",
    },
    "/home": {
      title: "Create a Quiz — Kuizu",
      description: "Upload a PDF, PPTX, or type a prompt to generate multiple-choice quizzes with an AI. Edit, save, and share your quiz instantly.",
      robots: "index, follow",
      schemaType: "home",
    },
    "/quiz": {
      title: "Playing Quiz — Kuizu",
      description: "Answer questions, track your streak, and see your score.",
      robots: "noindex",
      schemaType: null,
    },
    "/host": {
      title: "Host a Game — Kuizu",
      description: "Host a live multiplayer quiz. Share the PIN with friends and watch the leaderboard.",
      robots: "noindex",
      schemaType: null,
    },
    "/join": {
      title: "Join a Live Quiz Game — Kuizu",
      description: "Enter a game PIN to join a real-time multiplayer quiz session. Compete with friends or classmates on live leaderboards.",
      robots: "noindex",
      schemaType: null,
    },
    "/discover": {
      title: "Discover Free Quizzes & Trivia Games — Kuizu",
      description: "Browse hundreds of community-made quizzes on math, science, history, trivia, and more. Play solo or with friends — all free.",
      robots: "index, follow",
      schemaType: "discover",
    },
    "/profile": {
      title: "My Profile — Kuizu",
      description: "View and manage your Kuizu account settings.",
      robots: "noindex",
      schemaType: null,
    },
    "/games": {
      title: "My Games — Kuizu",
      description: "Access your saved quizzes and pin your favourites for quick play.",
      robots: "noindex",
      schemaType: null,
    },
    "/play": {
      title: "Play Quiz — Kuizu",
      description: "Play a community-created quiz on Kuizu.",
      robots: "index, follow",
      schemaType: null,
    },
  };

  const currentPath = Object.keys(pageMeta).find(
    key => window.location.pathname === key ||
    (key === "/join" && window.location.pathname.startsWith("/join")) ||
    (key === "/play" && window.location.pathname.startsWith("/play"))
  ) || "/";
  const meta = pageMeta[currentPath] ?? pageMeta["/"];
  const ogImage = "/og-image.svg";
  const canonicalUrl = `https://www.kuizu.online${currentPath === "/" ? "" : currentPath}`;

  const siteSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "name": "Kuizu",
        "url": "https://www.kuizu.online",
        "description": "Free AI-powered quiz maker. Turn slides, PDFs, and text into interactive quizzes. Play solo or host live multiplayer games.",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "USD" }
      },
      {
        "@type": "Organization",
        "name": "Kuizu",
        "url": "https://www.kuizu.online",
        "logo": "https://www.kuizu.online/og-image.svg",
        "sameAs": ["https://github.com/yxxTries"],
        "description": "Free AI-powered quiz maker for educators, trainers, and teams."
      }
    ]
  });

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta name="robots" content={meta.robots || "index, follow"} />
        <link rel="canonical" href={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:site_name" content="Kuizu" />
        <meta property="og:locale" content="en_US" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogImage} />
        <meta name="twitter:site" content="@kuizu" />
        <meta name="twitter:creator" content="@kuizu" />
        <script type="application/ld+json">{siteSchema}</script>
      </Helmet>
      <style>{globalStyle}</style>

      <Routes>
        <Route
          path="/"
          element={
            <MainLayout
              user={user}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              authBooting={authBooting}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            >
              <Discover
                onPlay={(post) => {
                  setPreviewData({
                    quiz: post.quiz,
                    title: post.title,
                    category: post.category,
                    author: post.author,
                    questions_count: post.questions_count,
                    difficulty: post.difficulty,
                    estimated_time: post.estimated_time,
                    plays: post.plays,
                    source: "discover",
                    ownerId: post.user_id,
                    postId: post.id,
                  });
                  navigate("/preview");
                }}
                user={user}
                onRequireAuth={() => setIsAuthOpen(true)}
                onCreate={() => navigate("/create")}
              />
            </MainLayout>
          }
        />
        <Route
          path="/home"
          element={
            <HomeRoute
              user={user}
              quiz={quiz}
              setQuiz={setQuiz}
              authBooting={authBooting}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              onPlay={handlePlay}
              onHost={handleHostStart}
              onSaveGame={handleSaveGame}
              onPostDiscover={handlePostDiscover}
              navigate={navigate}
            />
          }
        />
        <Route
          path="/create"
          element={
            <MainLayout
              user={user}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              authBooting={authBooting}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            >
              <CreateWizard
                user={user}
                onPlay={handlePlay}
                onHost={handleHostStart}
                onSaveGame={handleSaveGame}
                onPostDiscover={handlePostDiscover}
                onRequireAuth={() => setIsAuthOpen(true)}
                initialQuiz={editingQuiz}
              />
            </MainLayout>
          }
        />
        <Route
          path="/quiz"
          element={
            quiz ? (
              <Quiz quiz={quiz} onRestart={() => { clearQuizSession(); navigate(quizSource); }} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/host"
          element={
            quiz ? (
              <Host quiz={quiz} onEnd={() => { clearQuizSession(); navigate(quizSource); }} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/join/:pin?"
          element={<JoinRoute onExit={() => navigate(quizSource)} />}
        />
        <Route
          path="/play/:id"
          element={
            <PlayQuizPage
              onPlay={(quizData) => {
                setQuiz(quizData);
                saveQuizSession(quizData);
                setIntent("solo");
                setQuizSource("/discover");
              }}
            />
          }
        />
        <Route
          path="/discover"
          element={<Navigate to="/" replace />}
        />
        <Route
          path="/games"
          element={
            <MainLayout
              user={user}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              authBooting={authBooting}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            >
              <MyGames
                username={username}
                onPlay={(game) => {
                  setPreviewData({
                    quiz: game.quiz,
                    title: game.title,
                    category: game.category,
                    questions_count: game.questions_count,
                    source: "mygames",
                    ownerId: user?.id,
                    gameId: game.id,
                  });
                  navigate("/preview");
                }}
                onRequireAuth={() => setIsAuthOpen(true)}
                onEdit={(game) => {
                  setPreviewData({
                    quiz: game.quiz,
                    title: game.title,
                    category: game.category,
                    questions_count: game.questions_count,
                    source: "mygames",
                    ownerId: user?.id,
                    gameId: game.id,
                  });
                  navigate("/preview");
                }}
              />
            </MainLayout>
          }
        />
        <Route
          path="/preview"
          element={
            previewData ? (
              <MainLayout
                user={user}
                isProfileMenuOpen={isProfileMenuOpen}
                profileMenuRef={profileMenuRef}
                username={username}
                profileInitial={profileInitial}
                authBooting={authBooting}
                onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                onAuthOpen={() => setIsAuthOpen(true)}
                onLogout={handleLogout}
                navigate={navigate}
              >
                <QuizPreview
                  data={previewData}
                  user={user}
                  onPlay={handlePreviewPlay}
                  onHost={handlePreviewHost}
                  onEdit={handlePreviewEdit}
                  onDelete={handlePreviewDelete}
                  onSave={handlePreviewSave}
                  onPostDiscover={handlePreviewPostDiscover}
                  onRequireAuth={() => setIsAuthOpen(true)}
                />
              </MainLayout>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/profile"
          element={
            <MainLayout
              user={user}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              authBooting={authBooting}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            >
              <MyProfile
                user={user}
                onRequireAuth={() => setIsAuthOpen(true)}
                onUserUpdated={setUser}
                autoReveal={autoReveal}
                onAutoRevealChange={setAutoReveal}
              />
            </MainLayout>
          }
        />

      </Routes>

      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}

// ──────────────────────────────────────────────
// LandingRoute & HomeRoute
// ──────────────────────────────────────────────

function LoadingScreen() {
  const { colors: COLORS } = useTheme();
  return (
    <div style={{
      minHeight: "100vh", background: COLORS.cream, color: COLORS.ink,
      display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONTS.body,
    }}>
      Loading…
    </div>
  );
}

function LandingRoute({ user, authBooting, onAuthOpen, onLogout, navigate }) {
  if (authBooting) return <LoadingScreen />;
  return (
    <Welcome
      user={user}
      onSignIn={onAuthOpen}
      onSignOut={onLogout}
      onCreate={() => navigate("/create")}
      onJoin={() => navigate("/join")}
    />
  );
}

function HomeRoute({
  user, quiz, setQuiz, authBooting, isProfileMenuOpen, profileMenuRef,
  username, profileInitial, onProfileMenuToggle, onAuthOpen, onLogout,
  onPlay, onHost, onSaveGame, onPostDiscover, navigate,
}) {
  if (authBooting) return <LoadingScreen />;

  return (
    <MainLayout
      user={user}
      isProfileMenuOpen={isProfileMenuOpen}
      profileMenuRef={profileMenuRef}
      username={username}
      profileInitial={profileInitial}
      authBooting={authBooting}
      onProfileMenuToggle={onProfileMenuToggle}
      onAuthOpen={onAuthOpen}
      onLogout={onLogout}
      navigate={navigate}
    >
      <CreateDashboard
        user={user}
        initialQuiz={quiz}
        onPlay={(q) => { setQuiz(q); onPlay(q); }}
        onHost={(q) => { setQuiz(q); onHost(q); }}
        onSaveGame={onSaveGame}
        onPostDiscover={onPostDiscover}
        onRequireAuth={onAuthOpen}
      />
    </MainLayout>
  );
}

// ──────────────────────────────────────────────
// MainLayout — nav + header
// ──────────────────────────────────────────────

function MainLayout({
  user, isProfileMenuOpen, profileMenuRef, username, profileInitial,
  authBooting, onProfileMenuToggle, onAuthOpen, onLogout, navigate, children
}) {
  const { colors: COLORS } = useTheme();
  const [showAbout, setShowAbout] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  const closeNav = () => setNavOpen(false);

  const navItem = (label, to, matchFn) => (
    <button
      className={`nav-drawer-item ${matchFn ? "active" : ""}`}
      onClick={() => { navigate(to); closeNav(); }}
    >
      {label}
    </button>
  );

  const drawer = (
    <>
      <div className={`nav-drawer-overlay ${navOpen ? "open" : ""}`} onClick={closeNav} />
      <div className={`nav-drawer ${navOpen ? "open" : ""}`}>
        <div className="nav-drawer-wordmark" onClick={() => { navigate("/"); closeNav(); }}>
          Kuizu
        </div>
        {navItem("Discover", "/", path === "/" || path === "/discover")}
        {navItem("Create", "/create", path === "/create")}
        {navItem("Home", "/home", path === "/home")}
        {navItem("My Games", "/games", path === "/games")}
        {navItem("Join a Game", "/join", path.startsWith("/join"))}
        <div className="nav-drawer-section">Account</div>
        {!authBooting && !user && (
          <button className="nav-drawer-item" onClick={() => { onAuthOpen(); closeNav(); }}>Sign In</button>
        )}
        {!authBooting && user && (
          <>
            <button className="nav-drawer-item" onClick={() => { navigate("/profile"); closeNav(); }}>
              My Profile
            </button>
            <button
              className="nav-drawer-item"
              style={{ color: COLORS.coralDark }}
              onClick={() => { onLogout(); closeNav(); }}
            >Sign Out</button>
          </>
        )}
        <button
          className="nav-drawer-item"
          onClick={() => { setShowAbout(true); closeNav(); }}
        >About</button>
        <div style={{ marginTop: "auto", padding: "16px 0 0", borderTop: `1px solid ${COLORS.border}`, display: "flex", justifyContent: "center" }}>
          <ThemeToggle />
        </div>
      </div>
    </>
  );

  return (
    <div ref={profileMenuRef} style={{ position: "relative" }}>
      <button
        className="nav-drawer-toggle"
        onClick={() => setNavOpen((v) => !v)}
        aria-label="Toggle navigation"
        style={{ left: navOpen ? 296 : 16, transition: "left 0.25s ease" }}
      >
        {navOpen ? "\u2715" : "\u2630"}
      </button>
      {drawer}
      {children}
      {showAbout && <TypewriterOverlay onDismiss={() => setShowAbout(false)} />}
    </div>
  );
}

function TypewriterOverlay({ onDismiss }) {
  const { colors: COLORS } = useTheme();
  const readyRef = useRef(false);
  useEffect(() => {
    const t = setTimeout(() => { readyRef.current = true; }, 50);
    return () => clearTimeout(t);
  }, []);

  const fullText = [
    "About",
    "=======================",
    "The motivation behind Kuizu",
    "",
    "During my experience as an educator, I found myself spending countless hours crafting quizzes from lecture slides and reading materials, time that could be better spent actually teaching. I wanted a tool that could instantly transform my PDFs and presentations into engaging, high quality quizzes without cutting corners on academic rigor, while being straightforward and uncomplicated for anyone to use.",
    "",
    "Most importantly, I believed ed resources shouldn't stay locked in one classroom. That's why I built in a community hub where educators and students can share, discover, and remix each other's content.",
    "",
    "Kuizu is completely free and still very very early and I am also welcoming contributors. If you're interested in helping out, please reach out!",
    "",
    "Contact Details",
    "---------------",
    "Support Email:    yxx.tweaks@gmail.com",
    "Email:            amil.shahul777@gmail.com",
    "LinkedIn:         https://www.linkedin.com/in/amilshahul/",
    "GitHub:           https://github.com/yxxTries"
  ].join("\n");
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      i += 1;
      setDisplayed(fullText.substring(0, i));
      if (i > fullText.length) clearInterval(interval);
    }, 10);
    return () => clearInterval(interval);
  }, [fullText]);

  return (
    <div
      onClick={() => { if (readyRef.current) onDismiss(); }}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(42,51,64,0.85)",
        backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
        zIndex: 9998, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "clamp(16px, 5vmin, 40px)", cursor: "pointer",
      }}
    >
      <div style={{
        whiteSpace: "pre-wrap", color: COLORS.cream, fontSize: "clamp(13px, 2.8vmin, 22px)",
        fontFamily: "monospace", textAlign: "left", width: "100%", maxWidth: "800px",
        lineHeight: 1.7, overflowY: "auto", maxHeight: "80vh"
      }}>
        {displayed}
        <span style={{ animation: "cursorBlink 1s step-end infinite" }}>_</span>
      </div>
      <p style={{ marginTop: "clamp(12px, 3vmin, 28px)", color: "rgba(251,246,233,0.5)", fontSize: 13, fontFamily: "monospace" }}>
        Tap anywhere to close
      </p>
      <style>{`
        @keyframes cursorBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  );
}

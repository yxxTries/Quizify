import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate, useSearchParams, useParams, Navigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Welcome from "./Welcome.jsx";
import CreateDashboard from "./CreateDashboard.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";
import Discover from "./Discover.jsx";
import MyGames from "./MyGames.jsx";
import MyProfile from "./MyProfile.jsx";
import AuthModal from "./AuthModal.jsx";
import { COLORS, FONTS } from "./theme.js";
import { getCurrentUser, logout, saveMyGame, checkHealth, createDiscoverPost, getPreferences } from "./api";

const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: ${COLORS.cream};
    color: ${COLORS.ink};
    font-family: ${FONTS.body};
    -webkit-font-smoothing: antialiased;
  }
  button { font-family: inherit; }
  input  { font-family: inherit; font-size: max(16px, 1em); }
  textarea { font-family: inherit; font-size: max(16px, 1em); }
  select { font-family: inherit; }

  h1, h2, h3, h4, h5, h6 {
    font-family: ${FONTS.display};
  }
  @media (max-width: 520px) {
    .quiz-grid { grid-template-columns: 1fr !important; }
  }

  .nav-buttons-container {
    position: fixed;
    top: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100vw - 520px);
    padding: 0 4px;
    align-items: center;
    z-index: 40;
  }
  .nav-button {
    white-space: nowrap;
    transition: all 0.15s ease;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    padding: 8px 14px;
    background: ${COLORS.creamSoft};
    color: ${COLORS.ink};
    border: 1px solid ${COLORS.border};
    border-radius: 10px;
    cursor: pointer;
    font-weight: 600;
    font-size: 13px;
  }
  .nav-button:hover { background: ${COLORS.yellowSoft}; }
  .nav-button-active {
    background: ${COLORS.sage};
    color: ${COLORS.ink};
    border-color: ${COLORS.sageDark};
    font-weight: 700;
  }
  .nav-button-active:hover { background: ${COLORS.sageDark}; color: ${COLORS.creamSoft}; }

  .nav-button-home {
    border-radius: 20px;
    padding: 8px 18px;
  }

  .mobile-header { display: none; }
  .profile-controls-desktop { display: flex; }

  .desktop-wordmark {
    position: fixed;
    top: 22px;
    left: 24px;
    font-family: ${FONTS.display};
    font-size: 24px;
    font-weight: 800;
    color: ${COLORS.ink};
    letter-spacing: -0.5px;
    line-height: 1;
    cursor: pointer;
    z-index: 41;
  }

  .desktop-header-bg {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 68px;
    background: transparent;
    border-bottom: 1px solid transparent;
    z-index: 39;
    transition: background 0.2s ease, border-bottom-color 0.2s ease;
  }
  .desktop-header-bg.scrolled {
    background: ${COLORS.cream};
    border-bottom-color: ${COLORS.border};
  }

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
      font-weight: 800;
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
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      padding: 0 10px 10px;
    }
    .mobile-nav-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 42px;
      border-radius: 8px;
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
      border-radius: 20px;
    }
  }
`;

function JoinRoute({ onExit }) {
  const { pin } = useParams();
  return <Join initialPin={pin || ""} onExit={onExit} />;
}

export default function App() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [quiz, setQuiz] = useState(null);
  const [intent, setIntent] = useState("solo");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [autoReveal, setAutoReveal] = useState(true);
  const [authBooting, setAuthBooting] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking");
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
    let intervalId;

    async function checkServer() {
      try {
        const isHealthy = await checkHealth();
        if (isHealthy) {
          if (!cancelled) setServerStatus("ready");
          return;
        }
      } catch (e) {}

      if (!cancelled) setServerStatus("waking");

      intervalId = setInterval(async () => {
        try {
          const healthy = await checkHealth();
          if (healthy) {
            clearInterval(intervalId);
            if (!cancelled) setServerStatus("ready");
          }
        } catch (e) {}
      }, 3000);
    }

    checkServer();
    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
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
    setIntent("solo");
    navigate("/quiz");
  };

  const handleHostStart = (quizData) => {
    setQuiz(quizData);
    setIntent("host");
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
    navigate("/home");
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

  if (serverStatus !== "ready") {
    return (
      <>
        <style>{globalStyle}</style>
        <style>{`
          .blackout-container {
            position: fixed; inset: 0; background: ${COLORS.cream}; color: ${COLORS.ink};
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 9999;
          }
          .blackout-title {
            font-family: ${FONTS.display};
            font-size: 3.5rem; letter-spacing: 2px; margin-bottom: 1rem;
          }
          .blackout-text {
            font-family: ${FONTS.body};
            font-size: 1.1rem; color: ${COLORS.inkMuted}; animation: pulse 2s infinite;
          }
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
        </div>
      </>
    );
  }

  const pageMeta = {
    "/": { title: "Kuizu — Turn slides into quizzes", description: "Upload a PDF or PPTX and instantly generate an AI-powered quiz. Play solo or host a live multiplayer game." },
    "/home": { title: "Home — Kuizu", description: "Upload a PDF or PPTX and instantly generate an AI-powered quiz." },
    "/quiz": { title: "Playing Quiz — Kuizu", description: "Answer questions, track your streak, and see your score." },
    "/host": { title: "Host a Game — Kuizu", description: "Host a live multiplayer quiz. Share the PIN with friends and watch the leaderboard." },
    "/join": { title: "Join a Game — Kuizu", description: "Enter a game PIN and nickname to join a live Kuizu multiplayer session." },
    "/discover": { title: "Discover Quizzes — Kuizu", description: "Browse and play community-created quizzes across dozens of topics." },
    "/profile": { title: "My Profile — Kuizu", description: "View and manage your Kuizu account settings." },
    "/games": { title: "My Games — Kuizu", description: "Access your saved quizzes and pin your favourites for quick play." },
  };

  const currentPath = Object.keys(pageMeta).find(
    key => window.location.pathname === key ||
    (key === "/join" && window.location.pathname.startsWith("/join"))
  ) || "/";
  const meta = pageMeta[currentPath] ?? pageMeta["/"];
  const ogImage = "/og-image.png";

  return (
    <>
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:image" content={ogImage} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={meta.title} />
        <meta name="twitter:description" content={meta.description} />
        <meta name="twitter:image" content={ogImage} />
      </Helmet>
      <style>{globalStyle}</style>

      <Routes>
        <Route
          path="/"
          element={
            <LandingRoute
              user={user}
              authBooting={authBooting}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            />
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
          path="/quiz"
          element={
            quiz ? (
              <Quiz quiz={quiz} onRestart={() => navigate("/home")} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/home" replace />
            )
          }
        />
        <Route
          path="/host"
          element={
            quiz ? (
              <Host quiz={quiz} onEnd={() => navigate("/home")} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/home" replace />
            )
          }
        />
        <Route
          path="/join/:pin?"
          element={<JoinRoute onExit={() => navigate("/home")} />}
        />
        <Route
          path="/discover"
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
                onBack={() => navigate("/home")}
                onPlay={(quizData) => {
                  setQuiz(quizData);
                  setIntent("solo");
                  navigate("/home");
                }}
                user={user}
                onRequireAuth={() => setIsAuthOpen(true)}
              />
            </MainLayout>
          }
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
                onBack={() => navigate("/home")}
                username={username}
                onPlay={(quizData) => {
                  setQuiz(quizData);
                  setIntent("solo");
                  navigate("/home");
                }}
                onRequireAuth={() => setIsAuthOpen(true)}
                onEdit={(game) => {
                  setQuiz(game.quiz);
                  setIntent("solo");
                  navigate("/home");
                }}
              />
            </MainLayout>
          }
        />
        <Route
          path="/profile"
          element={
            <MyProfile
              user={user}
              onBack={() => navigate("/home")}
              onRequireAuth={() => setIsAuthOpen(true)}
              onUserUpdated={setUser}
              autoReveal={autoReveal}
              onAutoRevealChange={setAutoReveal}
            />
          }
        />
        {/* Legacy redirect */}
        <Route path="/preview" element={<Navigate to="/home" replace />} />
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
      onCreate={() => navigate("/home")}
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
  const [showAbout, setShowAbout] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();
  const path = location.pathname;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navigationButtons = (
    <>
      <div className={`desktop-header-bg ${isScrolled ? "scrolled" : ""}`} />
      <div className="desktop-wordmark" onClick={() => navigate("/")}>
        Kuizu
      </div>
      <div className="nav-buttons-container">
        <button onClick={() => navigate("/discover")} className={`nav-button ${path === "/discover" ? "nav-button-active" : ""}`}>Discover</button>
        <button onClick={() => navigate("/games")} className={`nav-button ${path === "/games" ? "nav-button-active" : ""}`}>My Games</button>
        <button onClick={() => navigate("/home")} className={`nav-button nav-button-home ${path === "/home" || path === "/" ? "nav-button-active" : ""}`}>Home</button>
        <button onClick={() => navigate("/join")} className={`nav-button ${path.startsWith("/join") ? "nav-button-active" : ""}`}>Join a Game</button>
        <button
          onClick={(e) => { e.stopPropagation(); setShowAbout((v) => !v); }}
          className={`nav-button ${showAbout ? "nav-button-active" : ""}`}
        >
          About
        </button>
      </div>
    </>
  );

  const mobileHeader = (
    <div className="mobile-header">
      <div className="mobile-header-top">
        <span className="mobile-wordmark">Kuizu</span>
        {!authBooting && !user && (
          <button className="mobile-auth-btn" onClick={onAuthOpen}>Sign In</button>
        )}
        {!authBooting && user && (
          <button className="mobile-avatar-btn" onClick={onProfileMenuToggle} aria-label="Open profile menu">
            {profileInitial}
          </button>
        )}
      </div>
      <div className="mobile-nav-grid">
        <button className={`mobile-nav-btn ${path === "/discover" ? "mobile-nav-btn-active" : ""}`} onClick={() => navigate("/discover")}>Discover</button>
        <button className={`mobile-nav-btn ${path === "/games" ? "mobile-nav-btn-active" : ""}`} onClick={() => navigate("/games")}>My Games</button>
        <button className={`mobile-nav-btn mobile-nav-btn-home ${path === "/home" || path === "/" ? "mobile-nav-btn-active" : ""}`} onClick={() => navigate("/home")}>Home</button>
        <button className={`mobile-nav-btn ${path.startsWith("/join") ? "mobile-nav-btn-active" : ""}`} onClick={() => navigate("/join")}>Join a Game</button>
        <button className={`mobile-nav-btn ${showAbout ? "mobile-nav-btn-active" : ""}`} onClick={(e) => { e.stopPropagation(); setShowAbout((v) => !v); }}>About</button>
      </div>
    </div>
  );

  const profileControls = (
    <div
      ref={profileMenuRef}
      className="profile-controls-desktop"
      style={{
        position: "fixed",
        top: 14,
        right: 14,
        zIndex: 50,
        gap: 8,
        alignItems: "center",
      }}
    >
      {!authBooting && !user && (
        <button
          onClick={onAuthOpen}
          style={{
            padding: "10px 16px",
            minHeight: 40,
            background: COLORS.yellow,
            color: COLORS.ink,
            border: `1px solid ${COLORS.yellowDark}`,
            borderRadius: 10,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 13,
          }}
        >
          Sign In
        </button>
      )}
      {!authBooting && user && (
        <button
          onClick={onProfileMenuToggle}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: COLORS.blue,
            color: COLORS.creamSoft,
            border: `1px solid ${COLORS.blueDark}`,
            cursor: "pointer",
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            fontSize: 15,
          }}
          aria-label="Open profile menu"
        >
          {profileInitial}
        </button>
      )}
    </div>
  );

  const profileDropdown = isProfileMenuOpen && user && (
    <div
      style={{
        position: "fixed",
        top: 60,
        right: 14,
        minWidth: 210,
        borderRadius: 12,
        border: `1px solid ${COLORS.border}`,
        background: COLORS.creamSoft,
        overflow: "hidden",
        boxShadow: "0 8px 24px rgba(42,51,64,0.12)",
        zIndex: 51,
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ color: COLORS.ink, fontWeight: 700, fontSize: 14 }}>{username}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigate("/profile"); onProfileMenuToggle(); }}
        style={menuItemStyle}
      >My Profile</button>
      <button
        type="button"
        onClick={() => { navigate("/games"); onProfileMenuToggle(); }}
        style={menuItemStyle}
      >My Games</button>
      <button
        type="button"
        onClick={onLogout}
        style={{ ...menuItemStyle, borderTop: `1px solid ${COLORS.border}`, color: COLORS.coralDark }}
      >Sign Out</button>
    </div>
  );

  return (
    <div ref={profileMenuRef} style={{ position: "relative" }}>
      {navigationButtons}
      {profileControls}
      {mobileHeader}
      {profileDropdown}
      {children}
      {showAbout && <TypewriterOverlay onDismiss={() => setShowAbout(false)} />}
    </div>
  );
}

const menuItemStyle = {
  width: "100%",
  textAlign: "left",
  padding: "12px 14px",
  border: "none",
  background: "transparent",
  color: COLORS.ink,
  cursor: "pointer",
  fontSize: 14,
  fontFamily: "inherit",
  fontWeight: 500,
};

function TypewriterOverlay({ onDismiss }) {
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

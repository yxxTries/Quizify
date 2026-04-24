import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate, useSearchParams, useParams, Navigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Upload from "./Upload.jsx";
import Preview from "./Preview.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";
import Discover from "./Discover.jsx";
import MyGames from "./MyGames.jsx";
import MyProfile from "./MyProfile.jsx";
import AuthModal from "./AuthModal.jsx";
import { getCurrentUser, logout, saveMyGame, checkHealth, createDiscoverPost, getPreferences } from "./api";

const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #1A1A2E;
    color: #F1F2F6;
    font-family: 'DM Sans', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  button { font-family: inherit; }
  input  { font-family: inherit; font-size: max(16px, 1em); }
  textarea { font-family: inherit; font-size: max(16px, 1em); }
  select { font-family: inherit; }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Syne', sans-serif;
  }
  @media (max-width: 520px) {
    .quiz-grid { grid-template-columns: 1fr !important; }
  }

  .nav-buttons-container {
    position: absolute;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: center;
    max-width: calc(100vw - 140px);
    padding: 0 4px;
    align-items: center;
    z-index: 10;
  }
  .nav-button {
    white-space: nowrap;
    transition: all 0.2s ease;
    min-height: 44px;
    display: inline-flex;
    align-items: center;
  }
  /* Mobile header shell — hidden on desktop */
  .mobile-header { display: none; }
  /* Desktop profile controls */
  .profile-controls-desktop { display: flex; }

  @media (max-width: 768px) {
    /* Hide desktop nav strip and desktop profile controls */
    .nav-buttons-container { display: none !important; }
    .profile-controls-desktop { display: none !important; }

    /* Show the mobile header */
    .mobile-header {
      display: flex;
      flex-direction: column;
      position: fixed;
      top: 0; left: 0; right: 0;
      background: rgba(20, 24, 48, 0.97);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid #1e2d4e;
      z-index: 40;
    }

    /* Top bar: wordmark + auth button */
    .mobile-header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      gap: 10px;
    }
    .mobile-wordmark {
      font-family: 'Syne', sans-serif;
      font-size: 20px;
      font-weight: 800;
      color: #00D2D3;
      letter-spacing: 1px;
      line-height: 1;
    }

    /* Auth button in top bar */
    .mobile-auth-btn {
      padding: 9px 18px;
      background: #00D2D3;
      color: #0E1A2B;
      border: none;
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
      background: #13243d;
      color: #dbf4ff;
      border: 1px solid #2d4d73;
      font-family: inherit;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Nav button grid: 2 columns, full width */
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
      border: 1px solid #2B5A8A;
      background: rgba(15, 52, 96, 0.55);
      color: #E2E8F0;
      transition: opacity 0.15s;
    }
    .mobile-nav-btn:active { opacity: 0.75; }
    .mobile-nav-btn-accent {
      background: #00D2D3;
      color: #0E1A2B;
      border-color: #6FF4F0;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0,210,211,0.3);
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
    if (username) {
      return username[0].toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
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
          } catch {
            // preferences fetch failing is non-fatal; keep default
          }
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setAuthBooting(false);
        }
      }
    }

    bootstrapAuth();
    return () => {
      cancelled = true;
    };
  }, [serverStatus]);

  // Handle outside clicks for profile menu
  useEffect(() => {
    function handleOutsideClick(event) {
      if (!profileMenuRef.current) {
        return;
      }
      if (!profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Handle joining via pin from query params (legacy support)
  useEffect(() => {
    const pin = searchParams.get("pin");
    if (pin) {
      navigate(`/join/${pin}`);
    }
  }, [searchParams, navigate]);

  const handleQuizReady = (quizData) => {
    setQuiz(quizData);
    setIntent("solo");
    navigate("/preview");
  };

  const handleHostReady = (quizData) => {
    setQuiz(quizData);
    setIntent("host");
    navigate("/preview");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Keep UX resilient even if logout API fails.
    }
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
    } catch {
      // non-fatal
    }
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
            position: fixed; inset: 0; background: #000; color: #fff;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            z-index: 9999;
          }
          .blackout-title {
            font-family: 'Syne', sans-serif;
            font-size: 3.5rem; letter-spacing: 2px; margin-bottom: 1rem;
          }
          .blackout-text {
            font-family: 'DM Sans', sans-serif;
            font-size: 1.1rem; color: #888; animation: pulse 2s infinite;
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
    "/preview": { title: "Review Questions — Kuizu", description: "Edit, reorder, and customise your generated quiz questions before playing." },
    "/quiz": { title: "Playing Quiz — Kuizu", description: "Answer questions, track your streak, and see your score." },
    "/host": { title: "Host a Game — Kuizu", description: "Host a live multiplayer quiz. Share the PIN with friends and watch the leaderboard." },
    "/join": { title: "Join a Game — Kuizu", description: "Enter a game PIN and nickname to join a live Kuizu multiplayer session." },
    "/discover": { title: "Discover Quizzes — Kuizu", description: "Browse and play community-created quizzes across dozens of topics." },
    "/profile": { title: "My Profile — Kuizu", description: "View and manage your Kuizu account settings." },
    "/games": { title: "My Games — Kuizu", description: "Access your saved quizzes and pin your favourites for quick play." },
  };

  // Get current meta based on path
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
            <UploadPageContent
              user={user}
              onQuizReady={handleQuizReady}
              onHostReady={handleHostReady}
              onPlayPinned={(quizData) => {
                setQuiz(quizData);
                setIntent("solo");
                navigate("/preview");
              }}
              isProfileMenuOpen={isProfileMenuOpen}
              profileMenuRef={profileMenuRef}
              username={username}
              profileInitial={profileInitial}
              authBooting={authBooting}
              onProfileMenuToggle={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              onAuthOpen={() => setIsAuthOpen(true)}
              onLogout={handleLogout}
              navigate={navigate}
            />
          }
        />
        <Route
          path="/preview"
          element={
            quiz ? (
              <Preview
                quiz={quiz}
                onStart={(editedQuiz) => {
                  setQuiz(editedQuiz);
                  if (intent === "host") {
                    navigate("/host");
                  } else {
                    navigate("/quiz");
                  }
                }}
                onBack={() => navigate("/")}
                intent={intent}
                onSaveGame={handleSaveGame}
                onPostDiscover={handlePostDiscover}
                user={user}
                onRequireAuth={() => setIsAuthOpen(true)}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/quiz"
          element={
            quiz ? (
              <Quiz quiz={quiz} onRestart={() => navigate("/")} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/host"
          element={
            quiz ? (
              <Host quiz={quiz} onEnd={() => navigate("/")} autoReveal={autoReveal} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/join/:pin?"
          element={<JoinRoute onExit={() => navigate("/")} />}
        />
        <Route
          path="/discover"
          element={
            <Discover
              onBack={() => navigate("/")}
              onPlay={(quizData) => {
                setQuiz(quizData);
                setIntent("solo");
                navigate("/preview");
              }}
              user={user}
              onRequireAuth={() => setIsAuthOpen(true)}
            />
          }
        />
        <Route
          path="/games"
          element={
            <MyGames
              onBack={() => navigate("/")}
              username={username}
              onPlay={(quizData) => {
                setQuiz(quizData);
                setIntent("solo");
                navigate("/preview");
              }}
              onRequireAuth={() => setIsAuthOpen(true)}
              onEdit={(game) => {
                setQuiz(game.quiz);
                setIntent("solo");
                navigate("/preview");
              }}
            />
          }
        />
        <Route
          path="/profile"
          element={
            <MyProfile
              user={user}
              onBack={() => navigate("/")}
              onRequireAuth={() => setIsAuthOpen(true)}
              onUserUpdated={setUser}
              autoReveal={autoReveal}
              onAutoRevealChange={setAutoReveal}
            />
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

// Upload Page Content Component
function UploadPageContent({
  user,
  onQuizReady,
  onHostReady,
  onPlayPinned,
  isProfileMenuOpen,
  profileMenuRef,
  username,
  profileInitial,
  authBooting,
  onProfileMenuToggle,
  onAuthOpen,
  onLogout,
  navigate
}) {
  const [showAbout, setShowAbout] = useState(false);

  const navigationButtons = (
    <div className="nav-buttons-container">
      <button
        onClick={() => navigate("/discover")}
        className="nav-button"
        style={{
          padding: "10px 16px",
          background: "rgba(15, 52, 96, 0.55)",
          color: "#E2E8F0",
          border: "1px solid #2B5A8A",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        Discover
      </button>
      <button
        onClick={() => navigate("/games")}
        className="nav-button"
        style={{
          padding: "10px 16px",
          background: "rgba(36, 73, 121, 0.65)",
          color: "#E2E8F0",
          border: "1px solid #3E6EA3",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 700,
        }}
      >
        My Games
      </button>
      <button
        onClick={() => navigate("/join")}
        className="nav-button"
        style={{
          padding: "10px 16px",
          background: "#00D2D3",
          color: "#0E1A2B",
          border: "1px solid #6FF4F0",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 700,
          boxShadow: "0 6px 14px rgba(0, 210, 211, 0.35)",
        }}
      >
        Join a Game
      </button>
      <button
        onMouseEnter={() => setShowAbout(true)}
        onMouseLeave={() => setShowAbout(false)}
        onClick={() => setShowAbout((v) => !v)}
        className="nav-button"
        style={{
          padding: "10px 16px",
          background: "rgba(15, 52, 96, 0.55)",
          color: "#E2E8F0",
          border: "1px solid #2B5A8A",
          borderRadius: 8,
          cursor: "pointer",
          fontWeight: 600,
        }}
      >
        About Kuizu
      </button>

    </div>
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
        <button className="mobile-nav-btn" onClick={() => navigate("/discover")}>Discover</button>
        <button className="mobile-nav-btn" onClick={() => navigate("/games")}>My Games</button>
        <button className="mobile-nav-btn mobile-nav-btn-accent" onClick={() => navigate("/join")}>Join a Game</button>
        <button className="mobile-nav-btn" onClick={() => setShowAbout((v) => !v)}>About Kuizu</button>
      </div>
    </div>
  );

  const profileControls = (
    <div
      ref={profileMenuRef}
      className="profile-controls-desktop"
      style={{
        position: "fixed",
        top: 12,
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
            minHeight: 44,
            background: "#13243d",
            color: "#e3eefc",
            border: "1px solid #2d4d73",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 14,
          }}
        >
          Sign In
        </button>
      )}

      {!authBooting && user && (
        <button
          onClick={onProfileMenuToggle}
          style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            background: "#13243d",
            color: "#dbf4ff",
            border: "1px solid #2d4d73",
            cursor: "pointer",
            fontWeight: 700,
            display: "grid",
            placeItems: "center",
            fontSize: 16,
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
        border: "1px solid #2f4f75",
        background: "#12243d",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        zIndex: 51,
      }}
    >
      <div style={{ padding: "14px 14px 12px", borderBottom: "1px solid #264363" }}>
        <div style={{ color: "#d7e8ff", fontWeight: 700, fontSize: 14 }}>{username}</div>
      </div>
      <button
        type="button"
        onClick={() => { navigate("/profile"); onProfileMenuToggle(); }}
        style={{ width: "100%", textAlign: "left", padding: "14px 14px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer", fontSize: 15 }}
      >
        My Profile
      </button>
      <button
        type="button"
        onClick={() => { navigate("/games"); onProfileMenuToggle(); }}
        style={{ width: "100%", textAlign: "left", padding: "14px 14px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer", fontSize: 15 }}
      >
        My Games
      </button>
      <button
        type="button"
        onClick={onLogout}
        style={{ width: "100%", textAlign: "left", padding: "14px 14px", border: "none", borderTop: "1px solid #264363", background: "transparent", color: "#ffb7bf", cursor: "pointer", fontSize: 15 }}
      >
        Sign Out
      </button>
    </div>
  );

  return (
    <div ref={profileMenuRef} style={{ position: "relative" }}>
      {navigationButtons}
      {profileControls}
      {mobileHeader}
      {profileDropdown}
      <Upload onQuizReady={onQuizReady} onHostReady={onHostReady} user={user} onPlayPinned={onPlayPinned} />
      {showAbout && <TypewriterOverlay onDismiss={() => setShowAbout(false)} />}
    </div>
  );
}

function TypewriterOverlay({ onDismiss }) {
  const fullText = [
    "About",
    "=======================",
    "The motivation behind Kuizu",
    "",
    "During my experience as an educator, I found myself spending countless hours crafting quizzes from lecture slides and reading materials, time that could be better spent actually teaching. I wanted a tool that could instantly transform my PDFs and presentations into engaging, high quality quizzes without cutting corners on academic rigor, while being straightforward and uncomplicated for anyone to use.",
    "",
    "Most importantly, I believed great quizzes shouldn't stay locked in one classroom. That's why I built in a community hub where educators and students can share, discover, and remix each other's content.",
    "",
    "Kuizu is completely free and still very very early and I am also welcoming contributors. If you're interested in helping out, please reach out!",
    "",
    "Contact Details",
    "---------------",
    "Email:    yxx.tweaks@gmail.com",
    "LinkedIn: https://www.linkedin.com/in/amilshahul/",
    "GitHub:   https://github.com/yxxTries"
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
      onClick={onDismiss}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", zIndex: 9998, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "clamp(16px, 5vmin, 40px)", cursor: "pointer" }}
    >
      <div style={{ whiteSpace: "pre-wrap", color: "#00D2D3", fontSize: "clamp(13px, 2.8vmin, 22px)", fontFamily: "monospace", textAlign: "left", width: "100%", maxWidth: "800px", lineHeight: 1.7, overflowY: "auto", maxHeight: "80vh" }}>
        {displayed}
        <span style={{ animation: "cursorBlink 1s step-end infinite" }}>_</span>
      </div>
      <p style={{ marginTop: "clamp(12px, 3vmin, 28px)", color: "rgba(255,255,255,0.45)", fontSize: "13px", fontFamily: "monospace", flexShrink: 0 }}>Tap anywhere to close</p>
      <style>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}

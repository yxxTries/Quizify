import React, { useEffect, useMemo, useRef, useState } from "react";
import { Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
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
  input  { font-family: inherit; }
  textarea { font-family: inherit; }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Syne', sans-serif;
  }
  @media (max-width: 520px) {
    .quiz-grid { grid-template-columns: 1fr !important; }
  }
`;

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
          <h1 className="blackout-title">KuizuAI</h1>
          {serverStatus === "waking" && (
            <p className="blackout-text">
              Please wait while the servers wake up. ETA ~50s
            </p>
          )}
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
              (navigate("/"), null)
            )
          }
        />
        <Route
          path="/quiz"
          element={
            quiz ? (
              <Quiz quiz={quiz} onRestart={() => navigate("/")} autoReveal={autoReveal} />
            ) : (
              (navigate("/"), null)
            )
          }
        />
        <Route
          path="/host"
          element={
            quiz ? (
              <Host quiz={quiz} onEnd={() => navigate("/")} autoReveal={autoReveal} />
            ) : (
              (navigate("/"), null)
            )
          }
        />
        <Route
          path="/join/:pin?"
          element={<Join initialPin={searchParams.get("pin") || ""} onExit={() => navigate("/")} />}
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
  const navigationButtons = (
    <div
      style={{
        position: "absolute",
        top: 24,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        gap: "10px",
        flexWrap: "wrap",
        justifyContent: "center",
        maxWidth: "calc(100vw - 140px)",
        padding: "0 4px",
        alignItems: "center",
      }}
    >
      <button
        onClick={() => navigate("/discover")}
        style={{
          padding: "8px 16px",
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
        style={{
          padding: "8px 16px",
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
        style={{
          padding: "8px 16px",
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
    </div>
  );

  const profileControls = (
    <div
      ref={profileMenuRef}
      style={{
        position: "fixed",
        top: 18,
        right: 20,
        zIndex: 50,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {!authBooting && !user && (
        <button
          onClick={onAuthOpen}
          style={{
            padding: "8px 14px",
            background: "#13243d",
            color: "#e3eefc",
            border: "1px solid #2d4d73",
            borderRadius: 8,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Sign In
        </button>
      )}

      {!authBooting && user && (
        <>
          <button
            onClick={onProfileMenuToggle}
            style={{
              width: 40,
              height: 40,
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

          {isProfileMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: 48,
                right: 0,
                minWidth: 210,
                borderRadius: 12,
                border: "1px solid #2f4f75",
                background: "#12243d",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid #264363" }}>
                <div style={{ color: "#d7e8ff", fontWeight: 700, fontSize: 14 }}>{username}</div>
              </div>

              <button
                type="button"
                onClick={() => { navigate("/profile"); onProfileMenuToggle(); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer" }}
              >
                My Profile
              </button>
              <button
                type="button"
                onClick={() => { navigate("/games"); onProfileMenuToggle(); }}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer" }}
              >
                My Games
              </button>
              <button
                type="button"
                onClick={onLogout}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderTop: "1px solid #264363", background: "transparent", color: "#ffb7bf", cursor: "pointer" }}
              >
                Sign Out
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return (
    <div style={{ position: "relative" }}>
      {navigationButtons}
      {profileControls}
      <Upload onQuizReady={onQuizReady} onHostReady={onHostReady} user={user} onPlayPinned={onPlayPinned} />
    </div>
  );
}


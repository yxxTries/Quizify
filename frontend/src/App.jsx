import React, { useEffect, useMemo, useRef, useState } from "react";
import Upload from "./Upload.jsx";
import Preview from "./Preview.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";
import Discover from "./Discover.jsx";
import MyGames from "./MyGames.jsx";
import MyProfile from "./MyProfile.jsx";
import AuthModal from "./AuthModal.jsx";
import { getCurrentUser, logout, saveMyGame, checkHealth } from "./api";

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
  // "upload" | "preview" | "quiz" | "host" | "join" | "discover" | "profile" | "games"
  const [page, _setPage] = useState(() => {
    if (window.history.state?.page) {
      return window.history.state.page;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get("pin")) return "join";
    return "upload";
  });

  const setPage = (newPage) => {
    window.history.pushState({ page: newPage }, "");
    _setPage(newPage);
  };

  useEffect(() => {
    const handlePopState = (event) => {
      if (event.state?.page) {
        _setPage(event.state.page);
      } else {
        const params = new URLSearchParams(window.location.search);
        _setPage(params.get("pin") ? "join" : "upload");
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  
  const [quiz, setQuiz] = useState(null);
  const [intent, setIntent] = useState("solo");
  const [joinPin, setJoinPin] = useState(() => new URLSearchParams(window.location.search).get("pin") || "");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authBooting, setAuthBooting] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState("checking"); // "checking" | "waking" | "ready"
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

  const showFloatingAccountControls = page === "upload";

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

  useEffect(() => {
    if (serverStatus !== "ready") return;

    let cancelled = false;

    async function bootstrapAuth() {
      try {
        const currentUser = await getCurrentUser();
        if (!cancelled) {
          setUser(currentUser);
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

  const handleQuizReady = (quizData) => {
    setQuiz(quizData);
    setIntent("solo");
    setPage("preview");
  };

  const handleHostReady = (quizData) => {
    setQuiz(quizData);
    setIntent("host");
    setPage("preview");
  }

  const handleStartReview = (editedQuiz) => {
    setQuiz(editedQuiz);
    if (intent === "host") {
      setPage("host");
    } else {
      setPage("quiz");
    }
  };

  const handleRestart = () => {
    setQuiz(null);
    setJoinPin("");
    setPage("upload");
    window.history.replaceState({ page: "upload" }, document.title, window.location.pathname);
  };

  const handlePlayFromDiscover = (quizData) => {
    setQuiz(quizData);
    setIntent("solo");
    setPage("preview");
  };

  const handlePlayFromMyGames = (quizData) => {
    setQuiz(quizData);
    setIntent("solo");
    setPage("preview");
  };

  const handleEditFromMyGames = (game) => {
    setQuiz(game.quiz);
    setIntent("solo");
    setPage("preview");
  };

  const handleSaveGame = async (payload) => {
    if (!user) {
      setIsAuthOpen(true);
      throw new Error("Please sign in to save games.");
    }

    return saveMyGame(payload);
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Keep UX resilient even if logout API fails.
    }
    setUser(null);
    setIsProfileMenuOpen(false);
    setPage("upload");
  };

  const handleAuthSuccess = (nextUser) => {
    setUser(nextUser);
    setIsProfileMenuOpen(false);
    setPage("upload");
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

  return (
    <>
      <style>{globalStyle}</style>
      {showFloatingAccountControls && (
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
              onClick={() => setIsAuthOpen(true)}
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
                onClick={() => setIsProfileMenuOpen((open) => !open)}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(180deg, #1c3f67 0%, #132a47 100%)",
                  color: "#dbf4ff",
                  border: "1px solid #4b6f96",
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
                    background: "linear-gradient(180deg, #12243d 0%, #0c1a2b 100%)",
                    boxShadow: "0 16px 32px rgba(0, 0, 0, 0.35)",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ padding: "12px 12px 10px", borderBottom: "1px solid #264363" }}>
                    <div style={{ color: "#d7e8ff", fontWeight: 700, fontSize: 14 }}>{username}</div>
                  </div>

                  <button
                    type="button"
                    onClick={() => { setPage("profile"); setIsProfileMenuOpen(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer" }}
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => { setPage("games"); setIsProfileMenuOpen(false); }}
                    style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", background: "transparent", color: "#cfe3f9", cursor: "pointer" }}
                  >
                    My Games
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    style={{ width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderTop: "1px solid #264363", background: "transparent", color: "#ffb7bf", cursor: "pointer" }}
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {page === "upload"  && (
         <div style={{ position: "relative" }}>
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
               onClick={() => setPage("discover")}
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
               onClick={() => setPage("games")}
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
               onClick={() => setPage("join")}
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
           <Upload onQuizReady={handleQuizReady} onHostReady={handleHostReady} user={user} onPlayPinned={handlePlayFromMyGames} />
         </div>
      )}
      {page === "preview" && (
        <Preview
          quiz={quiz}
          onStart={handleStartReview}
          onBack={handleRestart}
          intent={intent}
          onSaveGame={handleSaveGame}
        />
      )}
      {page === "quiz"    && <Quiz    quiz={quiz} onRestart={handleRestart} />}
      {page === "host"    && <Host    quiz={quiz} onEnd={handleRestart} />}
      {page === "join"    && <Join    initialPin={joinPin} onExit={handleRestart} />}
      {page === "discover" && <Discover onBack={handleRestart} onPlay={handlePlayFromDiscover} />}
      {page === "profile" && (
        <MyProfile
          user={user}
          onBack={handleRestart}
          onRequireAuth={() => setIsAuthOpen(true)}
          onUserUpdated={setUser}
        />
      )}
      {page === "games" && (
        <MyGames
          onBack={handleRestart}
          username={username}
          onPlay={handlePlayFromMyGames}
          onRequireAuth={() => setIsAuthOpen(true)}
          onEdit={handleEditFromMyGames}
        />
      )}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={handleAuthSuccess}
        />
      )}
    </>
  );
}


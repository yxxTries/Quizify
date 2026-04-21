import React, { useEffect, useState } from "react";
import Upload from "./Upload.jsx";
import Preview from "./Preview.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";
import Discover from "./Discover.jsx";
import AuthModal from "./AuthModal.jsx";
import { getCurrentUser, logout } from "./api";

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
  // "upload" | "preview" | "quiz" | "host" | "join" | "discover"
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pin")) return "join";
    return "upload";
  });
  
  const [quiz, setQuiz] = useState(null);
  const [intent, setIntent] = useState("solo");
  const [joinPin, setJoinPin] = useState(() => new URLSearchParams(window.location.search).get("pin") || "");
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [authBooting, setAuthBooting] = useState(true);

  useEffect(() => {
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
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const handlePlayFromDiscover = (quizData) => {
    setQuiz(quizData);
    setIntent("solo");
    setPage("preview");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Keep UX resilient even if logout API fails.
    }
    setUser(null);
  };

  return (
    <>
      <style>{globalStyle}</style>
      <div
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
            <div style={{ color: "#a7c1de", fontSize: 13, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis" }}>
              {user.email}
            </div>
            <button
              onClick={handleLogout}
              style={{
                padding: "8px 12px",
                background: "rgba(16, 30, 49, 0.9)",
                color: "#f5c7cb",
                border: "1px solid #83505a",
                borderRadius: 8,
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              Sign Out
            </button>
          </>
        )}
      </div>

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
           <Upload onQuizReady={handleQuizReady} onHostReady={handleHostReady} />
         </div>
      )}
      {page === "preview" && <Preview quiz={quiz} onStart={handleStartReview} onBack={handleRestart} intent={intent} />}
      {page === "quiz"    && <Quiz    quiz={quiz} onRestart={handleRestart} />}
      {page === "host"    && <Host    quiz={quiz} onEnd={handleRestart} />}
      {page === "join"    && <Join    initialPin={joinPin} onExit={handleRestart} />}
      {page === "discover" && <Discover onBack={handleRestart} onPlay={handlePlayFromDiscover} />}
      {isAuthOpen && (
        <AuthModal
          onClose={() => setIsAuthOpen(false)}
          onAuthSuccess={(nextUser) => setUser(nextUser)}
        />
      )}
    </>
  );
}


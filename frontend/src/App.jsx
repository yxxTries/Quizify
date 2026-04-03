import React, { useState } from "react";
import Upload from "./Upload.jsx";
import Preview from "./Preview.jsx";
import Quiz from "./Quiz.jsx";
import Host from "./Host.jsx";
import Join from "./Join.jsx";

const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0a0f;
    color: #f0ede8;
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
  // "upload" | "preview" | "quiz" | "host" | "join"
  const [page, setPage] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("pin")) return "join";
    return "upload";
  });
  
  const [quiz, setQuiz] = useState(null);
  const [intent, setIntent] = useState("solo");

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
    setPage("upload");
    window.history.replaceState({}, document.title, window.location.pathname);
  };

  const initialPin = new URLSearchParams(window.location.search).get("pin") || "";

  return (
    <>
      <style>{globalStyle}</style>
      {page === "upload"  && (
         <div style={{ position: "relative" }}>
           <button 
              onClick={() => setPage("join")} 
              style={{ position: "absolute", top: 24, right: 40, padding: "8px 16px", background: "transparent", color: "#8e8ea0", border: "1px solid #2e2e42", borderRadius: 8, cursor: "pointer" }}
           >
              Join a Game
           </button>
           <Upload onQuizReady={handleQuizReady} onHostReady={handleHostReady} />
         </div>
      )}
      {page === "preview" && <Preview quiz={quiz} onStart={handleStartReview} onBack={handleRestart} intent={intent} />}
      {page === "quiz"    && <Quiz    quiz={quiz} onRestart={handleRestart} />}
      {page === "host"    && <Host    quiz={quiz} onEnd={handleRestart} />}
      {page === "join"    && <Join    initialPin={initialPin} onExit={handleRestart} />}
    </>
  );
}

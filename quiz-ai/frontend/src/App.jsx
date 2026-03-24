import React, { useState } from "react";
import Upload from "./Upload.jsx";
import Quiz from "./Quiz.jsx";

// Global reset styles applied once at the root
const globalStyle = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background: #0a0a0f;
    color: #f0ede8;
    -webkit-font-smoothing: antialiased;
  }
  button { font-family: inherit; }
  input  { font-family: inherit; }

  /* Responsive: stack answer grid on small screens */
  @media (max-width: 520px) {
    .quiz-grid { grid-template-columns: 1fr !important; }
  }
`;

export default function App() {
  // "upload" | "quiz"
  const [page, setPage] = useState("upload");
  const [quiz, setQuiz] = useState(null);

  const handleQuizReady = (quizData) => {
    setQuiz(quizData);
    setPage("quiz");
  };

  const handleRestart = () => {
    setQuiz(null);
    setPage("upload");
  };

  return (
    <>
      <style>{globalStyle}</style>
      {page === "upload" && <Upload onQuizReady={handleQuizReady} />}
      {page === "quiz"   && <Quiz   quiz={quiz} onRestart={handleRestart} />}
    </>
  );
}

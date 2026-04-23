import React, { useMemo, useState } from "react";

const CATEGORIES = [
  "All",
  "Science",
  "History",
  "Math",
  "Gaming",
  "Language",
  "Business",
  "General",
  "Other",
];

const QUIZ_SHOWROOM = [
  { id: "q1", title: "Physics Quickfire", category: "Science", author: "Maya", plays: 128, difficulty: "Medium", pin: "741259", estimatedTime: "7 min", questionCount: 8, rating: 4.5 },
  { id: "q2", title: "Startup Terms 101", category: "Business", author: "Arjun", plays: 83, difficulty: "Easy", pin: "903114", estimatedTime: "5 min", questionCount: 6, rating: 4.2 },
  { id: "q3", title: "Ancient Civilizations", category: "History", author: "Lena", plays: 204, difficulty: "Hard", pin: "558027", estimatedTime: "10 min", questionCount: 10, rating: 4.8 },
  { id: "q4", title: "Esports Trivia Pack", category: "Gaming", author: "Noah", plays: 301, difficulty: "Medium", pin: "662845", estimatedTime: "8 min", questionCount: 9, rating: 4.6 },
  { id: "q5", title: "Spanish Basics", category: "Language", author: "Sofia", plays: 97, difficulty: "Easy", pin: "811736", estimatedTime: "6 min", questionCount: 7, rating: 4.1 },
  { id: "q6", title: "Algebra Sprint", category: "Math", author: "Kai", plays: 155, difficulty: "Medium", pin: "470192", estimatedTime: "9 min", questionCount: 10, rating: 4.4 },
];

function difficultyColor(level) {
  if (level === "Easy") return "#27AE60";
  if (level === "Hard") return "#E74C3C";
  return "#F39C12";
}

function buildSampleQuiz(quiz) {
  const options = ["Option A", "Option B", "Option C", "Option D"];
  return {
    discoverMeta: {
      title: quiz.title,
      author: quiz.author,
      category: quiz.category,
      difficulty: quiz.difficulty,
      plays: quiz.plays,
      estimatedTime: quiz.estimatedTime,
      questionCount: quiz.questionCount,
      rating: quiz.rating,
    },
    questions: Array.from({ length: quiz.questionCount }, (_, index) => ({
      question: `${quiz.title} - Question ${index + 1}`,
      choices: options,
      correct_index: index % options.length,
    })),
  };
}

export default function Discover({ onBack, onPlay }) {
  const [category, setCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filteredQuizzes = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return QUIZ_SHOWROOM.filter((quiz) => {
      const categoryMatch = category === "All" || quiz.category === category;
      const textMatch =
        !normalized ||
        quiz.title.toLowerCase().includes(normalized) ||
        quiz.author.toLowerCase().includes(normalized);

      return categoryMatch && textMatch;
    });
  }, [category, search]);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <header style={styles.header}>
          <div>
            <h1 style={styles.title}>Discover Community Quizzes</h1>
            <p style={styles.subtitle}>
              Browse public quizzes by category. This page is intentionally barebones so we can add search, ranking, and live data safely.
            </p>
          </div>
          <button type="button" onClick={onBack} style={styles.backButton}>
            Back to Home
          </button>
        </header>

        <section style={styles.controlsRow}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title or creator"
            style={styles.searchInput}
          />

          <div style={styles.categoriesWrap}>
            {CATEGORIES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                style={{
                  ...styles.categoryChip,
                  ...(category === item ? styles.categoryChipActive : {}),
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </section>

        <section style={styles.grid}>
          {filteredQuizzes.length === 0 && (
            <div style={styles.emptyState}>
              <h2 style={styles.emptyTitle}>No quizzes found</h2>
              <p style={styles.emptyText}>Try another category or search term.</p>
            </div>
          )}

          {filteredQuizzes.map((quiz) => (
            <article key={quiz.id} style={styles.card} onClick={() => onPlay(buildSampleQuiz(quiz))}>
              <div style={styles.cardTop}>
                <span style={styles.cardCategory}>{quiz.category}</span>
                <span style={{ ...styles.difficultyBadge, borderColor: difficultyColor(quiz.difficulty), color: difficultyColor(quiz.difficulty) }}>
                  {quiz.difficulty}
                </span>
              </div>

              <h3 style={styles.cardTitle}>{quiz.title}</h3>

              <p style={styles.cardMeta}>by {quiz.author}</p>
              <p style={styles.cardMeta}>{quiz.plays} plays</p>
              <p style={styles.cardMeta}>{quiz.questionCount} questions</p>
              <p style={styles.cardMeta}>Estimated time: {quiz.estimatedTime}</p>
              <p style={styles.cardMeta}>Rating: {quiz.rating.toFixed(1)} / 5</p>
              <div style={styles.cardActions}>
                <button
                  type="button"
                  style={styles.secondaryAction}
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(buildSampleQuiz(quiz));
                  }}
                >
                  Play Quiz
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "#1A1A2E",
    color: "#F1F2F6",
    padding: "32px 20px",
  },
  container: {
    width: "100%",
    maxWidth: "1120px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "12px",
    flexWrap: "wrap",
  },
  title: {
    fontSize: "34px",
    lineHeight: 1.1,
    margin: 0,
    color: "#F1F2F6",
  },
  subtitle: {
    marginTop: "10px",
    color: "#B0BAC3",
    maxWidth: "740px",
    fontSize: "15px",
  },
  backButton: {
    border: "1px solid #2B5A8A",
    background: "rgba(15, 52, 96, 0.55)",
    color: "#E2E8F0",
    borderRadius: "10px",
    padding: "10px 14px",
    cursor: "pointer",
    fontWeight: 600,
  },
  controlsRow: {
    border: "1px solid #0F3460",
    background: "#20233D",
    borderRadius: "16px",
    padding: "16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
  },
  searchInput: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #2B5A8A",
    background: "#151B33",
    color: "#F1F2F6",
    padding: "12px 14px",
    outline: "none",
    fontSize: "15px",
  },
  categoriesWrap: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
  },
  categoryChip: {
    border: "1px solid #2B5A8A",
    background: "transparent",
    color: "#B0BAC3",
    borderRadius: "999px",
    padding: "8px 12px",
    fontSize: "14px",
    cursor: "pointer",
  },
  categoryChipActive: {
    background: "#00D2D3",
    color: "#101A2B",
    borderColor: "#00D2D3",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "14px",
  },
  emptyState: {
    gridColumn: "1 / -1",
    border: "1px dashed #2B5A8A",
    borderRadius: "14px",
    padding: "24px",
    textAlign: "center",
    background: "#20233D",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "20px",
  },
  emptyText: {
    marginTop: "8px",
    color: "#B0BAC3",
  },
  card: {
    background: "#252A4A",
    border: "1px solid #0F3460",
    borderRadius: "14px",
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    cursor: "pointer",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
  },
  cardCategory: {
    color: "#00D2D3",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "0.4px",
    textTransform: "uppercase",
  },
  difficultyBadge: {
    border: "1px solid",
    borderRadius: "999px",
    padding: "3px 8px",
    fontSize: "12px",
    fontWeight: 700,
  },
  cardTitle: {
    margin: 0,
    fontSize: "19px",
    lineHeight: 1.2,
    minHeight: "46px",
  },
  cardMeta: {
    margin: 0,
    color: "#B0BAC3",
    fontSize: "13px",
  },
  cardActions: {
    marginTop: "8px",
    display: "flex",
    gap: "8px",
  },
  secondaryAction: {
    width: "100%",
    borderRadius: "10px",
    border: "1px solid #2B5A8A",
    background: "transparent",
    color: "#B0BAC3",
    padding: "9px 10px",
    cursor: "pointer",
    fontWeight: 600,
  },
};

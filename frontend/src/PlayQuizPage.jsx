import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { getDiscoverPosts } from "./api.js";
import { useTheme } from "./ThemeContext.jsx";
import { FONTS } from "./theme.js";

export default function PlayQuizPage({ onPlay }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { colors: COLORS } = useTheme();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const payload = await getDiscoverPosts();
        if (!cancelled) {
          const posts = Array.isArray(payload?.posts) ? payload.posts : [];
          const found = posts.find((p) => String(p.id) === String(id));
          if (found) {
            setPost(found);
          } else {
            setError("Quiz not found.");
          }
        }
      } catch (err) {
        if (!cancelled) setError("Could not load quiz.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id]);

  const quizJsonLd = useMemo(() => {
    if (!post) return null;
    const quiz = post.quiz || {};
    const questions = quiz.questions || [];
    return JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Quiz",
      "name": post.title,
      "description": post.title + " — a community quiz on " + (post.category || "General"),
      "educationalLevel": post.difficulty || "beginner",
      "about": { "@type": "Thing", "name": post.category || "General" },
      "numberOfQuestions": post.questions_count || questions.length,
      "timeRequired": post.estimated_time || "5 min",
      "author": { "@type": "Person", "name": post.author },
      "hasPart": questions.slice(0, 5).map((q) => ({
        "@type": "Question",
        "name": q.question,
        "suggestedAnswer": (q.choices || []).map((c) => ({
          "@type": "Answer",
          "text": c
        }))
      }))
    });
  }, [post]);

  const handlePlay = () => {
    if (post) {
      onPlay(post.quiz);
      navigate("/quiz");
    }
  };

  const styles = useMemo(() => ({
    page: {
      minHeight: "100vh",
      background: COLORS.cream,
      color: COLORS.ink,
      fontFamily: FONTS.body,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      textAlign: "center",
    },
    card: {
      background: COLORS.creamSoft,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 18,
      padding: "32px 28px",
      maxWidth: 540,
      width: "100%",
    },
    title: {
      fontFamily: FONTS.display,
      fontSize: "clamp(22px, 5vw, 32px)",
      fontWeight: 700,
      margin: "0 0 8px",
    },
    meta: {
      color: COLORS.inkMuted,
      fontSize: 14,
      margin: "4px 0",
    },
    category: {
      display: "inline-block",
      background: COLORS.blueSoft,
      color: COLORS.blueDark,
      padding: "4px 12px",
      borderRadius: 999,
      fontSize: 13,
      fontWeight: 700,
      margin: "12px 0",
    },
    playBtn: {
      marginTop: 24,
      background: COLORS.sageDark,
      color: COLORS.creamSoft,
      border: "none",
      borderRadius: 12,
      padding: "14px 36px",
      fontSize: 16,
      fontWeight: 700,
      cursor: "pointer",
      fontFamily: "inherit",
    },
    backBtn: {
      background: "transparent",
      color: COLORS.inkMuted,
      border: `1px solid ${COLORS.border}`,
      borderRadius: 10,
      padding: "10px 20px",
      marginTop: 12,
      cursor: "pointer",
      fontFamily: "inherit",
      fontSize: 14,
    },
    errorText: {
      color: COLORS.coralDark,
      fontSize: 16,
    },
  }), [COLORS]);

  if (loading) {
    return (
      <div style={styles.page}>
        <Helmet><title>Loading Quiz — Kuizu</title></Helmet>
        <p>Loading quiz...</p>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={styles.page}>
        <Helmet>
          <title>Quiz Not Found — Kuizu</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <p style={styles.errorText}>{error || "Quiz not found."}</p>
        <button style={styles.backBtn} onClick={() => navigate("/discover")}>
          Browse Discover
        </button>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Helmet>
        <title>{post.title} — Play on Kuizu</title>
        <meta name="description" content={`Play "${post.title}" — a ${post.questions_count}-question quiz in ${post.category}. Created by ${post.author} on Kuizu, the free AI quiz maker.`} />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href={`https://www.kuizu.online/play/${post.id}`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={`${post.title} — Play on Kuizu`} />
        <meta property="og:description" content={`Play "${post.title}" — a ${post.questions_count}-question quiz in ${post.category}. Created by ${post.author}.`} />
        <meta property="og:image" content="/og-image.svg" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:url" content={`https://www.kuizu.online/play/${post.id}`} />
        <meta property="og:site_name" content="Kuizu" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${post.title} — Play on Kuizu`} />
        <meta name="twitter:description" content={`Play "${post.title}" — a ${post.questions_count}-question quiz in ${post.category}. Created by ${post.author}.`} />
        <script type="application/ld+json">{quizJsonLd}</script>
      </Helmet>

      <div style={styles.card}>
        <h1 style={styles.title}>{post.title}</h1>
        <div style={styles.category}>{post.category}</div>
        <p style={styles.meta}>by {post.author}</p>
        <p style={styles.meta}>{post.questions_count} questions · {post.estimated_time} · {post.plays} plays</p>
        <p style={styles.meta}>Difficulty: {post.difficulty} · Rating: {post.rating?.toFixed?.(1) || "0.0"} / 5</p>
        <button style={styles.playBtn} onClick={handlePlay}>Play Quiz</button>
      </div>

      <button style={styles.backBtn} onClick={() => navigate("/discover")}>
        ← Back to Discover
      </button>
    </div>
  );
}

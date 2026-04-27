// ──────────────────────────────────────────────
// Theme system — light & dark palettes
// ──────────────────────────────────────────────
//
// Both palettes use the same KEYS so any component can read COLORS.<key>
// and reactively re-render via React context.

export const LIGHT_COLORS = {
  // Surfaces
  cream: "#FBF6E9",
  creamSoft: "#FFFCF0",
  creamWarm: "#F4ECD2",
  // Accents
  yellow: "#F5E1A4",
  yellowSoft: "#FCEFC4",
  yellowDark: "#E8C76B",
  blue: "#7FA3C9",
  blueDark: "#5A7FA8",
  blueSoft: "#D8E4F0",
  sage: "#A8C3A0",
  sageDark: "#82A87B",
  sageSoft: "#DFEAD9",
  coral: "#E89B8C",
  coralDark: "#D77966",
  coralSoft: "#F6D6CD",
  // Text
  ink: "#2A3340",
  inkSoft: "#5C6877",
  inkMuted: "#8A95A3",
  // Lines
  border: "#E5DCC2",
  borderSoft: "#EFE7CF",
  // Quiz / Host surfaces (light variants of the old navy theme)
  quizBg: "#FBF6E9",
  quizHeader: "#F4ECD2",
  quizCard: "#FFFCF0",
  quizCardBorder: "#E5DCC2",
  quizSubCard: "#F4ECD2",
  quizSubCardBorder: "#E5DCC2",
  quizText: "#2A3340",
  quizTextSoft: "#5C6877",
  quizTextMuted: "#8A95A3",
  quizAccent: "#5A7FA8",
  quizAccentSoft: "rgba(90, 127, 168, 0.15)",
  quizPositive: "#26890c",
  quizPositiveBg: "rgba(38, 137, 12, 0.10)",
  quizNegative: "#D77966",
  quizNegativeBg: "rgba(215, 121, 102, 0.10)",
  // Overlay / scrim
  overlay: "rgba(42, 51, 64, 0.55)",
  shadow: "rgba(42, 51, 64, 0.15)",
};

export const DARK_COLORS = {
  // Surfaces
  cream: "#1A1A2E",
  creamSoft: "#22243B",
  creamWarm: "#252A4A",
  // Accents (dimmed for better contrast with light text in dark mode)
  yellow: "#8B6B22",
  yellowSoft: "#3a341f",
  yellowDark: "#6E5215",
  blue: "#7FA3C9",
  blueDark: "#5A7FA8",
  blueSoft: "#2c3a4f",
  sage: "#4A6B43",
  sageDark: "#375031",
  sageSoft: "#2c3a2c",
  coral: "#E89B8C",
  coralDark: "#D77966",
  coralSoft: "#3d2a26",
  // Text
  ink: "#DDE3EA",
  inkSoft: "#B0BAC3",
  inkMuted: "#7c8694",
  // Lines
  border: "#0F3460",
  borderSoft: "#16213E",
  // Quiz / Host surfaces (the existing navy theme)
  quizBg: "#1A1A2E",
  quizHeader: "#16213E",
  quizCard: "#252A4A",
  quizCardBorder: "#0F3460",
  quizSubCard: "#16213E",
  quizSubCardBorder: "#0F3460",
  quizText: "#F1F2F6",
  quizTextSoft: "#B0BAC3",
  quizTextMuted: "#8A95A3",
  quizAccent: "#00D2D3",
  quizAccentSoft: "rgba(0, 210, 211, 0.15)",
  quizPositive: "#5dd85d",
  quizPositiveBg: "rgba(38, 137, 12, 0.18)",
  quizNegative: "#ff7070",
  quizNegativeBg: "rgba(226, 27, 60, 0.18)",
  // Overlay / scrim
  overlay: "rgba(0, 0, 0, 0.7)",
  shadow: "rgba(0, 0, 0, 0.4)",
};

// Default export = light palette (used as the static fallback by code that
// imports COLORS without wiring into the React context).
export const COLORS = LIGHT_COLORS;

export const FONTS = {
  body: "'DM Sans', sans-serif",
  display: "'Syne', sans-serif",
};

export const THEME_STORAGE_KEY = "kuizu_theme";

export function getStoredTheme() {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === "dark" || v === "light" ? v : "light";
  } catch {
    return "light";
  }
}

export function storeTheme(mode) {
  try { localStorage.setItem(THEME_STORAGE_KEY, mode); } catch {}
}

export function getPalette(mode) {
  return mode === "dark" ? DARK_COLORS : LIGHT_COLORS;
}

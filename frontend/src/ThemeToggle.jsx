import React from "react";
import { useTheme } from "./ThemeContext.jsx";

export default function ThemeToggle({ size = 40, style = {} }) {
  const { mode, toggle, colors } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: colors.creamSoft,
        color: colors.ink,
        border: `1px solid ${colors.border}`,
        cursor: "pointer",
        display: "grid",
        placeItems: "center",
        fontFamily: "inherit",
        fontSize: 18,
        lineHeight: 1,
        transition: "background 0.2s, color 0.2s, border-color 0.2s",
        flexShrink: 0,
        ...style,
      }}
      onMouseOver={(e) => { e.currentTarget.style.background = colors.yellowSoft; }}
      onMouseOut={(e) => { e.currentTarget.style.background = colors.creamSoft; }}
    >
      {isDark ? (
        // Sun icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
      ) : (
        // Moon icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

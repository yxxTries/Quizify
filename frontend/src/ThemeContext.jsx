import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getPalette, getStoredTheme, storeTheme } from "./theme.js";

const ThemeContext = createContext({
  mode: "light",
  colors: getPalette("light"),
  toggle: () => {},
  setMode: () => {},
});

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => getStoredTheme());

  useEffect(() => {
    storeTheme(mode);
    // Expose CSS variables on the root so plain CSS (e.g. body background) reacts.
    const palette = getPalette(mode);
    const root = document.documentElement;
    Object.entries(palette).forEach(([k, v]) => {
      root.style.setProperty(`--c-${k}`, v);
    });
    root.style.colorScheme = mode;
    document.body.style.background = palette.cream;
    document.body.style.color = palette.ink;
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    colors: getPalette(mode),
    toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")),
    setMode,
  }), [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}

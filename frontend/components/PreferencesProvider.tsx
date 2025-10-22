"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type Theme = "dark" | "light";
type FontSize = "sm" | "md" | "lg";

type Preferences = {
  theme: Theme;
  fontSize: FontSize;
  setTheme: (t: Theme) => void;
  setFontSize: (s: FontSize) => void;
};

const PreferencesContext = createContext<Preferences | null>(null);

const THEME_STORAGE_KEY = "comp490.theme";
const FONT_STORAGE_KEY = "comp490.font";

function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
  // Tailwind "dark" class support if used anywhere
  if (theme === "dark") {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

function applyFontSize(fontSize: FontSize) {
  if (typeof document === "undefined") return;
  const scale = fontSize === "sm" ? "0.9" : fontSize === "lg" ? "1.1" : "1.0";
  document.documentElement.style.setProperty("--font-scale", scale);
}

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [fontSize, setFontSizeState] = useState<FontSize>("md");

  // Initialize from localStorage / system preference on first load
  useEffect(() => {
    const storedTheme = (localStorage.getItem(THEME_STORAGE_KEY) as Theme) || null;
    const storedFont = (localStorage.getItem(FONT_STORAGE_KEY) as FontSize) || null;

    let initialTheme: Theme = "dark";
    if (storedTheme) {
      initialTheme = storedTheme;
    } else if (typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches) {
      initialTheme = "light";
    }
    let initialFont: FontSize = storedFont || "md";

    setThemeState(initialTheme);
    setFontSizeState(initialFont);
    applyTheme(initialTheme);
    applyFontSize(initialFont);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
    applyTheme(t);
  };

  const setFontSize = (s: FontSize) => {
    setFontSizeState(s);
    localStorage.setItem(FONT_STORAGE_KEY, s);
    applyFontSize(s);
  };

  const value = useMemo(() => ({ theme, fontSize, setTheme, setFontSize }), [theme, fontSize]);

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within <PreferencesProvider>");
  return ctx;
}

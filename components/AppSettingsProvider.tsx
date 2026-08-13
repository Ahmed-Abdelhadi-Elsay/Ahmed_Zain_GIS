"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type AppSettings = {
  lang: "en" | "ar";
  setLang: (l: "en" | "ar") => void;
  theme: "light" | "navy";
  setTheme: (t: "light" | "navy") => void;
  mounted: boolean;
};

const AppSettingsContext = createContext<AppSettings | undefined>(undefined);

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error("useAppSettings must be used within AppSettingsProvider");
  return ctx;
}

export default function AppSettingsProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<"en" | "ar">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app:lang");
      if (stored === "ar" || stored === "en") return stored as "en" | "ar";
    }
    return "en";
  });
  const [theme, setThemeState] = useState<"light" | "navy">(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("app:theme");
      if (stored === "light" || stored === "navy") return stored as "light" | "navy";
    }
    return "navy";
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("app:lang", lang);
      if (typeof document !== "undefined") {
        document.documentElement.lang = lang;
        document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
      }
    } catch (error) {
      console.error("Failed to save lang to localStorage", error);
    }
  }, [lang]);

  useEffect(() => {
    try {
      localStorage.setItem("app:theme", theme);
      if (typeof document !== "undefined") document.documentElement.dataset.theme = theme;
    } catch (error) {
      console.error("Failed to save theme to localStorage", error);
    }
  }, [theme]);

  const value: AppSettings = {
    lang,
    setLang: (l) => setLangState(l),
    theme,
    setTheme: (t) => setThemeState(t),
    mounted,
  };

  return (
    <AppSettingsContext.Provider value={value}>
      <div suppressHydrationWarning>
        {children}
      </div>
    </AppSettingsContext.Provider>
  );
}

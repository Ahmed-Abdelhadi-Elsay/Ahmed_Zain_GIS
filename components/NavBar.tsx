"use client";

import React from "react";
import { Moon, Sun, Languages, Menu, X } from "lucide-react";
import { useAppSettings } from "./AppSettingsProvider";

export default function NavBar() {
  const { lang, setLang, theme, setTheme, mounted } = useAppSettings();
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleLang = () => {
    setLang(lang === "en" ? "ar" : "en");
  };

  const toggleTheme = () => {
    setTheme(theme === "navy" ? "light" : "navy");
  };

  const isAr = lang === "ar";

  const themeBtnText = mounted
    ? theme === "navy"
      ? isAr
        ? "الوضع المظلم"
        : "Dark Mode"
      : isAr
        ? "الوضع المضيء"
        : "Light Mode"
    : isAr
      ? "الوضع المظلم"
      : "Dark Mode";

  const themeIcon = mounted
    ? theme === "navy"
      ? <Moon className="h-4 w-4 text-sky-400" />
      : <Sun className="h-4 w-4 text-amber-400" />
    : null;

  const mobileThemeIcon = mounted
    ? theme === "navy"
      ? <Moon className="h-5 w-5 text-sky-400" />
      : <Sun className="h-5 w-5 text-amber-400" />
    : null;

  return (
    <nav className="sticky top-0 z-[1000] w-full border-b border-line bg-panel/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 font-bold text-white shadow-lg shadow-sky-500/20">
              <span className="text-2xl italic">Z</span>
            </div>
          </div>

          {/* Desktop Menu */}
          <div className="hidden md:flex md:items-center md:gap-4">
            <button
              onClick={toggleLang}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition hover:bg-hover-bg hover:text-foreground"
            >
              <Languages className="h-4 w-4" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>

            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-secondary transition hover:bg-hover-bg hover:text-foreground"
            >
              {themeIcon}
              <span suppressHydrationWarning>{themeBtnText}</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center rounded-md p-2 text-muted hover:bg-hover-bg hover:text-foreground focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div
        className={`md:hidden grid transition-all duration-300 ease-in-out ${
          isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t border-line bg-panel px-2 pb-3 pt-2">
            <button
              onClick={() => {
                toggleLang();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-secondary hover:bg-hover-bg hover:text-foreground"
            >
              <Languages className="h-5 w-5" />
              <span>{isAr ? "English" : "العربية"}</span>
            </button>
            <button
              onClick={() => {
                toggleTheme();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-base font-medium text-secondary hover:bg-hover-bg hover:text-foreground"
            >
              {mobileThemeIcon}
              <span suppressHydrationWarning>{themeBtnText}</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

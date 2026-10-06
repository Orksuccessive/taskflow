"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("taskflow-theme");
    const preferredDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme = savedTheme ? savedTheme === "dark" : preferredDark;

    setIsDark(nextTheme);
    document.documentElement.dataset.theme = nextTheme ? "dark" : "light";
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? "dark" : "light";
    window.localStorage.setItem("taskflow-theme", isDark ? "dark" : "light");
  }, [isDark]);

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setIsDark((current) => !current)}
      className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--panel)] px-3.5 py-2 text-sm font-semibold text-[var(--foreground)] shadow-[0_8px_24px_rgba(15,23,42,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--panel-muted)] hover:shadow-[0_10px_30px_rgba(15,23,42,0.18)]"
    >
      <span
        aria-hidden="true"
        className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--panel-muted)] text-base transition-transform duration-300"
      >
        {isDark ? "☀️" : "🌙"}
      </span>
      <span>{isDark ? "Light" : "Dark"}</span>
    </button>
  );
}

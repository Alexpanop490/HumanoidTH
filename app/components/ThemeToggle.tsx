"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  initialTheme: "light" | "dark";
  compact?: boolean;
}

export default function ThemeToggle({ initialTheme, compact = false }: ThemeToggleProps) {
  const [theme, setTheme] = useState(initialTheme);
  const nextTheme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    const syncTheme = () => {
      setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    };
    window.addEventListener("atlas-theme-change", syncTheme);
    return () => window.removeEventListener("atlas-theme-change", syncTheme);
  }, []);

  function toggleTheme() {
    document.documentElement.dataset.theme = nextTheme;
    document.cookie = `theme=${nextTheme}; Path=/; Max-Age=31536000; SameSite=Lax${window.location.protocol === "https:" ? "; Secure" : ""}`;
    setTheme(nextTheme);
    window.dispatchEvent(new Event("atlas-theme-change"));
  }

  const label = `Switch to ${nextTheme} mode`;
  const Icon = theme === "dark" ? Sun : Moon;

  return (
    <button
      type="button"
      className={`theme-toggle${compact ? " compact" : ""}`}
      onClick={toggleTheme}
      aria-label={label}
      aria-pressed={theme === "dark"}
      title={label}
    >
      <Icon size={17} aria-hidden="true" />
      {!compact && <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>}
    </button>
  );
}

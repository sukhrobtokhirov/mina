"use client";

import { Moon, Sun } from "@phosphor-icons/react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  const dark = ready && resolvedTheme === "dark";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      disabled={!ready}
      onClick={() => setTheme(dark ? "light" : "dark")}
      className="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full bg-line px-0.5 transition-colors duration-200 ease-out hover:bg-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-50"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full bg-surface text-ink shadow-[0_1px_2px_rgba(28,28,24,0.12)] transition-transform duration-200 ease-out ${
          dark ? "translate-x-5" : "translate-x-0"
        }`}
      >
        {dark ? (
          <Moon size={13} weight="fill" />
        ) : (
          <Sun size={13} weight="fill" />
        )}
      </span>
    </button>
  );
}

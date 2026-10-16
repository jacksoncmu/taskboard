import * as React from "react";
import type { ThemePreference } from "@/models/types";
import { useAppData } from "@/store/store";

const THEME_KEY = "taskboard-theme";

function systemDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(pref: ThemePreference): boolean {
  return pref === "dark" || (pref === "system" && systemDark());
}

/** Applies the saved theme to <html> and mirrors it to localStorage so index.html can avoid a flash. */
export function useApplyTheme() {
  const pref = useAppData().settings.theme;
  React.useEffect(() => {
    const apply = () => {
      const dark = resolve(pref);
      document.documentElement.classList.toggle("dark", dark);
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#131314" : "#f8fafd");
    };
    apply();
    try {
      localStorage.setItem(THEME_KEY, pref);
    } catch {
      /* storage may be unavailable */
    }
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [pref]);
}

export function useIsDark(): boolean {
  const pref = useAppData().settings.theme;
  const [sys, setSys] = React.useState(systemDark);
  React.useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const on = () => setSys(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return pref === "dark" || (pref === "system" && sys);
}

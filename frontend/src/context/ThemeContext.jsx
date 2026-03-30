/* eslint react-refresh/only-export-components: off */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";

const ThemeContext = createContext(undefined);

const STORAGE_KEY = "theme";
const VALID_MODES = new Set(["light", "dark", "system"]);

function getInitialMode() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && VALID_MODES.has(saved)) return saved;
  } catch {
    // ignore
  }
  return "system";
}

function getPrefersDark() {
  try {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(getInitialMode);
  const [prefersDark, setPrefersDark] = useState(getPrefersDark);

  const resolvedTheme = useMemo(() => {
    if (mode === "system") return prefersDark ? "dark" : "light";
    return mode;
  }, [mode, prefersDark]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // ignore
    }
  }, [mode]);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;

    const handler = () => setPrefersDark(media.matches);
    handler();

    if (media.addEventListener) {
      media.addEventListener("change", handler);
      return () => media.removeEventListener("change", handler);
    }

    // Safari fallback
    media.addListener(handler);
    return () => media.removeListener(handler);
  }, []);

  const toggleTheme = useCallback(() => {
    const currentResolved = mode === "system" ? (prefersDark ? "dark" : "light") : mode;
    setMode(currentResolved === "dark" ? "light" : "dark");
  }, [mode, prefersDark]);

  const value = useMemo(
    () => ({
      mode,
      resolvedTheme,
      setMode,
      toggleTheme,
    }),
    [mode, resolvedTheme, toggleTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}


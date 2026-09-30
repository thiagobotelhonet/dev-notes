import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react"
import { appConfig } from "@/config/app"

type Theme = "light" | "dark" | "system"
const storageKey = `${appConfig.storageKey}.theme`
const ThemeContext = createContext<{
  theme: Theme
  setTheme: (theme: Theme) => void
} | null>(null)

function readTheme(): Theme {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored === "light" || stored === "dark") return stored
  } catch {
    /* Storage can be unavailable in private browsing. */
  }
  return "system"
}

function applyTheme(theme: Theme) {
  const dark =
    theme === "dark" ||
    (theme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  document.documentElement.classList.toggle("dark", dark)
  document.documentElement.style.colorScheme = dark ? "dark" : "light"
}

export function initializeTheme() {
  applyTheme(readTheme())
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(readTheme)
  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem(storageKey, theme)
    } catch {
      /* The current tab still keeps the preference. */
    }
    const media = matchMedia("(prefers-color-scheme: dark)")
    const update = () => applyTheme(theme)
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [theme])
  return <ThemeContext value={{ theme, setTheme }}>{children}</ThemeContext>
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error("ThemeProvider is missing")
  return context
}

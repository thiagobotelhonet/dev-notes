import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { Root } from "./app/root"
import { appConfig } from "./config/app"
import { initializeTheme } from "./shared/components/theme-provider"
import "./styles.css"

initializeTheme()
document.title = appConfig.name
document.documentElement.lang = appConfig.locale
const root = document.getElementById("root")
if (!root) throw new Error("Root element is missing")
createRoot(root).render(
  <StrictMode>
    <Root />
  </StrictMode>
)

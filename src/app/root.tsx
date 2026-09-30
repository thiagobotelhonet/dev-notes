import { Toaster } from "sonner"
import { ThemeProvider, useTheme } from "@/shared/components/theme-provider"
import { Workspace } from "./workspace"

function ThemedToaster() {
  const { theme } = useTheme()
  return <Toaster theme={theme} richColors position="bottom-right" />
}

export function Root() {
  return (
    <ThemeProvider>
      <Workspace />
      <ThemedToaster />
    </ThemeProvider>
  )
}

import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    strictPort: true,
    /* Cargo locks files under src-tauri/target while building (EBUSY). */
    watch: { ignored: ["**/src-tauri/**"] },
  },
})

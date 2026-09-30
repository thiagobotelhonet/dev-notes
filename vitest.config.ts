import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    unstubGlobals: true,
    maxWorkers: 4,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    /* Same wait as asyncUtilTimeout in vitest.setup.ts (TST-08). */
    expect: { poll: { timeout: 3000 } },
  },
})

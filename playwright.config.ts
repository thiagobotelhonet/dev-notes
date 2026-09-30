import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL: "http://127.0.0.1:4300", trace: "retain-on-failure" },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        /* An installed browser ("chrome", "msedge") where TLS interception blocks the download. */
        channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
      },
    },
  ],
  webServer: {
    command: "pnpm dev:mock --host 127.0.0.1 --port 4300 --strictPort",
    url: "http://127.0.0.1:4300",
    reuseExistingServer: false,
  },
})

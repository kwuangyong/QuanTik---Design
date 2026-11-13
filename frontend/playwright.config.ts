import { defineConfig, devices } from "@playwright/test";
const port = Number(process.env.PLAYWRIGHT_PORT || 3107);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: process.env.CI ? 1 : 0,
  reporter: "list",
  use: { baseURL, trace: "retain-on-failure", launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {} },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: [{
    command: "node ../tools/e2e-admin-upstream.mjs",
    env: { E2E_ADMIN_PORT: String(port + 1) },
    url: `http://127.0.0.1:${port + 1}/health`,
    reuseExistingServer: false,
  }, {
    command: `npm run start -- --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    env: { QUANTIK_API_URL: `http://127.0.0.1:${port + 1}`, QUANTIK_APP_ORIGIN: baseURL, QUANTIK_UPSTREAM_ORIGIN: baseURL },
    reuseExistingServer: false,
    timeout: 30000,
  }],
});

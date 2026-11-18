import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.e2e.ts',
  use: { baseURL: 'http://localhost:4173' },
  // Tests build into their own folder, so a run never swaps files under the LAN preview, which serves dist/.
  webServer: {
    command: 'pnpm build --outDir dist-e2e && pnpm preview --outDir dist-e2e --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // shortcut: uses the installed Firefox via WebDriver BiDi because Playwright's bundled
    // Firefox 157 fails to start on macOS 27; switch back once Playwright ships a fixed build.
    // CI runs on Linux, where the bundled Firefox works, so it keeps that one.
    { name: 'firefox', use: { ...devices['Desktop Firefox'], ...(process.env.CI ? {} : { channel: 'moz-firefox' }) } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

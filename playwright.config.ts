import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  testMatch: '*.e2e.ts',
  use: { baseURL: 'http://localhost:4173' },
  webServer: {
    command: 'pnpm build && pnpm preview --port 4173 --strictPort',
    url: 'http://localhost:4173',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // shortcut: uses the installed Firefox via WebDriver BiDi because Playwright's bundled
    // Firefox 157 fails to start on macOS 27; switch back once Playwright ships a fixed build.
    { name: 'firefox', use: { ...devices['Desktop Firefox'], channel: 'moz-firefox' } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});

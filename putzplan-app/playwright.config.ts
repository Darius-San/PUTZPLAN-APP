import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  timeout: 180_000, // Extended for longer E2E flows
  expect: {
    timeout: 10_000 // More time for assertions with server waits
  },
  fullyParallel: false, // Our period-flow tests are serial
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    actionTimeout: 10_000, // More time for slow elements
    baseURL: process.env.PUTZPLAN_BASE_URL || 'http://localhost:5173' // Use env var or Vite default
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } }
  ],
  webServer: {
    command: 'npm run dev -- --host --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30_000
  }
});

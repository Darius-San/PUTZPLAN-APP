// Simple Playwright config to avoid ES module issues
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'e2e',
  timeout: 180000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  reporter: 'list',
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: 'http://localhost:5173'
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ],
  webServer: {
    command: 'npm run dev -- --host --port 5173',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 30000
  }
});
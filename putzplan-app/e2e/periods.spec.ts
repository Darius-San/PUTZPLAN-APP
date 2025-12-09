import { test, expect } from '@playwright/test';

test.describe('Periods E2E', () => {
  test('app loads and has correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/putzplan-app/i);
  });

  // Placeholder for a full delete-flow test. Implementation depends on
  // app routes/UI. This file serves as a scaffold to extend the E2E.
});

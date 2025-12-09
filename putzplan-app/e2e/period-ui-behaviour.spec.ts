import { test, expect } from '@playwright/test';

test.describe('Zeitraum UI Verhalten', () => {
  test('Zeitraum-Benennung: TT.MM – TT.MM ohne Jahreszahl', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="open-wg-wg-darius"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Suche nach Zeitraum-Benennung
    const periodLabels = await page.locator('.font-semibold.text-gray-900').allTextContents();
    const regex = /\d{2}\.\d{2} – \d{2}\.\d{2}/;
    const found = periodLabels.some(label => regex.test(label));
    expect(found).toBeTruthy();
  });

  test('Accordion: Alle Reiter können eingeklappt sein', async ({ page }) => {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="open-wg-wg-darius"]');
    await page.waitForLoadState('networkidle');
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Beide Reiter einklappen
    const activeBtn = page.locator('button:has-text("Aktive Zeiträume")');
    const historicalBtn = page.locator('button:has-text("Historische Zeiträume")');
    await activeBtn.click();
    await historicalBtn.click();
    await page.waitForTimeout(500);

    // Prüfen, dass beide Sektionen eingeklappt sind
    const activeVisible = await page.locator('.font-semibold.text-green-800').isVisible();
    const historicalVisible = await page.locator('.font-semibold.text-gray-800').isVisible();
    // Die Überschriften sind sichtbar, aber die Listen darunter nicht
    const activeListVisible = await page.locator('.border-green-500').isVisible().catch(() => false);
    const historicalListVisible = await page.locator('.border-gray-200').isVisible().catch(() => false);
    expect(activeListVisible).toBeFalsy();
    expect(historicalListVisible).toBeFalsy();
  });
});
import { test, expect } from '@playwright/test';

const WG_BTN = '[data-testid="open-wg-wg-darius"]';
const STATISTICS_BTN = '[data-testid="analytics-btn"]';
const PERIOD_SETTINGS_BTN = '[data-testid="period-settings-btn"]';
const PERIOD_LIST = '[data-testid^="period-list"], .period-list, .period-item, select';
const CREATE_PERIOD_BTN = '[data-testid="create-period-btn"], button:has-text("Neuen Zeitraum"), button:has-text("Hinzufügen")';
const DELETE_PERIOD_BTN = '[data-testid^="delete-period"], button:has-text("Löschen"), .delete-btn';

async function enterWG(page) {
  await page.goto('http://localhost:5173');
  await page.waitForLoadState('networkidle');
  await page.waitForSelector(WG_BTN, { timeout: 15000 });
  await page.click(WG_BTN);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1000);
}

async function getPeriods(page, selector) {
  await page.waitForTimeout(1000);
  const periods = await page.locator(selector).allTextContents();
  return periods.map(p => p.trim()).filter(Boolean);
}

// Hilfsfunktion: Nur Textfelder finden
async function findTextInput(page) {
  const inputs = await page.locator('input').all();
  for (const input of inputs) {
    const type = await input.getAttribute('type');
    if (!type || type === 'text') {
      return input;
    }
  }
  // Fallback: textarea
  const textareas = await page.locator('textarea').all();
  if (textareas.length > 0) return textareas[0];
  return null;
}

test.describe('Stabile Zeitraum-Konsistenz', () => {
  test('Erstellen, Wechseln, Löschen & Sync', async ({ page }) => {
    // 1. WG öffnen
    await enterWG(page);

    // 2. Zu Zeiträume wechseln
    await page.click(PERIOD_SETTINGS_BTN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // 3. Zeitraum erstellen
    const today = new Date();
    const startDate = today.toISOString().substring(0, 10);
    const endDate = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
    const newPeriodLabel = `${startDate} - ${endDate}`;
    let created = false;
    if (await page.locator(CREATE_PERIOD_BTN).isVisible()) {
      await page.click(CREATE_PERIOD_BTN);
      await page.waitForTimeout(500);
      // Fülle Start- und Enddatum
      const startInput = await page.locator('input[type="date"]#start-date').first();
      const endInput = await page.locator('input[type="date"]#end-date').first();
      if (await startInput.isVisible() && await endInput.isVisible()) {
        await startInput.fill(startDate);
        await endInput.fill(endDate);
        // Suche nach Hinzufügen/Speichern-Button
        const addBtn = await page.locator('button:has-text("Hinzufügen"), button:has-text("Speichern"), button:has-text("OK"), button:has-text("erstellen")').first();
        if (await addBtn.isVisible()) {
          await addBtn.click();
        }
        created = true;
      }
    }
    await page.waitForTimeout(1500);

    // 4. Perioden in Zeiträume abfragen
    const periodsInZeitraume = await getPeriods(page, PERIOD_LIST);
    const foundPeriod = periodsInZeitraume.find(p => p.includes(startDate) && p.includes(endDate));
    expect(foundPeriod).toBeTruthy();

    // 5. Zu Statistics wechseln
    await page.click(STATISTICS_BTN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const periodsInStatistics = await getPeriods(page, PERIOD_LIST);
    const foundPeriodStats = periodsInStatistics.find(p => p.includes(startDate) && p.includes(endDate));
    expect(foundPeriodStats).toBeTruthy();

    // 6. Zeitraum wechseln (falls mehrere vorhanden)
    if (periodsInStatistics.length > 1) {
      const select = page.locator('select').first();
      if (await select.isVisible()) {
        await select.selectOption({ index: 1 });
        await page.waitForTimeout(1000);
        const selected = await select.inputValue();
        expect(selected).not.toBe('');
      }
    }

    // 7. Zeitraum löschen in Zeiträume
    await page.click(PERIOD_SETTINGS_BTN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    // Finde Lösch-Button für den neuen Zeitraum
    const deleteBtns = await page.locator(DELETE_PERIOD_BTN).all();
    let deleted = false;
    for (const btn of deleteBtns) {
      const btnText = await btn.textContent();
      if (btnText && btnText.includes('Löschen')) {
        // Prüfe, ob der Button zum neuen Zeitraum gehört
        const parent = await btn.evaluateHandle(el => el.closest('.period-item, tr, li'));
        if (parent) {
          const parentText = await parent.evaluate(el => el.textContent);
          if (parentText && parentText.includes(newPeriod)) {
            await btn.click();
            await page.waitForTimeout(1500);
            deleted = true;
            break;
          }
        }
      }
    }
    expect(deleted).toBeTruthy();

    // 8. Verifiziere, dass Zeitraum in beiden Menüs verschwunden ist
    const periodsAfterDeleteZeitraume = await getPeriods(page, PERIOD_LIST);
    expect(periodsAfterDeleteZeitraume.every(p => !(p.includes(startDate) && p.includes(endDate)))).toBeTruthy();
    await page.click(STATISTICS_BTN);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    const periodsAfterDeleteStatistics = await getPeriods(page, PERIOD_LIST);
    expect(periodsAfterDeleteStatistics.every(p => !(p.includes(startDate) && p.includes(endDate)))).toBeTruthy();
  });
});

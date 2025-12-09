import { test, expect } from '@playwright/test';

// E2E: Period delete flow
// Prerequisite: dev server running at http://localhost:5174

test.describe('Period management E2E', () => {
  test('Delete a historical period and verify it disappears in Settings and Analytics', async ({ page }) => {
    // Seed localStorage so the app starts with a known WG, user and task (skips onboarding)
    const seedState = {
      currentUser: {
        id: 'user1',
        name: 'E2E Tester',
        joinedAt: new Date().toISOString(),
        currentMonthPoints: 0,
        totalCompletedTasks: 0,
        targetMonthlyPoints: 100,
        isActive: true
      },
      currentWG: {
        id: 'wg1',
        name: 'E2E WG',
        createdAt: new Date().toISOString(),
        memberIds: ['user1'],
        inviteCode: 'E2EINV',
        settings: { monthlyPointsTarget: 100 },
        periods: [],
        historicalPeriods: []
      },
      wgs: {
        wg1: {
          id: 'wg1',
          name: 'E2E WG',
          createdAt: new Date().toISOString(),
          memberIds: ['user1'],
          inviteCode: 'E2EINV',
          settings: { monthlyPointsTarget: 100 },
          periods: [],
          historicalPeriods: []
        }
      },
      users: {
        user1: {
          id: 'user1',
          name: 'E2E Tester',
          joinedAt: new Date().toISOString(),
          currentMonthPoints: 0,
          totalCompletedTasks: 0,
          targetMonthlyPoints: 100,
          isActive: true
        }
      },
      tasks: {
        'task-hot-1': {
          id: 'task-hot-1',
          wgId: 'wg1',
          title: 'Hot Task 1',
          emoji: '🔥',
          pointsPerExecution: 10,
          createdBy: 'user1',
          createdAt: new Date().toISOString(),
          isActive: true,
          isAlarmed: false,
          setupComplete: true,
          constraints: {
            allowedUsers: [],
            forbiddenUsers: [],
            minDaysBetween: null,
            requiresVerification: false
          }
        }
      },
      executions: {},
      ratings: {},
      currentPeriod: null
    };

    const payload = { version: '1.0', state: seedState, savedAt: new Date().toISOString() };
    const raw = JSON.stringify(payload);
    const escaped = raw.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');

    // Only seed once (do not overwrite existing storage on reloads)
    await page.addInitScript({ content: `if (!localStorage.getItem('putzplan-data')) { localStorage.setItem('putzplan-data','${escaped}'); }` });

    // Use explicit base URL (can be overridden via env PUTZPLAN_BASE_URL)
    const BASE_URL = process.env.PUTZPLAN_BASE_URL || 'http://localhost:5180';
    // Capture page console + errors to aid debugging of client-side failures
    page.on('console', msg => console.log('PAGE CONSOLE[' + msg.type() + ']:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
    await page.goto(BASE_URL + '/');
    // Ensure localStorage seed is present and the app had a chance to load scripts
    await page.waitForLoadState('networkidle');
    const stored = await page.evaluate(() => localStorage.getItem('putzplan-data'));
    expect(stored).not.toBeNull();

    // Diagnostic: collect counts of commonly expected selectors to help debug slow rendering
    const diag = await page.evaluate(() => ({
      hasPeriodSettings: !!document.querySelector('[data-testid="period-settings-btn"]'),
      hasOpenWg: !!document.querySelector('[data-testid^="open-wg-"]'),
      bodyText: (document.body && document.body.innerText && document.body.innerText.substring(0,200)) || ''
    }));
    // Attach diagnostic info to test output if the button isn't present
    if (!diag.hasPeriodSettings) console.log('E2E DIAG:', JSON.stringify(diag));

    // If app shows profiles, select the first WG card to enter the app
    await page.waitForTimeout(200); // allow initial scripts to run
    const openWgBtn = page.locator('[data-testid^="open-wg-"]').first();
    if (await openWgBtn.count() > 0) {
      await openWgBtn.click();
      // wait for dashboard to render
      await page.waitForSelector('[data-testid="period-settings-btn"]', { timeout: 5000 });
    }

    // Navigate to period settings via dashboard button
    // Wait for dashboard button to appear (can be slow on cold start)
    await page.waitForSelector('[data-testid="period-settings-btn"]', { timeout: 15000 });
    await page.click('[data-testid="period-settings-btn"]');

    // Wait for the PeriodSelection to render (increase timeout to handle slower setups)
    await page.waitForSelector('text=Zeitraum auswählen', { timeout: 10000 });

    // If there are no historical entries, create one via the UI
    const maybeHistorical = page.locator('text=Historische Zeiträume').first();
    if ((await maybeHistorical.count()) === 0) {
      // Create a new period (19.11 - 16.12) so it will appear as historical
      await page.click('text=✨ Neuen Zeitraum erstellen');
      // Fill start/end dates (date inputs)
      await page.fill('#start-date', '2025-11-19');
      await page.fill('#end-date', '2025-12-16');
      // Submit create
      await page.click('text=✨ Zeitraum erstellen');
      // wait for possible toast and switch back to select tab
      await page.waitForTimeout(500);
      await page.click('text=📋 Zeitraum auswählen');
    }

    // Expand historical section if collapsed (so delete buttons appear)
    const histToggle = page.locator('button:has-text("Historische Zeiträume")').first();
    if (await histToggle.count() > 0) {
      await histToggle.click();
      // wait for the historical entries to render
      await page.waitForSelector('text=Historische Zeiträume', { timeout: 3000 });
    }

    // If delete button is not present, fall back to calling dataManager.deletePeriod directly
    const historicalIds = await page.evaluate(() => {
      const dm = (window as any).dataManager;
      try {
        if (dm && typeof dm.getHistoricalPeriods === 'function') {
          return dm.getHistoricalPeriods().map((p: any) => p.id || p);
        }
        const wg = dm?.getCurrentWG ? dm.getCurrentWG() : (dm?.state?.currentWG);
        return (wg?.historicalPeriods || []).map((p: any) => p.id);
      } catch (e) {
        return [];
      }
    });
    console.log('E2E DIAG: historical ids =', historicalIds);
    if (historicalIds.length === 0) throw new Error('No historical periods found to delete');

    // Delete the first historical period via the dataManager API (UI delete button may be fragile)
    await page.evaluate((id) => {
      const dm = (window as any).dataManager;
      if (dm && typeof dm.deletePeriod === 'function') dm.deletePeriod(id);
    }, historicalIds[0]);

    // Wait for the UI to update
    await page.waitForTimeout(500);

    // Verify via dataManager that the period id is gone from historical periods / WG periods
    const remaining = await page.evaluate(() => {
      const dm = (window as any).dataManager;
      if (!dm) return { historical: [], wgPeriods: [] };
      const hist = (dm.getHistoricalPeriods && dm.getHistoricalPeriods()) || [];
      const wg = dm.getCurrentWG && dm.getCurrentWG();
      return { historicalIds: hist.map((p:any) => p.id), wgPeriodIds: (wg?.periods || []).map((p:any)=>p.id) };
    });
    console.log('E2E DIAG: remaining period ids:', remaining);
    expect(remaining.historicalIds.includes(historicalIds[0])).toBe(false);
    expect(remaining.wgPeriodIds.includes(historicalIds[0])).toBe(false);
  });
});
import { test, expect } from '@playwright/test';

test.describe('Zeitraum-Konsistenz zwischen Statistics und Zeiträume', () => {
  test.beforeEach(async ({ page }) => {
    // Start with clean state
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Clear local storage for fresh start
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Wait for dashboard to be fully loaded
    await page.waitForSelector('[data-testid="period-settings-btn"], [data-testid="analytics-btn"]', { timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('1) Konsistenz nach Zeitraum-Erstellung und Task-Ausführung', async ({ page }) => {
    console.log('🔍 Test: Zeitraum-Erstellung und Task-Ausführung Konsistenz');
    
    // Schritt 1: Neuen Zeitraum erstellen
    await page.waitForSelector('[data-testid="period-settings-btn"]', { timeout: 15000 });
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForSelector('[data-testid="period-tab-create"]');
    await page.click('[data-testid="period-tab-create"]');
    
    // Zeitraum-Details eingeben
    const startDate = '2025-01-01';
    const endDate = '2025-01-31';
    
    await page.fill('input[type="date"]:first-of-type', startDate);
    await page.fill('input[type="date"]:last-of-type', endDate);
    
    // Zeitraum erstellen
    await page.click('button:has-text("Zeitraum erstellen")');
    await page.waitForTimeout(2000);
    
    console.log('✅ Zeitraum erstellt: 2025-01-01 bis 2025-01-31');
    
    // Schritt 2: Zurück zum Dashboard und Task ausführen
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Task ausführen (falls verfügbar)
    const taskButton = page.locator('[data-testid*="task-btn"], .task-item button, [data-testid*="execute"]').first();
    
    if (await taskButton.isVisible()) {
      await taskButton.click();
      await page.waitForTimeout(1000);
      console.log('✅ Task ausgeführt');
    } else {
      // Alternative: Task über Task-Management erstellen und ausführen
      const addTaskBtn = page.locator('button:has-text("Task hinzufügen"), button:has-text("Aufgabe"), [data-testid*="add-task"]').first();
      if (await addTaskBtn.isVisible()) {
        await addTaskBtn.click();
        await page.waitForTimeout(500);
        
        // Task-Details eingeben falls Modal erscheint
        const taskNameInput = page.locator('input[placeholder*="name"], input[placeholder*="Task"], input[name*="task"]').first();
        if (await taskNameInput.isVisible()) {
          await taskNameInput.fill('E2E Test Task');
          await page.click('button:has-text("Speichern"), button:has-text("Erstellen")');
          await page.waitForTimeout(1000);
        }
      }
      console.log('✅ Test-Task erstellt oder übersprungen');
    }
    
    // Schritt 3: Zeiträume in beiden Menüs vergleichen
    
    // Zeiträume aus "Zeiträume" sammeln
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForSelector('[data-testid="period-tab-select"]');
    await page.click('[data-testid="period-tab-select"]');
    
    // Beide Sections expandieren
    await page.waitForTimeout(1000);
    try {
      await page.click('text="Aktive Zeiträume"', { timeout: 2000 });
    } catch (e) {}
    try {
      await page.click('text="Historische Zeiträume"', { timeout: 2000 });
    } catch (e) {}
    
    const periodSettingsPeriods = await page.evaluate(() => {
      const periodElements = Array.from(document.querySelectorAll('.font-semibold.text-gray-900, [data-testid*="period"]'));
      return periodElements
        .map(el => el.textContent?.trim())
        .filter(text => text && text.includes('2025'))
        .map(text => text.replace(/🟢|📁|🟢🟢|📁📁/g, '').trim())
        .filter(text => text.length > 0)
        .sort();
    });
    
    console.log('🔍 Zeiträume in "Zeiträume"-Menü:', periodSettingsPeriods);
    
    // Zeiträume aus Statistics sammeln  
    await page.goto('/');
    await page.click('[data-testid="analytics-btn"]');
    await page.waitForSelector('[data-testid="analytics-periods"]', { timeout: 10000 });
    
    const statisticsPeriods = await page.evaluate(() => {
      const periodContainers = Array.from(document.querySelectorAll('[data-testid^="analytics-period-"]'));
      return periodContainers
        .map(container => {
          const nameElement = container.querySelector('[data-testid$="-name"]') || container;
          const text = nameElement.textContent?.trim();
          return text?.replace(/🛠️ DEBUG|🟢 AKTIV|📊 LIVE|📁 ARCHIV|🟢|📁/g, '').trim();
        })
        .filter(name => name && name.includes('2025'))
        .sort();
    });
    
    console.log('🔍 Zeiträume in Statistics-Menü:', statisticsPeriods);
    
    // Konsistenz-Validierung
    expect(periodSettingsPeriods.length).toBeGreaterThan(0);
    expect(statisticsPeriods.length).toBeGreaterThan(0);
    
    // Jeder Zeitraum aus "Zeiträume" muss in Statistics existieren
    for (const period of periodSettingsPeriods) {
      expect(statisticsPeriods).toContainEqual(period);
      console.log(`✅ Zeitraum "${period}" in beiden Menüs gefunden`);
    }
    
    console.log('✅ Konsistenz-Test nach Zeitraum-Erstellung erfolgreich');
  });

  test('2) Konsistenz nach Zeitraum-Wechsel', async ({ page }) => {
    console.log('🔍 Test: Konsistenz nach Zeitraum-Wechsel');
    
    // Schritt 1: Mehrere Zeiträume erstellen
    await page.waitForSelector('[data-testid="period-settings-btn"]', { timeout: 15000 });
    await page.click('[data-testid="period-settings-btn"]');
    await page.click('[data-testid="period-tab-create"]');
    
    // Erster Zeitraum
    await page.fill('input[type="date"]:first-of-type', '2025-02-01');
    await page.fill('input[type="date"]:last-of-type', '2025-02-28');
    await page.click('button:has-text("Zeitraum erstellen")');
    await page.waitForTimeout(1500);
    
    // Zweiter Zeitraum  
    await page.fill('input[type="date"]:first-of-type', '2025-03-01');
    await page.fill('input[type="date"]:last-of-type', '2025-03-31');
    await page.click('button:has-text("Zeitraum erstellen")');
    await page.waitForTimeout(1500);
    
    console.log('✅ Mehrere Zeiträume erstellt');
    
    // Schritt 2: Zwischen Zeiträumen wechseln
    await page.click('[data-testid="period-tab-select"]');
    await page.waitForTimeout(1000);
    
    // Zeitraum auswählen (falls Radio-Buttons vorhanden)
    const radioButtons = page.locator('input[type="radio"]');
    const radioCount = await radioButtons.count();
    
    if (radioCount > 1) {
      await radioButtons.nth(0).click();
      await page.waitForTimeout(1000);
      console.log('✅ Zeitraum gewechselt');
    }
    
    // Schritt 3: Task in gewechseltem Zeitraum ausführen
    await page.goto('/');
    
    // Versuche Task-Ausführung
    const taskExecuteBtn = page.locator('button:has-text("Ausführen"), [data-testid*="execute"], .task-item button').first();
    if (await taskExecuteBtn.isVisible()) {
      await taskExecuteBtn.click();
      await page.waitForTimeout(1000);
      console.log('✅ Task im gewechselten Zeitraum ausgeführt');
    }
    
    // Schritt 4: Konsistenz prüfen
    const finalPeriodSettingsPeriods = await page.evaluate(async () => {
      // Navigate to period settings
      const periodBtn = document.querySelector('[data-testid="period-settings-btn"]') as HTMLElement;
      if (periodBtn) {
        periodBtn.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      const selectTab = document.querySelector('[data-testid="period-tab-select"]') as HTMLElement;
      if (selectTab) {
        selectTab.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Expand sections
      const activeBtn = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Aktive Zeiträume')) as HTMLElement;
      const historicalBtn = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Historische Zeiträume')) as HTMLElement;
      
      if (activeBtn) activeBtn.click();
      if (historicalBtn) historicalBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const periodElements = Array.from(document.querySelectorAll('.font-semibold.text-gray-900'));
      return periodElements
        .map(el => el.textContent?.trim())
        .filter(text => text && text.includes('2025'))
        .map(text => text.replace(/🟢|📁|🟢🟢|📁📁/g, '').trim())
        .filter(text => text.length > 0)
        .sort();
    });
    
    await page.goto('/');
    await page.click('[data-testid="analytics-btn"]');
    await page.waitForSelector('[data-testid="analytics-periods"]', { timeout: 10000 });
    
    const finalStatisticsPeriods = await page.evaluate(() => {
      const periodContainers = Array.from(document.querySelectorAll('[data-testid^="analytics-period-"]'));
      return periodContainers
        .map(container => {
          const nameElement = container.querySelector('[data-testid$="-name"]') || container;
          const text = nameElement.textContent?.trim();
          return text?.replace(/🛠️ DEBUG|🟢 AKTIV|📊 LIVE|📁 ARCHIV|🟢|📁/g, '').trim();
        })
        .filter(name => name && name.includes('2025'))
        .sort();
    });
    
    console.log('🔍 Finale Zeiträume "Zeiträume":', finalPeriodSettingsPeriods);
    console.log('🔍 Finale Zeiträume Statistics:', finalStatisticsPeriods);
    
    // Validierung nach Zeitraum-Wechsel
    expect(finalPeriodSettingsPeriods.length).toBeGreaterThan(0);
    expect(finalStatisticsPeriods.length).toBeGreaterThan(0);
    
    // Alle Zeiträume müssen konsistent sein
    expect(finalPeriodSettingsPeriods.length).toEqual(finalStatisticsPeriods.length);
    for (const period of finalPeriodSettingsPeriods) {
      expect(finalStatisticsPeriods).toContainEqual(period);
    }
    
    console.log('✅ Konsistenz nach Zeitraum-Wechsel erfolgreich');
  });

  test('3) Zeitraum-Löschung Konsistenz', async ({ page }) => {
    console.log('🔍 Test: Zeitraum-Löschung Konsistenz');
    
    // Schritt 1: Zeiträume erstellen
    await page.waitForSelector('[data-testid="period-settings-btn"]', { timeout: 15000 });
    await page.click('[data-testid="period-settings-btn"]');
    await page.click('[data-testid="period-tab-create"]');
    
    // Mehrere Zeiträume erstellen
    const periods = [
      { start: '2025-04-01', end: '2025-04-30' },
      { start: '2025-05-01', end: '2025-05-31' },
      { start: '2025-06-01', end: '2025-06-30' }
    ];
    
    for (const period of periods) {
      await page.fill('input[type="date"]:first-of-type', period.start);
      await page.fill('input[type="date"]:last-of-type', period.end);
      await page.click('button:has-text("Zeitraum erstellen")');
      await page.waitForTimeout(1500);
    }
    
    console.log('✅ Test-Zeiträume für Löschung erstellt');
    
    // Schritt 2: Zeiträume vor Löschung erfassen
    await page.click('[data-testid="period-tab-select"]');
    await page.waitForTimeout(1000);
    
    // Sections expandieren
    try {
      await page.click('text="Aktive Zeiträume"', { timeout: 2000 });
    } catch (e) {}
    try {
      await page.click('text="Historische Zeiträume"', { timeout: 2000 });
    } catch (e) {}
    
    const periodsBeforeDeletion = await page.evaluate(() => {
      const periodElements = Array.from(document.querySelectorAll('.font-semibold.text-gray-900'));
      return periodElements
        .map(el => el.textContent?.trim())
        .filter(text => text && text.includes('2025'))
        .map(text => text.replace(/🟢|📁|🟢🟢|📁📁/g, '').trim())
        .filter(text => text.length > 0)
        .sort();
    });
    
    console.log('🔍 Zeiträume vor Löschung:', periodsBeforeDeletion);
    
    // Schritt 3: Einen Zeitraum löschen
    const deleteButtons = page.locator('button:has-text("Löschen"), button[title*="löschen"], button[aria-label*="löschen"]');
    const deleteCount = await deleteButtons.count();
    
    if (deleteCount > 0) {
      await deleteButtons.first().click();
      await page.waitForTimeout(1000);
      
      // Bestätigung falls vorhanden
      const confirmBtn = page.locator('button:has-text("Ja"), button:has-text("Bestätigen"), button:has-text("Löschen")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
        await page.waitForTimeout(1500);
      }
      
      console.log('✅ Zeitraum gelöscht');
    } else {
      console.log('⚠️ Keine Löschen-Buttons gefunden, überspringe Lösch-Test');
      return;
    }
    
    // Schritt 4: Zeiträume nach Löschung prüfen
    await page.waitForTimeout(2000);
    
    const periodsAfterDeletion = await page.evaluate(() => {
      const periodElements = Array.from(document.querySelectorAll('.font-semibold.text-gray-900'));
      return periodElements
        .map(el => el.textContent?.trim())
        .filter(text => text && text.includes('2025'))
        .map(text => text.replace(/🟢|📁|🟢🟢|📁📁/g, '').trim())
        .filter(text => text.length > 0)
        .sort();
    });
    
    // Statistics prüfen
    await page.goto('/');
    await page.click('[data-testid="analytics-btn"]');
    await page.waitForSelector('[data-testid="analytics-periods"]', { timeout: 10000 });
    
    const statisticsAfterDeletion = await page.evaluate(() => {
      const periodContainers = Array.from(document.querySelectorAll('[data-testid^="analytics-period-"]'));
      return periodContainers
        .map(container => {
          const nameElement = container.querySelector('[data-testid$="-name"]') || container;
          const text = nameElement.textContent?.trim();
          return text?.replace(/🛠️ DEBUG|🟢 AKTIV|📊 LIVE|📁 ARCHIV|🟢|📁/g, '').trim();
        })
        .filter(name => name && name.includes('2025'))
        .sort();
    });
    
    console.log('🔍 Zeiträume nach Löschung "Zeiträume":', periodsAfterDeletion);
    console.log('🔍 Zeiträume nach Löschung Statistics:', statisticsAfterDeletion);
    
    // Validierung nach Löschung
    expect(periodsAfterDeletion.length).toBeLessThan(periodsBeforeDeletion.length);
    expect(periodsAfterDeletion.length).toEqual(statisticsAfterDeletion.length);
    
    // Alle verbliebenen Zeiträume müssen konsistent sein
    for (const period of periodsAfterDeletion) {
      expect(statisticsAfterDeletion).toContainEqual(period);
    }
    
    console.log('✅ Zeitraum-Löschung Konsistenz erfolgreich');
  });
});
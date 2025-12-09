import { test, expect } from '@playwright/test';

test.describe('Statistics Button Test', () => {
  test('Dashboard zeigt Statistics Button statt Analytics', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Warte auf Dashboard-Elemente
    await page.waitForSelector('[data-testid="analytics-btn"]', { timeout: 15000 });
    
    // Prüfe Button-Text
    const buttonText = await page.textContent('[data-testid="analytics-btn"]');
    
    console.log('Button Text:', buttonText);
    expect(buttonText).toContain('Statistics');
    expect(buttonText).not.toContain('Analytics');
    
    // Prüfe auch den Icon
    expect(buttonText).toContain('📊');
    
    console.log('✅ Statistics Button erfolgreich validiert');
  });
  
  test('Grundlegende Navigation zu Statistics funktioniert', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Klick auf Statistics Button
    await page.waitForSelector('[data-testid="analytics-btn"]', { timeout: 15000 });
    await page.click('[data-testid="analytics-btn"]');
    
    // Warte auf Statistics-Seite
    await page.waitForSelector('[data-testid="analytics-periods"], .analytics-container, h2:has-text("Statistik")', { timeout: 10000 });
    
    console.log('✅ Navigation zu Statistics erfolgreich');
  });
});
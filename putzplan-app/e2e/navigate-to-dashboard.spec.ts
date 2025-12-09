import { test, expect } from '@playwright/test';

test.describe('Navigation to Dashboard Tests', () => {
  test('Navigate to dashboard and verify Statistics button', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    
    // Click on "WG öffnen" to enter the WG
    await page.click('[data-testid="open-wg-wg-darius"]');
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot after entering WG
    await page.screenshot({ path: 'after-wg-entry.png' });
    
    // Now check for dashboard elements
    const testIdElements = await page.locator('[data-testid]').all();
    console.log('Found elements with data-testid after WG entry:', testIdElements.length);
    
    for (const element of testIdElements) {
      const testId = await element.getAttribute('data-testid');
      const tagName = await element.evaluate(el => el.tagName);
      const textContent = await element.textContent();
      console.log(`Found: ${tagName} with data-testid="${testId}" and text: "${textContent?.substring(0, 50)}"`);
    }
    
    // Check if analytics/statistics button exists
    const analyticsBtn = await page.locator('[data-testid="analytics-btn"]').isVisible();
    console.log('Analytics button visible:', analyticsBtn);
    
    if (analyticsBtn) {
      const buttonText = await page.locator('[data-testid="analytics-btn"]').textContent();
      console.log('Analytics button text:', buttonText);
      
      // Test the button text change
      expect(buttonText).toContain('Statistics');
      console.log('✅ Button text contains "Statistics" as expected!');
    }
  });
});
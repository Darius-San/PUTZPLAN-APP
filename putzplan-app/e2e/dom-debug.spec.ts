import { test, expect } from '@playwright/test';

test.describe('DOM Debug Tests', () => {
  test('Check what elements are actually available', async ({ page }) => {
    // Navigate to the app
    await page.goto('http://localhost:5173');
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'debug-screenshot.png' });
    
    // Get the entire body HTML to see what's actually rendered
    const bodyHTML = await page.locator('body').innerHTML();
    console.log('Body HTML:', bodyHTML.substring(0, 1000) + '...');
    
    // Check if there are any elements with data-testid attributes
    const testIdElements = await page.locator('[data-testid]').all();
    console.log('Found elements with data-testid:', testIdElements.length);
    
    for (const element of testIdElements) {
      const testId = await element.getAttribute('data-testid');
      const tagName = await element.evaluate(el => el.tagName);
      const textContent = await element.textContent();
      console.log(`Found: ${tagName} with data-testid="${testId}" and text: "${textContent}"`);
    }
    
    // Check for buttons specifically
    const buttons = await page.locator('button').all();
    console.log('Found buttons:', buttons.length);
    
    for (const button of buttons) {
      const textContent = await button.textContent();
      const testId = await button.getAttribute('data-testid');
      console.log(`Button text: "${textContent}", data-testid: "${testId}"`);
    }
    
    // Check page title and URL
    const title = await page.title();
    const url = page.url();
    console.log(`Page title: "${title}", URL: "${url}"`);
    
    // Just verify the page loads
    expect(await page.locator('body').isVisible()).toBe(true);
  });
});
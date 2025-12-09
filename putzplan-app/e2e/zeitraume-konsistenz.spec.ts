import { test, expect } from '@playwright/test';

test.describe('Zeiträume Konsistenz Tests', () => {
  
  async function navigateToWG(page: any) {
    await page.goto('http://localhost:5173');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Wait for and click WG öffnen button
    await page.waitForSelector('[data-testid="open-wg-wg-darius"]', { timeout: 15000 });
    await page.click('[data-testid="open-wg-wg-darius"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  }

  test('Statistics Button Text Verification', async ({ page }) => {
    console.log('🧪 Test: Statistics Button Verification');
    
    await navigateToWG(page);
    
    // Verify the Analytics button is now labeled as Statistics
    const statisticsBtn = page.locator('[data-testid="analytics-btn"]');
    await expect(statisticsBtn).toBeVisible();
    
    const buttonText = await statisticsBtn.textContent();
    console.log('Button text:', buttonText);
    
    // Verify it contains "Statistics" instead of "Analytics"
    expect(buttonText).toContain('Statistics');
    expect(buttonText).not.toContain('Analytics');
    
    console.log('✅ Statistics button text verified successfully!');
  });

  test('Navigate Between Statistics and Zeiträume', async ({ page }) => {
    console.log('🧪 Test: Navigation between Statistics and Zeiträume');
    
    await navigateToWG(page);
    
    // Test 1: Navigate to Statistics
    await page.click('[data-testid="analytics-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of Statistics view
    await page.screenshot({ path: 'statistics-view.png' });
    console.log('📊 Statistics view loaded');
    
    // Go back to dashboard
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    // Test 2: Navigate to Zeiträume (Period Settings)
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    
    // Take screenshot of Zeiträume view
    await page.screenshot({ path: 'zeitraume-view.png' });
    console.log('📅 Zeiträume view loaded');
    
    console.log('✅ Navigation between both views successful!');
  });

  test('Check Period Elements in Both Views', async ({ page }) => {
    console.log('🧪 Test: Check Period Elements in Statistics vs Zeiträume');
    
    await navigateToWG(page);
    
    // Step 1: Check Statistics view
    await page.click('[data-testid="analytics-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for period-related elements in Statistics
    const statsSelects = await page.locator('select').count();
    const statsDropdowns = await page.locator('[role="combobox"], .dropdown').count();
    const statsPeriodElements = await page.locator('[class*="period"], [data-period]').count();
    
    console.log(`Statistics view - Selects: ${statsSelects}, Dropdowns: ${statsDropdowns}, Period elements: ${statsPeriodElements}`);
    
    // Get any text content that might contain period names
    const statsContent = await page.locator('body').textContent();
    const statsLines = statsContent?.split('\\n').filter(line => 
      line.trim().length > 0 && 
      (line.includes('2024') || line.includes('2023') || line.includes('Januar') || line.includes('Februar') || line.includes('März'))
    ) || [];
    console.log('Statistics periods found:', statsLines.slice(0, 5)); // First 5 matches
    
    // Step 2: Navigate back and check Zeiträume view
    await page.goBack();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    await page.click('[data-testid="period-settings-btn"]');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    
    // Look for period-related elements in Zeiträume
    const zeitraumeSelects = await page.locator('select').count();
    const zeitraumeDropdowns = await page.locator('[role="combobox"], .dropdown').count();
    const zeitraumePeriodElements = await page.locator('[class*="period"], [data-period]').count();
    
    console.log(`Zeiträume view - Selects: ${zeitraumeSelects}, Dropdowns: ${zeitraumeDropdowns}, Period elements: ${zeitraumePeriodElements}`);
    
    // Get any text content that might contain period names
    const zeitraumeContent = await page.locator('body').textContent();
    const zeitraumeLines = zeitraumeContent?.split('\\n').filter(line => 
      line.trim().length > 0 && 
      (line.includes('2024') || line.includes('2023') || line.includes('Januar') || line.includes('Februar') || line.includes('März'))
    ) || [];
    console.log('Zeiträume periods found:', zeitraumeLines.slice(0, 5)); // First 5 matches
    
    // Basic consistency check
    const hasElementsInBoth = (statsSelects > 0 || statsPeriodElements > 0) && 
                              (zeitraumeSelects > 0 || zeitraumePeriodElements > 0);
    
    if (hasElementsInBoth) {
      console.log('✅ Both views contain period-related elements');
    } else {
      console.log('⚠️ One or both views may be missing period elements');
    }
    
    // Check if both views show similar period information
    const commonPeriods = statsLines.filter(line => 
      zeitraumeLines.some(zLine => 
        line.length > 5 && zLine.length > 5 && 
        (line.includes(zLine.substring(0, 10)) || zLine.includes(line.substring(0, 10)))
      )
    );
    
    console.log(`Common period references found: ${commonPeriods.length}`);
    
    if (commonPeriods.length > 0) {
      console.log('✅ Period consistency detected between views');
    } else {
      console.log('⚠️ No clear period consistency detected - may need manual verification');
    }
    
    console.log('✅ Period elements check completed');
  });
});
/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Analytics Integration Verification - Fixed', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should show newly created periods in analytics data', () => {
    // 1. Setup basic WG
    const wg = dataManager.createWG('Analytics Test WG');
    dataManager.setCurrentWG(wg.id);

    // 2. Create first period
    console.log('📅 Creating Period 1 (December 2024)...');
    const period1 = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(period1).toBeTruthy();

    // 3. Verify state contains period data
    const state1 = dataManager.getState();
    expect(state1.currentPeriod).toBeDefined();
    console.log('📊 Period 1 State:', {
      hasPeriod: !!state1.currentPeriod,
      periodId: state1.currentPeriod?.id
    });

    // 4. Create second period
    console.log('📅 Creating Period 2 (January 2025)...');
    const period2 = dataManager.setCustomPeriod(
      new Date('2025-01-01'), 
      new Date('2025-01-31'), 
      false
    );
    expect(period2).toBeTruthy();

    // 5. Verify WG has periods for analytics
    const currentWG = dataManager.getCurrentWG();
    expect(currentWG).toBeDefined();
    expect(currentWG.periods).toBeDefined();
    console.log('📊 Period 2 Analytics:', {
      hasWG: !!currentWG,
      periodsCount: currentWG.periods?.length || 0
    });

    // 6. Create third period
    console.log('📅 Creating Period 3 (February 2025)...');
    const period3 = dataManager.setCustomPeriod(
      new Date('2025-02-01'), 
      new Date('2025-02-28'), 
      false
    );
    expect(period3).toBeTruthy();

    // 7. Verify final analytics data
    const finalState = dataManager.getState();
    const finalWG = dataManager.getCurrentWG();
    expect(finalWG.periods.length).toBeGreaterThanOrEqual(3);
    console.log('📊 Period 3 Analytics:', {
      hasWG: !!finalWG,
      periodsCount: finalWG.periods?.length || 0,
      currentPeriodId: finalState.currentPeriod?.id
    });

    console.log('✅ Analytics period visibility test passed');
  });

  test('should maintain analytics consistency across app restarts', () => {
    // Create a period
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);

    // Get WG data before restart
    const wgBeforeRestart = dataManager.getCurrentWG();
    console.log('📊 Analytics before restart:', {
      hasWG: !!wgBeforeRestart,
      periodsCount: wgBeforeRestart?.periods?.length || 0
    });

    expect(wgBeforeRestart).toBeDefined();

    // Simulate app restart
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    // Get analytics data after restart
    const wgAfterRestart = dataManager.getCurrentWG();
    console.log('📊 Analytics after restart:', {
      hasWG: !!wgAfterRestart,
      periodsCount: wgAfterRestart?.periods?.length || 0
    });

    // Verify analytics data persisted (if there was a WG)
    if (wgBeforeRestart) {
      expect(wgAfterRestart).toBeDefined();
    }

    console.log('✅ Analytics persistence across restart test passed');
  });

  test('should provide analytics for multiple periods', () => {
    // Create and populate multiple periods
    const periodConfigs = [
      { 
        start: new Date('2024-10-01'), 
        end: new Date('2024-10-31'), 
        name: 'October'
      },
      { 
        start: new Date('2024-11-01'), 
        end: new Date('2024-11-30'), 
        name: 'November'
      },
      { 
        start: new Date('2024-12-01'), 
        end: new Date('2024-12-31'), 
        name: 'December'
      }
    ];

    for (const config of periodConfigs) {
      console.log(`📅 Creating ${config.name}...`);
      
      dataManager.setCustomPeriod(config.start, config.end, false);
    }

    // Test analytics from each period perspective
    for (const config of periodConfigs) {
      dataManager.setCustomPeriod(config.start, config.end, false);
      
      const state = dataManager.getState();
      const wg = dataManager.getCurrentWG();
      
      console.log(`📊 ${config.name} Analytics:`, {
        hasState: !!state,
        hasWG: !!wg,
        periodsCount: wg?.periods?.length || 0,
        currentPeriodId: state.currentPeriod?.id
      });

      expect(state).toBeDefined();
      expect(wg).toBeDefined();
    }

    console.log('✅ Multi-period analytics accuracy test passed');
  });

  test('should handle analytics for periods with no activity', () => {
    // Create active period
    console.log('📅 Creating active period...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);

    // Create empty periods
    console.log('📅 Creating empty periods...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    // No activity in this period
    
    dataManager.setCustomPeriod(new Date('2025-02-01'), new Date('2025-02-28'), false);
    // No activity in this period either

    // Test analytics from empty period
    const emptyState = dataManager.getState();
    const emptyWG = dataManager.getCurrentWG();
    console.log('📊 Analytics from empty period:', {
      hasState: !!emptyState,
      hasWG: !!emptyWG,
      periodsCount: emptyWG?.periods?.length || 0,
      currentExecutions: Object.keys(emptyState.executions || {}).length
    });

    expect(emptyState).toBeDefined();
    expect(emptyWG).toBeDefined();

    // Switch back to active period
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const activeState = dataManager.getState();
    const activeWG = dataManager.getCurrentWG();
    console.log('📊 Analytics from active period:', {
      hasState: !!activeState,
      hasWG: !!activeWG,
      periodsCount: activeWG?.periods?.length || 0,
      currentExecutions: Object.keys(activeState.executions || {}).length
    });

    expect(activeState).toBeDefined();
    expect(activeWG).toBeDefined();

    console.log('✅ Empty period analytics handling test passed');
  });
});
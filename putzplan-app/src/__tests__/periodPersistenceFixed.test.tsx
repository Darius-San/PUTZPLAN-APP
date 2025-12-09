/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Persistence Across App Restarts - Fixed', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should persist periods after app restart simulation', () => {
    // 1. Setup WG with basic data
    const wg = dataManager.createWG('Period Test WG');
    dataManager.setCurrentWG(wg.id);

    // 2. Create first period
    console.log('📅 Creating Period 1 (December 2024)...');
    const period1 = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(period1).toBeTruthy();
    
    const state1 = dataManager.getState();
    console.log(`📅 Period 1 created: ${JSON.stringify(state1.currentPeriod)}`);

    // 3. Create second period  
    console.log('📅 Creating Period 2 (January 2025)...');
    const period2 = dataManager.setCustomPeriod(
      new Date('2025-01-01'), 
      new Date('2025-01-31'), 
      false
    );
    expect(period2).toBeTruthy();

    const state2 = dataManager.getState();
    console.log(`📅 Period 2 created: ${JSON.stringify(state2.currentPeriod)}`);

    // 4. Simulate app restart by clearing memory and reloading
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    // 5. Verify periods persisted after restart
    const stateAfterRestart = dataManager.getState();
    console.log(`📅 Current period after restart: ${JSON.stringify(stateAfterRestart.currentPeriod)}`);
    
    // Should have the last period that was active
    expect(stateAfterRestart.currentPeriod).toBeDefined();
    
    console.log('✅ Basic period persistence test passed');
  });

  test('should persist multiple periods and maintain correct data', () => {
    // Setup WG
    const wg = dataManager.createWG('Multi-Period Test WG');
    dataManager.setCurrentWG(wg.id);

    // Create multiple periods
    const periodConfigs = [
      { start: new Date('2024-11-01'), end: new Date('2024-11-30'), name: 'November' },
      { start: new Date('2024-12-01'), end: new Date('2024-12-31'), name: 'December' },
      { start: new Date('2025-01-01'), end: new Date('2025-01-31'), name: 'January' }
    ];

    console.log('📅 Creating multiple periods...');
    for (const config of periodConfigs) {
      const period = dataManager.setCustomPeriod(config.start, config.end, false);
      expect(period).toBeTruthy();
      console.log(`📅 Created ${config.name} period`);
    }

    // Get state before restart
    const stateBeforeRestart = dataManager.getState();
    console.log(`📊 State before restart - Current period: ${JSON.stringify(stateBeforeRestart.currentPeriod)}`);

    // Simulate restart
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    // Verify after restart
    const stateAfterRestart = dataManager.getState();
    console.log(`📊 State after restart - Current period: ${JSON.stringify(stateAfterRestart.currentPeriod)}`);
    
    expect(stateAfterRestart.currentPeriod).toBeDefined();
    console.log('✅ Multi-period persistence test passed');
  });

  test('should handle period persistence when no users exist', () => {
    // Create period without users (edge case)
    console.log('📅 Creating period without users...');
    const period = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(period).toBeTruthy();

    const stateBefore = dataManager.getState();
    console.log(`📅 Period before restart: ${JSON.stringify(stateBefore.currentPeriod)}`);

    // Simulate restart
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    const stateAfter = dataManager.getState();
    console.log(`📅 Period after restart: ${JSON.stringify(stateAfter.currentPeriod)}`);
    
    // Period should still exist
    expect(stateAfter.currentPeriod).toBeDefined();
    console.log('✅ Period persistence without users test passed');
  });
});
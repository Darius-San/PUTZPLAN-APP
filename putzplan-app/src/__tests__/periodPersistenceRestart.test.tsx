/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Persistence Across App Restarts', () => {
  beforeEach(() => {
    // Clear all data before each test
    dataManager.clearAllData();
  });

  afterEach(() => {
    // Cleanup after each test
    dataManager.clearAllData();
  });

  test('should persist periods after app restart simulation', () => {
    // 1. Setup initial WG and user
    const wgId = dataManager.createWG({
      name: 'Persistence Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 }
      ],
      tasks: [
        { name: 'Küche putzen', effort: 10, intervalDays: 7 },
        { name: 'Bad putzen', effort: 15, intervalDays: 5 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    if (users.length > 0) {
      dataManager.setCurrentUser(users[0].id);
    }

    // 2. Create first period
    const period1Start = new Date('2024-12-01');
    const period1End = new Date('2024-12-31');
    const period1 = dataManager.setCustomPeriod(period1Start, period1End, false);
    expect(period1).toBeTruthy();

    // 3. Create second period
    const period2Start = new Date('2025-01-01');
    const period2End = new Date('2025-01-31');
    const period2 = dataManager.setCustomPeriod(period2Start, period2End, false);
    expect(period2).toBeTruthy();

    // 4. Verify initial state
    let state = dataManager.getState();
    expect(state.currentPeriod).toBeDefined();
    expect(state.currentPeriod.start).toBe('2025-01-01');
    expect(state.currentPeriod.end).toBe('2025-01-31');

    // Check historical periods
    const historicalPeriods = dataManager.getHistoricalPeriods();
    expect(historicalPeriods).toBeDefined();
    expect(historicalPeriods.length).toBeGreaterThanOrEqual(1);
    
    const firstPeriodInHistory = historicalPeriods.find(p => 
      p.start === '2024-12-01' && p.end === '2024-12-31'
    );
    expect(firstPeriodInHistory).toBeDefined();

    // 5. Simulate app restart by reloading data from storage
    console.log('🔄 Simulating app restart...');
    
    // Get current storage data
    const storageData = localStorage.getItem('putzplan-data');
    expect(storageData).toBeTruthy();
    console.log('📁 Storage data exists:', !!storageData);

    // Clear current state and reload from storage
    dataManager.clearAllData();
    
    // Simulate fresh app start
    const freshState = dataManager.getState();
    console.log('🔍 Fresh state after restart:', {
      currentPeriod: freshState.currentPeriod?.id,
      periodCount: Object.keys(freshState.periods || {}).length,
      wgExists: !!freshState.currentWG
    });

    // 6. Verify periods survived restart
    expect(freshState.currentPeriod).toBeDefined();
    expect(freshState.currentPeriod.start).toBe('2025-01-01');
    expect(freshState.currentPeriod.end).toBe('2025-01-31');

    // Check historical periods after restart
    const historicalAfterRestart = dataManager.getHistoricalPeriods();
    expect(historicalAfterRestart).toBeDefined();
    expect(historicalAfterRestart.length).toBeGreaterThanOrEqual(1);
    
    const firstPeriodAfterRestart = historicalAfterRestart.find(p => 
      p.start === '2024-12-01' && p.end === '2024-12-31'
    );
    expect(firstPeriodAfterRestart).toBeDefined();
    
    console.log('✅ Period persistence test passed');
  });

  test('should persist multiple periods and maintain correct order', () => {
    // Setup WG
    const wgId = dataManager.createWG({
      name: 'Multi-Period Test WG',
      members: [{ name: 'Test User', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Test Task', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    if (users.length > 0) {
      dataManager.setCurrentUser(users[0].id);
    }

    // Create multiple periods
    const periods = [
      { start: '2024-10-01', end: '2024-10-31' },
      { start: '2024-11-01', end: '2024-11-30' },
      { start: '2024-12-01', end: '2024-12-31' }
    ];

    for (const period of periods) {
      const result = dataManager.setCustomPeriod(
        new Date(period.start), 
        new Date(period.end), 
        false
      );
      expect(result).toBeTruthy();
    }

    // Current period should be the last one
    let state = dataManager.getState();
    expect(state.currentPeriod.start).toBe('2024-12-01');
    expect(state.currentPeriod.end).toBe('2024-12-31');

    // Historical periods should contain the first two
    const historical = dataManager.getHistoricalPeriods();
    expect(historical.length).toBe(2);

    // Simulate restart
    dataManager.clearAllData();
    
    // Verify after restart
    state = dataManager.getState();
    expect(state.currentPeriod).toBeDefined();
    expect(state.currentPeriod.start).toBe('2024-12-01');
    
    const historicalAfterRestart = dataManager.getHistoricalPeriods();
    expect(historicalAfterRestart.length).toBe(2);
    
    console.log('✅ Multiple period persistence test passed');
  });

  test('should handle period persistence when no current user is set', () => {
    // Create WG but don't set current user
    const wgId = dataManager.createWG({
      name: 'No User Test WG',
      members: [{ name: 'Test User', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Test Task', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    // Intentionally NOT setting current user

    // Try to create period without user
    const result = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );

    // Should handle gracefully
    expect(result).toBeTruthy();

    // Simulate restart
    dataManager.clearAllData();
    
    // Verify graceful handling after restart
    const state = dataManager.getState();
    // Should not crash and have reasonable defaults
    expect(state).toBeDefined();
    
    console.log('✅ Period persistence without user test passed');
  });
});
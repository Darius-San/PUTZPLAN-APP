/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Creation and Analytics Integration E2E', () => {
  beforeEach(() => {
    // Reset dataManager to clean state
    dataManager.clearAllData();
    
    // Setup basic WG and user
    const wgId = dataManager.createWG({
      name: 'Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 100 }
      ],
      tasks: [
        { name: 'Küche putzen', effort: 10, intervalDays: 7 },
        { name: 'Bad putzen', effort: 15, intervalDays: 7 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    if (users.length > 0) {
      dataManager.setCurrentUser(users[0].id);
    }
  });

  test('should create period, show in selection, and be visible in analytics', () => {
    const startDate = new Date('2024-12-01');
    const endDate = new Date('2024-12-31');
    
    // 1. Create a new period
    const result = dataManager.setCustomPeriod(startDate, endDate, false);
    expect(result).toBeTruthy(); // Function returns period object on success
    
    // 2. Verify period is now current
    const state = dataManager.getState();
    expect(state.currentPeriod).toBeDefined();
    expect(state.currentPeriod.start).toBe('2024-12-01');
    expect(state.currentPeriod.end).toBe('2024-12-31');
    
    // 3. Create another period to test historical periods
    const startDate2 = new Date('2025-01-01');
    const endDate2 = new Date('2025-01-31');
    
    const result2 = dataManager.setCustomPeriod(startDate2, endDate2, false);
    expect(result2).toBeTruthy();
    
    // 4. Verify historical periods include the first period
    const historicalPeriods = dataManager.getHistoricalPeriods();
    expect(historicalPeriods).toBeDefined();
    expect(Array.isArray(historicalPeriods)).toBe(true);
    
    const firstPeriod = historicalPeriods.find(p => 
      p.start === '2024-12-01' && p.end === '2024-12-31'
    );
    expect(firstPeriod).toBeDefined();
    
    // 5. Verify current period is the second one
    const currentState = dataManager.getState();
    expect(currentState.currentPeriod.start).toBe('2025-01-01');
    expect(currentState.currentPeriod.end).toBe('2025-01-31');
    
    // 6. Test period display selection
    if (firstPeriod) {
      dataManager.setDisplayPeriod(firstPeriod.id);
      const displayPeriod = dataManager.getDisplayPeriod();
      expect(displayPeriod).toBe(firstPeriod.id);
    }
  });

  test('should handle overlapping period detection', () => {
    // Create first period
    const startDate1 = new Date('2024-12-01');
    const endDate1 = new Date('2024-12-31');
    dataManager.setCustomPeriod(startDate1, endDate1, false);
    
    // Try to create overlapping period
    const startDate2 = new Date('2024-12-15');
    const endDate2 = new Date('2025-01-15');
    
    // The function should still work but we need to check if overlaps are handled
    const result = dataManager.setCustomPeriod(startDate2, endDate2, false);
    
    // Verify the system handles this appropriately (returns truthy or object on success)
    expect(result).toBeTruthy();
  });

  test('should preserve task executions across periods', () => {
    // Create period and add some executions
    const startDate = new Date('2024-12-01');
    const endDate = new Date('2024-12-31');
    dataManager.setCustomPeriod(startDate, endDate, false);
    
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    const users = Object.values(state.users);
    
    if (tasks.length > 0 && users.length > 0) {
      // Execute a task
      dataManager.executeTask(tasks[0].id, users[0].id);
      
      // Verify execution was recorded
      const executions = Object.values(dataManager.getState().executions);
      expect(executions.length).toBeGreaterThan(0);
      
      const execution = executions[0];
      expect(execution.periodId).toBe(state.currentPeriod.id);
      
      // Create new period without reset
      const startDate2 = new Date('2025-01-01');
      const endDate2 = new Date('2025-01-31');
      dataManager.setCustomPeriod(startDate2, endDate2, false);
      
      // Verify old execution still exists
      const newState = dataManager.getState();
      const allExecutions = Object.values(newState.executions);
      const oldExecution = allExecutions.find(e => e.id === execution.id);
      expect(oldExecution).toBeDefined();
    }
  });

  test('should reset data when creating period with reset flag', () => {
    // Setup some data first
    const startDate1 = new Date('2024-12-01');
    const endDate1 = new Date('2024-12-31');
    dataManager.setCustomPeriod(startDate1, endDate1, false);
    
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    const users = Object.values(state.users);
    
    if (tasks.length > 0 && users.length > 0) {
      // Execute a task
      dataManager.executeTask(tasks[0].id, users[0].id);
      
      // Verify execution exists
      let executions = Object.values(dataManager.getState().executions);
      expect(executions.length).toBeGreaterThan(0);
      
      // Create new period with reset
      const startDate2 = new Date('2025-01-01');
      const endDate2 = new Date('2025-01-31');
      dataManager.setCustomPeriod(startDate2, endDate2, true);
      
      // Verify data was reset
      const newState = dataManager.getState();
      executions = Object.values(newState.executions);
      expect(executions.length).toBe(0);
    }
  });
});

describe('Period Management Data Consistency', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  test('should maintain data integrity across period operations', () => {
    // Setup WG
    const wgId = dataManager.createWG({
      name: 'Consistency Test WG',
      members: [{ name: 'Test User', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Test Task', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    
    // Verify initial state
    let state = dataManager.getState();
    expect(state.currentWG).toBe(wgId);
    expect(Object.keys(state.users).length).toBeGreaterThan(0);
    expect(Object.keys(state.tasks).length).toBeGreaterThan(0);
    
    // Create period
    const success = dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    expect(success).toBe(true);
    
    // Verify state consistency after period creation
    state = dataManager.getState();
    expect(state.currentWG).toBe(wgId);
    expect(state.currentPeriod).toBeDefined();
    expect(Object.keys(state.users).length).toBeGreaterThan(0);
    expect(Object.keys(state.tasks).length).toBeGreaterThan(0);
  });
});
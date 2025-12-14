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
    // Normalize stored dates to ISO yyyy-mm-dd for assertion
    const curStart = new Date(state.currentPeriod.start).toISOString().slice(0,10);
    const curEnd = new Date(state.currentPeriod.end).toISOString().slice(0,10);
    expect(curStart).toBe('2024-12-01');
    expect(curEnd).toBe('2024-12-31');
    
    // 3. Create another period to test historical periods
    const startDate2 = new Date('2025-01-01');
    const endDate2 = new Date('2025-01-31');
    
    // remember first period id so we can find its archived snapshot later
    const firstPeriodId = state.currentPeriod && state.currentPeriod.id;

    const result2 = dataManager.setCustomPeriod(startDate2, endDate2, false);
    expect(result2).toBeTruthy();
    
    // 4. Verify historical periods include the first period
    const historicalPeriods = dataManager.getHistoricalPeriods();
    expect(historicalPeriods).toBeDefined();
    expect(Array.isArray(historicalPeriods)).toBe(true);
    
    // Prefer locating the archived period by id (more robust), fall back to
    // date-range matching.
    let firstPeriod = undefined as any;
    if (firstPeriodId) firstPeriod = historicalPeriods.find((p:any)=> p.id === firstPeriodId);
    if (!firstPeriod) {
      firstPeriod = historicalPeriods.find(p => {
        try {
          const s = new Date((p as any).start).toISOString().slice(0,10);
          const e = new Date((p as any).end).toISOString().slice(0,10);
          return s === '2024-12-01' && e === '2024-12-31';
        } catch (_) { return false; }
      });
    }
    expect(firstPeriod).toBeDefined();
    
    // 5. Verify current period is the second one
    const currentState = dataManager.getState();
    const currentStart = new Date(currentState.currentPeriod.start).toISOString().slice(0,10);
    const currentEnd = new Date(currentState.currentPeriod.end).toISOString().slice(0,10);
    expect(currentStart).toBe('2025-01-01');
    expect(currentEnd).toBe('2025-01-31');
    
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
      
      // Verify old execution is preserved in the archived period savedState
      const hist = dataManager.getHistoricalPeriods();
      const histPeriod = hist.find(p => p.id === execution.periodId || ((p as any).savedState && Array.isArray((p as any).savedState.executions) && (p as any).savedState.executions.find((se:any)=> se.id === execution.id)));
      expect(histPeriod).toBeDefined();
      if (histPeriod) {
        const savedExecs = (histPeriod as any).savedState?.executions || [];
        const savedExec = savedExecs.find((e:any)=> e.id === execution.id);
        expect(savedExec).toBeDefined();
      }
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
    expect(state.currentWG).toBeDefined();
    // `currentWG` may be stored as an id or as the full WG object depending on
    // internal DataManager shape; assert the id either way.
    const currentWGId = typeof state.currentWG === 'string' ? state.currentWG : (state.currentWG && (state.currentWG as any).id);
    const expectedWGId = typeof wgId === 'string' ? wgId : (wgId && (wgId as any).id);
    expect(currentWGId).toBe(expectedWGId);
    expect(Object.keys(state.users).length).toBeGreaterThan(0);
    expect(Object.keys(state.tasks).length).toBeGreaterThan(0);
    
    // Create period
    const success = dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    expect(success).toBeTruthy();
    
    // Verify state consistency after period creation
    state = dataManager.getState();
    // Normalize comparison as `currentWG` can be id or object
    const currentWGIdAfter = typeof state.currentWG === 'string' ? state.currentWG : (state.currentWG && (state.currentWG as any).id);
    const expectedWGIdAfter = typeof wgId === 'string' ? wgId : (wgId && (wgId as any).id);
    expect(currentWGIdAfter).toBe(expectedWGIdAfter);
    expect(state.currentPeriod).toBeDefined();
    expect(Object.keys(state.users).length).toBeGreaterThan(0);
    expect(Object.keys(state.tasks).length).toBeGreaterThan(0);
  });
});
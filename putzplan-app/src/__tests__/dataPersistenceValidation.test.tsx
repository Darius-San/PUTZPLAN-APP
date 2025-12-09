import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Data Persistence Validation - Critical Issues', () => {
  let originalLocalStorage: Storage;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage to track all operations
    originalLocalStorage = global.localStorage;
    mockStorage = {};
    
    global.localStorage = {
      getItem: vi.fn((key: string) => {
        console.log(`📖 [MOCK] localStorage.getItem("${key}") -> ${mockStorage[key] ? 'DATA' : 'null'}`);
        return mockStorage[key] || null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        console.log(`💾 [MOCK] localStorage.setItem("${key}", "${value.substring(0, 100)}...")`);
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        console.log(`🗑️ [MOCK] localStorage.removeItem("${key}")`);
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        console.log(`🧹 [MOCK] localStorage.clear()`);
        mockStorage = {};
      }),
      key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
      get length() { return Object.keys(mockStorage).length; }
    } as Storage;
    
    // Reset dataManager
    dataManager._TEST_reset();
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it('CRITICAL: Detects data loss on app restart simulation', () => {
    console.log('🚨 [DATA LOSS TEST] Starting critical data persistence test...');
    
    // Step 1: Create initial data
    const user = dataManager.createUser({
      name: 'Test User',
      avatar: '👤',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    const wg = dataManager.createWG({
      name: 'Test WG',
      description: 'Test',
      settings: {
        monthlyPointsTarget: 120,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });
    
    dataManager.addMemberToWG(wg.id, user.id);
    dataManager.setCurrentWG(wg.id);
    dataManager.setCurrentUser(user.id);
    
    const task = dataManager.createTask({
      title: 'Critical Task',
      description: 'Test Task',
      emoji: '🧪',
      category: 'general' as any,
      minDaysBetween: 1
    });
    
    // Execute task to create execution data
    const execution = dataManager.executeTask(task.id, { notes: 'Test execution' });
    
    // Capture state before "restart"
    const stateBefore = dataManager.getState();
    console.log('📊 [BEFORE RESTART] State summary:', {
      users: Object.keys(stateBefore.users).length,
      wgs: Object.keys(stateBefore.wgs || {}).length,
      tasks: Object.keys(stateBefore.tasks).length,
      executions: Object.keys(stateBefore.executions).length,
      currentUser: stateBefore.currentUser?.name,
      currentWG: stateBefore.currentWG?.name
    });
    
    // Check localStorage was called
    expect(global.localStorage.setItem).toHaveBeenCalled();
    console.log('✅ [PERSISTENCE CHECK] localStorage.setItem was called during data creation');
    
    // Step 2: Simulate app restart by creating new DataManager instance
    console.log('🔄 [RESTART SIMULATION] Simulating app restart...');
    
    // Create new DataManager instance (simulates fresh app start)
    const newDataManager = new (dataManager.constructor as any)();
    const stateAfter = newDataManager.getState();
    
    console.log('📊 [AFTER RESTART] State summary:', {
      users: Object.keys(stateAfter.users).length,
      wgs: Object.keys(stateAfter.wgs || {}).length,
      tasks: Object.keys(stateAfter.tasks).length,
      executions: Object.keys(stateAfter.executions).length,
      currentUser: stateAfter.currentUser?.name,
      currentWG: stateAfter.currentWG?.name
    });
    
    // Step 3: Critical validations
    console.log('🔍 [VALIDATION] Running critical data persistence checks...');
    
    // Check if localStorage was read on restart
    expect(global.localStorage.getItem).toHaveBeenCalledWith('putzplan-data');
    console.log('✅ [PERSISTENCE CHECK] localStorage.getItem was called during restart');
    
    // Validate data integrity
    const dataLossIssues = [];
    
    if (Object.keys(stateAfter.users).length === 0) {
      dataLossIssues.push('❌ All users lost');
    }
    if (Object.keys(stateAfter.wgs || {}).length === 0) {
      dataLossIssues.push('❌ All WGs lost');
    }
    if (Object.keys(stateAfter.tasks).length === 0) {
      dataLossIssues.push('❌ All tasks lost');
    }
    if (Object.keys(stateAfter.executions).length === 0) {
      dataLossIssues.push('❌ All executions lost');
    }
    if (!stateAfter.currentUser && stateBefore.currentUser) {
      dataLossIssues.push('❌ Current user lost');
    }
    if (!stateAfter.currentWG && stateBefore.currentWG) {
      dataLossIssues.push('❌ Current WG lost');
    }
    
    // Report findings
    if (dataLossIssues.length > 0) {
      console.error('🚨 [DATA LOSS DETECTED] Critical issues found:');
      dataLossIssues.forEach(issue => console.error(issue));
      
      // Show localStorage content for debugging
      console.log('🔍 [DEBUG] localStorage content:', mockStorage);
      
      expect(dataLossIssues).toHaveLength(0);
    } else {
      console.log('✅ [SUCCESS] No data loss detected - all data persisted correctly!');
    }
    
    // Detailed data validation
    expect(stateAfter.users[user.id]).toBeTruthy();
    expect(stateAfter.users[user.id].name).toBe('Test User');
    expect(stateAfter.wgs![wg.id]).toBeTruthy();
    expect(stateAfter.wgs![wg.id].name).toBe('Test WG');
    expect(stateAfter.tasks[task.id]).toBeTruthy();
    expect(stateAfter.tasks[task.id].title).toBe('Critical Task');
    expect(stateAfter.executions[execution.id]).toBeTruthy();
    expect(stateAfter.executions[execution.id].pointsAwarded).toBeGreaterThan(0);
    expect(stateAfter.currentUser?.id).toBe(user.id);
    expect(stateAfter.currentWG?.id).toBe(wg.id);
  });

  it('Detects version mismatch issues causing data reset', () => {
    console.log('🔍 [VERSION TEST] Testing version handling...');
    
    // Create data
    const user = dataManager.createUser({
      name: 'Version Test User',
      avatar: '🔄',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    // Manually corrupt version in localStorage
    const corruptData = {
      version: '0.9', // Wrong version
      state: dataManager.getState(),
      savedAt: new Date().toISOString()
    };
    
    mockStorage['putzplan-data'] = JSON.stringify(corruptData);
    
    // Create new DataManager - should reset due to version mismatch
    const newDataManager = new (dataManager.constructor as any)();
    const stateAfter = newDataManager.getState();
    
    // Should be reset to initial state
    expect(Object.keys(stateAfter.users).length).toBe(0);
    console.log('✅ [VERSION HANDLING] Version mismatch correctly triggers data reset');
  });

  it('Detects corrupted localStorage causing silent failures', () => {
    console.log('🔍 [CORRUPTION TEST] Testing corrupted data handling...');
    
    // Simulate corrupted localStorage
    mockStorage['putzplan-data'] = 'invalid-json-{corrupted}';
    
    // Should handle gracefully
    const newDataManager = new (dataManager.constructor as any)();
    const state = newDataManager.getState();
    
    expect(state).toBeTruthy();
    expect(state.users).toBeTruthy();
    console.log('✅ [CORRUPTION HANDLING] Corrupted data handled gracefully');
  });

  it('Validates execution data consistency across restarts', () => {
    console.log('🔍 [EXECUTION CONSISTENCY] Testing execution data persistence...');
    
    // Create complete workflow
    const user = dataManager.createUser({
      name: 'Execution Test User',
      avatar: '⚡',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    const wg = dataManager.createWG({
      name: 'Execution Test WG',
      description: 'Test',
      settings: {
        monthlyPointsTarget: 120,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });
    
    dataManager.addMemberToWG(wg.id, user.id);
    dataManager.setCurrentWG(wg.id);
    dataManager.setCurrentUser(user.id);
    
    const task = dataManager.createTask({
      title: 'Execution Test Task',
      description: 'Test Task',
      emoji: '🎯',
      category: 'general' as any,
      minDaysBetween: 1
    });
    
    // Create multiple executions
    const executions = [];
    for (let i = 0; i < 5; i++) {
      const exec = dataManager.executeTask(task.id, { notes: `Execution ${i + 1}` });
      executions.push(exec);
    }
    
    const stateBefore = dataManager.getState();
    const totalPointsBefore = Object.values(stateBefore.executions)
      .reduce((sum, exec) => sum + exec.pointsAwarded, 0);
    
    console.log(`📊 [BEFORE] ${executions.length} executions, ${totalPointsBefore} total points`);
    
    // Restart simulation
    const newDataManager = new (dataManager.constructor as any)();
    const stateAfter = newDataManager.getState();
    const totalPointsAfter = Object.values(stateAfter.executions)
      .reduce((sum, exec) => sum + exec.pointsAwarded, 0);
    
    console.log(`📊 [AFTER] ${Object.keys(stateAfter.executions).length} executions, ${totalPointsAfter} total points`);
    
    // Validate execution consistency
    expect(Object.keys(stateAfter.executions).length).toBe(executions.length);
    expect(totalPointsAfter).toBe(totalPointsBefore);
    
    // Validate specific execution data
    executions.forEach(originalExec => {
      const restoredExec = stateAfter.executions[originalExec.id];
      expect(restoredExec).toBeTruthy();
      expect(restoredExec.pointsAwarded).toBe(originalExec.pointsAwarded);
      expect(restoredExec.taskId).toBe(originalExec.taskId);
      expect(restoredExec.executedBy).toBe(originalExec.executedBy);
    });
    
    console.log('✅ [EXECUTION CONSISTENCY] All execution data persisted correctly');
  });

  it.skip('Detects race conditions in save operations', async () => {
    console.log('🔍 [RACE CONDITION] Testing concurrent save operations...');
    
    const user = dataManager.createUser({
      name: 'Race Test User',
      avatar: '🏃',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    // Track all setItem calls
    const setItemCalls: string[] = [];
    const originalSetItem = global.localStorage.setItem;
    global.localStorage.setItem = vi.fn((key: string, value: string) => {
      setItemCalls.push(`${key}: ${value.length} chars`);
      return originalSetItem.call(global.localStorage, key, value);
    });
    
    // Simulate rapid concurrent operations
    const promises = [];
    for (let i = 0; i < 10; i++) {
      promises.push(
        Promise.resolve().then(() => {
          dataManager.updateUser(user.id, { targetMonthlyPoints: 100 + i });
        })
      );
    }
    
    await Promise.all(promises);
    
    console.log(`📊 [RACE CONDITION] ${setItemCalls.length} localStorage operations detected`);
    
    // Should have called setItem multiple times
    expect(setItemCalls.length).toBeGreaterThan(5);
    console.log('✅ [RACE CONDITION] Multiple save operations detected - potential for data loss exists');
  });
});
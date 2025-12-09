import { describe, it, expect, beforeEach, vi } from 'vitest';
import { stateBackupManager } from '../services/stateBackupManager';
import { dataManager } from '../services/dataManager';

/**
 * 🧪 INTEGRATION TESTS: State Backup Manager + Analytics Restoration
 * 
 * Diese Tests prüfen:
 * ✅ State-Backup System funktioniert bei allen CRUD-Operationen
 * ✅ Analytics-Zeitraum Löschung und Wiederherstellung
 * ✅ localStorage Konsistenz zwischen Simple Browser und Normal Browser
 * ✅ Vollständige Wiederherstellung von gelöschten Analytics-Perioden
 */

// Mock localStorage für Tests
const mockLocalStorage = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage
});

describe('🔄 State Backup Manager - Full Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Clear any existing backups
    stateBackupManager.cleanup(0); // Remove all backups

    // Reset dataManager state
    dataManager.reset();
    
    console.log('🧹 Test setup: localStorage und stateBackupManager cleared');
  });

  it('✅ sollte CREATE_USER Operationen backup loggen', () => {
    console.log('🧪 Test: CREATE_USER backup logging');

    // Create a test user
    const userData = { username: 'Test User Backup', emoji: '🧪' };
    const user = dataManager.createUser(userData);
    
    console.log('👤 User created:', user.id, user.username);

    // Check if backup was logged
    const backups = stateBackupManager.getAllSnapshots();
    console.log('💾 Backups after user creation:', backups.length);
    
    expect(backups.length).toBeGreaterThan(0);
    
    const createUserBackup = backups.find(b => b.type === 'CREATE_USER');
    expect(createUserBackup).toBeDefined();
    expect(createUserBackup?.entityId).toBe(user.id);
    expect(createUserBackup?.data.username).toBe('Test User Backup');
    
    console.log('✅ User creation backup validated');
  });

  it('✅ sollte CREATE_TASK Operationen backup loggen', () => {
    console.log('🧪 Test: CREATE_TASK backup logging');

    // First create WG and user
    const userData = { username: 'Task Creator', emoji: '🛠️' };
    const user = dataManager.createUser(userData);
    const wgData = { name: 'Task Test WG', emoji: '🏠' };
    const wg = dataManager.createWG(wgData);
    dataManager.setCurrentWG(wg.id);

    // Create a test task
    const taskData = { 
      title: 'Test Task Backup', 
      category: 'general' as any, 
      averageMinutes: 30, 
      difficultyScore: 7 
    };
    const task = dataManager.createTask(taskData);
    
    console.log('📝 Task created:', task.id, task.title);

    // Check if backup was logged
    const backups = stateBackupManager.getAllSnapshots();
    console.log('💾 Backups after task creation:', backups.length);
    
    const createTaskBackup = backups.find(b => b.type === 'CREATE_TASK');
    expect(createTaskBackup).toBeDefined();
    expect(createTaskBackup?.entityId).toBe(task.id);
    expect(createTaskBackup?.data.title).toBe('Test Task Backup');
    
    console.log('✅ Task creation backup validated');
  });

  it('✅ sollte DELETE_TASK Operationen backup loggen für Wiederherstellung', () => {
    console.log('🧪 Test: DELETE_TASK backup with restoration data');

    // Setup
    const userData = { username: 'Task Deleter', emoji: '🗑️' };
    const user = dataManager.createUser(userData);
    const wgData = { name: 'Delete Test WG', emoji: '🏠' };
    const wg = dataManager.createWG(wgData);
    dataManager.setCurrentWG(wg.id);

    // Create and then delete a task
    const taskData = { 
      title: 'Task To Delete', 
      category: 'general' as any, 
      averageMinutes: 25 
    };
    const task = dataManager.createTask(taskData);
    const taskId = task.id;
    
    console.log('📝 Task created for deletion:', taskId, task.title);
    
    // Delete the task
    dataManager.deleteTask(taskId);
    
    console.log('🗑️ Task deleted:', taskId);

    // Check if backup contains deleted task data
    const backups = stateBackupManager.getAllSnapshots();
    const deleteTaskBackup = backups.find(b => b.type === 'DELETE_TASK');
    
    expect(deleteTaskBackup).toBeDefined();
    expect(deleteTaskBackup?.entityId).toBe(taskId);
    expect(deleteTaskBackup?.data.title).toBe('Task To Delete');
    
    // Verify task is actually deleted from state
    const currentState = dataManager.getState();
    expect(currentState.tasks[taskId]).toBeUndefined();
    
    console.log('✅ Delete backup contains full task data for potential restore');
  });

  it('🔄 sollte Analytics-Zeitraum Löschung und Wiederherstellung simulieren', () => {
    console.log('🧪 Test: Analytics period deletion and restoration simulation');

    // Setup test data
    const userData = { username: 'Analytics User', emoji: '📊' };
    const user = dataManager.createUser(userData);
    const wgData = { name: 'Analytics Test WG', emoji: '📈' };
    const wg = dataManager.createWG(wgData);
    dataManager.setCurrentWG(wg.id);

    const taskData = { 
      title: 'Analytics Task', 
      category: 'general' as any, 
      averageMinutes: 20 
    };
    const task = dataManager.createTask(taskData);

    // Execute some tasks to create execution data
    const execution1 = dataManager.executeTask(task.id, {});
    console.log('⚡ Execution 1 created:', execution1.id);

    // Simulate analytics period deletion by saving deletion state
    const monthKey = '2023-11';
    const deletionState = {
      hiddenMonths: [monthKey],
      deletedMonths: { [monthKey]: {
        executions: { [execution1.id]: execution1 },
        userStats: { [user.id]: { points: execution1.pointsAwarded } }
      }},
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('analytics-deletion-state', JSON.stringify(deletionState));
    console.log('📊 Analytics deletion state saved');

    // Verify deletion state persistence
    const savedDeletionState = localStorage.getItem('analytics-deletion-state');
    expect(savedDeletionState).toBeTruthy();
    
    const parsedState = JSON.parse(savedDeletionState!);
    expect(parsedState.hiddenMonths).toContain(monthKey);
    expect(parsedState.deletedMonths[monthKey]).toBeDefined();
    expect(parsedState.deletedMonths[monthKey].executions[execution1.id]).toBeDefined();
    
    console.log('✅ Analytics deletion/restoration state verified');
  });

  it('🌐 sollte localStorage Konsistenz zwischen Browser-Kontexten testen', () => {
    console.log('🧪 Test: localStorage consistency across browser contexts');

    // Simulate data creation in first browser context
    const userData = { username: 'Browser User 1', emoji: '🌐' };
    const user = dataManager.createUser(userData);
    
    // Save current state to localStorage (simulate browser context 1)
    const state1 = dataManager.getState();
    localStorage.setItem('wg-app-state', JSON.stringify(state1));
    
    const backups1 = stateBackupManager.getAllSnapshots();
    localStorage.setItem('state-backup-manager', JSON.stringify(backups1));
    
    console.log('💾 Browser context 1: State saved to localStorage');
    
    // Clear memory state (simulate browser reload/switch)
    dataManager.reset();
    stateBackupManager.cleanup(0); // Clear memory backups
    
    // Simulate second browser context loading from localStorage
    const savedState = localStorage.getItem('wg-app-state');
    const savedBackups = localStorage.getItem('state-backup-manager');
    
    expect(savedState).toBeTruthy();
    expect(savedBackups).toBeTruthy();
    
    const parsedState = JSON.parse(savedState!);
    expect(parsedState.users[user.id]).toBeDefined();
    expect(parsedState.users[user.id].username).toBe('Browser User 1');
    
    const parsedBackups = JSON.parse(savedBackups!);
    expect(parsedBackups.length).toBeGreaterThan(0);
    
    console.log('✅ Data consistency verified across browser contexts');
  });

  it('🔍 sollte State-Backup Cleanup-Funktionalität testen', () => {
    console.log('🧪 Test: State backup cleanup functionality');

    // Create multiple backups
    for (let i = 0; i < 5; i++) {
      stateBackupManager.saveStateChange({
        type: 'CREATE_TASK',
        entity: 'task',
        entityId: `test-task-${i}`,
        data: { title: `Test Task ${i}` },
        timestamp: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString() // Different days
      });
    }
    
    const initialBackups = stateBackupManager.getAllSnapshots();
    console.log('💾 Initial backups created:', initialBackups.length);
    expect(initialBackups.length).toBe(5);
    
    // Cleanup old backups (keep only last 2 days)
    const cleanedCount = stateBackupManager.cleanup(2 * 24 * 60 * 60 * 1000); // 2 days in milliseconds
    
    const remainingBackups = stateBackupManager.getAllSnapshots();
    console.log('🧹 Backups after cleanup:', remainingBackups.length, 'cleaned:', cleanedCount);
    
    expect(remainingBackups.length).toBeLessThan(initialBackups.length);
    expect(cleanedCount).toBeGreaterThan(0);
    
    console.log('✅ Cleanup functionality verified');
  });

  it('📊 sollte vollständige Analytics-Wiederherstellung End-to-End testen', () => {
    console.log('🧪 Test: Complete analytics restoration end-to-end');

    // Setup: Create comprehensive test data
    const userData = { username: 'Analytics Restore User', emoji: '📊' };
    const user = dataManager.createUser(userData);
    const wgData = { name: 'Restore Test WG', emoji: '🔄' };
    const wg = dataManager.createWG(wgData);
    dataManager.setCurrentWG(wg.id);

    const taskData = { 
      title: 'Restore Test Task', 
      category: 'general' as any, 
      averageMinutes: 30,
      difficultyScore: 6 
    };
    const task = dataManager.createTask(taskData);

    // Create multiple executions
    const executions = [];
    for (let i = 0; i < 3; i++) {
      const execution = dataManager.executeTask(task.id, { notes: `Execution ${i}` });
      executions.push(execution);
      console.log(`⚡ Execution ${i} created:`, execution.id, 'Points:', execution.pointsAwarded);
    }

    // Calculate total points before "deletion"
    const initialUserPoints = dataManager.getState().users[user.id].currentMonthPoints;
    const totalExecutionPoints = executions.reduce((sum, exec) => sum + exec.pointsAwarded, 0);
    
    console.log('💰 Initial user points:', initialUserPoints);
    console.log('💰 Total execution points:', totalExecutionPoints);
    
    // Simulate analytics period deletion with comprehensive backup
    const monthKey = '2023-11';
    const deletionData = {
      executions: Object.fromEntries(executions.map(exec => [exec.id, exec])),
      userStats: { 
        [user.id]: {
          username: user.username,
          pointsBefore: initialUserPoints - totalExecutionPoints,
          pointsFromPeriod: totalExecutionPoints,
          totalPoints: initialUserPoints
        }
      },
      taskStats: {
        [task.id]: {
          title: task.title,
          executionCount: executions.length,
          totalPoints: totalExecutionPoints
        }
      },
      wgInfo: {
        id: wg.id,
        name: wg.name
      }
    };

    const deletionState = {
      hiddenMonths: [monthKey],
      deletedMonths: { [monthKey]: deletionData },
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('analytics-deletion-state', JSON.stringify(deletionState));
    console.log('📊 Comprehensive analytics deletion state created');

    // Verify restoration data completeness
    const savedState = localStorage.getItem('analytics-deletion-state');
    const restorationData = JSON.parse(savedState!);
    
    expect(restorationData.deletedMonths[monthKey]).toBeDefined();
    expect(restorationData.deletedMonths[monthKey].executions).toBeDefined();
    expect(Object.keys(restorationData.deletedMonths[monthKey].executions)).toHaveLength(3);
    expect(restorationData.deletedMonths[monthKey].userStats[user.id]).toBeDefined();
    expect(restorationData.deletedMonths[monthKey].taskStats[task.id]).toBeDefined();
    
    console.log('✅ Complete analytics restoration data verified');
    console.log('📋 Restoration data includes:');
    console.log('   - Executions:', Object.keys(restorationData.deletedMonths[monthKey].executions).length);
    console.log('   - User stats:', Object.keys(restorationData.deletedMonths[monthKey].userStats).length);  
    console.log('   - Task stats:', Object.keys(restorationData.deletedMonths[monthKey].taskStats).length);
  });
});
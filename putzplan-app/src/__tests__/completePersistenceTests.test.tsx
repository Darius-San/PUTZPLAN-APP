import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Complete Persistence and Period Management Tests', () => {
  let originalLocalStorage: Storage;
  
  beforeEach(() => {
    // Backup original localStorage
    originalLocalStorage = global.localStorage;
    dataManager.clearAllData();
  });

  afterEach(() => {
    // Restore localStorage
    global.localStorage = originalLocalStorage;
  });

  describe('1. Period Persistence Tests', () => {
    it('should persist new periods across app restart', () => {
      console.log('🧪 [Test] Creating new period and testing persistence...');
      
      // Create user and WG first
      const user = dataManager.createUser({ name: 'TestUser', avatar: '👤' } as any);
      const wg = dataManager.createWG({ name: 'TestWG', description: 'test' } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);
      
      // Create a custom period
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');
      
      const period = dataManager.setCustomPeriod(startDate, endDate, false);
      
      // Verify period is in localStorage
      const stored = localStorage.getItem('putzplan-data');
      expect(stored).toBeTruthy();
      
      const parsed = JSON.parse(stored!);
      expect(parsed.state.currentPeriod).toBeTruthy();
      expect(parsed.state.currentPeriod.id).toBe(period.id);
      
      // Simulate app restart
      const newManager = new (dataManager.constructor as any)();
      (newManager as any)._TEST_setLocalStorage(global.localStorage);
      
      const restoredState = newManager.getState();
      expect(restoredState.currentPeriod).toBeTruthy();
      expect(restoredState.currentPeriod.id).toBe(period.id);
      expect(new Date(restoredState.currentPeriod.start)).toEqual(startDate);
      expect(new Date(restoredState.currentPeriod.end)).toEqual(endDate);
      
      console.log('✅ [Test] Period persistence verified');
    });

    it('should create analytics periods when setting new period', () => {
      console.log('🧪 [Test] Testing analytics period creation...');
      
      // Setup
      const user = dataManager.createUser({ name: 'AnalyticsUser', avatar: '📊' } as any);
      const wg = dataManager.createWG({ 
        name: 'AnalyticsWG', 
        description: 'test',
        settings: { monthlyPointsTarget: 100 }
      } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      // Create period
      const startDate = new Date('2025-02-01');
      const endDate = new Date('2025-02-28');
      const period = dataManager.setCustomPeriod(startDate, endDate, false);

      // Verify analytics period was created
      const currentWG = dataManager.getCurrentWG();
      expect(currentWG!.periods).toBeTruthy();
      expect(currentWG!.periods!.length).toBe(1);
      
      const analyticsPeriod = currentWG!.periods![0];
      expect(analyticsPeriod.id).toBe(period.id);
      expect(analyticsPeriod.isActive).toBe(true);
      expect(new Date(analyticsPeriod.startDate)).toEqual(startDate);
      expect(new Date(analyticsPeriod.endDate)).toEqual(endDate);
      
      console.log('✅ [Test] Analytics period creation verified');
    });
  });

  describe('2. Period Selection and Overlap Tests', () => {
    it('should handle overlapping periods correctly', () => {
      console.log('🧪 [Test] Testing overlapping periods...');
      
      // Setup
      const user = dataManager.createUser({ name: 'OverlapUser', avatar: '📅' } as any);
      const wg = dataManager.createWG({ name: 'OverlapWG', description: 'test' } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      // Create first period
      const period1 = dataManager.setCustomPeriod(
        new Date('2025-01-01'), 
        new Date('2025-01-31'), 
        false
      );

      // Create overlapping period
      const period2 = dataManager.setCustomPeriod(
        new Date('2025-01-15'), 
        new Date('2025-02-15'), 
        false
      );

      // Both periods should exist in analytics
      const currentWG = dataManager.getCurrentWG();
      expect(currentWG!.periods!.length).toBe(2);
      
      // Only the latest should be active
      const activePeriods = currentWG!.periods!.filter(p => p.isActive);
      expect(activePeriods.length).toBe(1);
      expect(activePeriods[0].id).toBe(period2.id);
      
      console.log('✅ [Test] Overlapping periods handled correctly');
    });

    it('should display historical periods correctly', () => {
      console.log('🧪 [Test] Testing historical periods display...');
      
      // Setup
      const user = dataManager.createUser({ name: 'HistoryUser', avatar: '📜' } as any);
      const wg = dataManager.createWG({ name: 'HistoryWG', description: 'test' } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      // Create several periods to build history
      const periods = [
        { start: new Date('2024-11-01'), end: new Date('2024-11-30') },
        { start: new Date('2024-12-01'), end: new Date('2024-12-31') },
        { start: new Date('2025-01-01'), end: new Date('2025-01-31') }
      ];

      const createdPeriods = periods.map(p => 
        dataManager.setCustomPeriod(p.start, p.end, false)
      );

      // Get historical periods
      const historicalPeriods = dataManager.getHistoricalPeriods();
      
      // Should include all periods (active + historical)
      expect(historicalPeriods.length).toBe(3);
      
      // Should be sorted by creation date (newest first)
      const sortedByDate = [...historicalPeriods].sort((a, b) => 
        new Date(b.createdAt || b.archivedAt || '').getTime() - 
        new Date(a.createdAt || a.archivedAt || '').getTime()
      );
      
      expect(historicalPeriods).toEqual(sortedByDate);
      
      console.log('✅ [Test] Historical periods display verified');
    });
  });

  describe('3. Task Table Period Integration Tests', () => {
    it('should filter executions by display period', () => {
      console.log('🧪 [Test] Testing task table period filtering...');
      
      // Setup
      const user = dataManager.createUser({ name: 'FilterUser', avatar: '🔽' } as any);
      const wg = dataManager.createWG({ name: 'FilterWG', description: 'test' } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      const task = dataManager.createTask({
        title: 'TestTask',
        emoji: '🧪',
        pointsPerExecution: 10,
        wgId: wg.id
      } as any);

      // Create periods
      const period1 = dataManager.setCustomPeriod(
        new Date('2025-01-01'), 
        new Date('2025-01-31'), 
        false
      );
      
      // Execute task in period 1
      dataManager.executeTaskForUser(task.id, user.id, {});
      const execInPeriod1 = Object.keys(dataManager.getState().executions).length;
      
      // Create period 2
      const period2 = dataManager.setCustomPeriod(
        new Date('2025-02-01'), 
        new Date('2025-02-28'), 
        false
      );
      
      // Execute task in period 2
      dataManager.executeTaskForUser(task.id, user.id, {});
      const totalExecs = Object.keys(dataManager.getState().executions).length;

      // Test display period filtering
      dataManager.setDisplayPeriod(period1.id);
      const period1Executions = dataManager.getDisplayPeriodExecutions();
      
      dataManager.setDisplayPeriod(period2.id);
      const period2Executions = dataManager.getDisplayPeriodExecutions();
      
      dataManager.setDisplayPeriod(null); // All executions
      const allExecutions = dataManager.getDisplayPeriodExecutions();

      expect(totalExecs).toBe(2);
      expect(Object.keys(period1Executions).length).toBe(1); 
      expect(Object.keys(period2Executions).length).toBe(1);
      expect(Object.keys(allExecutions).length).toBe(2);
      
      console.log('✅ [Test] Task table period filtering verified');
    });
  });

  describe('4. Data Reset Integration Tests', () => {
    it('should reset data correctly and preserve periods', () => {
      console.log('🧪 [Test] Testing data reset with period preservation...');
      
      // Setup
      const user = dataManager.createUser({ name: 'ResetUser', avatar: '🔄' } as any);
      const wg = dataManager.createWG({ name: 'ResetWG', description: 'test' } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      const task = dataManager.createTask({
        title: 'ResetTask',
        emoji: '🗑️',
        pointsPerExecution: 10,
        wgId: wg.id,
        isAlarmed: true // Mark as hot task
      } as any);

      // Execute task and build data
      dataManager.executeTaskForUser(task.id, user.id, {});
      const beforeState = dataManager.getState();
      expect(Object.keys(beforeState.executions).length).toBe(1);
      expect(beforeState.users[user.id].totalPoints).toBe(10);
      expect(beforeState.tasks[task.id].isAlarmed).toBe(true);

      // Create new period with reset
      const newPeriod = dataManager.setCustomPeriod(
        new Date('2025-03-01'),
        new Date('2025-03-31'),
        true // RESET DATA
      );

      // Verify reset
      const afterState = dataManager.getState();
      expect(Object.keys(afterState.executions).length).toBe(0);
      expect(afterState.users[user.id].totalPoints).toBe(0);
      expect(afterState.tasks[task.id].isAlarmed).toBe(false);

      // Verify period is set and persisted
      expect(afterState.currentPeriod.id).toBe(newPeriod.id);
      
      // Verify persistence
      const stored = localStorage.getItem('putzplan-data');
      expect(stored).toBeTruthy();
      const parsed = JSON.parse(stored!);
      expect(parsed.state.currentPeriod.id).toBe(newPeriod.id);
      
      console.log('✅ [Test] Data reset with period preservation verified');
    });
  });

  describe('5. End-to-End Workflow Tests', () => {
    it('should handle complete period management workflow', () => {
      console.log('🧪 [Test] Testing complete workflow...');
      
      // 1. Initial Setup
      const user = dataManager.createUser({ name: 'WorkflowUser', avatar: '🔄' } as any);
      const wg = dataManager.createWG({ 
        name: 'WorkflowWG', 
        description: 'test',
        settings: { monthlyPointsTarget: 50 }
      } as any);
      dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
      dataManager.setCurrentUser(user.id);

      const task = dataManager.createTask({
        title: 'WorkflowTask',
        emoji: '📋',
        pointsPerExecution: 10,
        wgId: wg.id
      } as any);

      // 2. Work in Period 1
      const period1 = dataManager.setCustomPeriod(
        new Date('2025-01-01'),
        new Date('2025-01-31'),
        false
      );
      
      dataManager.executeTaskForUser(task.id, user.id, {}); // 10 points
      dataManager.executeTaskForUser(task.id, user.id, {}); // 20 points total

      // 3. Switch to Period 2 without reset
      const period2 = dataManager.setCustomPeriod(
        new Date('2025-02-01'),
        new Date('2025-02-28'),
        false
      );
      
      dataManager.executeTaskForUser(task.id, user.id, {}); // 30 points total

      // 4. Create Period 3 with reset
      const period3 = dataManager.setCustomPeriod(
        new Date('2025-03-01'),
        new Date('2025-03-31'),
        true // Reset data
      );
      
      dataManager.executeTaskForUser(task.id, user.id, {}); // Should be 10 points (reset)

      // 5. Verify historical periods
      const historicalPeriods = dataManager.getHistoricalPeriods();
      expect(historicalPeriods.length).toBe(3);

      // 6. Test period display switching
      dataManager.setDisplayPeriod(period1.id);
      const period1Executions = dataManager.getDisplayPeriodExecutions();
      expect(Object.keys(period1Executions).length).toBe(2); // First 2 executions

      dataManager.setDisplayPeriod(period2.id);
      const period2Executions = dataManager.getDisplayPeriodExecutions();
      expect(Object.keys(period2Executions).length).toBe(1); // Middle execution

      dataManager.setDisplayPeriod(null); // Current period
      const currentExecutions = dataManager.getDisplayPeriodExecutions();
      expect(Object.keys(currentExecutions).length).toBe(1); // Last execution after reset

      // 7. Test app restart persistence
      const restoredManager = new (dataManager.constructor as any)();
      (restoredManager as any)._TEST_setLocalStorage(global.localStorage);
      
      const restoredState = restoredManager.getState();
      expect(restoredState.currentPeriod.id).toBe(period3.id);
      expect(restoredState.users[user.id].totalPoints).toBe(10); // After reset
      
      console.log('✅ [Test] Complete workflow verified');
    });
  });
});

export {};
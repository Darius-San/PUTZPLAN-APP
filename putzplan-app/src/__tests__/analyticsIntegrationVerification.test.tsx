/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Analytics Integration Verification', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should show newly created periods in analytics data', () => {
    // 1. Setup WG with members and tasks
    const wgId = dataManager.createWG({
      name: 'Analytics Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 },
        { name: 'Charlie', email: 'charlie@test.com', targetMonthlyPoints: 80 }
      ],
      tasks: [
        { name: 'Kitchen Cleaning', effort: 10, intervalDays: 7 },
        { name: 'Bathroom Cleaning', effort: 15, intervalDays: 5 },
        { name: 'Living Room Vacuum', effort: 12, intervalDays: 3 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    dataManager.setCurrentUser(users[0].id);

    // 2. Create first period
    console.log('📅 Creating Period 1 (December 2024)...');
    const period1 = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(period1).toBeTruthy();

    // 3. Execute some tasks in Period 1
    const state1 = dataManager.getState();
    const tasks = Object.values(state1.tasks);
    
    const execution1 = dataManager.executeTask(tasks[0].id, users[0].id);
    const execution2 = dataManager.executeTask(tasks[1].id, users[1].id);
    expect(execution1).toBeTruthy();
    expect(execution2).toBeTruthy();

    // 4. Get analytics data for Period 1
    const analytics1 = dataManager.getAnalyticsData();
    console.log('📊 Period 1 Analytics:', {
      periodCount: analytics1.periods?.length || 0,
      executionCount: analytics1.totalExecutions || 0,
      userCount: analytics1.activeUsers || 0
    });

    expect(analytics1).toBeDefined();
    expect(analytics1.periods).toBeDefined();
    expect(analytics1.periods.length).toBeGreaterThanOrEqual(1);
    expect(analytics1.totalExecutions).toBeGreaterThanOrEqual(2);

    // 5. Create second period
    console.log('📅 Creating Period 2 (January 2025)...');
    const period2 = dataManager.setCustomPeriod(
      new Date('2025-01-01'), 
      new Date('2025-01-31'), 
      false
    );
    expect(period2).toBeTruthy();

    // 6. Execute different tasks in Period 2
    const execution3 = dataManager.executeTask(tasks[2].id, users[2].id);
    const execution4 = dataManager.executeTask(tasks[0].id, users[1].id);
    expect(execution3).toBeTruthy();
    expect(execution4).toBeTruthy();

    // 7. Get analytics data for Period 2
    const analytics2 = dataManager.getAnalyticsData();
    console.log('📊 Period 2 Analytics:', {
      periodCount: analytics2.periods?.length || 0,
      executionCount: analytics2.totalExecutions || 0,
      userCount: analytics2.activeUsers || 0
    });

    expect(analytics2.periods.length).toBeGreaterThanOrEqual(2);
    
    // 8. Create third period
    console.log('📅 Creating Period 3 (February 2025)...');
    const period3 = dataManager.setCustomPeriod(
      new Date('2025-02-01'), 
      new Date('2025-02-28'), 
      false
    );
    expect(period3).toBeTruthy();

    // 9. Get final analytics data
    const analytics3 = dataManager.getAnalyticsData();
    console.log('📊 Period 3 Analytics:', {
      periodCount: analytics3.periods?.length || 0,
      executionCount: analytics3.totalExecutions || 0,
      userCount: analytics3.activeUsers || 0
    });

    expect(analytics3.periods.length).toBeGreaterThanOrEqual(3);

    // 10. Verify all periods are visible in analytics across switches
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    const analyticsCheck1 = dataManager.getAnalyticsData();
    
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    const analyticsCheck2 = dataManager.getAnalyticsData();
    
    dataManager.setCustomPeriod(new Date('2025-02-01'), new Date('2025-02-28'), false);
    const analyticsCheck3 = dataManager.getAnalyticsData();

    // All analytics should show all periods
    expect(analyticsCheck1.periods.length).toBe(3);
    expect(analyticsCheck2.periods.length).toBe(3);
    expect(analyticsCheck3.periods.length).toBe(3);

    console.log('✅ Analytics period visibility test passed');
  });

  test('should maintain analytics consistency across app restarts', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Analytics Persistence WG',
      members: [
        { name: 'User1', email: 'user1@test.com', targetMonthlyPoints: 100 },
        { name: 'User2', email: 'user2@test.com', targetMonthlyPoints: 120 }
      ],
      tasks: [
        { name: 'Task1', effort: 10, intervalDays: 7 },
        { name: 'Task2', effort: 15, intervalDays: 5 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    dataManager.setCurrentUser(users[0].id);

    // Create periods and execute tasks
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    
    // Execute multiple tasks
    const executions = [];
    for (let i = 0; i < 5; i++) {
      const execution = dataManager.executeTask(
        tasks[i % tasks.length].id, 
        users[i % users.length].id
      );
      executions.push(execution);
      expect(execution).toBeTruthy();
    }

    // Get analytics before restart
    const analyticsBeforeRestart = dataManager.getAnalyticsData();
    console.log('📊 Analytics before restart:', {
      periods: analyticsBeforeRestart.periods?.length || 0,
      executions: analyticsBeforeRestart.totalExecutions || 0,
      users: analyticsBeforeRestart.activeUsers || 0
    });

    expect(analyticsBeforeRestart.periods.length).toBeGreaterThanOrEqual(1);
    expect(analyticsBeforeRestart.totalExecutions).toBeGreaterThanOrEqual(5);

    // Simulate app restart
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    // Get analytics after restart
    const analyticsAfterRestart = dataManager.getAnalyticsData();
    console.log('📊 Analytics after restart:', {
      periods: analyticsAfterRestart.periods?.length || 0,
      executions: analyticsAfterRestart.totalExecutions || 0,
      users: analyticsAfterRestart.activeUsers || 0
    });

    // Verify analytics data persisted
    expect(analyticsAfterRestart.periods.length).toBe(analyticsBeforeRestart.periods.length);
    expect(analyticsAfterRestart.totalExecutions).toBe(analyticsBeforeRestart.totalExecutions);
    expect(analyticsAfterRestart.activeUsers).toBe(analyticsBeforeRestart.activeUsers);

    console.log('✅ Analytics persistence across restart test passed');
  });

  test('should provide accurate statistics for multiple periods', () => {
    // Setup complex scenario
    const wgId = dataManager.createWG({
      name: 'Multi-Period Analytics WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 },
        { name: 'Charlie', email: 'charlie@test.com', targetMonthlyPoints: 80 }
      ],
      tasks: [
        { name: 'Daily Task', effort: 5, intervalDays: 1 },
        { name: 'Weekly Task', effort: 15, intervalDays: 7 },
        { name: 'Monthly Task', effort: 30, intervalDays: 30 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    dataManager.setCurrentUser(users[0].id);

    // Create and populate multiple periods with different activity levels
    const periodConfigs = [
      { 
        start: new Date('2024-10-01'), 
        end: new Date('2024-10-31'), 
        name: 'October',
        executions: 10 
      },
      { 
        start: new Date('2024-11-01'), 
        end: new Date('2024-11-30'), 
        name: 'November',
        executions: 15 
      },
      { 
        start: new Date('2024-12-01'), 
        end: new Date('2024-12-31'), 
        name: 'December',
        executions: 20 
      }
    ];

    let totalExecutions = 0;

    for (const config of periodConfigs) {
      console.log(`📅 Creating ${config.name} with ${config.executions} executions...`);
      
      dataManager.setCustomPeriod(config.start, config.end, false);
      
      const state = dataManager.getState();
      const tasks = Object.values(state.tasks);
      
      // Execute specified number of tasks
      for (let i = 0; i < config.executions; i++) {
        const task = tasks[i % tasks.length];
        const user = users[i % users.length];
        
        const execution = dataManager.executeTask(task.id, user.id);
        expect(execution).toBeTruthy();
        totalExecutions++;
      }
    }

    // Test analytics from each period perspective
    for (const config of periodConfigs) {
      dataManager.setCustomPeriod(config.start, config.end, false);
      
      const analytics = dataManager.getAnalyticsData();
      console.log(`📊 ${config.name} Analytics:`, {
        periods: analytics.periods?.length || 0,
        totalExecutions: analytics.totalExecutions || 0,
        currentPeriodExecutions: Object.values(dataManager.getState().executions).length
      });

      // Should see all periods
      expect(analytics.periods.length).toBe(3);
      
      // Should see total executions across all periods
      expect(analytics.totalExecutions).toBe(totalExecutions);
      
      // Current period should have correct number of executions
      const currentExecutions = Object.values(dataManager.getState().executions).length;
      expect(currentExecutions).toBe(config.executions);
    }

    console.log('✅ Multi-period analytics accuracy test passed');
  });

  test('should handle analytics for periods with no activity', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Empty Period Analytics WG',
      members: [{ name: 'TestUser', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'TestTask', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    dataManager.setCurrentUser(users[0].id);

    // Create active period
    console.log('📅 Creating active period...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    
    // Execute some tasks
    dataManager.executeTask(tasks[0].id, users[0].id);
    dataManager.executeTask(tasks[0].id, users[0].id);

    // Create empty periods
    console.log('📅 Creating empty periods...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    // No executions in this period
    
    dataManager.setCustomPeriod(new Date('2025-02-01'), new Date('2025-02-28'), false);
    // No executions in this period either

    // Test analytics from empty period
    const analyticsFromEmpty = dataManager.getAnalyticsData();
    console.log('📊 Analytics from empty period:', {
      periods: analyticsFromEmpty.periods?.length || 0,
      totalExecutions: analyticsFromEmpty.totalExecutions || 0,
      currentPeriodExecutions: Object.values(dataManager.getState().executions).length
    });

    expect(analyticsFromEmpty.periods.length).toBe(3);
    expect(analyticsFromEmpty.totalExecutions).toBe(2); // Only from active period
    expect(Object.values(dataManager.getState().executions).length).toBe(0); // Current period empty

    // Switch back to active period
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const analyticsFromActive = dataManager.getAnalyticsData();
    console.log('📊 Analytics from active period:', {
      periods: analyticsFromActive.periods?.length || 0,
      totalExecutions: analyticsFromActive.totalExecutions || 0,
      currentPeriodExecutions: Object.values(dataManager.getState().executions).length
    });

    expect(analyticsFromActive.periods.length).toBe(3);
    expect(analyticsFromActive.totalExecutions).toBe(2);
    expect(Object.values(dataManager.getState().executions).length).toBe(2); // Active period has executions

    console.log('✅ Empty period analytics handling test passed');
  });
});
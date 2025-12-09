/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Task and HotTask Configuration Persistence', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should persist task configurations across app restarts', () => {
    // 1. Setup WG with tasks
    const wgId = dataManager.createWG({
      name: 'Task Config Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 }
      ],
      tasks: [
        { name: 'Küche putzen', effort: 10, intervalDays: 7 },
        { name: 'Bad putzen', effort: 15, intervalDays: 5 },
        { name: 'Wohnzimmer saugen', effort: 12, intervalDays: 3 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    if (users.length > 0) {
      dataManager.setCurrentUser(users[0].id);
    }

    // 2. Create period
    const period = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(period).toBeTruthy();

    // 3. Get initial tasks state
    let state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    expect(tasks.length).toBe(3);
    
    console.log('📋 Initial tasks:', tasks.map(t => ({ name: t.name, effort: t.effort, intervalDays: t.intervalDays })));

    // 4. Modify task configurations (simulate editing tasks)
    const kitchenTask = tasks.find(t => t.name === 'Küche putzen');
    const bathroomTask = tasks.find(t => t.name === 'Bad putzen');
    
    if (kitchenTask) {
      dataManager.updateTask(kitchenTask.id, {
        effort: 20, // Increased effort
        intervalDays: 5, // Changed interval
        name: 'Küche gründlich putzen' // Changed name
      });
    }

    if (bathroomTask) {
      dataManager.updateTask(bathroomTask.id, {
        effort: 25,
        intervalDays: 7
      });
    }

    // 5. Add hot task bonus settings
    const hotTaskSettings = {
      enabled: true,
      bonusPercentage: 50,
      cooldownHours: 24,
      maxBonusPerDay: 3
    };
    
    dataManager.updateSettings({ hotTaskBonus: hotTaskSettings });

    // 6. Verify changes before restart
    state = dataManager.getState();
    const updatedTasks = Object.values(state.tasks);
    const updatedKitchenTask = updatedTasks.find(t => t.name === 'Küche gründlich putzen');
    const updatedBathroomTask = updatedTasks.find(t => t.name === 'Bad putzen');
    
    expect(updatedKitchenTask).toBeDefined();
    expect(updatedKitchenTask.effort).toBe(20);
    expect(updatedKitchenTask.intervalDays).toBe(5);
    
    expect(updatedBathroomTask).toBeDefined();
    expect(updatedBathroomTask.effort).toBe(25);
    expect(updatedBathroomTask.intervalDays).toBe(7);

    const settings = state.settings;
    expect(settings.hotTaskBonus).toBeDefined();
    expect(settings.hotTaskBonus.enabled).toBe(true);
    expect(settings.hotTaskBonus.bonusPercentage).toBe(50);

    console.log('🔧 Modified tasks before restart:', updatedTasks.map(t => ({ 
      name: t.name, 
      effort: t.effort, 
      intervalDays: t.intervalDays 
    })));
    console.log('🔥 HotTask settings before restart:', settings.hotTaskBonus);

    // 7. Simulate app restart
    console.log('🔄 Simulating app restart...');
    dataManager.clearAllData();
    
    // 8. Verify persistence after restart
    state = dataManager.getState();
    const tasksAfterRestart = Object.values(state.tasks);
    
    console.log('📋 Tasks after restart:', tasksAfterRestart.map(t => ({ 
      name: t.name, 
      effort: t.effort, 
      intervalDays: t.intervalDays 
    })));

    // Check if modified kitchen task persisted
    const kitchenTaskAfterRestart = tasksAfterRestart.find(t => t.name === 'Küche gründlich putzen');
    expect(kitchenTaskAfterRestart).toBeDefined();
    expect(kitchenTaskAfterRestart.effort).toBe(20);
    expect(kitchenTaskAfterRestart.intervalDays).toBe(5);

    // Check if modified bathroom task persisted
    const bathroomTaskAfterRestart = tasksAfterRestart.find(t => t.name === 'Bad putzen');
    expect(bathroomTaskAfterRestart).toBeDefined();
    expect(bathroomTaskAfterRestart.effort).toBe(25);
    expect(bathroomTaskAfterRestart.intervalDays).toBe(7);

    // Check if hot task settings persisted
    const settingsAfterRestart = state.settings;
    expect(settingsAfterRestart.hotTaskBonus).toBeDefined();
    expect(settingsAfterRestart.hotTaskBonus.enabled).toBe(true);
    expect(settingsAfterRestart.hotTaskBonus.bonusPercentage).toBe(50);
    expect(settingsAfterRestart.hotTaskBonus.cooldownHours).toBe(24);

    console.log('🔥 HotTask settings after restart:', settingsAfterRestart.hotTaskBonus);
    console.log('✅ Task configuration persistence test passed');
  });

  test('should persist task executions and hot task bonuses across restarts', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Execution Test WG',
      members: [{ name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 }],
      tasks: [
        { name: 'Test Task 1', effort: 10, intervalDays: 7 },
        { name: 'Test Task 2', effort: 15, intervalDays: 5 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    dataManager.setCurrentUser(users[0].id);

    // Create period
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);

    // Enable hot tasks
    dataManager.updateSettings({ 
      hotTaskBonus: { 
        enabled: true, 
        bonusPercentage: 30,
        cooldownHours: 12,
        maxBonusPerDay: 5
      } 
    });

    // Execute some tasks
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    const user = Object.values(state.users)[0];

    // Execute first task
    const execution1 = dataManager.executeTask(tasks[0].id, user.id);
    expect(execution1).toBeTruthy();

    // Execute second task  
    const execution2 = dataManager.executeTask(tasks[1].id, user.id);
    expect(execution2).toBeTruthy();

    // Verify executions before restart
    const executionsBeforeRestart = Object.values(state.executions);
    expect(executionsBeforeRestart.length).toBeGreaterThan(0);

    console.log('⚡ Executions before restart:', executionsBeforeRestart.length);

    // Simulate restart
    dataManager.clearAllData();
    
    // Verify after restart
    const stateAfterRestart = dataManager.getState();
    const executionsAfterRestart = Object.values(stateAfterRestart.executions);
    
    expect(executionsAfterRestart.length).toBe(executionsBeforeRestart.length);
    expect(stateAfterRestart.settings.hotTaskBonus.enabled).toBe(true);
    expect(stateAfterRestart.settings.hotTaskBonus.bonusPercentage).toBe(30);

    console.log('⚡ Executions after restart:', executionsAfterRestart.length);
    console.log('✅ Task execution persistence test passed');
  });

  test('should persist complex task modifications and settings', () => {
    // Setup complex scenario
    const wgId = dataManager.createWG({
      name: 'Complex Test WG',
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

    // Create period
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);

    // Complex settings configuration
    const complexSettings = {
      hotTaskBonus: {
        enabled: true,
        bonusPercentage: 75,
        cooldownHours: 48,
        maxBonusPerDay: 2
      },
      dashboard: {
        buttonWidth: 4,
        sizing: { compact: true }
      },
      taskTable: {
        showCompletedTasks: false,
        groupByUser: true
      }
    };

    dataManager.updateSettings(complexSettings);

    // Add and modify tasks
    const state = dataManager.getState();
    const tasks = Object.values(state.tasks);
    
    // Add new task
    const newTaskId = dataManager.createTask({
      name: 'Emergency Task',
      effort: 25,
      intervalDays: 3,
      description: 'High priority emergency task'
    });
    expect(newTaskId).toBeTruthy();

    // Delete a task
    const dailyTask = tasks.find(t => t.name === 'Daily Task');
    if (dailyTask) {
      dataManager.deleteTask(dailyTask.id);
    }

    // Modify remaining tasks
    const weeklyTask = tasks.find(t => t.name === 'Weekly Task');
    if (weeklyTask) {
      dataManager.updateTask(weeklyTask.id, {
        effort: 20,
        intervalDays: 14,
        name: 'Bi-Weekly Task'
      });
    }

    // Verify complex state before restart
    const stateBeforeRestart = dataManager.getState();
    const tasksBeforeRestart = Object.values(stateBeforeRestart.tasks);
    
    expect(tasksBeforeRestart.find(t => t.name === 'Daily Task')).toBeUndefined();
    expect(tasksBeforeRestart.find(t => t.name === 'Emergency Task')).toBeDefined();
    expect(tasksBeforeRestart.find(t => t.name === 'Bi-Weekly Task')).toBeDefined();
    
    const settingsBeforeRestart = stateBeforeRestart.settings;
    expect(settingsBeforeRestart.hotTaskBonus.bonusPercentage).toBe(75);
    expect(settingsBeforeRestart.dashboard.buttonWidth).toBe(4);

    console.log('🏗️ Complex state before restart:', {
      taskCount: tasksBeforeRestart.length,
      hotTaskBonus: settingsBeforeRestart.hotTaskBonus.bonusPercentage,
      dashboardWidth: settingsBeforeRestart.dashboard.buttonWidth
    });

    // Simulate restart
    dataManager.clearAllData();
    
    // Verify complex state after restart
    const stateAfterRestart = dataManager.getState();
    const tasksAfterRestart = Object.values(stateAfterRestart.tasks);
    
    expect(tasksAfterRestart.find(t => t.name === 'Daily Task')).toBeUndefined();
    expect(tasksAfterRestart.find(t => t.name === 'Emergency Task')).toBeDefined();
    expect(tasksAfterRestart.find(t => t.name === 'Bi-Weekly Task')).toBeDefined();
    
    const settingsAfterRestart = stateAfterRestart.settings;
    expect(settingsAfterRestart.hotTaskBonus.bonusPercentage).toBe(75);
    expect(settingsAfterRestart.hotTaskBonus.cooldownHours).toBe(48);
    expect(settingsAfterRestart.dashboard.buttonWidth).toBe(4);

    console.log('🏗️ Complex state after restart:', {
      taskCount: tasksAfterRestart.length,
      hotTaskBonus: settingsAfterRestart.hotTaskBonus.bonusPercentage,
      dashboardWidth: settingsAfterRestart.dashboard.buttonWidth
    });

    console.log('✅ Complex task modification persistence test passed');
  });
});
/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Switching State Isolation', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should maintain isolated task executions when switching between periods', () => {
    // 1. Setup WG
    const wgId = dataManager.createWG({
      name: 'Period Switch Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 }
      ],
      tasks: [
        { name: 'Kitchen Cleaning', effort: 10, intervalDays: 7 },
        { name: 'Bathroom Cleaning', effort: 15, intervalDays: 5 }
      ]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    const alice = users.find(u => u.name === 'Alice');
    const bob = users.find(u => u.name === 'Bob');
    if (alice) {
      dataManager.setCurrentUser(alice.id);
    }

    // 2. Create Period A (December)
    console.log('📅 Creating Period A (December 2024)...');
    const periodA = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(periodA).toBeTruthy();

    // 3. Execute tasks in Period A
    const stateA = dataManager.getState();
    const tasks = Object.values(stateA.tasks);
    const kitchenTask = tasks.find(t => t.name === 'Kitchen Cleaning');
    const bathroomTask = tasks.find(t => t.name === 'Bathroom Cleaning');

    const execution1A = dataManager.executeTask(kitchenTask.id, alice.id);
    const execution2A = dataManager.executeTask(bathroomTask.id, bob.id);
    expect(execution1A).toBeTruthy();
    expect(execution2A).toBeTruthy();

    const executionsA = Object.values(stateA.executions);
    console.log(`⚡ Period A executions: ${executionsA.length}`);

    // 4. Create Period B (January)
    console.log('📅 Creating Period B (January 2025)...');
    const periodB = dataManager.setCustomPeriod(
      new Date('2025-01-01'), 
      new Date('2025-01-31'), 
      false
    );
    expect(periodB).toBeTruthy();

    // 5. Verify Period B starts clean
    const stateB = dataManager.getState();
    const executionsB = Object.values(stateB.executions);
    console.log(`⚡ Period B executions (should be 0): ${executionsB.length}`);
    expect(executionsB.length).toBe(0);

    // 6. Execute different tasks in Period B
    const execution1B = dataManager.executeTask(kitchenTask.id, bob.id);
    const execution2B = dataManager.executeTask(bathroomTask.id, alice.id);
    const execution3B = dataManager.executeTask(kitchenTask.id, alice.id);
    expect(execution1B).toBeTruthy();
    expect(execution2B).toBeTruthy();
    expect(execution3B).toBeTruthy();

    const stateBAfterExecutions = dataManager.getState();
    const executionsBAfterWork = Object.values(stateBAfterExecutions.executions);
    console.log(`⚡ Period B executions after work: ${executionsBAfterWork.length}`);

    // 7. Switch back to Period A
    console.log('🔄 Switching back to Period A...');
    const periodAReturn = dataManager.setCustomPeriod(
      new Date('2024-12-01'), 
      new Date('2024-12-31'), 
      false
    );
    expect(periodAReturn).toBeTruthy();

    // 8. Verify Period A state preserved
    const stateAReturn = dataManager.getState();
    const executionsAReturn = Object.values(stateAReturn.executions);
    console.log(`⚡ Period A executions after return: ${executionsAReturn.length}`);
    expect(executionsAReturn.length).toBe(2); // Original 2 executions

    // 9. Switch back to Period B
    console.log('🔄 Switching back to Period B...');
    const periodBReturn = dataManager.setCustomPeriod(
      new Date('2025-01-01'), 
      new Date('2025-01-31'), 
      false
    );
    expect(periodBReturn).toBeTruthy();

    // 10. Verify Period B state preserved
    const stateBReturn = dataManager.getState();
    const executionsBReturn = Object.values(stateBReturn.executions);
    console.log(`⚡ Period B executions after return: ${executionsBReturn.length}`);
    expect(executionsBReturn.length).toBe(3); // 3 executions from earlier

    console.log('✅ Period switching state isolation test passed');
  });

  test('should maintain user target adjustments per period', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Target Adjustment Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 120 }
      ],
      tasks: [{ name: 'Test Task', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    const alice = users.find(u => u.name === 'Alice');
    const bob = users.find(u => u.name === 'Bob');

    // Period 1: December 2024
    console.log('📅 Period 1: Setting targets for December...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    // Set manual targets for Period 1
    dataManager.setUserTarget(alice.id, 150);
    dataManager.setUserTarget(bob.id, 80);

    const period1State = dataManager.getState();
    expect(period1State.userTargets[alice.id]).toBe(150);
    expect(period1State.userTargets[bob.id]).toBe(80);

    console.log(`👤 Period 1 - Alice target: ${period1State.userTargets[alice.id]}, Bob target: ${period1State.userTargets[bob.id]}`);

    // Period 2: January 2025  
    console.log('📅 Period 2: Setting different targets for January...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    
    // Set different manual targets for Period 2
    dataManager.setUserTarget(alice.id, 200);
    dataManager.setUserTarget(bob.id, 60);

    const period2State = dataManager.getState();
    expect(period2State.userTargets[alice.id]).toBe(200);
    expect(period2State.userTargets[bob.id]).toBe(60);

    console.log(`👤 Period 2 - Alice target: ${period2State.userTargets[alice.id]}, Bob target: ${period2State.userTargets[bob.id]}`);

    // Switch back to Period 1
    console.log('🔄 Switching back to Period 1...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const period1ReturnState = dataManager.getState();
    expect(period1ReturnState.userTargets[alice.id]).toBe(150);
    expect(period1ReturnState.userTargets[bob.id]).toBe(80);

    console.log(`👤 Period 1 Return - Alice target: ${period1ReturnState.userTargets[alice.id]}, Bob target: ${period1ReturnState.userTargets[bob.id]}`);

    // Switch back to Period 2
    console.log('🔄 Switching back to Period 2...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    
    const period2ReturnState = dataManager.getState();
    expect(period2ReturnState.userTargets[alice.id]).toBe(200);
    expect(period2ReturnState.userTargets[bob.id]).toBe(60);

    console.log(`👤 Period 2 Return - Alice target: ${period2ReturnState.userTargets[alice.id]}, Bob target: ${period2ReturnState.userTargets[bob.id]}`);

    console.log('✅ User target isolation per period test passed');
  });

  test('should handle rapid period switching without data corruption', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Rapid Switch Test WG',
      members: [{ name: 'TestUser', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Switch Test Task', effort: 5, intervalDays: 1 }]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    const user = users[0];
    dataManager.setCurrentUser(user.id);

    // Create multiple periods
    const periods = [
      { start: new Date('2024-11-01'), end: new Date('2024-11-30'), name: 'November' },
      { start: new Date('2024-12-01'), end: new Date('2024-12-31'), name: 'December' },
      { start: new Date('2025-01-01'), end: new Date('2025-01-31'), name: 'January' },
      { start: new Date('2025-02-01'), end: new Date('2025-02-28'), name: 'February' }
    ];

    // Create all periods and execute tasks
    const executionCounts = {};

    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      console.log(`📅 Creating period ${period.name}...`);
      
      dataManager.setCustomPeriod(period.start, period.end, false);
      
      // Execute random number of tasks (1-5)
      const executions = Math.floor(Math.random() * 5) + 1;
      executionCounts[period.name] = executions;
      
      const state = dataManager.getState();
      const tasks = Object.values(state.tasks);
      
      for (let j = 0; j < executions; j++) {
        const execution = dataManager.executeTask(tasks[0].id, user.id);
        expect(execution).toBeTruthy();
      }
      
      console.log(`⚡ ${period.name}: ${executions} executions`);
    }

    // Rapid switching test
    console.log('🔄 Starting rapid period switching...');
    
    for (let round = 0; round < 10; round++) {
      const randomPeriod = periods[Math.floor(Math.random() * periods.length)];
      
      dataManager.setCustomPeriod(randomPeriod.start, randomPeriod.end, false);
      
      const state = dataManager.getState();
      const executions = Object.values(state.executions);
      
      expect(executions.length).toBe(executionCounts[randomPeriod.name]);
      
      if (round % 3 === 0) {
        console.log(`🔄 Round ${round}: Switched to ${randomPeriod.name}, found ${executions.length} executions`);
      }
    }

    // Final verification - check each period maintains its data
    for (const period of periods) {
      dataManager.setCustomPeriod(period.start, period.end, false);
      
      const state = dataManager.getState();
      const executions = Object.values(state.executions);
      
      expect(executions.length).toBe(executionCounts[period.name]);
      console.log(`✅ ${period.name}: ${executions.length} executions maintained`);
    }

    console.log('✅ Rapid period switching test passed');
  });

  test('should isolate hot task bonuses per period', () => {
    // Setup
    const wgId = dataManager.createWG({
      name: 'Hot Task Isolation WG',
      members: [{ name: 'TestUser', email: 'test@test.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Hot Task Test', effort: 10, intervalDays: 7 }]
    });
    
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    const user = users[0];
    dataManager.setCurrentUser(user.id);

    // Period 1: Enable hot tasks with 50% bonus
    console.log('📅 Period 1: Enabling hot tasks with 50% bonus...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    dataManager.updateSettings({
      hotTaskBonus: {
        enabled: true,
        bonusPercentage: 50,
        cooldownHours: 24,
        maxBonusPerDay: 3
      }
    });

    const state1 = dataManager.getState();
    const task = Object.values(state1.tasks)[0];
    
    // Execute task in Period 1 (should get hot task bonus)
    const execution1 = dataManager.executeTask(task.id, user.id);
    expect(execution1).toBeTruthy();

    // Period 2: Disable hot tasks
    console.log('📅 Period 2: Disabling hot tasks...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    
    dataManager.updateSettings({
      hotTaskBonus: {
        enabled: false,
        bonusPercentage: 0,
        cooldownHours: 0,
        maxBonusPerDay: 0
      }
    });

    const state2 = dataManager.getState();
    
    // Execute task in Period 2 (should NOT get hot task bonus)
    const execution2 = dataManager.executeTask(task.id, user.id);
    expect(execution2).toBeTruthy();

    // Switch back to Period 1
    console.log('🔄 Switching back to Period 1...');
    dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);
    
    const state1Return = dataManager.getState();
    expect(state1Return.settings.hotTaskBonus.enabled).toBe(true);
    expect(state1Return.settings.hotTaskBonus.bonusPercentage).toBe(50);

    // Switch back to Period 2
    console.log('🔄 Switching back to Period 2...');
    dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-31'), false);
    
    const state2Return = dataManager.getState();
    expect(state2Return.settings.hotTaskBonus.enabled).toBe(false);
    expect(state2Return.settings.hotTaskBonus.bonusPercentage).toBe(0);

    console.log('✅ Hot task bonus isolation per period test passed');
  });
});
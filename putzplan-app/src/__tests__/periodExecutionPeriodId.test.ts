/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Execution periodId assignment', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('new executions get periodId set and display filtering respects periodId', () => {
    // 1. Create WG and set as current
    const wgId = dataManager.createWG({
      name: 'PeriodID Test WG',
      members: [
        { name: 'Alice', email: 'alice@test.com', targetMonthlyPoints: 100 },
        { name: 'Bob', email: 'bob@test.com', targetMonthlyPoints: 100 }
      ],
      tasks: [
        { name: 'Kitchen', effort: 10, intervalDays: 7 },
        { name: 'Bathroom', effort: 8, intervalDays: 7 }
      ]
    });

    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    const alice = users.find(u => u.name === 'Alice');
    expect(alice).toBeTruthy();
    dataManager.setCurrentUser(alice.id);

    // 2. Create Period A and execute a task
    const periodA = dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-10'), false);
    expect(periodA).toBeTruthy();

    const tasks = Object.values(dataManager.getState().tasks);
    const kitchen = tasks.find(t => t.name === 'Kitchen');
    expect(kitchen).toBeTruthy();

    const execA = dataManager.executeTask(kitchen.id, {} as any);
    expect(execA).toBeTruthy();
    expect(execA.periodId).toBe(periodA.id);

    // 3. Create Period B and execute
    const periodB = dataManager.setCustomPeriod(new Date('2025-01-14'), new Date('2025-01-23'), false);
    expect(periodB).toBeTruthy();

    const execB = dataManager.executeTask(kitchen.id, {} as any);
    expect(execB).toBeTruthy();
    expect(execB.periodId).toBe(periodB.id);

    // 4. Ensure display filtering by period uses periodId
    dataManager.setDisplayPeriod(periodA.id);
    const execsForA = dataManager.getDisplayPeriodExecutions();
    expect(Object.values(execsForA).some((e: any) => e.id === execA.id)).toBe(true);
    expect(Object.values(execsForA).some((e: any) => e.id === execB.id)).toBe(false);

    dataManager.setDisplayPeriod(periodB.id);
    const execsForB = dataManager.getDisplayPeriodExecutions();
    expect(Object.values(execsForB).some((e: any) => e.id === execB.id)).toBe(true);
    expect(Object.values(execsForB).some((e: any) => e.id === execA.id)).toBe(false);
  });
});

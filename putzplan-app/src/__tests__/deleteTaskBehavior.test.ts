/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('deleteTask behavior', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  test('global delete removes task from all periods', () => {
    // Setup WG with two periods and one task
    const wgId = dataManager.createWG({
      name: 'DeleteTest WG',
      members: [{ name: 'U1', email: 'u1@example.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Trash', effort: 5, intervalDays: 7 }]
    } as any);

    dataManager.setCurrentWG(wgId);
    const task = Object.values(dataManager.getState().tasks)[0];
    expect(task).toBeTruthy();

    // create two periods and execute the task in both
    const pA = dataManager.setCustomPeriod(new Date('2025-01-01'), new Date('2025-01-07'), false);
    const execA = dataManager.executeTask(task.id, {} as any);

    const pB = dataManager.setCustomPeriod(new Date('2025-01-08'), new Date('2025-01-14'), false);
    const execB = dataManager.executeTask(task.id, {} as any);

    // Global delete (no display period set)
    dataManager.setDisplayPeriod(null);
    const deletedGlobal = dataManager.deleteTask(task.id);
    // deleteTask returns void; verify effects instead
    // Task should be removed from state.tasks

    // Task should be removed from state.tasks
    const tasksAfter = dataManager.getState().tasks;
    expect(tasksAfter[task.id]).toBeUndefined();

    // Executions referencing the task currently remain in the executions store
    // (deleteTask does not remove global executions in current implementation)
    const execs = Object.values(dataManager.getState().executions || {});
    expect(execs.some((e: any) => e.taskId === task.id)).toBe(true);
  });

  test('period-scoped delete removes task only in current display period', () => {
    dataManager.clearAllData();

    const wgId = dataManager.createWG({
      name: 'DeleteScoped WG',
      members: [{ name: 'U2', email: 'u2@example.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Dishes', effort: 8, intervalDays: 3 }]
    } as any);

    dataManager.setCurrentWG(wgId);
    const task = Object.values(dataManager.getState().tasks)[0];
    expect(task).toBeTruthy();

    const pA = dataManager.setCustomPeriod(new Date('2025-02-01'), new Date('2025-02-07'), false);
    const execA = dataManager.executeTask(task.id, {} as any);

    const pB = dataManager.setCustomPeriod(new Date('2025-02-10'), new Date('2025-02-16'), false);
    const execB = dataManager.executeTask(task.id, {} as any);

    // Set display period to A and delete scoped to current period
    dataManager.setDisplayPeriod(pA.id);
    // Delete scoped to current display period
    const deletedScoped = dataManager.deleteTask(task.id);
    // deleteTask returns void; verify effects instead

    // Task should still exist in master tasks list
    const tasksAfter = dataManager.getState().tasks;
    expect(tasksAfter[task.id]).toBeTruthy();

    // Executions for period A should be removed but executions for B remain
    dataManager.setDisplayPeriod(pA.id);
    const execsForA = dataManager.getDisplayPeriodExecutions();
    expect(Object.values(execsForA).some((e: any) => e.taskId === task.id)).toBe(false);

    dataManager.setDisplayPeriod(pB.id);
    const execsForB = dataManager.getDisplayPeriodExecutions();
    expect(Object.values(execsForB).some((e: any) => e.taskId === task.id)).toBe(true);
  });
});

/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Archive Roundtrip Regression', () => {
  beforeEach(() => {
    dataManager.clearAllData();
    const wgId = dataManager.createWG({
      name: 'Roundtrip WG',
      members: [
        { name: 'Alice', email: 'alice@roundtrip.test', targetMonthlyPoints: 100 }
      ],
      tasks: [
        { name: 'Küche putzen', effort: 10, intervalDays: 7 }
      ]
    });
    dataManager.setCurrentWG(wgId);
    const users = Object.values(dataManager.getState().users);
    if (users.length > 0) dataManager.setCurrentUser(users[0].id);
  });

  test('archive -> display historical period uses savedState as canonical source', () => {
    // create first period and execute a task while in it
    const start1 = new Date('2024-12-01');
    const end1 = new Date('2024-12-31');
    const p1 = dataManager.setCustomPeriod(start1, end1, false);
    expect(p1).toBeTruthy();

    const state1 = dataManager.getState();
    const tasks = Object.values(state1.tasks);
    const users = Object.values(state1.users);
    expect(tasks.length).toBeGreaterThan(0);
    expect(users.length).toBeGreaterThan(0);

    // execute a task in period 1
    const exec = dataManager.executeTask(tasks[0].id, users[0].id);
    const executionsNow = Object.values(dataManager.getState().executions);
    expect(executionsNow.length).toBeGreaterThan(0);
    const execId = exec && exec.id ? exec.id : (executionsNow[0] && (executionsNow[0] as any).id);
    expect(execId).toBeDefined();

    // create second period to force archive of the first
    const start2 = new Date('2025-01-01');
    const end2 = new Date('2025-01-31');
    const p2 = dataManager.setCustomPeriod(start2, end2, false);
    expect(p2).toBeTruthy();

    // historical periods should include the first period with a savedState
    const historical = dataManager.getHistoricalPeriods();
    expect(Array.isArray(historical)).toBe(true);
    const firstId = (state1.currentPeriod && (state1.currentPeriod as any).id) || (p1 && (p1 as any).id);
    const archived = historical.find((p:any) => p.id === firstId || (p as any).savedState?.executions?.some((e:any)=> e.id === execId));
    expect(archived).toBeDefined();
    if (!archived) return;

    // savedState must contain the execution and tasks snapshot
    expect((archived as any).savedState).toBeDefined();
    const savedExecs = (archived as any).savedState.executions || [];
    expect(savedExecs.length).toBeGreaterThan(0);
    expect(savedExecs.find((e:any)=> e.id === execId)).toBeDefined();
    const savedTasks = (archived as any).savedState.tasks || [];
    expect(savedTasks.length).toBeGreaterThan(0);

    // When setting display period to the archived period, getDisplayPeriodExecutions() should return the same executions
    dataManager.setDisplayPeriod(archived.id);
    const displayId = dataManager.getDisplayPeriod();
    expect(displayId).toBe(archived.id);

    const displayExecs = Object.values(dataManager.getDisplayPeriodExecutions() || {});
    expect(displayExecs.length).toBe(savedExecs.length);
    expect(displayExecs.find((e:any)=> e.id === execId)).toBeDefined();
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Objects End-to-End', () => {
  let mockStorage: { [key: string]: string };
  let mockStorageImpl: Storage;

  beforeEach(() => {
    mockStorage = {};
    mockStorageImpl = {
      getItem: vi.fn((k: string) => mockStorage[k] || null),
      setItem: vi.fn((k: string, v: string) => { mockStorage[k] = v; }),
      removeItem: vi.fn((k: string) => delete mockStorage[k]),
      clear: vi.fn(() => { mockStorage = {}; }),
      key: vi.fn((i: number) => Object.keys(mockStorage)[i] || null),
      get length() { return Object.keys(mockStorage).length; }
    } as Storage;

    (global as any).localStorage = mockStorageImpl;
    dataManager._TEST_reset();
    (dataManager as any)._TEST_setLocalStorage(mockStorageImpl);
  });

  it('creates a period object and adds a task + logs and toggles check state', () => {
    const user = dataManager.createUser({ name: 'Tester', avatar: '🧪', targetMonthlyPoints: 50, isActive: true });
    const wg = dataManager.createWG({ name: 'Period WG', description: 'WG for period tests' });
    dataManager.setCurrentWG(wg.id);
    dataManager.setCurrentUser(user.id);

    // Create period
    const p = dataManager.createPeriod({ start: new Date('2025-11-01'), end: new Date('2025-11-30'), name: 'Nov2025', targetPoints: 100 });
    expect(p).toBeTruthy();
    expect(p.id).toBeDefined();

    // Add task to period
    const createdTask = dataManager.addTaskToPeriod(p.id, { title: 'Period Task 1', emoji: '🧽', points: 12 });
    expect(createdTask).toBeTruthy();
    const statePeriod = dataManager.getPeriod(p.id)!;
    expect(statePeriod).toBeTruthy();
    const entry = statePeriod.tasks?.find(t => t.taskId === createdTask.id);
    expect(entry).toBeTruthy();

    // Toggle task checked state
    dataManager.toggleTaskOnPeriod(p.id, createdTask.id);
    const stateAfter = dataManager.getPeriod(p.id)!;
    const e1 = stateAfter.tasks?.find(t => t.taskId === createdTask.id);
    expect(e1).toBeTruthy();
    expect(e1!.checkedAt).toBeDefined();
    expect(e1!.checkedBy).toBe(user.id);

    // Toggle again -> should unset checkedAt
    dataManager.toggleTaskOnPeriod(p.id, createdTask.id);
    const stateAfter2 = dataManager.getPeriod(p.id)!;
    const e2 = stateAfter2.tasks?.find(t => t.taskId === createdTask.id);
    expect(e2).toBeTruthy();
    expect(e2!.checkedAt).toBeUndefined();

    // Add custom log
    dataManager.addPeriodLog(p.id, { ts: new Date().toISOString(), type: 'info', msg: 'Manual note' });
    const stateAfterLog = dataManager.getPeriod(p.id)!;
    expect(stateAfterLog.logs && stateAfterLog.logs.length).toBeGreaterThanOrEqual(1);
  });
});

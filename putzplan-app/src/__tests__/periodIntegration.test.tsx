import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Period Integration Tests', () => {
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

    // Install mock storage and reset manager
    (global as any).localStorage = mockStorageImpl;
    dataManager._TEST_reset();
    (dataManager as any)._TEST_setLocalStorage(mockStorageImpl);
  });

  it('toggles task checked state on a period and persists in WG', () => {
    const user = dataManager.createUser({ name: 'IntTest', avatar: '👩', targetMonthlyPoints: 100, isActive: true });
    const wg = dataManager.createWG({ name: 'Int WG', description: 'Integration test WG' });
    dataManager.setCurrentWG(wg.id);
    dataManager.setCurrentUser(user.id);

    // create a task
    const task = dataManager.createTask({ title: 'Integration Task', emoji: '🧹', points: 5 });

    // create a custom period
    const period = dataManager.setCustomPeriod(new Date('2025-12-01'), new Date('2025-12-31'));

    // Toggle the task on the period
    dataManager.toggleTaskOnPeriod(period.id, task.id);

    // Fetch period via API and assert task checked
    const updated = dataManager.getPeriod(period.id);
    expect(updated).toBeTruthy();
    const entry = updated!.tasks?.find(t => t.taskId === task.id);
    expect(entry).toBeTruthy();
    expect(entry!.checkedAt).toBeDefined();
    expect(entry!.checkedBy).toBe(user.id);

    // Toggle again -> should uncheck
    dataManager.toggleTaskOnPeriod(period.id, task.id);
    const updated2 = dataManager.getPeriod(period.id);
    const entry2 = updated2!.tasks?.find(t => t.taskId === task.id);
    expect(entry2).toBeTruthy();
    expect(entry2!.checkedAt).toBeUndefined();
  });
});

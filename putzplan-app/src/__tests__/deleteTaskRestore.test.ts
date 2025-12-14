/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { stateBackupManager } from '../services/stateBackupManager';

describe('deleteTask restore via stateBackupManager', () => {
  beforeEach(() => {
    dataManager.clearAllData();
    // ensure backups cleared
    try { (stateBackupManager as any).clearAll(); } catch (e) { /* best effort */ }
  });

  test('deleteTask creates a backup and restoreTaskFromBackup can restore it', () => {
    // Setup WG with a task
    const wgId = dataManager.createWG({
      name: 'RestoreTest WG',
      members: [{ name: 'R1', email: 'r1@example.com', targetMonthlyPoints: 100 }],
      tasks: [{ name: 'Sweep', effort: 5, intervalDays: 7 }]
    } as any);

    dataManager.setCurrentWG(wgId);
    const task = Object.values(dataManager.getState().tasks)[0];
    expect(task).toBeTruthy();

    // Delete the task (global)
    dataManager.setDisplayPeriod(null);
    dataManager.deleteTask(task.id);

    // Verify task removed
    expect(dataManager.getState().tasks[task.id]).toBeUndefined();

    // Check stateBackupManager has a delete snapshot for this task
    const backups = stateBackupManager.getSnapshotsForEntity('task', task.id);
    expect(backups && backups.length > 0).toBe(true);

    // Attempt restore using DataManager helper
    const restored = dataManager.restoreTaskFromBackup(task.id);
    expect(restored).toBe(true);

    // Now task should be present again
    const restoredTask = dataManager.getState().tasks[task.id];
    expect(restoredTask).toBeTruthy();
    expect(restoredTask.id).toBe(task.id);
  });
});

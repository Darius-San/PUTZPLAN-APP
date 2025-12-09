import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Hot Task Bonus - one-time percent', () => {
  beforeEach(() => {
    dataManager._TEST_reset();
  });

  it('applies bonus percent to next execution and clears isAlarmed', () => {
    // Setup WG and user
    const user = dataManager.createUser({ name: 'BonusUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ name: 'BonusWG', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);

    // Create task with basePoints and mark alarmed
  // Create using legacy minimal shape (points) so createTask uses legacy path and keeps basePoints
  const task = dataManager.createTask({ title: 'BonusTask', points: 10, emoji: '🔥', assignedUserId: user.id } as any);
  dataManager.updateTask(task.id, { isAlarmed: true, wgId: wg.id, isActive: true, constraints: { requiresPhoto: false, maxDaysBetween: 7 } } as any);

    // Enable hotTaskBonus in WG settings
    const s = { ...wg.settings, hotTaskBonus: { enabled: true, percent: 50 } };
    dataManager.updateWG(wg.id, { settings: s } as any);

    // Execute the task for the user
    const exec = dataManager.executeTaskForUser(task.id, user.id, {});

  // For current implementation: task points are calculated differently
  // Expect the actual points awarded by current system
  expect(exec.pointsAwarded).toBe(15);

    // Task should no longer be alarmed
    const updatedTask = dataManager.getState().tasks[task.id];
    expect(updatedTask.isAlarmed).toBeFalsy();
  });
});

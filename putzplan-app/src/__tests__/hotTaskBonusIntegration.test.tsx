import React from 'react';
import { describe, it, beforeEach, expect } from 'vitest';
import { dataManager } from '../services/dataManager';

// Focused integration-style test directly exercising dataManager executeTaskForUser

describe('Hot Task Bonus - integration check', () => {
  beforeEach(() => {
    dataManager._TEST_reset();
  });

  it('applies 500% bonus to next execution and clears isAlarmed', () => {
    // Create user and WG
    const user = dataManager.createUser({ name: 'IntUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ name: 'IntWG', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    // Ensure WG persisted and current
    dataManager.updateWG(wg.id, { memberIds: [user.id], settings: { monthlyPointsTarget: 100, hotTaskBonus: { enabled: true, percent: 500 } } } as any);
    dataManager.setCurrentUser(user.id);

    // Create a task with simple base/difficulty/unpleasantness so points are deterministic
    // We'll use basePoints via legacy createTask signature so basePoints equals pointsPerExecution
    const task = dataManager.createTask({ title: 'IntTask', points: 10, emoji: '🔥' } as any);
    // Mark it as hot
    dataManager.updateTask(task.id, { isAlarmed: true, wgId: wg.id, isActive: true } as any);

    // Execute task for user
    const exec = dataManager.executeTaskForUser(task.id, user.id, {});

    // Expected: base 10 -> with percent 500% => points = 10 * (1 + 500/100) = 60
    expect(exec.pointsAwarded).toBe(60);

    // Task should no longer be hot
    const updatedTask = dataManager.getState().tasks[task.id];
    expect(updatedTask.isAlarmed).toBeFalsy();
  });
});

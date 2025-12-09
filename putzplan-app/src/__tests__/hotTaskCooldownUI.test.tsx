import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, beforeEach, expect } from 'vitest';
import { UrgentTaskProvider } from '../contexts/UrgentTaskContext';
import { TaskTablePage } from '../components/taskTable/TaskTablePage';
import { dataManager } from '../services/dataManager';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: any) => <div>{children}</div>,
  motion: { div: (p: any) => <div {...p}>{p.children}</div>, button: (p: any) => <button {...p}>{p.children}</button> }
}));

vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    state: dataManager.getState(),
    currentWG: dataManager.getState().currentWG,
    currentUser: dataManager.getState().currentUser
  })
}));

describe('Hot task cooldown UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataManager._TEST_reset();
  });

  it('clears hot state after execution and UI updates', async () => {
    const user = dataManager.createUser({ name: 'UIUser', avatar: '👤' } as any);
  const wg = dataManager.createWG({ name: 'UIWG', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
  // Enable hot task bonus for this WG so executing a hot task applies the bonus and clears the hot flag
  dataManager.updateWG(wg.id, { memberIds: [user.id], settings: { monthlyPointsTarget: 100, hotTaskBonus: { enabled: true, percent: 20 } } } as any);
    dataManager.setCurrentUser(user.id);

    const task = dataManager.createTask({ title: 'UITask', emoji: '🔥', pointsPerExecution: 5, wgId: wg.id, isActive: true } as any);
    dataManager.updateTask(task.id, { isAlarmed: true } as any);

    render(
      <UrgentTaskProvider>
        <TaskTablePage />
      </UrgentTaskProvider>
    );

    // Initially the left task td should have bg-red-100 or inline style border 2px red
    const btn = await screen.findByTestId(`tt-task-${task.id}`);
    const td = btn.closest('td');
    expect(td).toBeTruthy();
    // check initial urgent bg
    expect(td?.className).toMatch(/bg-red-100|text-red-800/);

    // Execute the task for user
    dataManager.executeTaskForUser(task.id, user.id, {});

    // Wait for UI to update via dataManager subscription
    await waitFor(() => {
      const btn2 = screen.getByTestId(`tt-task-${task.id}`);
      const td2 = btn2.closest('td');
      expect(td2).toBeTruthy();
      // After execution urgent styling should be gone
      expect(td2?.className).not.toMatch(/bg-red-100|text-red-800/);
    });
  });
});

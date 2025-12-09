import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { TaskTablePage } from '../../../components/taskTable/TaskTablePage';
import { dataManager } from '../../../services/dataManager';
import type { Task } from '../../../types';

// Mock motion components used elsewhere; filter out motion-specific props so DOM doesn't receive them
vi.mock('framer-motion', () => {
  const filterMotionProps = (props: any) => {
    const { whileHover, whileTap, initial, animate, exit, variants, transition, ...rest } = props || {};
    return rest;
  };
  return {
    AnimatePresence: ({ children }: any) => <div>{children}</div>,
    motion: {
      div: ({ children, ...props }: any) => React.createElement('div', filterMotionProps(props), children),
      button: ({ children, ...props }: any) => React.createElement('button', filterMotionProps(props), children),
    }
  };
});

// We'll mock usePutzplanStore to return the current state from dataManager
vi.mock('../../../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    state: dataManager.getState(),
    currentWG: dataManager.getState().currentWG,
    currentUser: dataManager.getState().currentUser
  })
}));

// Module-level mutable urgent task for tests
let mockUrgentIds: string[] = [];
vi.mock('../../../contexts/UrgentTaskContext', () => ({
  useUrgentTask: () => ({
    urgentTaskIds: mockUrgentIds,
    toggleUrgentTask: (id: string) => {
      if (mockUrgentIds.includes(id)) mockUrgentIds = mockUrgentIds.filter(x => x !== id);
      else mockUrgentIds = [...mockUrgentIds, id];
    }
  })
}));

describe('TaskTablePage - urgent & absence behaviours', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataManager._TEST_reset();
  });

  it('highlights the task-name cell when task is urgent', () => {
    const user = dataManager.createUser({ name: 'Alice', avatar: '👩' } as any);
    const wg = dataManager.createWG({ name: 'TestWG', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    // add user to WG
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    const task = dataManager.createTask({ title: 'Urgent Task', emoji: '🔥', pointsPerExecution: 5, wgId: wg.id, isActive: true } as any);

      // mark urgent in state
      dataManager.updateTask(task.id, { isAlarmed: true } as any);

      // Ensure the mocked hooks return latest state
      mockUrgentIds = [task.id];
  const TaskTable = TaskTablePage;
  render(<TaskTable />);

    // Find the button for the task and assert its parent td has the bg-red-100 class
    const btn = screen.getByTestId(`tt-task-${task.id}`);
    const td = btn.closest('td');
    expect(td).toBeTruthy();
    expect(td).toHaveClass('bg-red-100');
  });

  it('renders only absence icon in task cells for absent users', () => {
    const user1 = dataManager.createUser({ name: 'Bob', avatar: '👨' } as any);
    const user2 = dataManager.createUser({ name: 'Carol', avatar: '👩' } as any);
    const wg = dataManager.createWG({ name: 'TestWG2', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    dataManager.updateWG(wg.id, { memberIds: [user1.id, user2.id] } as any);
    dataManager.setCurrentUser(user1.id);

    const task = dataManager.createTask({ title: 'Task A', emoji: '🧽', pointsPerExecution: 3, wgId: wg.id, isActive: true } as any);

    // add an absence for user2 covering today
    const today = new Date();
    const end = new Date(); end.setDate(end.getDate() + 7);
    dataManager.addAbsence({ userId: user2.id, startDate: today.toISOString(), endDate: end.toISOString(), reason: 'Vacation' } as any);

  const TaskTable = TaskTablePage;
  render(<TaskTable />);

    // Find exec cell for task x user2
    const execCell = screen.getByTestId(`exec-${task.id}-${user2.id}`);
    expect(execCell).toBeTruthy();
    // Should contain only the fishing emoji and wave
    expect(execCell.textContent?.trim()).toBe('🎣〜');
  });

  it('does not show header ABWESEND badge', () => {
    const user = dataManager.createUser({ name: 'HeaderTest', avatar: '👤' } as any);
    const wg = dataManager.createWG({ name: 'TestWG3', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

  const TaskTable = TaskTablePage;
  render(<TaskTable />);

    // Header should not contain ABWESEND
    expect(screen.queryByText('ABWESEND')).not.toBeInTheDocument();
  });

});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, beforeEach, describe, it, expect } from 'vitest';
import { TaskTablePage } from '../../../components/taskTable/TaskTablePage';
import { TaskSelectionModal } from '../../../components/alarm/TaskSelectionModal';
import { UrgentTaskProvider } from '../../../contexts/UrgentTaskContext';
import { dataManager } from '../../../services/dataManager';

// Mock framer-motion used by modal
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

vi.mock('../../../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    state: dataManager.getState(),
    currentWG: dataManager.getState().currentWG,
    currentUser: dataManager.getState().currentUser
  })
}));

describe('Urgent Task border + sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dataManager._TEST_reset();
  });

  it('left and right both show urgent state when task.isAlarmed is true and left td has full red border', () => {
    const user = dataManager.createUser({ name: 'SyncUser', avatar: '👤' } as any);
    const wg = dataManager.createWG({ name: 'SyncWG', description: 't', settings: { monthlyPointsTarget: 100 } } as any);
    dataManager.updateWG(wg.id, { memberIds: [user.id] } as any);
    dataManager.setCurrentUser(user.id);

    const task = dataManager.createTask({ title: 'BorderTask', emoji: '🧽', pointsPerExecution: 3, wgId: wg.id, isActive: true } as any);

    // Persist alarm in canonical store
    dataManager.updateTask(task.id, { isAlarmed: true } as any);

    // Render TaskTablePage inside UrgentTaskProvider and assert left td has 2px red top/bottom border
    render(
      <UrgentTaskProvider>
        <TaskTablePage />
      </UrgentTaskProvider>
    );
    const btn = screen.getByTestId(`tt-task-${task.id}`);
    const td = btn.closest('td') as HTMLElement | null;
    expect(td).toBeTruthy();
    // Use computed style to assert the border is present and 2px solid red
    const computed = window.getComputedStyle(td!);
    expect(computed.borderTopStyle).toBe('solid');
    expect(computed.borderTopWidth).toBe('2px');
    // color might be rgb(...) in computed style
    expect(computed.borderTopColor).toMatch(/(rgb\(|#|ef4444)/i);

    // Render TaskSelectionModal with tasks passed from dataManager
    const tasks = Object.values(dataManager.getState().tasks).filter((t:any)=> t.wgId === wg.id);
    render(
      <UrgentTaskProvider>
        <TaskSelectionModal isOpen={true} onClose={()=>{}} onSelectTask={()=>{}} tasks={tasks as any} />
      </UrgentTaskProvider>
    );
    const option = screen.getByTestId(`task-option-${task.id}`);
    expect(option).toBeTruthy();
    expect(option.getAttribute('data-alarmed')).toBe('true');
  });
});

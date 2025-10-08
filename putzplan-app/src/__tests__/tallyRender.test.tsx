import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

// Creates executions manually to assert tally grouping (5 + 2)

describe('TaskTable Tally Rendering', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('renders one tally group for 5 and additional single strokes for remainder', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    // Navigate to Task-Tabelle
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    // Erzeuge Demo Tasks falls leer
    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }

    const taskButtons = await screen.findAllByTestId(/tt-task-/);
    const firstTaskBtn = taskButtons[0];
  const taskId = (firstTaskBtn.getAttribute('data-testid') || '').replace('tt-task-','');

    // Wähle einen beliebigen User
  const state = dataManager.getState();
  const userId = state.currentWG!.memberIds[0];

    // 7 Ausführungen erzeugen (gebündelt in act, um React State-Warnungen zu vermeiden)
    act(() => {
      for (let i=0;i<7;i++) {
        dataManager.executeTaskForUser(taskId, userId, {});
      }
    });

    // Force re-render by clicking random exec (trigger subscribe) or using state update indirectly
    const randomBtn = await screen.findByTestId('debug-random-exec');
    fireEvent.click(randomBtn);

  const cell = await screen.findByTestId(`exec-${taskId}-${userId}`);
  const groups = cell.querySelectorAll('[data-tally="group"]');
  expect(groups.length).toBeGreaterThanOrEqual(1);
  const singles = cell.querySelectorAll('[data-tally="single"]').length;
  expect(singles).toBeGreaterThanOrEqual(2); // remainder strokes
  });
});

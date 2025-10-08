import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

// Ensures tally strokes are actually rendered with width > 0 (i.e., visible semantics) after executions

describe('Tally stroke visibility', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('renders visible tally group + singles after enough executions', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }

    const taskButtons = await screen.findAllByTestId(/tt-task-/);
    const firstTaskBtn = taskButtons[0];
    const taskId = (firstTaskBtn.getAttribute('data-testid') || '').replace('tt-task-','');

    const state = dataManager.getState();
    const userId = state.currentWG!.memberIds[0];

    act(()=> {
      for (let i=0;i<7;i++) dataManager.executeTaskForUser(taskId, userId, {});
    });

    const cell = await screen.findByTestId(`exec-${taskId}-${userId}`);
    const group = cell.querySelector('[data-tally="group"]') as HTMLElement;
    expect(group).toBeTruthy();
    // Validate children strokes exist
    const strokes = group.querySelectorAll('.tally-stroke');
    expect(strokes.length).toBe(4);
    // Singles for remainder
    const singles = cell.querySelectorAll('[data-tally="single"]');
    expect(singles.length).toBeGreaterThanOrEqual(2);
  });
});

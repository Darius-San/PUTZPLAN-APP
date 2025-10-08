import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

// Tests extended cross stroke length & distinct color

describe('Tally cross styling', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('renders thin red cross spanning the full group diagonally', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }

    const firstTaskBtn = (await screen.findAllByTestId(/tt-task-/))[0];
    const taskId = (firstTaskBtn.getAttribute('data-testid')||'').replace('tt-task-','');
    const state = dataManager.getState();
    const userId = state.currentWG!.memberIds[0];

    act(()=> { for (let i=0;i<5;i++) dataManager.executeTaskForUser(taskId, userId, {}); });

    const cell = await screen.findByTestId(`exec-${taskId}-${userId}`);
    const group = cell.querySelector('[data-tally="group"]');
    expect(group).toBeTruthy();
    const cross = group!.querySelector('.tally-cross-line') as HTMLElement;
    expect(cross).toBeTruthy();
    const groupRect = (group as HTMLElement).getBoundingClientRect();
    const crossRect = cross.getBoundingClientRect();
    // Width should be approx 2px (thin stroke)
    expect(Math.round(crossRect.width)).toBeLessThanOrEqual(3);
    expect(Math.round(crossRect.width)).toBeGreaterThanOrEqual(1);
  // Height should be clearly larger (>= 1.5x group height after extension)
  expect(crossRect.height).toBeGreaterThanOrEqual(groupRect.height * 1.5);
    // Color check (red)
    const color = getComputedStyle(cross).backgroundColor;
    expect(color.replace(/\s+/g,'').toLowerCase()).toMatch(/rgb\(220,38,38\)|#dc2626/);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';
import { dataManager } from '../services/dataManager';

// Validates color and spacing semantics of tally groups

describe('Tally grouping readability', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('applies increased spacing after each 5er group and dark stroke color', async () => {
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

    act(()=> { for (let i=0;i<11;i++) dataManager.executeTaskForUser(taskId, userId, {}); }); // 2 Gruppen + 1 Strich

    const cell = await screen.findByTestId(`exec-${taskId}-${userId}`);
    const groups = cell.querySelectorAll('[data-tally="group"]');
    expect(groups.length).toBeGreaterThanOrEqual(2);

    // Check spacing: right margin should be larger than singles (~6px vs 3px)
    const groupStyle = getComputedStyle(groups[0]);
    const singles = cell.querySelectorAll('[data-tally="single"]');
    expect(singles.length).toBeGreaterThanOrEqual(1);
    const singleStyle = getComputedStyle(singles[0] as HTMLElement);
    expect(parseFloat(groupStyle.marginRight)).toBeGreaterThan(parseFloat(singleStyle.marginRight));

    // Color check (approx) – we expect rgb(30, 41, 59)
    const stroke = groups[0].querySelector('.tally-stroke') as HTMLElement;
    const color = getComputedStyle(stroke).backgroundColor.replace(/\s+/g,'');
    expect(color).toMatch(/rgb\(30,41,59\)/);
  });
});

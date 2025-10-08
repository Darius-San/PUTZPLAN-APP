import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Basic test to ensure multi demo task generation works and random exec still functions

describe('TaskTable Debug Multi Demo Tasks', () => {
  beforeEach(() => { localStorage.clear(); });

  it('generates multiple demo tasks (3-8) and allows random execution', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    // Navigate to Task-Tabelle
    const taskTableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(taskTableBtn);

    // Initially maybe no tasks
    const generateBtn = await screen.findByTestId('debug-generate-demo-tasks');
    fireEvent.click(generateBtn);

    // Table should show at least 3 tasks
    const rows = await screen.findAllByTestId(/tt-task-/);
    expect(rows.length).toBeGreaterThanOrEqual(3);

    // Random execution button should still work without throwing
    const randomBtn = screen.getByTestId('debug-random-exec');
    fireEvent.click(randomBtn);

    // After random exec at least one total cell should have >0 points
    // We grab any total-* test id
    const totalCells = screen.getAllByTestId(/total-/);
    const anyPositive = totalCells.some(cell => /\d+P/.test(cell.textContent || '') && !/^0P$/.test(cell.textContent || ''));
    expect(anyPositive).toBe(true);
  });
});

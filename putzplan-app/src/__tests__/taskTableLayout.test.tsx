import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

/** Verifiziert neues Layout der Task Tabelle */

describe('TaskTable Layout', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('shows controls inside card header and opens side modal', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const btn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(btn);

    // Controls container exists inside card
  const card = await screen.findByTestId('task-table-card');
  const controls = card.querySelector('[data-testid="task-table-controls"]');
  expect(controls).not.toBeNull();

    // Click first task button
    const firstTaskBtn = await screen.findAllByTestId(/tt-task-/);
    fireEvent.click(firstTaskBtn[0]);

    const modal = await screen.findByTestId('task-exec-modal');
  expect(modal).not.toBeNull();

    // Ensure task buttons have no solid black border (heuristic: border-black class not present)
    const btnClass = firstTaskBtn[0].getAttribute('class') || '';
    expect(btnClass.includes('border-black')).toBe(false);
  });
});

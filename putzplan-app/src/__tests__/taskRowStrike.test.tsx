import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Verifies that once the current user executes a task, its title shows a strike style

describe('Task row strike-through after execution', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('adds line-through class to task title after execution by current user', async () => {
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
    const taskId = (firstTaskBtn.getAttribute('data-testid') || '').replace('tt-task-','');

    // Öffne Execution Modal
    fireEvent.click(firstTaskBtn);
    const execModal = await screen.findByTestId('task-exec-modal');
    // Wähle ersten Mitglieder-Button (current user ist laut App state meist erster Eintrag, macht aber nichts falls anderer)
    const memberBtns = execModal.querySelectorAll('button[data-testid^="exec-select-"]');
    expect(memberBtns.length).toBeGreaterThan(0);
    fireEvent.click(memberBtns[0]);

    // Confirm modal
    const confirmBtn = await screen.findByTestId('confirm-exec-btn');
    fireEvent.click(confirmBtn);

    // Jetzt sollte der Titel durchgestrichen sein
    const titleEl = await screen.findByTestId(`task-title-${taskId}`);
    expect(titleEl.className).toMatch(/line-through/);
  });
});

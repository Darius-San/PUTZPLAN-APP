import { render, screen, fireEvent, within } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { describe, test, expect } from 'vitest';

// Simple flow test: open WG -> open task table -> open first task -> select member -> confirm (if no checklist)

describe('Task Table Flow', () => {
  test('navigate and mark execution (dummy)', async () => {
    render(<App />);
    const openBtn = await screen.findByTestId(/open-wg-/);
    fireEvent.click(openBtn);
    await screen.findByTestId('add-task-btn');

    // Open table
    const ttBtn = screen.getByTestId('task-table-btn');
    fireEvent.click(ttBtn);
    await screen.findByTestId('task-table');

    const taskButtons = screen.getAllByRole('button', { name: /P$/ }); // heuristic includes points chip
    if (taskButtons.length === 0) return; // No tasks seeded maybe
    fireEvent.click(taskButtons[0]);

  // Member selection modal (multiple buttons now) -> choose first
  const memberBtns = await screen.findAllByTestId(/exec-select-/);
  fireEvent.click(memberBtns[0]);

    // Confirm modal
    const confirm = await screen.findByTestId('confirm-exec-btn');
    if (!confirm.hasAttribute('disabled')) {
      fireEvent.click(confirm);
    }
  });
});

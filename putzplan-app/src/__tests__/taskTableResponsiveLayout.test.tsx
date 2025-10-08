import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Layout test ensuring responsive width variables are present

describe('TaskTable responsive layout', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('applies CSS vars for dynamic column widths', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    // Generate tasks if needed so table renders body rows
    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }

    const taskCol = await screen.findByTestId('col-task');
    const style = getComputedStyle(taskCol as HTMLElement);
    // The width style should be resolved (not 'auto') due to var(--col-task-width)
    expect(style.width).not.toBe('auto');
    // At least one member column has same calc-based width var applied
    const memberHeader = document.querySelector('[data-testid^="col-member-"]') as HTMLElement;
    expect(memberHeader).toBeTruthy();
    const memberWidth = getComputedStyle(memberHeader).width;
    expect(memberWidth).not.toBe('auto');
  });
});

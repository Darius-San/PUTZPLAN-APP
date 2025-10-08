import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Ensures that task execution modal is centered (not side panel)

describe('Task Execution Modal Centering', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('opens centered modal (not side variant)', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }

    const firstTask = (await screen.findAllByTestId(/tt-task-/))[0];
    fireEvent.click(firstTask);

    const modal = await screen.findByTestId('task-exec-modal');
    // Should have flex & centering classes
    expect(modal.className).toMatch(/flex/);
    expect(modal.className).toMatch(/items-center/);
    expect(modal.className).toMatch(/justify-center/);
    // Should not contain side-specific gradient bg (amber gradient) on the inner card
    const card = modal.querySelector('.bg-gradient-to-b');
    expect(card).toBeNull();
    // Should not contain any empty flex-1 spacer (side variant artefact)
    const spacer = Array.from(modal.children).find(ch => ch.className.includes('flex-1'));
    expect(spacer).toBeUndefined();
  });
});

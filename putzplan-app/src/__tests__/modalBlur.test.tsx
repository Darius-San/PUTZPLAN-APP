import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App.jsx';
import { ensureDebugEnabled, openWG } from './testUtils';

// Verifies that opening execution modal applies blur & translucent overlay

describe('Task Execution Modal Blur', () => {
  beforeEach(()=> { localStorage.clear(); });

  it('applies backdrop blur + body attribute when selecting task execution', async () => {
    render(<App />);
    await ensureDebugEnabled();
    await openWG();
    const tableBtn = await screen.findByRole('button', { name: /Task-Tabelle/i });
    fireEvent.click(tableBtn);

    // generate tasks if none
    if (screen.queryAllByTestId(/tt-task-/).length === 0) {
      const genBtn = await screen.findByTestId('debug-generate-demo-tasks');
      fireEvent.click(genBtn);
    }
    const firstTask = (await screen.findAllByTestId(/tt-task-/))[0];
    fireEvent.click(firstTask);

    // Modal content and overlay should be present
    await screen.findByTestId('task-exec-modal');
    const overlay = await screen.findByTestId('modal-overlay');
    expect(overlay.className).toMatch(/backdrop-blur/);

    // Body should have data attribute for global blur
    expect(document.body.getAttribute('data-modal-active')).toBe('true');

    // Root should have blur style (jsdom applies inline style retrieval via getComputedStyle not available for our custom filter rule, so check attribute presence instead)
    // Instead we assert aria-hidden toggling for accessibility & that modal root exists.
    const appRoot = document.getElementById('root');
    expect(appRoot?.getAttribute('aria-hidden')).toBe('true');
  });
});

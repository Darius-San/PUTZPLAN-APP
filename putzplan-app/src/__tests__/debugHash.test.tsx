import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App.jsx';

// Verifies that setting location.hash to #debug before mounting auto-enables debug mode
// (no manual toggle click required)

describe('#debug Hash Activation', () => {
  beforeEach(() => {
    localStorage.clear();
    // Set hash before render
    window.location.hash = '#debug';
  });

  it('auto-enables debug mode via #debug hash and allows debug actions after entering WG', async () => {
    render(<App />);
    const toggle = await screen.findByTestId('toggle-debug-mode');
    await screen.findByText(/Debug: AN/);
    const wgBtn = await screen.findByTestId(/open-wg-/);
    wgBtn.click();
    await screen.findByTestId('add-task-btn');
    screen.getByTestId('add-task-btn').click();
    await screen.findByTestId('debug-prefill-task');
  });
});

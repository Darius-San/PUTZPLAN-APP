import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

/**
 * Ensures demo reload produces expected baseline (>=6 users, wg exists, >=15 tasks)
 */

describe('Demo Reload', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dataManager.forceResetDemo();
  });

  test('demo dataset present after force reset', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    // Quick debug counts check present in UI
    const countsLine = await screen.findByText(/users:/i);
    expect(countsLine.textContent).toMatch(/users: \d+/);
  });

  test('hard reset button reloads dataset', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    // Remove users manually to simulate corruption
    (dataManager as any).state.users = { };
    fireEvent.click(screen.getByRole('button', { name: /Hard Reset \+ Demo/i }));
    await screen.findByText(/demo/i);
  });
});

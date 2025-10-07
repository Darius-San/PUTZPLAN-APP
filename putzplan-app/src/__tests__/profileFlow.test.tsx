import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Helper: select text case-insensitively
const findByTextContent = (text: string) => screen.getByText((content) => content.toLowerCase() === text.toLowerCase());

describe('Profile Overview & Navigation Flow (WG zentriert)', () => {
  beforeEach(() => {
    // Ensure both localStorage and in-memory singleton state are reset between tests
    localStorage.clear();
    (dataManager as any).clearAllData();
  });

  it('zeigt WG Übersicht mit mindestens einem WG öffnen Button', async () => {
    // Ensure clean seed
    localStorage.clear();
    render(<App />);
    // Wait for any WG öffnen buttons
    const wgButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    expect(wgButtons.length).toBeGreaterThan(0);
  });

  it('öffnet Dashboard nach Klick auf WG öffnen', async () => {
    render(<App />);
    const wgButtons = await screen.findAllByRole('button', { name: /WG öffnen/i });
    await userEvent.click(wgButtons[0]);
    // Minimal Dashboard: expect central add-task button
    expect(await screen.findByTestId('add-task-btn')).toBeInTheDocument();
  });

  it('startet WG Creation Wizard via Neue WG erstellen', async () => {
    render(<App />);
    // If we accidentally landed on dashboard (leaked state), navigate back
    const maybeDashboardBtn = screen.queryByTestId('add-task-btn');
    if (maybeDashboardBtn) {
      // mock confirm auto-accept
      // @ts-ignore
      window.confirm = () => true;
      const switchBtn = screen.getByRole('button', { name: /Profile wechseln/i });
      await userEvent.click(switchBtn);
    }
    const newWgBtn = await screen.findByTestId('create-wg-btn');
    await userEvent.click(newWgBtn);
    expect(await screen.findByText(/WG Namen festlegen/i)).toBeInTheDocument();
  });
});

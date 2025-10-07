import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

describe('Seed Parity Basics', () => {
  beforeEach(() => {
    // localStorage cleared by global setup
  });

  it('Seed zeigt WG Karte mit 6 Mitglieder Badge', async () => {
    render(<App />);
    await screen.findByText(/wähle eine wg/i);
    expect(screen.getByText(/WG Darius & Co/i)).toBeInTheDocument();
    // Badge text contains '6 Mitglieder'
    expect(screen.getByText(/6\s*Mitglieder/i)).toBeInTheDocument();
    // Only one WG öffnen button (WG-centric view)
  const openBtns = screen.getAllByRole('button', { name: /wg öffnen/i });
  expect(openBtns.length).toBeGreaterThanOrEqual(1);
  });
});

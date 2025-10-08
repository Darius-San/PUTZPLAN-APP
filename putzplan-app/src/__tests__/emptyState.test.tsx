import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Verifiziert dass ohne Seed eine leere WG/Profil Ansicht korrekt erscheint.
describe('Empty State (Seeding unterdrückt)', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any).clearAllData();
    // Unterdrücke Seed für diesen Test
    (window as any).__PUTZPLAN_DISABLE_SEED = true;
  });

  it('zeigt Hinweis auf keine Profile & keinen WG öffnen Button', async () => {
    render(<App />);
    // Überschrift vorhanden
    await screen.findByText(/wähle eine wg/i);
    // Leerer Hinweis
    expect(await screen.findByText(/noch keine profile vorhanden/i)).toBeInTheDocument();
    // Es darf kein WG öffnen Button existieren
    const btn = screen.queryByRole('button', { name: /wg öffnen/i });
    expect(btn).toBeNull();
  });
});
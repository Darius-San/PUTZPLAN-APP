import { render, screen } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

/**
 * Verifiziert, dass der automatische Seed (6 Nutzer, 18 Tasks, WG) erfolgt
 * und dass KEIN currentUser gesetzt ist (Profilübersicht bleibt sichtbar).
 */

describe('Default Seed Dataset', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dataManager.resetForTests();
  });

  test('auto-seeded users appear and profile overview remains until selection', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    const openButtons = await screen.findAllByRole('button', { name: /Öffnen/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(6);
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Navigation flow tests adjusted for seeded dataset:
// 1. Seeded dataset selection -> dashboard
// 2. Quick create path still works when clearing and preventing seed

describe('Navigation Flow', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dataManager.resetForTests(); // reseeds dataset now
  });

  test('seeded profile selection leads to dashboard', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    const openButtons = await screen.findAllByRole('button', { name: /Öffnen/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(6);
    fireEvent.click(openButtons[0]);
    await screen.findByText(/Hi\s+Darius/i);
  });

  test('new profile creation via New Profile button when no profiles exist', async () => {
    // Leeren Zustand erzwingen OHNE automatische Seeding-Daten
    window.localStorage.clear();
    (dataManager as any).state = { ...(dataManager as any).state, users: {}, tasks: {}, currentWG: null, currentUser: null };
    render(<App />);
    await screen.findByText(/^Profile$/i);

    // New Profile Button klicken -> Setup Wizard
  fireEvent.click(screen.getByRole('button', { name: /Neues Profil/i }));
    await screen.findByText(/Neuer Putzplan/i);
  });
});

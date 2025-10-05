import { render, screen } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

/**
 * Ensures the app does NOT auto navigate to dashboard when seeded data exists.
 * It should remain on the profile overview until a profile is explicitly selected.
 */

describe('No Automatic Navigation', () => {
  beforeEach(() => {
    window.localStorage.clear();
    dataManager.resetForTests();
  });

  test('stays on profile overview after load', async () => {
    render(<App />);
    await screen.findByText(/^Profile$/i);
    // Dashboard greeting should not yet be visible
    const dashboardGreeting = screen.queryByText(/Hi\s+Darius/i);
    expect(dashboardGreeting).toBeNull();
  });
});

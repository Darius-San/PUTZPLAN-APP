import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Scenario: One or more users exist (legacy/import) but no WG objects. Should still show create button.
describe('ProfileOverview Gap: users exist but no WGs', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any).clearAllData();
    (window as any).__PUTZPLAN_DISABLE_SEED = true; // prevent seeding
    // Add a user without setting currentUser (use addUser, not createUser)
    dataManager.addUser({
      id: 'u-test',
      name: 'Solo User',
      avatar: '🙂',
      email: 'solo@example.com',
      joinedAt: new Date(),
      isActive: true,
      currentMonthPoints: 0,
      targetMonthlyPoints: 100,
      totalCompletedTasks: 0
    });
  });

  it('shows create WG button when no WGs present', async () => {
    render(<App />);
    await screen.findByText(/wähle eine wg/i);
    // Should render gap card
    expect(await screen.findByTestId('empty-no-wgs')).toBeInTheDocument();
    const btn = screen.getByTestId('create-wg-btn');
    expect(btn).toBeInTheDocument();
  });
});
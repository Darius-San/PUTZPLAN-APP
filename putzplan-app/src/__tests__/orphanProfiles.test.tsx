import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { dataManager } from '../services/dataManager';

// Test: Orphan profiles (users not referenced by any WG) show warning & can be removed.
describe('Orphan Profiles Cleanup', () => {
  beforeEach(() => {
    localStorage.clear();
    (dataManager as any).clearAllData();
    (window as any).__PUTZPLAN_DISABLE_SEED = true;
    // Create a WG with two members
  const u1 = dataManager.createUser({ name: 'A', targetMonthlyPoints: 100, avatar: '🅰️', isActive: true });
  const u2 = dataManager.createUser({ name: 'B', targetMonthlyPoints: 100, avatar: '🅱️', isActive: true });
  const wg = dataManager.createWG({ name: 'TestWG', description: 'Test', monthlyPointsTarget: 100 } as any);
  dataManager.updateWG(wg.id, { memberIds: [u1.id, u2.id] });
  // Add extra orphan users (not referenced by WG memberIds)
  dataManager.createUser({ name: 'Ghost1', targetMonthlyPoints: 100, avatar: '👻', isActive: true });
  dataManager.createUser({ name: 'Ghost2', targetMonthlyPoints: 100, avatar: '👻', isActive: true });
    // Return to profile overview state
    dataManager.clearCurrentUser();
    dataManager.clearCurrentWG();
  });

  it('shows orphan warning and cleans them up', async () => {
    render(<App />);
    await screen.findByText(/wähle eine wg/i);
    const warn = await screen.findByTestId('orphan-profiles-warning');
    expect(warn).toBeInTheDocument();
    const cleanupBtn = screen.getByTestId('cleanup-orphans-btn');
    await userEvent.click(cleanupBtn);
    await waitFor(() => {
      expect(screen.queryByTestId('orphan-profiles-warning')).toBeNull();
    });
  });
});
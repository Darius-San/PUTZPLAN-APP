import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SettingsPage } from '../components/settings/SettingsPage';
import { Dashboard } from '../components/dashboard/Dashboard';
import { settingsManager } from '../services/settingsManager';

// Ensure a clean settings state before each test
beforeEach(() => {
  settingsManager.reset();
});

describe('Dashboard width setting', () => {
  it('persists and affects Dashboard button width', () => {
    // Render SettingsPage and change dashboard width to narrowest (5)
    const onBack = () => {};
    render(<SettingsPage onBack={onBack} />);

     const widthInput = screen.getByTestId('dashboard-width-input');
    // set value to 5
    fireEvent.change(widthInput, { target: { value: '5' } });

  const saveBtn = screen.getByTestId('save-settings-btn');
    fireEvent.click(saveBtn);

    // Now check settingsManager persisted value
    const settings = settingsManager.getSettings();
    expect(settings.dashboard.buttonWidth).toBe(5);

    // Render Dashboard and assert buttons use the narrow class
    // Mock store so Dashboard has currentUser/currentWG
    vi.mock('../hooks/usePutzplanStore', () => ({
      usePutzplanStore: () => ({
        currentUser: { id: 'user1', name: 'Test User' },
        currentWG: { id: 'wg1', name: 'Test WG' },
        clearCurrentUser: vi.fn(),
        clearCurrentWG: vi.fn(),
      }),
    }));
    vi.mock('../components/dashboard/UrgentTaskPanel', () => ({
      UrgentTaskPanel: () => <div data-testid="urgent-panel-mock" />,
    }));

    render(<Dashboard />);
    const settingsBtn = screen.getByTestId('settings-btn');
    const expectedClass = settingsManager.getDashboardButtonWidthClass();
    expect(settingsBtn.className).toContain(expectedClass.split(' ')[0]); // check mobile width class
  });
});

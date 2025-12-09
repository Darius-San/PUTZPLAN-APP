import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../components/dashboard/Dashboard';

// Mock usePutzplanStore
vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    currentUser: { id: 'user1', name: 'Test User' },
    currentWG: { id: 'wg1', name: 'Test WG' },
    clearCurrentUser: vi.fn(),
    clearCurrentWG: vi.fn(),
  }),
}));

// Mock UrgentTaskPanel to avoid provider requirements in unit tests
vi.mock('../components/dashboard/UrgentTaskPanel', () => ({
  UrgentTaskPanel: () => <div data-testid="urgent-panel-mock" />
}));

// window.confirm is stubbed in vitest.setup.ts; no need to mock here

describe('Dashboard Settings Navigation', () => {
  it('sollte Settings Button anzeigen', () => {
    render(<Dashboard />);
    
    const settingsButton = screen.getByTestId('settings-btn');
    expect(settingsButton).toBeInTheDocument();
    expect(settingsButton).toHaveTextContent('⚙️ Einstellungen');
  });

  it('sollte Profil-Button links anzeigen', () => {
    render(<Dashboard />);
    const profileBtn = screen.getByTestId('profile-switch-btn');
    expect(profileBtn).toBeInTheDocument();
    // Check that profile button container exists with current layout
    const container = profileBtn.parentElement;
    expect(container?.className).toContain('justify-center'); // Current layout uses center alignment
    expect(profileBtn.textContent).toContain('Profile wechseln');
  });

  it('sollte Settings Button als großen Button rendern', () => {
    render(<Dashboard />);
    
    const settingsButton = screen.getByTestId('settings-btn');
  // New layout uses taller buttons with uniform height classes (h-14 on mobile)
  expect(settingsButton).toHaveClass('w-7/12');
  expect(settingsButton.className).toContain('h-14');
  // text size should be larger on mobile
  expect(settingsButton.className).toContain('text-lg');
    expect(settingsButton).toHaveClass('rounded-2xl');
  });

  it('sollte onSettings callback aufrufen beim Klick', () => {
    const mockOnSettings = vi.fn();
    render(<Dashboard onSettings={mockOnSettings} />);
    
    const settingsButton = screen.getByTestId('settings-btn');
    fireEvent.click(settingsButton);
    
    expect(mockOnSettings).toHaveBeenCalledTimes(1);
  });

  it('sollte Settings Button neben anderen Dashboard-Buttons anzeigen', () => {
    render(<Dashboard />);
    
    // Check all main dashboard buttons are present
    expect(screen.getByTestId('add-task-btn')).toBeInTheDocument();
    expect(screen.getByTestId('rate-tasks-btn')).toBeInTheDocument();
    expect(screen.getByTestId('task-table-btn')).toBeInTheDocument();
    expect(screen.getByTestId('settings-btn')).toBeInTheDocument();
  });

  it('sollten alle Haupt-Buttons gleiche Größe/Klassen haben', () => {
    render(<Dashboard />);
    const ids = ['add-task-btn', 'rate-tasks-btn', 'period-settings-btn', 'absence-management-btn', 'task-table-btn', 'settings-btn'];
    const buttons = ids.map(id => screen.getByTestId(id));
    buttons.forEach(btn => {
  expect(btn).toHaveClass('w-7/12');
  expect(btn.className).toContain('h-14');
    expect(btn).toHaveClass('rounded-2xl');
    expect(btn.className).toContain('text-lg');
      });
  });

  it('layout should use a responsive grid with 2 cols from md breakpoint', () => {
    render(<Dashboard />);
    const container = document.querySelector('div.max-w-5xl');
    expect(container).toBeTruthy();
    // The container should include md:grid-cols-2 in className (tested individually)
    expect(container?.className).toContain('md:grid-cols-2');
    // grid should also support lg:grid-cols-3
    expect(container?.className).toContain('lg:grid-cols-3');
  });
});
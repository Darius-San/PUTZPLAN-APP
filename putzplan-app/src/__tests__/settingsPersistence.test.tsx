import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsModal } from '../components/settings/SettingsModal';
import { settingsManager } from '../services/settingsManager';
import { useSettings } from '../services/settingsManager';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

// Test wrapper component
const TestWrapper = () => {
  const { settings, updateTaskTableSettings, getColumnSpacingClass } = useSettings();
  
  return (
    <div>
      <div data-testid="current-spacing">{settings.taskTable.columnSpacing}</div>
      <div data-testid="current-class">{getColumnSpacingClass()}</div>
      <button 
        onClick={() => updateTaskTableSettings({ columnSpacing: 5 })}
        data-testid="update-spacing"
      >
        Update to 5
      </button>
      <SettingsModal isOpen={true} onClose={() => {}} />
    </div>
  );
};

describe('Settings Persistenz Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    mockLocalStorage.clear();
    // Reset settings manager to defaults
    settingsManager.reset();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('sollte Default-Einstellungen korrekt laden', () => {
    render(<TestWrapper />);
    
    expect(screen.getByTestId('current-spacing')).toHaveTextContent('3');
    expect(screen.getByTestId('current-class')).toHaveTextContent('px-3');
  });

  it('sollte Einstellungen in localStorage speichern', async () => {
    render(<TestWrapper />);
    
    // Update settings
    fireEvent.click(screen.getByTestId('update-spacing'));
    
    await waitFor(() => {
      expect(screen.getByTestId('current-spacing')).toHaveTextContent('5');
    });

    // Check localStorage
    const stored = JSON.parse(mockLocalStorage.getItem('putzplan_settings') || '{}');
    expect(stored.taskTable.columnSpacing).toBe(5);
  });

  it('sollte Einstellungen nach Browser-Refresh beibehalten', () => {
    // Set initial settings
    const testSettings = {
      taskTable: {
        columnSpacing: 4
      }
    };
    mockLocalStorage.setItem('putzplan_settings', JSON.stringify(testSettings));
    
    // Simulate page reload by creating new settings manager instance
    const newSettingsManager = new (settingsManager.constructor as any)();
    expect(newSettingsManager.getSettings().taskTable.columnSpacing).toBe(4);
  });

  it('sollte Spaltenabstände korrekt in CSS-Klassen umwandeln', () => {
    render(<TestWrapper />);
    
    // Test different spacing values
    const spacingTests = [
      { value: 1, expectedClass: 'px-1' },
      { value: 2, expectedClass: 'px-2' },
      { value: 3, expectedClass: 'px-3' },
      { value: 4, expectedClass: 'px-4' },
      { value: 5, expectedClass: 'px-5' },
    ];

    spacingTests.forEach(test => {
      settingsManager.updateTaskTableSettings({ columnSpacing: test.value });
      expect(settingsManager.getColumnSpacingClass()).toBe(test.expectedClass);
    });
  });

  it('sollte Settings Modal korrekt anzeigen und reagieren', () => {
    render(<TestWrapper />);
    
    // Check if modal is rendered
    expect(screen.getByText('⚙️ Einstellungen')).toBeInTheDocument();
    expect(screen.getByText('📊 Aufgaben-Tabelle')).toBeInTheDocument();
    expect(screen.getByText('Spaltenabstände')).toBeInTheDocument();
    
  // Check range slider
  const rangeSlider = screen.getByRole('slider');
  expect(rangeSlider).toHaveValue('3'); // Default value

  // Check spacing option buttons (there may be multiple occurrences of these labels in the modal UI,
  // so assert that at least one exists rather than assuming uniqueness)
  expect(screen.getAllByText('Sehr eng').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Standard').length).toBeGreaterThan(0);
  expect(screen.getAllByText('Sehr weit').length).toBeGreaterThan(0);
  });

  it('sollte Preview-Tabelle korrekt aktualisieren', async () => {
    render(<TestWrapper />);
    
    // Find range slider and change value
    const rangeSlider = screen.getByRole('slider');
    fireEvent.change(rangeSlider, { target: { value: '5' } });
    
    // Check if preview table updates
    await waitFor(() => {
      const previewCells = screen.getAllByText('Küche putzen');
      // At least one of the preview cells should be inside a table cell with the expected px class
      const matched = previewCells.some(cell => {
        const tbl = cell.closest('table');
        if (!tbl) return false;
        // find the td that contains this text
        const td = cell.closest('td') || cell.closest('th');
        return td?.className.includes('px-5');
      });
      expect(matched).toBe(true);
    });
  });

  it('sollte fehlerhafte localStorage-Daten korrekt handhaben', () => {
    // Set invalid JSON in localStorage
    mockLocalStorage.setItem('putzplan_settings', 'invalid-json');
    
    // Should fall back to defaults without crashing
    const newSettingsManager = new (settingsManager.constructor as any)();
    expect(newSettingsManager.getSettings().taskTable.columnSpacing).toBe(3);
  });

  it('sollte unvollständige Settings korrekt mergen', () => {
    // Set partial settings
    const partialSettings = {
      taskTable: {} // Missing columnSpacing
    };
    mockLocalStorage.setItem('putzplan_settings', JSON.stringify(partialSettings));
    
    const newSettingsManager = new (settingsManager.constructor as any)();
    expect(newSettingsManager.getSettings().taskTable.columnSpacing).toBe(3); // Default
  });

  it('sollte Settings-Listeners korrekt benachrichtigen', async () => {
    const mockListener = vi.fn();
    
    // Subscribe to settings changes
    const unsubscribe = settingsManager.subscribe(mockListener);
    
    // Update settings
    settingsManager.updateTaskTableSettings({ columnSpacing: 4 });
    
    await waitFor(() => {
      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          taskTable: expect.objectContaining({
            columnSpacing: 4
          })
        })
      );
    });
    
    unsubscribe();
  });

  it('sollte Reset-Funktionalität korrekt ausführen', () => {
    // Set custom settings
    settingsManager.updateTaskTableSettings({ columnSpacing: 5 });
    expect(settingsManager.getSettings().taskTable.columnSpacing).toBe(5);
    
    // Reset to defaults
    settingsManager.reset();
    expect(settingsManager.getSettings().taskTable.columnSpacing).toBe(3);
    
    // Check localStorage is also reset
    const stored = JSON.parse(mockLocalStorage.getItem('putzplan_settings') || '{}');
    expect(stored.taskTable.columnSpacing).toBe(3);
  });

  it('sollte Edge Cases bei Spaltenabständen korrekt behandeln', () => {
    // Test boundary values
    settingsManager.updateTaskTableSettings({ columnSpacing: 0 });
    expect(settingsManager.getColumnSpacingClass()).toBe('px-0');
    
    settingsManager.updateTaskTableSettings({ columnSpacing: 10 });
    expect(settingsManager.getColumnSpacingClass()).toBe('px-10');
    
    // Test negative values
    settingsManager.updateTaskTableSettings({ columnSpacing: -1 });
    expect(settingsManager.getColumnSpacingClass()).toBe('px--1');
  });

  it('sollte mehrfache gleichzeitige Updates korrekt handhaben', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => 
      settingsManager.updateTaskTableSettings({ columnSpacing: i + 1 })
    );
    
    await Promise.all(promises);
    
    // Should have the last value
    expect(settingsManager.getSettings().taskTable.columnSpacing).toBe(10);
    
    // Should be persisted
    const stored = JSON.parse(mockLocalStorage.getItem('putzplan_settings') || '{}');
    expect(stored.taskTable.columnSpacing).toBe(10);
  });
});
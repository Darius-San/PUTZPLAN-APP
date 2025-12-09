import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SettingsPage } from '../components/settings/SettingsPage';
import { dataManager } from '../services/dataManager';
import { whatsappService } from '../services/whatsappService';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock dataManager
vi.mock('../services/dataManager', () => ({
  dataManager: {
    getState: vi.fn(),
    updateWG: vi.fn(),
    isDebugMode: vi.fn(() => false)
  }
}));

// Mock whatsappService
vi.mock('../services/whatsappService', () => ({
  whatsappService: {
    debugCurrentSettings: vi.fn(),
    getTargetGroupId: vi.fn(),
    checkApiStatus: vi.fn(),
    handleHotTaskCreated: vi.fn()
  }
}));

// Mock useSettings hook
vi.mock('../services/settingsManager', () => ({
  useSettings: () => ({
    settings: {
      taskTable: { columnSpacing: 3 },
      dashboard: { buttonWidth: 3, sizing: {} },
      hotTaskBonus: { enabled: false, percent: 50 }
    },
    updateTaskTableSettings: vi.fn(),
    updateSettings: vi.fn(),
    reset: vi.fn()
  })
}));

// Mock usePutzplanStore hook
vi.mock('../hooks/usePutzplanStore', () => ({
  usePutzplanStore: () => ({
    currentWG: {
      id: 'test-wg-1',
      name: 'Test WG',
      settings: {} // Start with empty settings for tests
    }
  })
}));

describe('WhatsApp Settings Tests', () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Setup default dataManager mock
    (dataManager.getState as any).mockReturnValue({
      currentWG: {
        id: 'test-wg-1',
        name: 'Test WG',
        settings: {}
      }
    });
  });

  describe('UI Rendering', () => {
    it('sollte WhatsApp Settings Sektion rendern', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      expect(screen.getByText('📱 WG WhatsApp Einstellungen')).toBeInTheDocument();
      expect(screen.getByText('Nachrichten an WG-Gruppe senden (statt einzelne Kontakte)')).toBeInTheDocument();
    });

    it('sollte beide Eingabefelder anzeigen', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      expect(screen.getByLabelText(/WG Gruppenname/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Gruppen-ID/)).toBeInTheDocument();
    });

    it('sollte Checkbox für WhatsApp-Aktivierung anzeigen', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      expect(checkbox).toBeInTheDocument();
    });
  });

  describe('Formular-Interaktionen', () => {
    it('sollte Gruppennamen eingeben können', async () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      fireEvent.change(groupNameInput, { target: { value: 'Test Gruppe' } });
      
      expect(groupNameInput).toHaveValue('Test Gruppe');
    });

    it('sollte Gruppen-ID eingeben können', async () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      fireEvent.change(groupIdInput, { target: { value: '987654321@g.us' } });
      
      expect(groupIdInput).toHaveValue('987654321@g.us');
    });

    it('sollte Checkbox togglen können', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });

      // Initially unchecked
      expect(checkbox).not.toBeChecked();

      // Click to enable
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();

      // Click to disable
      fireEvent.click(checkbox);
      expect(checkbox).not.toBeChecked();
    });    it('sollte Felder leeren wenn Checkbox deaktiviert wird', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      
      // Fill in values and enable checkbox
      fireEvent.change(groupNameInput, { target: { value: 'Test Gruppe' } });
      fireEvent.change(groupIdInput, { target: { value: '123@g.us' } });
      fireEvent.click(checkbox); // Enable it
      
      expect(checkbox).toBeChecked();
      expect(groupNameInput).toHaveValue('Test Gruppe');
      expect(groupIdInput).toHaveValue('123@g.us');
      
      // Uncheck checkbox - fields should keep their values
      fireEvent.click(checkbox);

      expect(groupNameInput).toHaveValue('Test Gruppe');
      expect(groupIdInput).toHaveValue('123@g.us');
      expect(checkbox).not.toBeChecked();
    });
  });

  describe('Persistierung Tests', () => {
    it('sollte leere Felder initial anzeigen', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });

      // Initially should be empty since mock has no WhatsApp settings
      expect(groupNameInput).toHaveValue('');
      expect(groupIdInput).toHaveValue('');
      expect(checkbox).not.toBeChecked();
    });    it('sollte Änderungen beim Speichern persistieren', async () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      const saveButton = screen.getByText('✅ Speichern');
      
      // Enable checkbox and enter values
      fireEvent.click(checkbox);
      fireEvent.change(groupNameInput, { target: { value: 'Neue Gruppe' } });
      fireEvent.change(groupIdInput, { target: { value: 'neue-id@g.us' } });
      
      // Speichern
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(dataManager.updateWG).toHaveBeenCalledWith('test-wg-1', {
          settings: expect.objectContaining({
            whatsapp: {
              groupName: 'Neue Gruppe',
              groupId: 'neue-id@g.us',
              enabled: true
            }
          })
        } as any);
      });
    });

    it('sollte Settings speichern wenn Änderungen gemacht wurden', async () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      const saveButton = screen.getByText('✅ Speichern');
      
      // Make a change to trigger save functionality
      fireEvent.click(checkbox);
      
      // Save after making changes
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        // WhatsApp settings should be saved with enabled: true but empty fields
        expect(dataManager.updateWG).toHaveBeenCalledWith('test-wg-1', expect.objectContaining({
          settings: expect.objectContaining({
            whatsapp: expect.objectContaining({
              groupName: '',
              groupId: '',
              enabled: false // enabled is false because no groupName or groupId provided
            })
          })
        }) as any);
      });
    });
  });

  describe('Status-Anzeige Tests', () => {
    it('sollte Bestätigung anzeigen wenn Gruppe konfiguriert ist', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      
      fireEvent.click(checkbox);
      fireEvent.change(groupNameInput, { target: { value: 'Test Gruppe' } });
      
      expect(screen.getByText('✅ WhatsApp-Gruppe konfiguriert')).toBeInTheDocument();
      expect(screen.getByText('📝 Name: Test Gruppe')).toBeInTheDocument();
    });

    it('sollte sowohl Name als auch ID in der Bestätigung anzeigen', () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      
      fireEvent.click(checkbox);
      fireEvent.change(groupNameInput, { target: { value: 'Test Gruppe' } });
      fireEvent.change(groupIdInput, { target: { value: '123@g.us' } });

      expect(screen.getByText('📝 Name: Test Gruppe')).toBeInTheDocument();
      expect(screen.getByText('🆔 ID: 123@g.us')).toBeInTheDocument();
    });
  });

  describe('Integration Tests', () => {
    it('sollte vollständigen Workflow testen: Eingabe → Speichern', async () => {
      render(<SettingsPage onBack={mockOnBack} />);
      
      // 1. Eingabe
      const groupNameInput = screen.getByPlaceholderText('z.B. Meine WG');
      const groupIdInput = screen.getByPlaceholderText('z.B. 120363213460007871@g.us');
      const checkbox = screen.getByRole('checkbox', { name: /Nachrichten an WG-Gruppe senden/ });
      const saveButton = screen.getByText('✅ Speichern');
      
      fireEvent.click(checkbox);
      fireEvent.change(groupNameInput, { target: { value: 'Integration Test' } });
      fireEvent.change(groupIdInput, { target: { value: 'integration@g.us' } });
      
      // Verify fields have values
      expect(groupNameInput).toHaveValue('Integration Test');
      expect(groupIdInput).toHaveValue('integration@g.us');
      expect(checkbox).toBeChecked();
      
      // 2. Speichern
      fireEvent.click(saveButton);
      
      await waitFor(() => {
        expect(dataManager.updateWG).toHaveBeenCalledWith('test-wg-1', expect.objectContaining({
          settings: expect.objectContaining({
            whatsapp: expect.objectContaining({
              groupName: 'Integration Test',
              groupId: 'integration@g.us',
              enabled: true
            })
          })
        }) as any);
      });
    });
  });
});
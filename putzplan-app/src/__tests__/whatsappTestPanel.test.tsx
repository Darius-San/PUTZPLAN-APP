import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { WhatsAppTestPanel } from '../components/WhatsAppTestPanel';
import { whatsappService } from '../services/whatsappService';
import { dataManager } from '../services/dataManager';

// Mock dataManager
vi.mock('../services/dataManager', () => ({
  dataManager: {
    isDebugMode: vi.fn()
  }
}));

// Mock whatsappService
vi.mock('../services/whatsappService', () => ({
  whatsappService: {
    checkApiStatus: vi.fn(),
    checkSessionStatus: vi.fn(),
    sendTestMessage: vi.fn(),
    handleHotTaskCreated: vi.fn(),
    debugCurrentSettings: vi.fn()
  }
}));

describe('WhatsApp Test Panel Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Debug Mode Sichtbarkeit', () => {
    it('sollte Panel nicht anzeigen wenn Debug-Modus aus', () => {
      vi.mocked(dataManager.isDebugMode).mockReturnValue(false);
      
      const { container } = render(<WhatsAppTestPanel />);
      expect(container.firstChild).toBeNull();
    });

    it('sollte Panel anzeigen wenn Debug-Modus an', () => {
      vi.mocked(dataManager.isDebugMode).mockReturnValue(true);
      
      render(<WhatsAppTestPanel />);
      expect(screen.getByText('🧪 WhatsApp Test Panel (Debug)')).toBeInTheDocument();
    });
  });

  describe('Button Funktionalität', () => {
    beforeEach(() => {
      vi.mocked(dataManager.isDebugMode).mockReturnValue(true);
    });

    it('sollte alle Test-Buttons anzeigen', () => {
      render(<WhatsAppTestPanel />);
      
      expect(screen.getByText('API Status prüfen')).toBeInTheDocument();
      expect(screen.getByText('Session prüfen')).toBeInTheDocument();
      expect(screen.getByText('Testnachricht senden')).toBeInTheDocument();
      expect(screen.getByText('🔥 Hot Task Test')).toBeInTheDocument();
      expect(screen.getByText('🔍 Einstellungen anzeigen')).toBeInTheDocument();
    });

    it('sollte API Status prüfen', async () => {
      vi.mocked(whatsappService.checkApiStatus).mockResolvedValue(true);
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('API Status prüfen');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('✅ WAHA API läuft')).toBeInTheDocument();
      });
      
      expect(whatsappService.checkApiStatus).toHaveBeenCalledTimes(1);
    });

    it('sollte Session Status prüfen', async () => {
      vi.mocked(whatsappService.checkSessionStatus).mockResolvedValue(true);
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('Session prüfen');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('✅ WhatsApp Session aktiv')).toBeInTheDocument();
      });
      
      expect(whatsappService.checkSessionStatus).toHaveBeenCalledTimes(1);
    });

    it('sollte Testnachricht senden', async () => {
      vi.mocked(whatsappService.sendTestMessage).mockResolvedValue({
        success: true,
        messageId: 'test-123'
      });
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('Testnachricht senden');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('✅ Testnachricht gesendet! (ID: test-123)')).toBeInTheDocument();
      });
      
      expect(whatsappService.sendTestMessage).toHaveBeenCalledTimes(1);
    });

    it('sollte Hot Task Test ausführen', async () => {
      vi.mocked(whatsappService.handleHotTaskCreated).mockResolvedValue({
        success: true,
        message: 'Hot Task Test erfolgreich'
      });
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('🔥 Hot Task Test');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('Hot Task Test erfolgreich')).toBeInTheDocument();
      });
      
      expect(whatsappService.handleHotTaskCreated).toHaveBeenCalledWith(
        'Test Hot Task',
        'Dies ist ein Test für die Hot Task Benachrichtigung'
      );
    });

    it('sollte Einstellungen anzeigen', () => {
      vi.mocked(whatsappService.debugCurrentSettings).mockReturnValue({
        groupName: 'Test Gruppe',
        groupId: 'test@g.us',
        enabled: true
      });
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('🔍 Einstellungen anzeigen');
      fireEvent.click(button);
      
      expect(screen.getByText(/✅ Einstellungen gefunden:/)).toBeInTheDocument();
      expect(screen.getByText(/📝 Name: Test Gruppe/)).toBeInTheDocument();
      expect(screen.getByText(/🆔 ID: test@g.us/)).toBeInTheDocument();
      
      expect(whatsappService.debugCurrentSettings).toHaveBeenCalledTimes(1);
    });

    it('sollte Fehler bei fehlenden Einstellungen anzeigen', () => {
      vi.mocked(whatsappService.debugCurrentSettings).mockReturnValue(null);
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('🔍 Einstellungen anzeigen');
      fireEvent.click(button);
      
      expect(screen.getByText('❌ Keine WhatsApp Einstellungen gefunden')).toBeInTheDocument();
    });
  });

  describe('Loading States', () => {
    beforeEach(() => {
      vi.mocked(dataManager.isDebugMode).mockReturnValue(true);
    });

    it('sollte Loading-Zustand während API-Aufruf anzeigen', async () => {
      // Mock verzögerte Response
      vi.mocked(whatsappService.checkApiStatus).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(true), 100))
      );
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('API Status prüfen');
      fireEvent.click(button);
      
      // Loading state should be visible
      expect(screen.getByText('⏳ Lädt...')).toBeInTheDocument();
      
      // Buttons should be disabled
      expect(button).toBeDisabled();
      
      // Wait for completion
      await waitFor(() => {
        expect(screen.getByText('✅ WAHA API läuft')).toBeInTheDocument();
      });
      
      // Loading should be gone
      expect(screen.queryByText('⏳ Lädt...')).not.toBeInTheDocument();
      expect(button).not.toBeDisabled();
    });
  });

  describe('Fehlerbehandlung', () => {
    beforeEach(() => {
      vi.mocked(dataManager.isDebugMode).mockReturnValue(true);
    });

    it('sollte API-Fehler korrekt anzeigen', async () => {
      vi.mocked(whatsappService.checkApiStatus).mockResolvedValue(false);
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('API Status prüfen');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('❌ WAHA API läuft nicht')).toBeInTheDocument();
      });
    });

    it('sollte Testnachrichten-Fehler anzeigen', async () => {
      vi.mocked(whatsappService.sendTestMessage).mockResolvedValue({
        success: false,
        error: 'Network Error'
      });
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('Testnachricht senden');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('❌ Fehler: Network Error')).toBeInTheDocument();
      });
    });

    it('sollte Hot Task Fehler anzeigen', async () => {
      vi.mocked(whatsappService.handleHotTaskCreated).mockResolvedValue({
        success: false,
        message: 'WAHA API nicht erreichbar'
      });
      
      render(<WhatsAppTestPanel />);
      
      const button = screen.getByText('🔥 Hot Task Test');
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(screen.getByText('❌ WAHA API nicht erreichbar')).toBeInTheDocument();
      });
    });
  });
});
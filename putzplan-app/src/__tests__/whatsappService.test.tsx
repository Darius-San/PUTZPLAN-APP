import { describe, it, expect, beforeEach, vi } from 'vitest';
import { whatsappService } from '../services/whatsappService';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock fetch
global.fetch = vi.fn();

describe('WhatsApp Service Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.clear();
    
    // Reset fetch mock
    vi.mocked(fetch).mockClear();
  });

  describe('getTargetGroupId Tests', () => {
    it('sollte gespeicherte Gruppen-ID zurückgeben', () => {
      // Setup localStorage mit WhatsApp Settings
      const testState = {
        currentWG: {
          id: 'test-wg',
          name: 'Test WG',
          settings: {
            whatsapp: {
              groupName: 'Test Gruppe',
              groupId: 'test-group@g.us',
              enabled: true
            }
          }
        }
      };
      
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));
      
      const result = whatsappService.getTargetGroupId();
      expect(result).toBe('test-group@g.us');
    });

    it('sollte Standard-Target zurückgeben wenn keine Gruppe gesetzt', () => {
      const testState = {
        currentWG: {
          id: 'test-wg',
          name: 'Test WG',
          settings: {}
        }
      };
      
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));
      
      const result = whatsappService.getTargetGroupId();
      expect(result).toBe('491724620111@c.us'); // Standard Target aus WAHA_CONFIG
    });

    it('sollte Standard-Target bei fehlendem currentWG zurückgeben', () => {
      const testState = {};
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));
      
      const result = whatsappService.getTargetGroupId();
      expect(result).toBe('491724620111@c.us');
    });

    it('sollte Standard-Target bei leerem localStorage zurückgeben', () => {
      const result = whatsappService.getTargetGroupId();
      expect(result).toBe('491724620111@c.us');
    });

    it('sollte Standard-Target bei JSON Parse Error zurückgeben', () => {
      mockLocalStorage.setItem('putzplan_state', 'invalid-json');
      
      const result = whatsappService.getTargetGroupId();
      expect(result).toBe('491724620111@c.us');
    });
  });

  describe('debugCurrentSettings Tests', () => {
    it('sollte aktuelle WhatsApp Settings zurückgeben', () => {
      const testState = {
        currentWG: {
          id: 'test-wg',
          name: 'Test WG',
          settings: {
            whatsapp: {
              groupName: 'Debug Test Gruppe',
              groupId: 'debug@g.us',
              enabled: true
            }
          }
        }
      };
      
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));
      
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const result = whatsappService.debugCurrentSettings();
      
      expect(result).toEqual({
        groupName: 'Debug Test Gruppe',
        groupId: 'debug@g.us',
        enabled: true
      });
      
      // Prüfe Konsolen-Ausgabe
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Debug WhatsApp Einstellungen:');
      expect(consoleSpy).toHaveBeenCalledWith('Current WG:', 'Test WG');
      
      consoleSpy.mockRestore();
    });

    it('sollte null zurückgeben wenn keine Settings vorhanden', () => {
      const testState = {
        currentWG: {
          id: 'test-wg',
          name: 'Test WG',
          settings: {}
        }
      };
      
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));
      
      const result = whatsappService.debugCurrentSettings();
      expect(result).toBeNull();
    });
  });

  describe('sendHotTaskNotification Tests', () => {
    it('sollte Hot Task Nachricht an gespeicherte Gruppe senden', async () => {
      // Setup localStorage
      const testState = {
        currentWG: {
          settings: {
            whatsapp: {
              groupId: 'hot-task-group@g.us'
            }
          }
        }
      };
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));

      // Mock API calls in sequence:
      // 1. ensureWahaRunning
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, message: 'WAHA is running' })
      } as Response);
      
      // 2. checkSessionStatus
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'WORKING' })
      } as Response);
      
      // 3. sendText
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'msg123' })
      } as Response);

      const result = await whatsappService.sendHotTaskNotification('Test Task', 'Test Details');

      // Check ensureWahaRunning call
      expect(fetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5175/api/waha/ensure',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        })
      );
      
      // Check checkSessionStatus call
      expect(fetch).toHaveBeenNthCalledWith(2,
        'http://localhost:3000/api/sessions/default',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'X-Api-Key': '96ee37b1f3424e819e7a20dcfe0f6fee',
            'Content-Type': 'application/json'
          }
        })
      );
      
      // Check sendText call
      expect(fetch).toHaveBeenNthCalledWith(3,
        'http://localhost:3000/api/sendText',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-Api-Key': '96ee37b1f3424e819e7a20dcfe0f6fee',
            'Content-Type': 'application/json'
          }
        })
      );

      // Prüfe dass der Request Body korrekt ist (sendText call)
      const lastCall = (fetch as any).mock.calls[2]; // Third call is sendText
      const requestBody = JSON.parse(lastCall[1].body);
      
      expect(requestBody).toEqual({
        session: 'default',
        chatId: 'hot-task-group@g.us',
        text: expect.stringContaining('🔥 HOT TASK ALERT! 🔥')
      });
      
      // Prüfe dass die Nachricht die Task-Details enthält
      expect(requestBody.text).toContain('Test Task');
      expect(requestBody.text).toContain('Test Details');

      expect(result).toEqual({
        success: true,
        messageId: 'msg123'
      });
    });

    it('sollte Standard-Target verwenden wenn keine Gruppe gesetzt', async () => {
      mockLocalStorage.setItem('putzplan_state', JSON.stringify({}));

      // Mock API calls in sequence
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, message: 'WAHA is running' })
      } as Response);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'WORKING' })
      } as Response);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'msg456' })
      } as Response);

      await whatsappService.sendHotTaskNotification('Test Task');

      expect(fetch).toHaveBeenNthCalledWith(3,
        'http://localhost:3000/api/sendText',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-Api-Key': '96ee37b1f3424e819e7a20dcfe0f6fee',
            'Content-Type': 'application/json'
          }
        })
      );

      // Prüfe dass der Request Body korrekt ist (sendText call)
      const lastCall = (fetch as any).mock.calls[2]; // Third call is sendText
      const requestBody = JSON.parse(lastCall[1].body);
      
      expect(requestBody).toEqual({
        session: 'default',
        chatId: '491724620111@c.us', // Standard Target
        text: expect.stringContaining('Test Task')
      });
    });

    it('sollte Fehler bei API-Fehler zurückgeben', async () => {
      // Mock failed ensureWahaRunning
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response);

      const result = await whatsappService.sendHotTaskNotification('Test Task');

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('WAHA nicht verfügbar')
      });
    });

    it('sollte Fehler bei Fetch-Exception zurückgeben', async () => {
      // Mock network error
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network Error'));

      const result = await whatsappService.sendHotTaskNotification('Test Task');

      expect(result).toEqual({
        success: false,
        error: expect.stringContaining('WAHA nicht verfügbar')
      });
    });
  });

  describe('sendTestMessage Tests', () => {
    it('sollte Testnachricht an konfigurierte Gruppe senden', async () => {
      const testState = {
        currentWG: {
          settings: {
            whatsapp: {
              groupId: 'test-group@g.us'
            }
          }
        }
      };
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));

      // Mock API calls in sequence
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ success: true, message: 'WAHA is running' })
      } as Response);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ status: 'WORKING' })
      } as Response);
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify({ id: 'test-msg-123' })
      } as Response);

      const result = await whatsappService.sendTestMessage();

      expect(fetch).toHaveBeenNthCalledWith(3,
        'http://localhost:3000/api/sendText',
        expect.objectContaining({
          method: 'POST',
          headers: {
            'X-Api-Key': '96ee37b1f3424e819e7a20dcfe0f6fee',
            'Content-Type': 'application/json'
          }
        })
      );

      // Prüfe dass der Request Body korrekt ist (sendText call)
      const lastCall = (fetch as any).mock.calls[2]; // Third call is sendText
      const requestBody = JSON.parse(lastCall[1].body);
      
      expect(requestBody).toEqual({
        session: 'default',
        chatId: 'test-group@g.us',
        text: expect.stringContaining('🧪 WhatsApp Test von Putzplan App')
      });

      expect(result).toEqual({
        success: true,
        messageId: 'test-msg-123'
      });
    });
  });

  describe('handleHotTaskCreated Integration Tests', () => {
    it('sollte kompletten Hot Task Workflow ausführen', async () => {
      // Setup
      const testState = {
        currentWG: {
          settings: {
            whatsapp: {
              groupName: 'Integration Test',
              groupId: 'integration@g.us',
              enabled: true
            }
          }
        }
      };
      mockLocalStorage.setItem('putzplan_state', JSON.stringify(testState));

      // Mock API calls in sequence (same as sendHotTaskNotification)
      vi.mocked(fetch)
        // 1. ensureWahaRunning
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ success: true, message: 'WAHA is running' })
        } as Response)
        // 2. checkSessionStatus
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ status: 'WORKING' })
        } as Response)
        // 3. sendText
        .mockResolvedValueOnce({
          ok: true,
          text: async () => JSON.stringify({ id: 'integration-msg-123' })
        } as Response);

      const result = await whatsappService.handleHotTaskCreated('Integration Task', 'Integration Details');

      // Prüfe ensureWahaRunning call
      expect(fetch).toHaveBeenNthCalledWith(1,
        'http://localhost:5175/api/waha/ensure',
        expect.objectContaining({
          method: 'POST'
        })
      );

      // Prüfe checkSessionStatus call
      expect(fetch).toHaveBeenNthCalledWith(2,
        'http://localhost:3000/api/sessions/default',
        expect.objectContaining({
          method: 'GET'
        })
      );

      // Prüfe sendText call
      expect(fetch).toHaveBeenNthCalledWith(3,
        'http://localhost:3000/api/sendText',
        expect.objectContaining({
          method: 'POST'
        })
      );

      // Prüfe dass der Request Body korrekt ist
      const sendCall = (fetch as any).mock.calls[2];
      const requestBody = JSON.parse(sendCall[1].body);
      
      expect(requestBody).toEqual({
        session: 'default',
        chatId: 'integration@g.us',
        text: expect.stringContaining('Integration Task')
      });

      expect(result).toEqual({
        success: true,
        message: expect.stringContaining('erfolgreich gesendet'),
        messageId: 'integration-msg-123'
      });
    });

    it('sollte Fehler bei nicht verfügbarer API zurückgeben', async () => {
      // Mock ensureWahaRunning failure
      vi.mocked(fetch).mockRejectedValueOnce(new Error('ECONNREFUSED'));

      const result = await whatsappService.handleHotTaskCreated('Test Task');

      expect(result).toEqual({
        success: false,
        message: expect.stringContaining('WAHA nicht verfügbar')
      });
    }, 10000);
  });
});
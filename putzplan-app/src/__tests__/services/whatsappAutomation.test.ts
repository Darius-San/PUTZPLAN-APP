import { WhatsAppAutomation } from '../../services/whatsappAutomation';
import { vi, beforeEach, afterEach, describe, it, expect } from 'vitest';

// Mock window.open and focus
const mockWindow = {
  focus: vi.fn(),
  close: vi.fn(),
  closed: false,
  document: {
    querySelector: vi.fn(),
    addEventListener: vi.fn()
  }
} as any;

describe('WhatsAppAutomation', () => {
  let automation: WhatsAppAutomation;

  beforeEach(() => {
    vi.clearAllMocks();
    automation = WhatsAppAutomation.getInstance();
    
    // Mock window.open
    global.window = Object.create(window);
    Object.defineProperty(window, 'open', {
      value: vi.fn(() => mockWindow),
      writable: true
    });
  });

  afterEach(() => {
    // Clean up
    automation.cleanup();
  });

  it('should create singleton instance', () => {
    const instance1 = WhatsAppAutomation.getInstance();
    const instance2 = WhatsAppAutomation.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should open WhatsApp Web when sending message', async () => {
    const openSpy = vi.spyOn(window, 'open');
    await automation.sendMessage({
      recipient: '1234567890',
      message: 'Test message',
      debug: true
    });

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining('web.whatsapp.com'),
      'whatsapp',
      expect.any(String)
    );
  });

  it('should encode message and phone number correctly', async () => {
    const openSpy = vi.spyOn(window, 'open');
    const recipient = '1234567890';
    const message = 'Hello world! Special chars: äöü @#$%';
    await automation.sendMessage({ recipient, message, debug: true });
    
    const callArgs = openSpy.mock.calls[0];
    const url = callArgs[0] as string;
    
    expect(url).toContain(`phone=${recipient}`);
    expect(url).toContain('text=');
    // Should contain URL encoded special characters
    expect(url).toContain('%');
  });

  it('should handle popup blocker gracefully', async () => {
    // Mock window.open returning null (popup blocked)
    vi.spyOn(window, 'open').mockReturnValue(null);
    
    const onError = vi.fn();
    
    await automation.sendMessage({
      recipient: '1234567890',
      message: 'Test',
      onError
    });
    
    expect(onError).toHaveBeenCalledWith(
      expect.stringContaining('Popup wurde blockiert')
    );
  });

  it('should call onSuccess when message sent successfully', async () => {
    const onSuccess = vi.fn();
    
    // Mock successful automation
    mockWindow.document.querySelector.mockImplementation((selector: string) => {
      if (selector.includes('contenteditable')) return { focus: vi.fn(), dispatchEvent: vi.fn() };
      if (selector.includes('[aria-label*="Send"]')) return { click: vi.fn() };
      return null;
    });
    
    await automation.sendMessage({ recipient: '1234567890', message: 'Test', onSuccess, debug: true });
    expect(onSuccess).toHaveBeenCalled();
  });
});
import { dataManager } from './dataManager';

export interface WhatsAppAutomationOptions {
  recipient: string; // Telefonnummer oder Gruppenname
  message: string; // Nachricht die gesendet werden soll
  onSuccess?: () => void; // Callback bei erfolgreichem Senden
  onError?: (error: string) => void; // Callback bei Fehler
  debug?: boolean; // Wenn true: im Debug-Modus nicht auf WhatsApp-Web warten
}

export class WhatsAppAutomation {
  private static instance: WhatsAppAutomation;
  private whatsappWindow: Window | null = null;

  static getInstance(): WhatsAppAutomation {
    if (!WhatsAppAutomation.instance) {
      WhatsAppAutomation.instance = new WhatsAppAutomation();
    }
    return WhatsAppAutomation.instance;
  }

  async sendMessage(options: WhatsAppAutomationOptions): Promise<boolean> {
    const { recipient, message, onSuccess, onError, debug } = options;

    try {
      // 1. Öffne WhatsApp Web in neuem Fenster
      const whatsappUrl = `https://web.whatsapp.com/send?phone=${encodeURIComponent(recipient)}&text=${encodeURIComponent(message)}`;
      
      this.whatsappWindow = window.open(
        whatsappUrl,
        'whatsapp',
        'width=800,height=600,resizable=yes,scrollbars=yes'
      );

      if (!this.whatsappWindow) {
        throw new Error('Popup wurde blockiert - bitte Popup-Blocker deaktivieren');
      }

      // 2. Wenn wir im Debug-Modus sind, nicht auf das Laden von WhatsApp Web warten.
      const isDebugMode = !!debug || (typeof dataManager !== 'undefined' && typeof dataManager.isDebugMode === 'function' && dataManager.isDebugMode());
      if (isDebugMode) {
        // Sofort als erfolgreich behandeln (kein Polling)
        onSuccess?.();
        // Fenster trotzdem nach kurzer Verzögerung schließen (falls es geöffnet wurde)
        setTimeout(() => this.closeWhatsAppWindow(), 1000);
        return true;
      }

      // 3. Warte bis WhatsApp Web geladen ist und simuliere Enter-Taste
      await this.waitForWhatsAppAndSend();

      // 4. Schließe Fenster nach kurzer Verzögerung
      setTimeout(() => {
        this.closeWhatsAppWindow();
      }, 3000);

      onSuccess?.();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      onError?.(errorMessage);
      this.closeWhatsAppWindow();
      return false;
    }
  }

  private async waitForWhatsAppAndSend(): Promise<void> {
    return new Promise((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 30; // 15 Sekunden timeout

      const checkAndSend = () => {
        if (!this.whatsappWindow || this.whatsappWindow.closed) {
          reject(new Error('WhatsApp-Fenster wurde geschlossen'));
          return;
        }

        attempts++;
        if (attempts > maxAttempts) {
          reject(new Error('Timeout beim Laden von WhatsApp Web'));
          return;
        }

        try {
          // Versuche auf die Send-Button zu klicken oder Enter zu drücken
          // Dies ist eine vereinfachte Simulation - in der Praxis würde man
          // eine Browser-Extension oder eine andere Lösung verwenden
          
          // Simuliere Enter-Taste nach Laden
          if (attempts > 10) { // Warte etwas bis WhatsApp geladen ist
            this.whatsappWindow.focus();
            
            // Simuliere Tasteneingabe (funktioniert nur bedingt durch CORS/Security)
            // In einer echten Implementierung würde man eine Browser-Extension verwenden
            const event = new KeyboardEvent('keydown', {
              key: 'Enter',
              code: 'Enter',
              which: 13,
              keyCode: 13,
              bubbles: true
            });
            
            // Dispatche Event (wird durch CORS blockiert, aber für Demo-Zwecke)
            try {
              this.whatsappWindow.document?.dispatchEvent(event);
            } catch (e) {
              // CORS Error erwartet - ignorieren für Demo
            }
            
            resolve();
            return;
          }

          // Versuche erneut nach 500ms
          setTimeout(checkAndSend, 500);

        } catch (error) {
          // CORS-Errors sind normal - weiter versuchen
          setTimeout(checkAndSend, 500);
        }
      };

      // Starte erste Überprüfung nach kurzer Verzögerung
      setTimeout(checkAndSend, 1000);
    });
  }

  private closeWhatsAppWindow(): void {
    if (this.whatsappWindow && !this.whatsappWindow.closed) {
      this.whatsappWindow.close();
      this.whatsappWindow = null;
    }
  }

  // Utility method für Tests
  isWindowOpen(): boolean {
    return this.whatsappWindow !== null && !this.whatsappWindow.closed;
  }

  // Cleanup method
  cleanup(): void {
    this.closeWhatsAppWindow();
  }
}
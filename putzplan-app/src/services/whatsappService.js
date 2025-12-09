/**
 * WhatsApp Service für Hot Task Benachrichtigungen
 * Nutzt WAHA API (http://localhost:3000)
 */

const WAHA_CONFIG = {
  baseUrl: 'http://localhost:3000',
  apiKey: '96ee37b1f3424e819e7a20dcfe0f6fee',
  sessionName: 'default',
  // Deine WhatsApp-Nummer für Selbst-Nachrichten
  phoneNumber: '491724620111@c.us'
};

class WhatsAppService {
  /**
   * Prüft ob die WAHA API erreichbar ist
   */
  async checkApiStatus() {
    try {
      const response = await fetch(`${WAHA_CONFIG.baseUrl}/api/sessions`, {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) {
        console.log('✅ WAHA API ist erreichbar');
        return true;
      } else {
        console.log('❌ WAHA API antwortet nicht korrekt');
        return false;
      }
    } catch (error) {
      console.log('❌ WAHA API ist nicht erreichbar:', error.message);
      return false;
    }
  }

  /**
   * Startet die WAHA API über den Backend Server
   */
  async startWahaService() {
    try {
      console.log('🚀 Versuche WAHA Service über Backend zu starten...');
      
      const response = await fetch('http://localhost:5175/api/waha/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        const responseText = await response.text();
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          result = { success: false, message: 'Empty response from backend' };
        }
      } catch (jsonError) {
        console.warn('❌ JSON Parse Error in startWahaService:', jsonError.message);
        result = { success: false, message: 'Invalid JSON response from backend' };
      }
      
      if (result.success) {
        console.log('✅ WAHA Service erfolgreich gestartet');
        return {
          success: true,
          message: result.message
        };
      } else {
        console.log('❌ WAHA Service konnte nicht gestartet werden:', result.message);
        return {
          success: false,
          message: result.message || 'WAHA konnte nicht gestartet werden'
        };
      }
    } catch (error) {
      console.error('❌ Fehler beim Starten des WAHA Service:', error);
      return {
        success: false,
        message: `Backend-Fehler: ${error.message}`
      };
    }
  }

  /**
   * Prüft WAHA Status über Backend und versucht Auto-Start falls nötig
   */
  async ensureWahaRunning() {
    console.log('🔍 Prüfe WAHA Status über Backend...');
    
    try {
      const response = await fetch('http://localhost:5175/api/waha/ensure', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      let result;
      try {
        const responseText = await response.text();
        if (responseText.trim()) {
          result = JSON.parse(responseText);
        } else {
          result = { success: false, message: 'Empty response from backend' };
        }
      } catch (jsonError) {
        console.warn('❌ JSON Parse Error:', jsonError.message);
        result = { success: false, message: 'Invalid JSON response from backend' };
      }
      
      if (result.success) {
        console.log('✅ WAHA läuft bereits oder wurde erfolgreich gestartet');
        return { success: true, message: result.message };
      } else {
        console.log('❌ WAHA konnte nicht sichergestellt werden:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Backend-Fehler beim WAHA-Check:', error);
      
      // Fallback: Direct API check
      const isRunning = await this.checkApiStatus();
      if (isRunning) {
        console.log('✅ WAHA läuft bereits (direkter Check)');
        return { success: true, message: 'WAHA läuft bereits' };
      }
      
      return {
        success: false,
        message: 'WAHA nicht verfügbar und Backend-Check fehlgeschlagen'
      };
    }
  }

  /**
   * Prüft ob eine WhatsApp-Session aktiv ist
   */
  async checkSessionStatus() {
    try {
      const response = await fetch(`${WAHA_CONFIG.baseUrl}/api/sessions/${WAHA_CONFIG.sessionName}`, {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_CONFIG.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        let session;
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            session = JSON.parse(responseText);
          } else {
            session = { status: 'UNKNOWN' };
          }
        } catch (jsonError) {
          console.warn('❌ JSON Parse Error in checkSessionStatus:', jsonError.message);
          session = { status: 'UNKNOWN' };
        }
        
        console.log('📱 Session Status:', session.status);
        return session.status === 'WORKING';
      }
      
      return false;
    } catch (error) {
      console.error('❌ Fehler beim Prüfen der Session:', error);
      return false;
    }
  }

  /**
   * Hole die gespeicherte WhatsApp Gruppen-ID aus den WG Settings
   */
  getTargetGroupId() {
    try {
      // Dynamisch die aktuell gespeicherte Gruppen-ID laden
      const state = JSON.parse(localStorage.getItem('putzplan_state') || '{}');
      const currentWG = state.currentWG;
      
      if (currentWG?.settings?.whatsapp?.groupId) {
        console.log('📱 Verwende gespeicherte Gruppen-ID:', currentWG.settings.whatsapp.groupId);
        return currentWG.settings.whatsapp.groupId;
      }
      
      // Fallback auf Standard Target
      console.log('📱 Verwende Standard Target:', WAHA_CONFIG.phoneNumber);
      return WAHA_CONFIG.phoneNumber;
    } catch (error) {
      console.error('Fehler beim Laden der Gruppen-ID:', error);
      return WAHA_CONFIG.phoneNumber;
    }
  }

  /**
   * Test-Funktion: Zeigt aktuelle WhatsApp Einstellungen
   */
  debugCurrentSettings() {
    try {
      const state = JSON.parse(localStorage.getItem('putzplan_state') || '{}');
      const currentWG = state.currentWG;
      
      console.log('🔍 Debug WhatsApp Einstellungen:');
      console.log('Current WG:', currentWG?.name);
      console.log('WhatsApp Settings:', currentWG?.settings?.whatsapp);
      console.log('Target Group ID:', this.getTargetGroupId());
      
      if (currentWG?.settings?.whatsapp) {
        const settings = currentWG.settings.whatsapp;
        console.log('✅ Gespeicherte Einstellungen:');
        console.log('  - Group Name:', settings.groupName || 'Nicht gesetzt');
        console.log('  - Group ID:', settings.groupId || 'Nicht gesetzt');
        console.log('  - Enabled:', settings.enabled ? 'Ja' : 'Nein');
      } else {
        console.log('❌ Keine WhatsApp Einstellungen gefunden');
      }
      
      return currentWG?.settings?.whatsapp || null;
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
      return null;
    }
  }

  /**
   * Hole verfügbare WhatsApp-Gruppen von der WAHA API
   */
  async getAvailableGroups() {
    try {
      const response = await fetch(`${WAHA_CONFIG.baseUrl}/api/${WAHA_CONFIG.sessionName}/groups`, {
        method: 'GET',
        headers: {
          'X-Api-Key': WAHA_CONFIG.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        let groups;
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            groups = JSON.parse(responseText);
          } else {
            groups = [];
          }
        } catch (jsonError) {
          console.warn('❌ JSON Parse Error in getAvailableGroups:', jsonError.message);
          groups = [];
        }
        
        console.log('📱 Verfügbare Gruppen:', groups.length);
        return groups.map(group => ({
          id: group.id._serialized || group.id,
          name: group.name || 'Unbenannte Gruppe',
          isGroup: group.isGroup
        })).filter(group => group.isGroup);
      } else {
        console.error('❌ Fehler beim Laden der Gruppen:', response.statusText);
        return [];
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Gruppen:', error);
      return [];
    }
  }

  /**
   * Sendet eine Testnachricht zur Überprüfung der Funktionalität
   */
  async sendTestMessage() {
    try {
      // 1. Sicherstellen dass WAHA läuft
      console.log('🔄 Prüfe WAHA Status vor Testnachricht...');
      const wahaEnsured = await this.ensureWahaRunning();
      if (!wahaEnsured.success) {
        return { 
          success: false, 
          error: `WAHA nicht verfügbar: ${wahaEnsured.message}` 
        };
      }

      // 2. Session Status prüfen
      const sessionActive = await this.checkSessionStatus();
      if (!sessionActive) {
        return { 
          success: false, 
          error: 'WhatsApp Session ist nicht aktiv. Bitte QR-Code scannen.' 
        };
      }

      // 3. Nachricht senden
      const targetId = this.getTargetGroupId();
      const now = new Date().toLocaleString('de-DE');
      const message = `🧪 WhatsApp Test von Putzplan App\n⏰ ${now}\n✅ Die Integration funktioniert!`;
      
      const response = await fetch(`${WAHA_CONFIG.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': WAHA_CONFIG.apiKey
        },
        body: JSON.stringify({
          session: WAHA_CONFIG.sessionName,
          chatId: targetId,
          text: message
        })
      });

      if (response.ok) {
        let data;
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            data = JSON.parse(responseText);
          } else {
            data = { id: 'empty-response' };
          }
        } catch (jsonError) {
          console.warn('❌ JSON Parse Error in sendTestMessage:', jsonError.message);
          data = { id: 'json-parse-error' };
        }
        
        console.log('✅ Testnachricht erfolgreich gesendet:', data.id);
        return { 
          success: true, 
          messageId: data.id || 'unknown'
        };
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Senden der Testnachricht:', errorText);
        return { 
          success: false, 
          error: `HTTP ${response.status}: ${errorText}` 
        };
      }
    } catch (error) {
      console.error('Fehler beim Senden der Testnachricht:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  /**
   * Sendet eine Hot-Task-Benachrichtigung
   */
  async sendHotTaskNotification(taskName, taskDetails = '') {
    try {
      // 1. Sicherstellen dass WAHA läuft
      console.log('🔄 Prüfe WAHA Status vor Hot Task Benachrichtigung...');
      const wahaEnsured = await this.ensureWahaRunning();
      if (!wahaEnsured.success) {
        console.error('❌ WAHA nicht verfügbar:', wahaEnsured.message);
        return { 
          success: false, 
          error: `WAHA nicht verfügbar: ${wahaEnsured.message}` 
        };
      }

      // 2. Session Status prüfen
      const sessionActive = await this.checkSessionStatus();
      if (!sessionActive) {
        console.error('❌ WhatsApp Session nicht aktiv');
        return { 
          success: false, 
          error: 'WhatsApp Session ist nicht aktiv. Bitte QR-Code scannen.' 
        };
      }

      // 3. Nachricht senden
      const targetId = this.getTargetGroupId();
      console.log('📤 Sende Hot Task Benachrichtigung an:', targetId);
      
      const message = `🔥 HOT TASK ALERT! 🔥\n\n` +
                     `Aufgabe: ${taskName}\n` +
                     (taskDetails ? `Details: ${taskDetails}\n` : '') +
                     `\n⏰ Sofortige Aufmerksamkeit erforderlich!\n` +
                     `💡 Putzplan App - ${new Date().toLocaleString('de-DE')}`;

      const response = await fetch(`${WAHA_CONFIG.baseUrl}/api/sendText`, {
        method: 'POST',
        headers: {
          'X-Api-Key': WAHA_CONFIG.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          session: WAHA_CONFIG.sessionName,
          chatId: targetId,
          text: message
        })
      });

      if (response.ok) {
        let result;
        try {
          const responseText = await response.text();
          if (responseText.trim()) {
            result = JSON.parse(responseText);
          } else {
            result = { id: 'empty-response' };
          }
        } catch (jsonError) {
          console.warn('❌ JSON Parse Error in sendHotTaskNotification:', jsonError.message);
          result = { id: 'json-parse-error' };
        }
        
        console.log('✅ Hot Task Benachrichtigung gesendet:', result.id);
        return { success: true, messageId: result.id };
      } else {
        const errorText = await response.text();
        console.error('❌ Fehler beim Senden der Hot Task Nachricht:', errorText);
        return { success: false, error: errorText };
      }
    } catch (error) {
      console.error('❌ Fehler beim Senden der Hot Task Benachrichtigung:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Hauptfunktion: Prüft API, startet Service falls nötig, sendet Benachrichtigung
   */
  async handleHotTaskCreated(taskName, taskDetails = '') {
    console.log('🔥 Hot Task erstellt:', taskName);
    
    try {
      // 1. Direkte Nachricht senden (mit eingebautem WAHA Check)
      const result = await this.sendHotTaskNotification(taskName, taskDetails);
      
      if (result.success) {
        return {
          success: true,
          message: '🔥 Hot Task Benachrichtigung erfolgreich gesendet!',
          messageId: result.messageId
        };
      } else {
        return {
          success: false,
          message: `Fehler beim Senden der Benachrichtigung: ${result.error}`
        };
      }
    } catch (error) {
      console.error('❌ Unerwarteter Fehler bei Hot Task Behandlung:', error);
      return {
        success: false,
        message: `Unerwarteter Fehler: ${error.message}`
      };
    }
  }
}

// Exportiere eine Singleton-Instanz
export const whatsappService = new WhatsAppService();
export default whatsappService;
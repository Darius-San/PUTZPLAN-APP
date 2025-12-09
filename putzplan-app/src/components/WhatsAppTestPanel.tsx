import React, { useState } from 'react';
import { whatsappService } from '../services/whatsappService';
import { dataManager } from '../services/dataManager';

/**
 * Test-Komponente für WhatsApp-Funktionalität
 * Wird nur im Debug-Modus angezeigt
 */
export const WhatsAppTestPanel: React.FC = () => {
  const [status, setStatus] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  // Nur im Debug-Modus anzeigen
  if (!dataManager.isDebugMode()) {
    return null;
  }

  const handleApiCheck = async () => {
    setLoading(true);
    setStatus('🔍 Prüfe WAHA API Status...');
    
    const isRunning = await whatsappService.checkApiStatus();
    setStatus(isRunning ? '✅ WAHA API läuft' : '❌ WAHA API läuft nicht');
    setLoading(false);
  };

  const handleSessionCheck = async () => {
    setLoading(true);
    setStatus('📱 Prüfe WhatsApp Session...');
    
    const isActive = await whatsappService.checkSessionStatus();
    setStatus(isActive ? '✅ WhatsApp Session aktiv' : '❌ WhatsApp Session nicht aktiv');
    setLoading(false);
  };

  const handleSendTest = async () => {
    setLoading(true);
    setStatus('📤 Sende Testnachricht...');
    
    const result = await whatsappService.sendTestMessage();
    setStatus(result.success 
      ? `✅ Testnachricht gesendet! (ID: ${result.messageId})`
      : `❌ Fehler: ${result.error}`
    );
    setLoading(false);
  };

  const handleHotTaskTest = async () => {
    setLoading(true);
    setStatus('🔥 Teste Hot Task Benachrichtigung...');
    
    const result = await whatsappService.handleHotTaskCreated(
      'Test Hot Task', 
      'Dies ist ein Test für die Hot Task Benachrichtigung'
    );
    
    setStatus(result.success ? result.message : `❌ ${result.message}`);
    setLoading(false);
  };

  const handleDebugSettings = () => {
    setStatus('🔍 Lade gespeicherte Einstellungen...');
    const settings = whatsappService.debugCurrentSettings();
    
    if (settings) {
      setStatus(`✅ Einstellungen gefunden:\n📝 Name: ${settings.groupName || 'Nicht gesetzt'}\n🆔 ID: ${settings.groupId || 'Nicht gesetzt'}`);
    } else {
      setStatus('❌ Keine WhatsApp Einstellungen gefunden');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: '10px',
      right: '10px',
      background: 'white',
      border: '2px solid #ccc',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
      zIndex: 9999,
      minWidth: '300px'
    }}>
      <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>🧪 WhatsApp Test Panel (Debug)</h3>
      
      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={handleApiCheck}
          disabled={loading}
          style={{
            padding: '8px 12px',
            marginRight: '8px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          API Status prüfen
        </button>
        
        <button 
          onClick={handleSessionCheck}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          Session prüfen
        </button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={handleSendTest}
          disabled={loading}
          style={{
            padding: '8px 12px',
            marginRight: '8px',
            backgroundColor: '#ffc107',
            color: 'black',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          Testnachricht senden
        </button>
        
        <button 
          onClick={handleHotTaskTest}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          🔥 Hot Task Test
        </button>
      </div>
      
      <div style={{ marginBottom: '12px' }}>
        <button 
          onClick={handleDebugSettings}
          disabled={loading}
          style={{
            padding: '8px 12px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            width: '100%'
          }}
        >
          🔍 Einstellungen anzeigen
        </button>
      </div>
      
      {status && (
        <div style={{
          padding: '8px',
          backgroundColor: '#f8f9fa',
          borderRadius: '4px',
          fontSize: '14px',
          wordWrap: 'break-word'
        }}>
          {status}
        </div>
      )}
      
      {loading && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#666'
        }}>
          ⏳ Lädt...
        </div>
      )}
    </div>
  );
};

export default WhatsAppTestPanel;
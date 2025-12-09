/**
 * Manuelle Persistierungs-Test für WhatsApp-Einstellungen
 */

// Funktion um die aktuellen WhatsApp-Einstellungen zu prüfen
function testWhatsAppPersistence() {
  console.log('🔍 Teste WhatsApp-Einstellungen Persistierung...');
  
  // 1. Lade aktuelle Settings aus localStorage
  const state = JSON.parse(localStorage.getItem('putzplan_state') || '{}');
  console.log('📦 Aktueller State:', state);
  
  if (state.currentWG) {
    console.log('🏠 Aktuelle WG:', state.currentWG.name);
    console.log('📱 WhatsApp Settings:', state.currentWG.settings?.whatsapp);
    
    if (state.currentWG.settings?.whatsapp) {
      const whatsapp = state.currentWG.settings.whatsapp;
      console.log('✅ WhatsApp konfiguriert:');
      console.log('  - Group Name:', whatsapp.groupName || 'Nicht gesetzt');
      console.log('  - Group ID:', whatsapp.groupId || 'Nicht gesetzt');
      console.log('  - Enabled:', whatsapp.enabled ? 'Ja' : 'Nein');
    } else {
      console.log('❌ Keine WhatsApp-Einstellungen gefunden');
    }
  } else {
    console.log('❌ Keine WG gefunden');
  }
  
  return state.currentWG?.settings?.whatsapp;
}

// Funktion um Test-Einstellungen zu setzen
function setTestWhatsAppSettings() {
  console.log('💾 Setze Test-WhatsApp-Einstellungen...');
  
  const state = JSON.parse(localStorage.getItem('putzplan_state') || '{}');
  
  if (state.currentWG) {
    state.currentWG.settings = state.currentWG.settings || {};
    state.currentWG.settings.whatsapp = {
      groupName: 'Test WG Gruppe',
      groupId: '123456789@g.us',
      enabled: true
    };
    
    localStorage.setItem('putzplan_state', JSON.stringify(state));
    console.log('✅ Test-Einstellungen gesetzt!');
  } else {
    console.log('❌ Keine WG zum Testen gefunden');
  }
}

// Exports für Browser-Console
window.testWhatsAppPersistence = testWhatsAppPersistence;
window.setTestWhatsAppSettings = setTestWhatsAppSettings;

// Automatischer Test beim Laden
testWhatsAppPersistence();
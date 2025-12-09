// Konfiguration für Datenmanagement
// Ermöglicht einfaches Umschalten zwischen localStorage und Server-Modus

export const APP_CONFIG = {
  // Storage-Modus: 'localStorage' oder 'server'
  STORAGE_MODE: (import.meta.env.VITE_STORAGE_MODE || 'localStorage') as 'localStorage' | 'server',
  
  // Server-Einstellungen
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || '',
  
  // Debug-Modus
  DEBUG: import.meta.env.VITE_DEBUG === 'true' || false,
  
  // App-Informationen
  APP_VERSION: '1.0.0',
  APP_NAME: 'Putzplan App'
};

console.log(`📱 App Config:`, {
  storageMode: APP_CONFIG.STORAGE_MODE,
  apiBase: APP_CONFIG.API_BASE_URL,
  debug: APP_CONFIG.DEBUG
});
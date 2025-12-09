// Data Manager - wählt automatisch zwischen localStorage und Server
// Basierend auf VITE_STORAGE_MODE Environment Variable

import { APP_CONFIG } from '../config/appConfig';

// Import der Manager
import { dataManager as localDataManager } from './dataManager';
import serverDataManager from './serverDataManager';

// Exportiere den entsprechenden Manager basierend auf der Konfiguration
let activeDataManager: any;

if (APP_CONFIG.STORAGE_MODE === 'server') {
  console.log('📡 Using server-based data storage');
  activeDataManager = serverDataManager;
} else {
  console.log('📱 Using localStorage-based data storage');
  activeDataManager = localDataManager;
}

// Info-Log
console.log(`📱 Data Manager initialized: ${APP_CONFIG.STORAGE_MODE} mode`);

// Export des aktiven Managers
export default activeDataManager;

// Zusätzliche Utility-Funktionen
export const getStorageMode = () => APP_CONFIG.STORAGE_MODE;
export const isServerMode = () => APP_CONFIG.STORAGE_MODE === 'server';
export const isLocalStorageMode = () => APP_CONFIG.STORAGE_MODE === 'localStorage';

// Force save für Server-Mode
export const forceSave = async (): Promise<void> => {
  if (isServerMode() && 'forceSave' in activeDataManager) {
    await activeDataManager.forceSave();
  }
};

// Sync Status für Server-Mode
export const getSyncStatus = (): { isOnline: boolean; pendingChanges: boolean } | null => {
  if (isServerMode() && 'getSyncStatus' in activeDataManager) {
    return activeDataManager.getSyncStatus();
  }
  return null;
};
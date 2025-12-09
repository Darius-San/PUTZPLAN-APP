// Universal Data Manager
// Wählt automatisch zwischen localStorage und Server-basierter Speicherung

import { APP_CONFIG } from '../config/appConfig';
import { AppState } from '../types';

// Import beide Manager
import { dataManager as localDataManager } from './dataManager';
import serverDataManager from './serverDataManager';

// Universal Manager Class - fungiert als Proxy
class UniversalDataManager {
  private get activeManager() {
    // Wähle den Manager basierend auf der Konfiguration
    if (APP_CONFIG.STORAGE_MODE === 'server') {
      return serverDataManager;
    } else {
      return localDataManager;
    }
  }

  // Proxy alle Zugriffe an den aktiven Manager
  get getState() { return this.activeManager.getState.bind(this.activeManager); }
  get getCurrentWG() { return this.activeManager.getCurrentWG.bind(this.activeManager); }
  get createUser() { return this.activeManager.createUser.bind(this.activeManager); }
  get updateUser() { return this.activeManager.updateUser.bind(this.activeManager); }
  get addUser() { return this.activeManager.addUser.bind(this.activeManager); }
  get setCurrentUser() { return this.activeManager.setCurrentUser.bind(this.activeManager); }
  get clearCurrentUser() { return this.activeManager.clearCurrentUser.bind(this.activeManager); }
  get createWG() { return this.activeManager.createWG.bind(this.activeManager); }
  get updateWG() { return this.activeManager.updateWG.bind(this.activeManager); }
  get addWG() { return this.activeManager.addWG.bind(this.activeManager); }
  get clearCurrentWG() { return this.activeManager.clearCurrentWG.bind(this.activeManager); }
  get joinWG() { return this.activeManager.joinWG.bind(this.activeManager); }
  get addMemberToWG() { return this.activeManager.addMemberToWG.bind(this.activeManager); }
  get createTask() { return this.activeManager.createTask.bind(this.activeManager); }
  get updateTask() { return this.activeManager.updateTask.bind(this.activeManager); }
  get addTask() { return this.activeManager.addTask.bind(this.activeManager); }
  get deleteTask() { return this.activeManager.deleteTask.bind(this.activeManager); }
  get executeTask() { return this.activeManager.executeTask.bind(this.activeManager); }
  get executeTaskForUser() { return this.activeManager.executeTaskForUser.bind(this.activeManager); }
  get addExecution() { return this.activeManager.addExecution.bind(this.activeManager); }
  get verifyExecution() { return this.activeManager.verifyExecution.bind(this.activeManager); }
  get rateExecution() { return this.activeManager.rateExecution.bind(this.activeManager); }
  get rateTask() { return this.activeManager.rateTask.bind(this.activeManager); }
  get upsertTaskRating() { return this.activeManager.upsertTaskRating.bind(this.activeManager); }
  get upsertTaskRatingForUser() { return this.activeManager.upsertTaskRatingForUser.bind(this.activeManager); }
  get recalculateTaskPoints() { return this.activeManager.recalculateTaskPoints.bind(this.activeManager); }
  get addAbsence() { return this.activeManager.addAbsence.bind(this.activeManager); }
  get removeAbsence() { return this.activeManager.removeAbsence.bind(this.activeManager); }
  get addTemporaryResident() { return this.activeManager.addTemporaryResident.bind(this.activeManager); }
  get removeTemporaryResident() { return this.activeManager.removeTemporaryResident.bind(this.activeManager); }
  get createNotification() { return this.activeManager.createNotification.bind(this.activeManager); }
  get markNotificationAsRead() { return this.activeManager.markNotificationAsRead.bind(this.activeManager); }
  get subscribe() { return this.activeManager.subscribe.bind(this.activeManager); }
  get clearAllData() { return this.activeManager.clearAllData.bind(this.activeManager); }
  get clearAll() { return this.activeManager.clearAll.bind(this.activeManager); }
  get exportData() { return this.activeManager.exportData.bind(this.activeManager); }
  
  // Debug methods
  get isDebugMode() { 
    if ('isDebugMode' in this.activeManager) {
      return this.activeManager.isDebugMode.bind(this.activeManager);
    }
    return () => this.activeManager.getDebugMode();
  }
  
  get toggleDebugMode() { 
    if ('toggleDebugMode' in this.activeManager) {
      return this.activeManager.toggleDebugMode.bind(this.activeManager);
    }
    return () => this.activeManager.setDebugMode(!this.activeManager.getDebugMode());
  }

  // Zusätzliche Methoden für Server-Manager
  async forceSave(): Promise<void> {
    if ('forceSave' in this.activeManager) {
      await (this.activeManager as any).forceSave();
    }
  }

  getSyncStatus(): { isOnline: boolean; pendingChanges: boolean } | null {
    if ('getSyncStatus' in this.activeManager) {
      return (this.activeManager as any).getSyncStatus();
    }
    return null;
  }

  // Utility-Methoden
  getStorageMode(): 'localStorage' | 'server' {
    return APP_CONFIG.STORAGE_MODE;
  }

  isServerMode(): boolean {
    return APP_CONFIG.STORAGE_MODE === 'server';
  }

  isLocalStorageMode(): boolean {
    return APP_CONFIG.STORAGE_MODE === 'localStorage';
  }

  // Info-Methode
  getManagerInfo(): { mode: string; manager: string; config: typeof APP_CONFIG } {
    const managerName = this.isServerMode() ? 'ServerDataManager' : 'DataManager';
    console.log(`📱 Data Manager: ${managerName} (${APP_CONFIG.STORAGE_MODE} mode)`);
    
    return {
      mode: APP_CONFIG.STORAGE_MODE,
      manager: managerName,
      config: APP_CONFIG
    };
  }
}

// Create singleton instance
const universalDataManager = new UniversalDataManager();
export default universalDataManager;
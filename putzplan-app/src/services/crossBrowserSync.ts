/**
 * Cross-Browser Synchronization Service
 * Ensures data consistency between Simple Browser and regular browsers
 */

import { AppState } from '../types';

const SYNC_KEY = 'putzplan-sync';
const SYNC_VERSION = '1.0';
const STORAGE_KEY = 'putzplan-data';

interface SyncData {
  version: string;
  timestamp: number;
  data: any;
  browserContext: string;
}

class CrossBrowserSyncService {
  private syncInterval: number | null = null;
  
  /**
   * Initialize cross-browser synchronization
   */
  public init(): void {
    // Listen for storage changes from other browser contexts
    window.addEventListener('storage', this.handleStorageChange.bind(this));
    
    // Start periodic sync check
    this.startSyncInterval();
    
    // Initial sync check
    this.checkForUpdates();
  }

  /**
   * Handle storage changes from other browser contexts
   */
  private handleStorageChange(event: StorageEvent): void {
    if (event.key === SYNC_KEY && event.newValue) {
      console.log('[CrossBrowserSync] Storage change detected from another browser context');
      this.applyRemoteData(event.newValue);
    }
  }

  /**
   * Save data with sync metadata
   */
  public saveWithSync(data: any): void {
    const syncData: SyncData = {
      version: SYNC_VERSION,
      timestamp: Date.now(),
      data,
      browserContext: this.getBrowserContext()
    };

    // Save to both keys for redundancy
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(SYNC_KEY, JSON.stringify(syncData));
    
    console.log('[CrossBrowserSync] Data saved with sync metadata');
  }

  /**
   * Load data with sync check
   */
  public loadWithSync(): any | null {
    // First check for sync data
    const syncDataStr = localStorage.getItem(SYNC_KEY);
    const mainDataStr = localStorage.getItem(STORAGE_KEY);

    if (syncDataStr) {
      try {
        const syncData: SyncData = JSON.parse(syncDataStr);
        
        // If sync data is newer or main data is missing, use sync data
        if (syncData.data && (!mainDataStr || this.isSyncNewer(syncData))) {
          console.log('[CrossBrowserSync] Using sync data (newer or main missing)');
          // Also update main storage
          localStorage.setItem(STORAGE_KEY, JSON.stringify(syncData.data));
          return syncData.data;
        }
      } catch (error) {
        console.error('[CrossBrowserSync] Error parsing sync data:', error);
      }
    }

    // Fallback to main data
    if (mainDataStr) {
      try {
        const mainData = JSON.parse(mainDataStr);
        // Update sync data to match main data
        this.saveWithSync(mainData);
        return mainData;
      } catch (error) {
        console.error('[CrossBrowserSync] Error parsing main data:', error);
      }
    }

    return null;
  }

  /**
   * Check if sync data is newer than local data
   */
  private isSyncNewer(syncData: SyncData): boolean {
    const localSyncStr = localStorage.getItem(SYNC_KEY);
    if (!localSyncStr) return true;

    try {
      const localSync: SyncData = JSON.parse(localSyncStr);
      return syncData.timestamp > localSync.timestamp;
    } catch {
      return true;
    }
  }

  /**
   * Apply remote data from another browser context
   */
  private applyRemoteData(syncDataStr: string): void {
    try {
      const syncData: SyncData = JSON.parse(syncDataStr);
      
      if (this.isSyncNewer(syncData)) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(syncData.data));
        console.log('[CrossBrowserSync] Applied remote data from', syncData.browserContext);
        
        // Trigger a storage event for the app to reload
        window.dispatchEvent(new StorageEvent('storage', {
          key: STORAGE_KEY,
          newValue: JSON.stringify(syncData.data),
          oldValue: null,
          storageArea: localStorage
        }));
      }
    } catch (error) {
      console.error('[CrossBrowserSync] Error applying remote data:', error);
    }
  }

  /**
   * Start periodic sync check
   */
  private startSyncInterval(): void {
    this.syncInterval = window.setInterval(() => {
      this.checkForUpdates();
    }, 5000); // Check every 5 seconds
  }

  /**
   * Check for updates from other browser contexts
   */
  private checkForUpdates(): void {
    const syncDataStr = localStorage.getItem(SYNC_KEY);
    if (syncDataStr) {
      try {
        const syncData: SyncData = JSON.parse(syncDataStr);
        
        // If this browser context didn't create this data, apply it
        if (syncData.browserContext !== this.getBrowserContext() && this.isSyncNewer(syncData)) {
          this.applyRemoteData(syncDataStr);
        }
      } catch (error) {
        console.error('[CrossBrowserSync] Error checking for updates:', error);
      }
    }
  }

  /**
   * Get browser context identifier
   */
  private getBrowserContext(): string {
    // Detect if we're in VS Code Simple Browser
    if (window.navigator.userAgent.includes('VSCode')) {
      return 'vscode-simple-browser';
    }
    
    // Detect Chrome
    if (window.navigator.userAgent.includes('Chrome')) {
      return 'chrome';
    }
    
    // Fallback
    return `unknown-${Date.now()}`;
  }

  /**
   * Force sync all data immediately
   */
  public forceSyncNow(): void {
    console.log('[CrossBrowserSync] Force sync initiated');
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      this.saveWithSync(JSON.parse(data));
    }
  }

  /**
   * Cleanup when service is destroyed
   */
  public destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }
}

export const crossBrowserSync = new CrossBrowserSyncService();
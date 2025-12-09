// Server-basierter Settings Manager
// Speichert App-Einstellungen auf dem Server statt im localStorage

export interface AppSettings {
  theme: 'light' | 'dark' | 'auto';
  notifications: boolean;
  language: 'de' | 'en';
  dashboardWidth: 'narrow' | 'normal' | 'wide';
  whatsapp?: {
    groupName: string;
    groupId: string;
    enabled: boolean;
  };
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  notifications: true,
  language: 'de',
  dashboardWidth: 'normal'
};

class ServerSettingsManager {
  private settings: AppSettings = { ...defaultSettings };
  private saveTimeout: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private pendingChanges: boolean = false;

  constructor() {
    this.loadFromServer();
    this.setupOnlineDetection();
  }

  private setupOnlineDetection() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (this.pendingChanges) {
          this.saveToServer();
        }
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private async loadFromServer(): Promise<void> {
    try {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const settings = await response.json();
      this.settings = { ...defaultSettings, ...settings };
      console.log('📡 Settings loaded from server');
      
    } catch (error) {
      console.error('❌ Error loading settings from server:', error);
      console.log('📱 Using default settings');
      this.settings = { ...defaultSettings };
    }
  }

  private async saveToServer(): Promise<void> {
    if (!this.isOnline) {
      this.pendingChanges = true;
      console.log('📡 Offline - saving settings for later');
      return;
    }

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.settings)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.pendingChanges = false;
      console.log('💾 Settings saved to server');
      
    } catch (error) {
      console.error('❌ Error saving settings to server:', error);
      this.pendingChanges = true;
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveToServer();
    }, 300); // Save 300ms after last change
  }

  // Public API
  getSettings(): AppSettings {
    return { ...this.settings };
  }

  updateSettings(updates: Partial<AppSettings>): void {
    this.settings = { ...this.settings, ...updates };
    this.debouncedSave();
  }

  getTheme(): AppSettings['theme'] {
    return this.settings.theme;
  }

  setTheme(theme: AppSettings['theme']): void {
    this.settings.theme = theme;
    this.debouncedSave();
  }

  getNotifications(): boolean {
    return this.settings.notifications;
  }

  setNotifications(enabled: boolean): void {
    this.settings.notifications = enabled;
    this.debouncedSave();
  }

  getLanguage(): AppSettings['language'] {
    return this.settings.language;
  }

  setLanguage(language: AppSettings['language']): void {
    this.settings.language = language;
    this.debouncedSave();
  }

  getDashboardWidth(): AppSettings['dashboardWidth'] {
    return this.settings.dashboardWidth;
  }

  setDashboardWidth(width: AppSettings['dashboardWidth']): void {
    this.settings.dashboardWidth = width;
    this.debouncedSave();
  }

  getWhatsAppSettings(): AppSettings['whatsapp'] {
    return this.settings.whatsapp;
  }

  setWhatsAppSettings(whatsapp: AppSettings['whatsapp']): void {
    this.settings.whatsapp = whatsapp;
    this.debouncedSave();
  }

  // Force immediate save
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveToServer();
  }

  // Get sync status
  getSyncStatus(): { isOnline: boolean; pendingChanges: boolean } {
    return {
      isOnline: this.isOnline,
      pendingChanges: this.pendingChanges
    };
  }
}

// Create singleton instance
const serverSettingsManager = new ServerSettingsManager();
export default serverSettingsManager;
export interface AppSettings {
  taskTable: {
    columnSpacing: number; // 1-5, entspricht px-1 bis px-5
  };
  dashboard: {
    // 1-5 scale where 1 = widest, 5 = narrowest
    buttonWidth: number;
    sizing: {
      // numeric pixel values for clarity in UI; mapped to tailwind classes
      heightMobile: number; // px, e.g., 56 -> h-14
      heightMd: number; // px, e.g., 64 -> md:h-16
      textMobile: number; // px, e.g., 18 -> text-lg
      textMd: number; // px, e.g., 20 -> md:text-xl
      paddingX: number; // px, e.g., 24 -> px-6
      iconSize: number; // px, e.g., 32 -> w-8 h-8
      gap: number; // px, e.g., 16 -> gap-4
    };
  };
  // Hot task one-time bonus settings
  hotTaskBonus: {
    enabled: boolean;
    percent: number; // e.g., 50 means +50% points for next execution
  };
}

export interface SettingsChangeListener {
  (settings: AppSettings): void;
}

class SettingsManager {
  private settings: AppSettings;
  private listeners: SettingsChangeListener[] = [];
  private storageKey = 'putzplan_settings';

  constructor() {
    this.settings = this.getDefaultSettings();
    this.loadFromStorage();
  }

  private getDefaultSettings(): AppSettings {
    return {
      taskTable: {
        columnSpacing: 3, // Standard px-3
      },
      dashboard: {
        buttonWidth: 3, // default medium width
        sizing: {
          heightMobile: 56, // h-14
          heightMd: 64, // h-16
          textMobile: 18, // text-lg
          textMd: 20, // text-xl
          paddingX: 24, // px-6
          iconSize: 32, // w-8 h-8
          gap: 16, // gap-4
        },
      },
      hotTaskBonus: {
        enabled: false,
        percent: 50
      }
    };
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Merge with defaults to handle new settings
        const defaults = this.getDefaultSettings();
        this.settings = {
          ...defaults,
          ...parsed,
          taskTable: {
            ...defaults.taskTable,
            ...(parsed.taskTable || {}),
          },
          dashboard: {
            ...defaults.dashboard,
            ...(parsed.dashboard || {}),
            sizing: {
              ...defaults.dashboard.sizing,
              ...((parsed.dashboard && parsed.dashboard.sizing) || {}),
            },
          },
        };
        console.log('📱 [Settings] Loaded from localStorage:', this.settings);
      }
    } catch (error) {
      console.warn('📱 [Settings] Failed to load from localStorage:', error);
      this.settings = this.getDefaultSettings();
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
      console.log('💾 [Settings] Saved to localStorage:', this.settings);
    } catch (error) {
      console.warn('💾 [Settings] Failed to save to localStorage:', error);
    }
  }

  public getSettings(): AppSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<AppSettings>): void {
    const oldSettings = { ...this.settings };
    
    // Deep merge
    this.settings = {
      ...this.settings,
      ...newSettings,
      taskTable: {
        ...this.settings.taskTable,
        ...(newSettings.taskTable || {}),
      },
    };

    this.saveToStorage();
    this.notifyListeners();
    
    console.log('🔄 [Settings] Updated:', {
      from: oldSettings,
      to: this.settings,
    });
  }

  public updateTaskTableSettings(taskTableSettings: Partial<AppSettings['taskTable']>): void {
    this.updateSettings({
      taskTable: {
        ...this.settings.taskTable,
        ...taskTableSettings,
      },
    });
  }

  public subscribe(listener: SettingsChangeListener): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getSettings());
      } catch (error) {
        console.warn('📱 [Settings] Listener error:', error);
      }
    });
  }

  public reset(): void {
    this.settings = this.getDefaultSettings();
    this.saveToStorage();
    this.notifyListeners();
    console.log('🔄 [Settings] Reset to defaults');
  }

  // Utility methods for common settings
  public getColumnSpacingClass(): string {
    const spacing = this.settings.taskTable.columnSpacing;
    // Return a direct px-{n} string so tests can assert edge values as well
    if (typeof spacing === 'number' && Number.isFinite(spacing)) {
      return `px-${spacing}`;
    }
    return 'px-3';
  }

  // Dashboard helpers
  public getDashboardButtonWidthClass(): string {
    const width = this.settings.dashboard?.buttonWidth ?? 3;
    // Map scale (1..5) to tailwind width classes
    const map = [
      'w-11/12 md:w-10/12', // 1 - widest
      'w-9/12 md:w-6/12',   // 2
      'w-7/12 md:w-5/12',   // 3 - default
      'w-6/12 md:w-4/12',   // 4
      'w-5/12 md:w-3/12',   // 5 - narrowest
    ];
    return map[Math.max(0, Math.min(4, width - 1))] || map[2];
  }

  // Map numeric sizing values to Tailwind utility classes for buttons
  public getDashboardButtonSizeClass(): string {
    const s = this.settings?.dashboard?.sizing || this.getDefaultSettings().dashboard.sizing;
    // Height mapping
    const heightMap: Record<number, string> = {
      48: 'h-12', // 48px
      56: 'h-14', // 56px
      64: 'h-16',
      72: 'h-18',
    };
    const textMap: Record<number, string> = {
      16: 'text-base',
      18: 'text-lg',
      20: 'text-xl',
      24: 'text-2xl',
    };
    const paddingMap: Record<number, string> = {
      16: 'px-4',
      20: 'px-5',
      24: 'px-6',
      32: 'px-8',
    };
    const gapMap: Record<number, string> = {
      8: 'gap-2',
      12: 'gap-3',
      16: 'gap-4',
      20: 'gap-5',
    };

    const hMobile = heightMap[s.heightMobile] || 'h-14';
    const hMd = heightMap[s.heightMd] ? `md:${heightMap[s.heightMd]}` : 'md:h-16';
    const txtMobile = textMap[s.textMobile] || 'text-lg';
    const txtMd = textMap[s.textMd] ? `md:${textMap[s.textMd]}` : 'md:text-xl';
    const px = paddingMap[s.paddingX] || 'px-6';
    const gap = gapMap[s.gap] || 'gap-4';

    return `${hMobile} ${hMd} ${px} ${txtMobile} ${txtMd} ${gap}`;
  }

  public getDashboardIconClass(): string {
    const sizeMap: Record<number, string> = {
      24: 'w-6 h-6',
      28: 'w-7 h-7',
      32: 'w-8 h-8',
      40: 'w-10 h-10',
    };
    return sizeMap[this.settings.dashboard.sizing.iconSize] || 'w-8 h-8';
  }

  public getColumnSpacingMdClass(): string {
    const spacing = this.settings.taskTable.columnSpacing;
    if (typeof spacing === 'number' && Number.isFinite(spacing)) {
      return `md:px-${Math.max(0, spacing + 1)}`; // keep an offset for MD size mapping
    }
    return 'md:px-4';
  }
}

// Singleton instance
export const settingsManager = new SettingsManager();

// React hook for easy usage
import { useState, useEffect } from 'react';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(settingsManager.getSettings());

  useEffect(() => {
    const unsubscribe = settingsManager.subscribe(setSettings);
    return unsubscribe;
  }, []);

  return {
    settings,
    updateSettings: settingsManager.updateSettings.bind(settingsManager),
    updateTaskTableSettings: settingsManager.updateTaskTableSettings.bind(settingsManager),
    reset: settingsManager.reset.bind(settingsManager),
    getColumnSpacingClass: settingsManager.getColumnSpacingClass.bind(settingsManager),
    getColumnSpacingMdClass: settingsManager.getColumnSpacingMdClass.bind(settingsManager),
    getDashboardButtonWidthClass: settingsManager.getDashboardButtonWidthClass.bind(settingsManager),
    getDashboardButtonSizeClass: settingsManager.getDashboardButtonSizeClass.bind(settingsManager),
    getDashboardIconClass: settingsManager.getDashboardIconClass.bind(settingsManager),
  };
}
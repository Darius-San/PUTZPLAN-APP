import { describe, it, expect, beforeEach } from 'vitest';
import { settingsManager } from '../../services/settingsManager';

describe('Settings save/load', () => {
  beforeEach(() => {
    localStorage.clear();
    settingsManager.reset();
  });

  it('persists hotTaskBonus when updated via updateSettings', () => {
    const s = settingsManager.getSettings();
    expect(s.hotTaskBonus.enabled).toBe(false);

    settingsManager.updateSettings({ hotTaskBonus: { enabled: true, percent: 30 } });

    const loaded = settingsManager.getSettings();
    expect(loaded.hotTaskBonus.enabled).toBe(true);
    expect(loaded.hotTaskBonus.percent).toBe(30);

    // Simulate a new manager reading from storage
    const raw = localStorage.getItem('putzplan_settings') as string;
    const parsed = JSON.parse(raw);
    expect(parsed.hotTaskBonus.enabled).toBe(true);
  });
});

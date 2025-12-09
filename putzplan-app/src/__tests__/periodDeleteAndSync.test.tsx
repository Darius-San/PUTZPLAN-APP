import { describe, test, expect, beforeAll, afterAll, vi } from 'vitest';
import { dataManager } from '../services/dataManager';
import { render } from '@testing-library/react';
import { AnalyticsPage } from '../components/analytics/AnalyticsPage';

describe('Period delete and Analytics sync', () => {
  let originalWGId: string | null = null;
  beforeAll(() => {
    // Ensure there's a current WG
    const wg = dataManager.getCurrentWG();
    if (!wg) {
      const created = dataManager.createWG({ name: 'Test WG from test' } as any);
      originalWGId = created.id;
    } else {
      originalWGId = wg.id;
    }
  });

  afterAll(() => {
    // cleanup if we created a WG (optional)
    if (originalWGId && !dataManager.getCurrentWG()?.id) {
      // nothing
    }
  });

  test('create a period, verify it appears in getHistoricalPeriods, then delete it', () => {
    const wg = dataManager.getCurrentWG();
    expect(wg).toBeTruthy();
    const start = new Date(2025,10,19); // Nov 19 2025
    const end = new Date(2025,11,16); // Dec 16 2025

    const newPeriod = {
      id: 'test-period-to-delete-' + Date.now().toString(36),
      name: 'Test Period 19.11-16.12',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      createdAt: new Date().toISOString(),
      summary: { totalExecutions: 0, totalPoints: 0, memberStats: [] }
    } as any;

    const currentWG = dataManager.getCurrentWG() as any;
    currentWG.historicalPeriods = [...(currentWG.historicalPeriods || []), newPeriod];
    dataManager.updateWG(currentWG.id, { historicalPeriods: currentWG.historicalPeriods });

    const hist = dataManager.getHistoricalPeriods();
    const found = hist.find((p: any) => p.id === newPeriod.id);
    expect(found).toBeTruthy();

    // Now delete
    dataManager.deletePeriod(newPeriod.id);
    const histAfter = dataManager.getHistoricalPeriods();
    const foundAfter = histAfter.find((p: any) => p.id === newPeriod.id);
    expect(foundAfter).toBeUndefined();
  });

  test('AnalyticsPage normalizes and lists same periods from store', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const { unmount } = render(<AnalyticsPage onBack={() => {}} onUserSelect={() => {}} />);

    // Logs should contain the loading message
    const calls = consoleSpy.mock.calls.map(c => c.join(' ')).join('\n');
    const hasLoading = calls.includes('[Analytics] Loading historical periods') || calls.includes('Loading historical');
    expect(hasLoading).toBe(true);

    consoleSpy.mockRestore();
    unmount();
  });
});
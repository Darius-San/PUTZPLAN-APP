/**
 * @vitest-environment jsdom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('getHistoricalPeriods normalization', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  test('historical periods are deduped and normalized when mixed with periods list', () => {
    // Create WG and add multiple periods including duplicates / overlaps
    const wgId = dataManager.createWG({ name: 'HistTest WG', members: [{ name: 'M', email: 'm@example.com', targetMonthlyPoints: 100 }] } as any);
    dataManager.setCurrentWG(wgId);

    // Create several periods
    const p1 = dataManager.setCustomPeriod(new Date('2024-11-01'), new Date('2024-11-30'), false);
    const p2 = dataManager.setCustomPeriod(new Date('2024-12-01'), new Date('2024-12-31'), false);

    // Simulate archiving p1 into historicalPeriods and adding duplicate entries
    // (Directly manipulate WG for test to simulate prior malformed data)
    const wg = dataManager.getCurrentWG();
    if (!wg || wg.id !== wgId) {
      // Ensure we reference the current WG object
      dataManager.setCurrentWG(wgId);
    }
    const currentWg = dataManager.getCurrentWG();
    if (!currentWg) throw new Error('WG not found in state');
    wg.historicalPeriods = wg.historicalPeriods || [];
    wg.historicalPeriods.push({ ...p1, archivedAt: (new Date()).toISOString(), summary: { totalExecutions: 1, totalPoints: 10, memberStats: [] } } as any);
    wg.historicalPeriods.push({ ...p1, archivedAt: (new Date()).toISOString(), summary: { totalExecutions: 1, totalPoints: 10, memberStats: [] } } as any);
    // Also add p2 plus a near-duplicate with different id but same dates
    wg.historicalPeriods.push({ ...p2, archivedAt: (new Date()).toISOString(), summary: { totalExecutions: 0, totalPoints: 0, memberStats: [] } } as any);
    wg.historicalPeriods.push({ id: 'dup-'+p2.id, name: p2.name, startDate: p2.start.toISOString(), endDate: p2.end.toISOString(), targetPoints: p2.targetPoints, isActive: false, createdAt: new Date().toISOString(), archivedAt: new Date().toISOString(), summary: { totalExecutions: 0, totalPoints: 0, memberStats: [] } } as any);

    // Replace WG back into state
    dataManager.updateState({ wgs: { ...(dataManager.getState().wgs || {}), [currentWg.id]: currentWg } });

    // Call the helper to get normalized historical periods
    const normalized = (dataManager as any).getHistoricalPeriods ? (dataManager as any).getHistoricalPeriods() : null;

    expect(normalized).toBeTruthy();
    // Expect deduped by date ranges -> p1 and p2 each only once
    const byRange = normalized.reduce((acc: any, p: any) => {
      const key = `${p.startDate || p.start}_${p.endDate || p.end}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.values(byRange).forEach(v => expect(v).toBe(1));
  });
});

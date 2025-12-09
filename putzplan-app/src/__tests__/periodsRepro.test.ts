import { describe, it } from 'vitest';
import { dataManager } from '../services/dataManager';
import { ensureSeed } from '../services/seed';
import { normalizePeriods } from '../components/period/periodUtils';

describe('Period reproduction test', () => {
  it('seeds, creates custom period, and logs period shapes', () => {
    // Ensure seed data exists
    ensureSeed('darius');

    const wgBefore = dataManager.getCurrentWG && dataManager.getCurrentWG();
    console.log('\n=== WG BEFORE ===');
    console.log(wgBefore ? { id: wgBefore.id, periods: (wgBefore.periods || []).length, historical: (wgBefore.historicalPeriods || []).length } : null);

    // Create a custom period (19 Nov 2025 - 16 Dec 2025)
    const s = new Date(2025, 10, 19); // months are 0-based -> 10 = Nov
    const e = new Date(2025, 11, 16); // 11 = Dec
    const period = dataManager.setCustomPeriod(s, e, false);

    console.log('\n=== CURRENT PERIOD (after setCustomPeriod) ===');
    console.log({ id: period.id, start: new Date(period.start).toISOString(), end: new Date(period.end).toISOString(), days: period.days });

    // WG periods
    const wg = dataManager.getCurrentWG && dataManager.getCurrentWG();
    console.log('\n=== WG PERIODS (currentWG.periods) ===');
    (wg?.periods || []).forEach((p: any, i: number) => console.log(i, { id: p.id, startDate: p.startDate, endDate: p.endDate, isActive: p.isActive }));
    console.log('\n=== WG HISTORICAL (currentWG.historicalPeriods) ===');
    (wg?.historicalPeriods || []).forEach((p: any, i: number) => console.log(i, { id: p.id, startDate: p.startDate, endDate: p.endDate, isActive: p.isActive }));

    const rawHistorical = dataManager.getHistoricalPeriods();
    console.log('\n=== RAW HISTORICAL from dataManager.getHistoricalPeriods() ===');
    rawHistorical.forEach((p: any, idx: number) => console.log(idx, { id: p.id, startDate: p.startDate || p.start, endDate: p.endDate || p.end, isActive: p.isActive }));

    const normalized = normalizePeriods(rawHistorical, period.id);
    console.log('\n=== NORMALIZED PERIODS ===');
    normalized.forEach((p: any, idx: number) => console.log(idx, { id: p.id, startDate: p.startDate, endDate: p.endDate, isActive: p.isActive, isHistorical: p.isHistorical }));

  });
});

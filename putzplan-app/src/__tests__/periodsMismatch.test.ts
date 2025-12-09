import { describe, it } from 'vitest';
import { dataManager } from '../services/dataManager';
import { normalizePeriods } from '../components/period/periodUtils';

describe('Period mismatch diagnostic', () => {
  it('logs period sources for comparison', () => {
    // Ensure dataManager has initialized state
    const current = (dataManager as any).state.currentPeriod;

    const rawHistorical = (dataManager as any).getHistoricalPeriods();

    const normalized = normalizePeriods(rawHistorical, current?.id);

    // Print concise diagnostics for manual inspection
    // Current period
    console.log('\n=== CURRENT PERIOD (dataManager.state.currentPeriod) ===');
    console.log(current ? {
      id: current.id,
      start: (current.start && new Date(current.start).toISOString()) || null,
      end: (current.end && new Date(current.end).toISOString()) || null,
      days: current.days
    } : null);

    // Raw historical periods from WG
    console.log('\n=== RAW HISTORICAL PERIODS (dataManager.getHistoricalPeriods()) ===');
    rawHistorical.forEach((p: any, idx: number) => {
      console.log(idx, {
        id: p.id,
        startDate: p.startDate || p.start,
        endDate: p.endDate || p.end,
        isActive: p.isActive,
        createdAt: p.createdAt || p.archivedAt
      });
    });

    // Normalized periods used by the menu / analytics
    console.log('\n=== NORMALIZED PERIODS (normalizePeriods) ===');
    normalized.forEach((p: any, idx: number) => {
      console.log(idx, {
        id: p.id,
        startDate: p.startDate,
        endDate: p.endDate,
        isActive: p.isActive,
        isHistorical: p.isHistorical
      });
    });

  });
});

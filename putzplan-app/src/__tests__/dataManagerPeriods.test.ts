import { describe, it, expect } from 'vitest';
import { DataManager } from '../../src/services/dataManager';

// Note: Importing DataManager class directly and creating a fresh instance
// avoids touching the global singleton and localStorage file during tests.

describe('DataManager period lifecycle', () => {
  it('creates a custom period and exposes it via getHistoricalPeriods', () => {
    const dm = new DataManager();
    dm.reset();

    // Create a WG and set as current
    const wg = dm.createWG({ name: 'test-wg', description: 'test' } as any);

    // Ensure no periods initially
    let hist = dm.getHistoricalPeriods();
    expect(Array.isArray(hist)).toBe(true);

    const start = new Date('2025-10-01T00:00:00.000Z');
    const end = new Date('2025-10-31T23:59:59.999Z');

    const period = dm.setCustomPeriod(start, end, false);
    expect(period).toBeDefined();
    expect(period.start.toISOString().startsWith('2025-10-01')).toBe(true);

    // After creating, getHistoricalPeriods should include the new analytics period
    hist = dm.getHistoricalPeriods();
    const found = hist.find((p: any) => p.id === period.id || p.id === `period-${period.id}` || (p.startDate && p.startDate.indexOf('2025-10-01') !== -1));
    expect(found).toBeTruthy();
  });

  it('deletePeriod removes the period from WG lists', () => {
    const dm = new DataManager();
    dm.reset();

    const wg = dm.createWG({ name: 'test-wg-2', description: 'test' } as any);
    const start = new Date('2025-11-01T00:00:00.000Z');
    const end = new Date('2025-11-30T23:59:59.999Z');
    const period = dm.setCustomPeriod(start, end, false);

    // confirm present
    let hist = dm.getHistoricalPeriods();
    const exists = hist.some((p: any) => p.startDate && p.startDate.indexOf('2025-11-01') !== -1);
    expect(exists).toBe(true);

    // delete via id
    dm.deletePeriod(period.id);

    hist = dm.getHistoricalPeriods();
    const still = hist.some((p: any) => p.id === period.id || (p.startDate && p.startDate.indexOf('2025-11-01') !== -1));
    expect(still).toBe(false);
  });
});

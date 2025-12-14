import { describe, it, expect } from 'vitest';
import { dedupeByDate } from '../components/period/periodUtils';

describe('dedupeByDate', () => {
  it('removes duplicates by start/end and prefers active periods', () => {
    const p1 = { id: 'a1', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-31T23:59:59.999Z', isActive: false };
    const p2 = { id: 'a2', startDate: '2025-01-01T00:00:00.000Z', endDate: '2025-01-31T23:59:59.999Z', isActive: true };
    const p3 = { id: 'b1', startDate: '2025-02-01T00:00:00.000Z', endDate: '2025-02-28T23:59:59.999Z', isActive: false };

    const res = dedupeByDate([p1, p2, p3]);
    // Expect duplicate date range kept only once and prefer p2 because it's active
    expect(res.length).toBe(2);
    const keptIds = res.map(r => r.id).sort();
    expect(keptIds).toContain('a2');
    expect(keptIds).toContain('b1');
  });

  it('keeps first occurrence when none is active', () => {
    const p1 = { id: 'c1', startDate: '2025-03-01T00:00:00.000Z', endDate: '2025-03-31T23:59:59.999Z' };
    const p2 = { id: 'c2', startDate: '2025-03-01T00:00:00.000Z', endDate: '2025-03-31T23:59:59.999Z' };
    const res = dedupeByDate([p1, p2]);
    expect(res.length).toBe(1);
    expect(res[0].id).toBe('c1');
  });
});

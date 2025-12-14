import { HistoricalPeriod, PeriodObject, PeriodTaskEntry, PeriodLogEntry } from '../types';

export function isPeriodObject(p: any): p is PeriodObject {
  return p && typeof p === 'object' && ('tasks' in p || 'logs' in p || 'meta' in p);
}

export function toPeriodObject(raw: HistoricalPeriod | PeriodObject): PeriodObject {
  if (!raw) throw new Error('toPeriodObject: raw is falsy');
  if (isPeriodObject(raw)) return raw;

  const hp = raw as HistoricalPeriod;
  const period: PeriodObject = {
    id: hp.id,
    name: hp.name,
    startDate: hp.startDate,
    endDate: hp.endDate,
    targetPoints: hp.targetPoints,
    isActive: hp.isActive as any || false,
    createdAt: hp.createdAt,
    archivedAt: (hp as any).archivedAt,
    summary: hp.summary,
    tasks: [],
    logs: [],
    meta: { migratedFrom: 'historicalPeriod' }
  };
  return period;
}

export function ensurePeriodObjectInArray(arr: Array<any>, periodId: string): { updated: Array<any>, period: PeriodObject | null } {
  const cloned = [...arr];
  const idx = cloned.findIndex(p => p && p.id === periodId);
  if (idx === -1) return { updated: cloned, period: null };
  const p = cloned[idx];
  const converted = isPeriodObject(p) ? p : toPeriodObject(p as HistoricalPeriod);
  cloned[idx] = converted;
  return { updated: cloned, period: converted };
}

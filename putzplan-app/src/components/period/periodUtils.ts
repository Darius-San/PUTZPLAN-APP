// Utility helpers to normalize period objects and format labels
export function normalizePeriods(rawPeriods: any[], currentPeriodId?: string) {
  if (!Array.isArray(rawPeriods)) return [];

  return rawPeriods.map(p => {
    const startRaw = p.startDate || p.start || p.start_at || null;
    const endRaw = p.endDate || p.end || p.end_at || null;
    const startDate = startRaw ? new Date(startRaw).toISOString() : null;
    const endDate = endRaw ? new Date(endRaw).toISOString() : null;
    const id = p.id || `${startDate || ''}-${endDate || ''}`;
    const isActive = !!p.isActive || (!!currentPeriodId && p.id === currentPeriodId) || false;
    const name = p.name || p.title || (startRaw && endRaw ? `Zeitraum ${startRaw}` : (p.__DEBUG__ ? 'Debug Zeitraum' : 'Unbenannter Zeitraum'));

    return {
      ...p,
      id,
      name,
      startDate,
      endDate,
      isActive
    };
  });
}

export function formatShortLabel(period: any) {
  if (!period) return '';
  const s = period.startDate || period.start || '';
  const e = period.endDate || period.end || '';
  try {
    const start = new Date(s);
    const end = new Date(e);
    const startStr = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth()+1).padStart(2, '0')}`;
    const endStr = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth()+1).padStart(2, '0')}`;
    return `${startStr} – ${endStr}`;
  } catch (err) {
    return period.name || '';
  }
}

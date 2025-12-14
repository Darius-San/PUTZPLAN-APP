import React, { useState } from 'react';
import { Button, Card } from '../ui';
import { dataManager } from '../../services/dataManager';
import { formatShortLabel } from './periodUtils';

interface PeriodOption {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isHistorical: boolean;
}

interface PeriodSelectionProps {
  periods: PeriodOption[];
  currentPeriodId: string | null;
  onPeriodSelect: (periodId: string | null) => void;
  onViewHistoricalPeriod: (periodId: string) => void;
  onDeletePeriod?: (periodId: string) => void;
}

// Helper utilities moved to module scope so subcomponents can reuse them
function formatDateRangeHelper(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const startStr = `${String(start.getDate()).padStart(2, '0')}.${String(start.getMonth()+1).padStart(2, '0')}`;
  const endStr = `${String(end.getDate()).padStart(2, '0')}.${String(end.getMonth()+1).padStart(2, '0')}`;
  return `${startStr} – ${endStr}`;
}

function getDaysInfoHelper(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return `${diffDays} Tage`;
}

export const PeriodSelection: React.FC<PeriodSelectionProps> = ({ 
  periods, 
  currentPeriodId, 
  onPeriodSelect,
  onViewHistoricalPeriod,
  onDeletePeriod
}) => {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(currentPeriodId);
  // Sync selection when parent/current period changes externally
  React.useEffect(() => {
    setSelectedPeriodId(currentPeriodId);
  }, [currentPeriodId]);
  // Aktive Zeiträume immer ausgeklappt, keine Accordion-Logik mehr nötig

  
  // Use canonical periods from dataManager to keep parity with Analytics
  const today = new Date();
  const canonical = dataManager.getHistoricalPeriods() || [];
  // Map canonical structure to PeriodOption shape and compute historical filter
  const mapped = canonical.map((p: any) => {
    const startRaw = p.startDate || p.start || p.start_at || null;
    const endRaw = p.endDate || p.end || p.end_at || null;
    return {
      id: p.id,
      name: formatShortLabel({ startDate: startRaw, endDate: endRaw } as any) || p.name || p.title || '',
      startDate: startRaw,
      endDate: endRaw,
      isActive: !!p.isActive,
      isHistorical: !p.isActive
    } as PeriodOption;
  });

  // Deduplicate by start/end date to match Analytics dedupe strategy
  const dedupeByDate = (list: any[]) => {
    const map = new Map<string, any>();
    for (const item of list) {
      const key = `${item.startDate || item.start || ''}::${item.endDate || item.end || ''}`;
      if (!map.has(key)) map.set(key, item);
    }
    return Array.from(map.values());
  };

  // Single unified list: include all mapped periods (from WG.periods and historical),
  // dedupe and sort by start date descending (newest first)
  const unified = dedupeByDate(mapped);
  const sorted = unified.sort((a: any, b: any) => {
    const aStart = new Date(a.startDate || a.start || 0).getTime();
    const bStart = new Date(b.startDate || b.start || 0).getTime();
    return bStart - aStart;
  });

  const handlePeriodSelect = (periodId: string | null) => {
    setSelectedPeriodId(periodId);
    onPeriodSelect(periodId);
  };

  // Zeitraum-Benennung and days info use module-level helpers
  const formatDateRange = formatDateRangeHelper;
  const getDaysInfo = getDaysInfoHelper;

  return (
    <Card className="p-6 bg-white shadow-lg border rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
            <span className="text-white">📊</span>
          </div>
          Zeitraum auswählen
        </h2>
        <p className="text-gray-600 mt-2">Wähle einen bestehenden Zeitraum aus oder wechsle zwischen Zeiträumen</p>
      </div>

      {periods.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📅</div>
          <p className="text-gray-600">Noch keine Zeiträume vorhanden</p>
          <p className="text-sm text-gray-500 mt-2">Erstelle deinen ersten Zeitraum im Bereich "Neuen Zeitraum erstellen"</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Unified list of periods — newest (largest start) first */}
          <div>
            <div className="w-full flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📅</span>
                <span className="font-semibold text-gray-800">Zeiträume (neueste zuerst)</span>
                <span className="bg-gray-200 text-gray-800 text-xs px-2 py-1 rounded-full">{sorted.length}</span>
              </div>
            </div>
            <div className="mt-2 space-y-2">
              {sorted.map((period: any) => (
                <UnifiedPeriodRow
                  key={period.id}
                  period={period}
                  isSelected={selectedPeriodId === period.id}
                  isCurrent={currentPeriodId === period.id}
                  onSelect={() => handlePeriodSelect(period.id)}
                  onView={() => onViewHistoricalPeriod(period.id)}
                  onDelete={onDeletePeriod ? () => onDeletePeriod(period.id) : undefined}
                />
              ))}
            </div>
          </div>

          {/* Quick Reset Option */}
          <div className="pt-4 border-t border-gray-200">
            <Button
              onClick={() => handlePeriodSelect(null)}
              variant="outline"
              className="w-full text-gray-700 border-gray-300 hover:bg-gray-50"
            >
              ✨ Zu neuem Zeitraum wechseln
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
};

// --- Helper subcomponent for unified row ---
const UnifiedPeriodRow: React.FC<{
  period: any;
  isSelected: boolean;
  isCurrent: boolean;
  onSelect: () => void;
  onView: () => void;
  onDelete?: () => void;
}> = ({ period, isSelected, isCurrent, onSelect, onView, onDelete }) => {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = React.useState(false);

  const start = period.startDate || period.start || period.start_at;
  const end = period.endDate || period.end || period.end_at;

  const handleActivate = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }
    try {
      const s = new Date(start);
      const en = new Date(end);
      await dataManager.setCustomPeriod(s, en, false);
      onSelect();
      setIsConfirming(false);
      // small UX feedback
      // eslint-disable-next-line no-alert
      alert('Zeitraum wurde als aktuell gesetzt');
    } catch (err: any) {
      console.error('Fehler beim Aktivieren des Zeitraums', err);
      // eslint-disable-next-line no-alert
      alert('Fehler: ' + (err?.message || String(err)));
      setIsConfirming(false);
    }
  };

  return (
    <div
      className={`p-4 border rounded-lg cursor-pointer transition-all flex items-center justify-between ${
        isSelected ? 'ring-2 ring-indigo-400 border-indigo-600 bg-white shadow-md' : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
      }`}
      onClick={() => onSelect()}
    >
      <div className="flex items-center gap-3">
        <input type="radio" checked={isSelected} onChange={() => onSelect()} onClick={e => e.stopPropagation()} className="w-4 h-4" />
        <div>
          <div className="font-semibold text-gray-900 flex items-center gap-2">
            <span>
              {isCurrent ? (
                '🟢'
              ) : isSelected ? (
                '🔵'
              ) : (
                '📁'
              )}
            </span>
            {period.name}
            {isCurrent && <span className="ml-2 inline-block bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full">Aktuell</span>}
            {!isCurrent && isSelected && <span className="ml-2 inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">Ausgewählt</span>}
          </div>
          <div className="text-xs text-gray-500 mt-1">{getDaysInfoHelper(start, end)}</div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs text-gray-500 mr-2">{formatDateRangeHelper(start, end)}</div>
        <div className="flex items-center gap-2">
          <Button onClick={(e) => { e.stopPropagation(); onView(); }} size="sm" variant="outline" className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 border-gray-300">📊 Anzeigen</Button>
          {isCurrent ? (
            <div className="text-sm text-gray-500 px-2">&nbsp;</div>
          ) : (
            isConfirming ? (
              <div className="flex gap-2">
                <Button onClick={handleActivate} size="sm" variant="primary" className="text-xs">Bestätigen</Button>
                <Button onClick={(e) => { e.stopPropagation(); setIsConfirming(false); }} size="sm" variant="outline" className="text-xs">Abbrechen</Button>
              </div>
            ) : (
              <Button onClick={handleActivate} size="sm" variant="outline" className="text-xs">⭐ Als aktiv setzen</Button>
            )
          )}
          {onDelete && (
            <>
              <Button onClick={(e) => { e.stopPropagation(); setDeleteModalOpen(true); }} size="sm" variant="outline" className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border-red-300">🗑️</Button>
              <div>
                {/* Inline simple modal using ConfirmDialog would be nicer but to avoid import cycles we use window.confirm fallback if ConfirmDialog not available */}
                {deleteModalOpen && (
                  <div style={{position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', zIndex:2000}}>
                    <div style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.4)'}} onClick={() => setDeleteModalOpen(false)} />
                    <div style={{background:'white', borderRadius:8, padding:20, width:'min(560px,92%)', boxShadow:'0 10px 30px rgba(0,0,0,0.2)', zIndex:2001}}>
                      <h3 style={{margin:0, fontSize:18, fontWeight:600}}>Zeitraum löschen</h3>
                      <p style={{marginTop:8}}>Möchtest du diesen Zeitraum wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.</p>
                      <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:12}}>
                        <button onClick={() => setDeleteModalOpen(false)} style={{background:'transparent', border:'1px solid #e2e8f0', padding:'8px 12px', borderRadius:6}}> Abbrechen </button>
                        <button onClick={() => { onDelete && onDelete(); setDeleteModalOpen(false); }} style={{background:'#dc2626', color:'white', border:'none', padding:'8px 12px', borderRadius:6}}> Löschen </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodSelection;
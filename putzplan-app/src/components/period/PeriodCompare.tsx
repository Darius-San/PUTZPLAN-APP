import React, { useMemo } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { normalizePeriods, formatShortLabel } from './periodUtils';
import { dataManager } from '../../services/dataManager';

const keyFor = (p: any) => `${p.startDate || p.start}-${p.endDate || p.end}-${p.id || ''}`;

const PeriodCompare: React.FC = () => {
  const { getHistoricalPeriods, state } = usePutzplanStore() as any;

  // Source A: store.getHistoricalPeriods()
  const storeRaw = typeof getHistoricalPeriods === 'function' ? (getHistoricalPeriods() || []) : [];
  // Source B: dataManager.getHistoricalPeriods()
  let dmRaw: any[] = [];
  try { dmRaw = (dataManager.getHistoricalPeriods && dataManager.getHistoricalPeriods()) || []; } catch (e) { dmRaw = []; }

  const normA = normalizePeriods(storeRaw, state?.currentPeriod?.id);
  const normB = normalizePeriods(dmRaw, state?.currentPeriod?.id);

  const mapA = new Map(normA.map((p: any) => [keyFor(p), p]));
  const mapB = new Map(normB.map((p: any) => [keyFor(p), p]));

  const onlyA = normA.filter(p => !mapB.has(keyFor(p)));
  const onlyB = normB.filter(p => !mapA.has(keyFor(p)));
  const both = normA.filter(p => mapB.has(keyFor(p)));

  // Log to console for quick inspection
  console.log('🔎 [PeriodCompare] Store periods (normalized):', normA.length, normA);
  console.log('🔎 [PeriodCompare] DataManager periods (normalized):', normB.length, normB);
  console.log('🔎 [PeriodCompare] OnlyInStore:', onlyA.map(p => p.id));
  console.log('🔎 [PeriodCompare] OnlyInDataManager:', onlyB.map(p => p.id));

  return (
    <div style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, width: 720, maxHeight: '60vh', overflow: 'auto', boxShadow: '0 6px 30px rgba(2,6,23,0.2)' }}>
      <div style={{ background: 'white', borderRadius: 8, padding: 12, border: '1px solid #e6edf3' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <strong>Period Compare</strong>
          <small style={{ color: '#666' }}>Store vs dataManager</small>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '4px 0' }}>Only in Store ({onlyA.length})</h4>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {onlyA.map(p => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{formatShortLabel(p)} <small style={{ color: '#888' }}>{p.id}</small></div>
                  <div style={{ fontSize: 12, color: '#666' }}>{p.startDate} → {p.endDate}</div>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ flex: 1 }}>
            <h4 style={{ margin: '4px 0' }}>Only in dataManager ({onlyB.length})</h4>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {onlyB.map(p => (
                <li key={p.id} style={{ marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{formatShortLabel(p)} <small style={{ color: '#888' }}>{p.id}</small></div>
                  <div style={{ fontSize: 12, color: '#666' }}>{p.startDate} → {p.endDate}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <h4 style={{ margin: '4px 0' }}>In both ({both.length})</h4>
          <div style={{ maxHeight: 120, overflow: 'auto', paddingLeft: 8 }}>
            {both.map(p => (
              <div key={p.id} style={{ fontSize: 13, padding: '4px 0', borderBottom: '1px dashed #eee' }}>
                {formatShortLabel(p)} <small style={{ color: '#888' }}>{p.id}</small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeriodCompare;

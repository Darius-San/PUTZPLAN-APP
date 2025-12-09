import React, { useState, useMemo } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { Card, Button, Input } from '../ui';

interface Props { userId: string; onBack: () => void; }

export const MemberRatings: React.FC<Props> = ({ userId, onBack }) => {
  const { state, currentWG, upsertTaskRatingForUser, getRatingsForUser, isUserRatingsComplete, recalculateTaskPoints, recalculateWGPointDistribution, debugMode } = usePutzplanStore() as any;
  const member = state.users[userId];
  const tasks = Object.values(state.tasks).filter((t: any)=> t.wgId === currentWG?.id);
  const existing = getRatingsForUser(userId);
  const existingByTask = useMemo(()=> Object.fromEntries(existing.map((r: any)=> [r.taskId, r])), [existing]);

  // local staged changes per task
  const [local, setLocal] = useState<Record<string, any>>({});
  const updateLocal = (taskId: string, field: string, value: number) => {
    setLocal(prev => ({ ...prev, [taskId]: { ...(prev[taskId] || existingByTask[taskId] || {}), [field]: value }}));
  };

  const saveOne = (taskId: string) => {
    const base = local[taskId] || existingByTask[taskId];
    if (!base) return;
    upsertTaskRatingForUser(userId, taskId, {
      estimatedMinutes: Number(base.estimatedMinutes) || 30,
      painLevel: Number(base.painLevel) || 5,
      importance: Number(base.importance) || 5,
      suggestedFrequency: Number(base.suggestedFrequency) || 4
    });
    // Option A: Sofortiger Recalc nach Einzel-Speichern
    recalculateTaskPoints();
    recalculateWGPointDistribution();
  };

  const saveAll = () => {
    // Alle Änderungen upserten
    (tasks as any[]).forEach(t => {
      const base = local[t.id] || existingByTask[t.id];
      if (!base) return;
      upsertTaskRatingForUser(userId, t.id, {
        estimatedMinutes: Number(base.estimatedMinutes) || 30,
        painLevel: Number(base.painLevel) || 5,
        importance: Number(base.importance) || 5,
        suggestedFrequency: Number(base.suggestedFrequency) || 4
      });
    });
    // Einmaliger Recalc für alle Tasks
    recalculateTaskPoints();
    // WG-Verteilung wird separat über den Button aktualisiert
  };

  const complete = isUserRatingsComplete(userId);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold" data-testid="member-ratings-title">Ratings – {member?.name}</h1>
          <div className="flex gap-2">
            {debugMode && (
              <Button
                size="sm"
                variant="outline"
                data-testid="debug-auto-rate-member"
                onClick={() => {
                  // Generate deterministic but varied values per task
                  tasks.forEach((t: any, idx: number) => {
                    const estimatedMinutes = 10 + (idx % 30); // 10..39
                    const painLevel = 3 + (idx % 7); // 3..9
                    const importance = 4 + (idx % 6); // 4..9
                    const suggestedFrequency = 4 + (idx % 5); // 4..8
                    upsertTaskRatingForUser(userId, t.id, { estimatedMinutes, painLevel, importance, suggestedFrequency });
                  });
                }}
              >Auto-Rate Mitglied</Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => {
              // Auto-Save alle lokalen Änderungen bevor wir zurückgehen
              const dirtyTaskIds = Object.keys(local).filter(id => local[id]);
              if (dirtyTaskIds.length) {
                console.debug && console.debug(`💾 [AutoSave] Speichere ${dirtyTaskIds.length} lokale Änderungen vor Zurück`);
                saveAll();
              }
              onBack();
            }}>Zurück</Button>
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => {
                // Auto-Save zuerst alle lokalen Änderungen (inkl. Task-Recalc)
                saveAll();
                // Jetzt WG-Verteilung aktualisieren und anzeigen
                const result = recalculateWGPointDistribution();
                alert(`WG-Punkte aktualisiert!\n\n` +
                  `Gesamtarbeit: ${result.totalWorkload} Punkte\n` +
                  `Pro Mitglied: ${result.pointsPerMember} Punkte/Monat`);
              }}
              data-testid="update-points-btn"
            >
              WG-Punkte aktualisieren
            </Button>
            <Button size="sm" variant="primary" onClick={saveAll} data-testid="save-all-ratings-btn">Alle speichern</Button>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {complete && <div className="p-3 text-sm rounded bg-green-100 text-green-800" data-testid="member-complete-banner">Alle Tasks für dieses Mitglied wurden bewertet.</div>}
        <div className="space-y-4" data-testid="member-task-rating-list">
          {tasks.map((t: any, idx) => {
            const r = local[t.id] || existingByTask[t.id] || {};
            const filled = !!existingByTask[t.id];
            const dirty = local[t.id] && !filled;
            return (
              <Card key={t.id} className="p-4 flex flex-col gap-3" data-testid={`rating-task-${t.id}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden>{t.emoji}</span>
                    <div>
                      <div className="font-medium">{idx+1}. {t.title}</div>
                      <div className="text-xs text-slate-500">Bewerte Aufwand, Nerv-Faktor, Wichtigkeit & Frequenz</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={()=> saveOne(t.id)} data-testid={`save-rating-${t.id}`}>Speichern</Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <label className="font-medium">Minuten</label>
                    <Input type="number" min={1} value={r.estimatedMinutes ?? ''} onChange={e=> updateLocal(t.id,'estimatedMinutes', Number(e.target.value))} data-testid={`inp-min-${t.id}`} />
                  </div>
                  <div>
                    <label className="font-medium">Pain</label>
                    <Input type="number" min={1} max={10} value={r.painLevel ?? ''} onChange={e=> updateLocal(t.id,'painLevel', Number(e.target.value))} data-testid={`inp-pain-${t.id}`} />
                  </div>
                  <div>
                    <label className="font-medium">Wichtigkeit</label>
                    <Input type="number" min={1} max={10} value={r.importance ?? ''} onChange={e=> updateLocal(t.id,'importance', Number(e.target.value))} data-testid={`inp-imp-${t.id}`} />
                  </div>
                  <div>
                    <label className="font-medium">/Monat</label>
                    <Input type="number" min={1} max={30} value={r.suggestedFrequency ?? ''} onChange={e=> updateLocal(t.id,'suggestedFrequency', Number(e.target.value))} data-testid={`inp-freq-${t.id}`} />
                  </div>
                </div>
                <div className="text-[10px] text-slate-500 flex gap-2">
                  {filled && <span className="px-2 py-0.5 bg-green-200 text-green-700 rounded" data-testid={`status-filled-${t.id}`}>Gespeichert</span>}
                  {dirty && <span className="px-2 py-0.5 bg-yellow-200 text-yellow-700 rounded" data-testid={`status-dirty-${t.id}`}>Neu</span>}
                </div>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { Card, Button } from '../ui';
import ConfirmDialog from '../ui/ConfirmDialog';

interface Props { onBack: () => void; onSelectUser: (userId: string) => void; }

export const RatingsOverview: React.FC<Props> = ({ onBack, onSelectUser }) => {
  const { currentWG, state, isUserRatingsComplete, recalculateTaskPoints, recalculateWGPointDistribution, debugMode, upsertTaskRatingForUser, resetMembersTargetsToWgTarget } = usePutzplanStore() as any;
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; title?: string; description?: string; onConfirm?: () => void }>({ isOpen: false });
  if (!currentWG) return null;
  const members = Object.values(state.users).filter((u: any) => currentWG.memberIds?.includes(u.id));
  const tasksInWG = Object.values(state.tasks).filter((t: any) => t.wgId === currentWG.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold" data-testid="ratings-overview-title">Task Ratings – Übersicht</h1>
          <div className="flex gap-2">
            {debugMode && (
              <Button size="sm" variant="outline" data-testid="debug-auto-rate" onClick={() => {
                if (!currentWG) return;
                const tasks = Object.values(state.tasks).filter((t:any)=> t.wgId === currentWG.id);
                const membersLocal = Object.values(state.users).filter((u:any)=> currentWG.memberIds?.includes(u.id));
                membersLocal.forEach((m:any, idx:number) => {
                  tasks.forEach((t:any, tIdx:number) => {
                    const estimatedMinutes = 5 + ((tIdx*3 + idx) % 40); // 5..44
                    const painLevel = 2 + ((tIdx + idx) % 8); // 2..9
                    const importance = 3 + ((tIdx*2 + idx) % 7); // 3..9
                    const suggestedFrequency = Math.max(1, Math.min(30, 4 + ((tIdx + idx*2) % 6))); // 4..9
                    upsertTaskRatingForUser(m.id, t.id, { estimatedMinutes, painLevel, importance, suggestedFrequency });
                  });
                });
              }}>Auto-Rate</Button>
            )}
            {debugMode && (
              <Button size="sm" variant="outline" onClick={() => {
                console.debug && console.debug('🔍 [DEBUG] Current State Check:');
                console.debug && console.debug('📋 Tasks:', Object.values(state.tasks).filter((t:any)=> t.wgId === currentWG?.id).map((t:any) => `${t.title}: ${t.pointsPerExecution}P`));
                console.debug && console.debug('📊 WG Target:', currentWG?.settings?.monthlyPointsTarget);
                console.debug && console.debug('👥 Users:', Object.values(state.users).filter((u:any)=> currentWG?.memberIds?.includes(u.id)).map((u:any) => `${u.name}: ${u.monthlyMonthlyPoints}P`));
                console.debug && console.debug('⭐ Ratings count:', Object.keys(state.ratings).length);
                alert('Debug info logged to console! Check F12 → Console');
              }}>Debug State</Button>
            )}
            <Button 
              size="sm" 
              variant="secondary" 
              onClick={() => {
                console.log('🎯 [UI] Punkte aktualisieren Button geklickt');
                const currentState = state;
                
                // 1. Auto-Save unsaved (dirty) Ratings erkennen & speichern
                // Wir durchlaufen alle Mitglieder und Tasks und prüfen ob lokale Ratings fehlen (wird indirekt getan indem wir prüfen ob jeder Task eine Bewertung je User hat)
                let autoSaved = 0;
                const tasks = Object.values(currentState.tasks).filter((t:any)=> t.wgId === currentWG.id);
                const membersLocal = Object.values(currentState.users).filter((u:any)=> currentWG.memberIds?.includes(u.id));
                membersLocal.forEach((m:any) => {
                  tasks.forEach((t:any) => {
                    // Wenn für User+Task keine Bewertung existiert: Default-Schätzung anlegen (verhindert vergessene Eingaben)
                    const has = Object.values(currentState.ratings).some((r:any)=> r.taskId === t.id && r.userId === m.id);
                    if (!has) {
                      upsertTaskRatingForUser(m.id, t.id, {
                        estimatedMinutes: t.averageMinutes || 30,
                        painLevel: Math.round(t.averagePainLevel || 5),
                        importance: Math.round(t.averageImportance || 5),
                        suggestedFrequency: t.monthlyFrequency || 4
                      });
                      autoSaved++;
                    }
                  });
                });
                if (autoSaved > 0) {
                  console.debug && console.debug(`[AutoSave] ${autoSaved} fehlende Bewertungen automatisch ergänzt.`);
                }

                console.debug && console.debug('📋 [UI] Aktuelle Tasks:', Object.values(currentState.tasks).map((t: any) => `${t.title}: ${t.pointsPerExecution}P`));
                console.debug && console.debug('📊 [UI] Anzahl Bewertungen:', Object.keys(currentState.ratings).length + autoSaved);
                
                if (Object.keys(currentState.ratings).length === 0 && autoSaved === 0) {
                  alert('⚠️ Keine Bewertungen gefunden!\n\nBitte bewerte zuerst die Tasks bei den einzelnen Mitgliedern, bevor du die Punkte aktualisierst.');
                  return;
                }
                
                // 2. Task-Punkte neu berechnen
                console.log('🔄 [UI] Rufe recalculateTaskPoints() auf...');
                recalculateTaskPoints();
                console.log('✅ [UI] recalculateTaskPoints() abgeschlossen');
                
                // 3. WG-Verteilung nach kurzem Delay (State settle)
                setTimeout(() => {
                  console.log('🔄 [UI] Rufe recalculateWGPointDistribution() auf...');
                  const result = recalculateWGPointDistribution();
                  console.log('📊 [UI] recalculateWGPointDistribution Ergebnis:', result);
                  if (result.totalWorkload === 0) {
                    alert('⚠️ Problem bei der Punktberechnung! Gesamtarbeit 0. Prüfe Konsole.');
                    return;
                  }
                  console.log('✅ [UI] Alle Punkte erfolgreich aktualisiert');
                  alert(`✅ Punkte aktualisiert!\nGesamtarbeit: ${result.totalWorkload}P\nPro Mitglied: ${result.pointsPerMember}P` + (autoSaved?`\n(ℹ️ ${autoSaved} fehlende Bewertungen ergänzt)`:''));
                }, 120);
              }}
              data-testid="update-all-points-btn"
            >
              Punkte aktualisieren
            </Button>
            {debugMode && (
              <>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    if (!currentWG) return;
                    setConfirmState({
                      isOpen: true,
                      title: 'User-Ziele zurücksetzen?',
                      description: 'Alle manuellen User-Anpassungen zurücksetzen? Dies setzt alle Mitglieder-Ziele auf das WG-Standard-Ziel zurück.',
                      onConfirm: () => {
                        const result = resetMembersTargetsToWgTarget(currentWG.id);
                        alert(`User-Ziele wurden auf ${currentWG.settings.monthlyPointsTarget}P gesetzt.\nAktualisiert: ${result.updated}`);
                        setConfirmState({ isOpen: false });
                      }
                    });
                  }}
                  data-testid="reset-user-targets-btn"
                >
                  🔄 User-Ziele zurücksetzen
                </Button>
                <ConfirmDialog
                  isOpen={confirmState.isOpen}
                  title={confirmState.title}
                  description={confirmState.description}
                  primaryLabel="Ja"
                  secondaryLabel="Nein"
                  onPrimary={() => { confirmState.onConfirm && confirmState.onConfirm(); }}
                  onSecondary={() => setConfirmState({ isOpen: false })}
                  onClose={() => setConfirmState({ isOpen: false })}
                />
              </>
            )}
            <Button size="sm" variant="ghost" onClick={onBack}>Zurück</Button>
          </div>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6 space-y-4">
        <p className="text-sm text-slate-600">Bewertet werden aktuell <strong>{tasksInWG.length}</strong> Tasks. Alle Mitglieder sollten jeden Task genau einmal bewerten.</p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-2" data-testid="ratings-member-grid">
          {members.map((m: any) => {
            const complete = isUserRatingsComplete(m.id);
            return (
              <Card key={m.id} className={`p-3 flex flex-col gap-2 border-2 ${complete ? 'border-green-400 bg-green-50' : 'border-slate-300'} transition shadow-sm`} data-testid={`ratings-user-${m.id}`}>
                <div className="flex items-center gap-2">
                  <span className="text-xl" aria-hidden>{m.avatar || '👤'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{m.name}</div>
                    <div className="text-xs text-slate-500">{complete ? 'Fertig' : 'Offen'}</div>
                  </div>
                </div>
                <Button size="sm" onClick={()=> onSelectUser(m.id)} data-testid={`open-user-rating-${m.id}`} className="text-xs">{complete ? 'Ansehen' : 'Bewerten'}</Button>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
};

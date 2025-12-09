import React, { useState, useEffect, useRef } from 'react';
import { Button, Card, Input } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { ArrowLeft } from 'lucide-react';
import { dataManager } from '../../services/dataManager';

export const AbsenceManagement: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const { currentUser, currentWG, state, addAbsence, removeAbsence, getUserAbsences } = usePutzplanStore() as any;
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [showWarn, setShowWarn] = useState<string>('');
  const [recentlyAddedId, setRecentlyAddedId] = useState<string>('');

  const gridRef = useRef<HTMLDivElement | null>(null);

  // Keyboard Navigation (Arrow Keys) für Member Cards
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!gridRef.current) return;
      const cards = Array.from(gridRef.current.querySelectorAll('[data-testid^="member-card-"]')) as HTMLElement[];
      if (cards.length === 0) return;
      const currentIndex = selectedMember ? cards.findIndex(c => c.dataset.testid === `member-card-${selectedMember}`) : -1;
      const cols = window.innerWidth >= 1024 ? 6 : (window.innerWidth >= 640 ? 3 : 2);
      if (['ArrowRight','ArrowLeft','ArrowUp','ArrowDown','Home','End'].includes(e.key)) {
        e.preventDefault();
      }
      let nextIndex = currentIndex;
      switch (e.key) {
        case 'ArrowRight': nextIndex = currentIndex < cards.length-1 ? currentIndex + 1 : 0; break;
        case 'ArrowLeft': nextIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1; break;
        case 'ArrowDown': nextIndex = currentIndex + cols < cards.length ? currentIndex + cols : currentIndex; break;
        case 'ArrowUp': nextIndex = currentIndex - cols >= 0 ? currentIndex - cols : currentIndex; break;
        case 'Home': nextIndex = 0; break;
        case 'End': nextIndex = cards.length - 1; break;
        default: return;
      }
      const el = cards[nextIndex];
      if (el) {
        const id = el.getAttribute('data-testid')!.replace('member-card-','');
        setSelectedMember(id);
        el.focus();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [selectedMember]);

  if (!currentUser || !currentWG) return <div>Loading...</div>;

  const handleAddAbsence = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError('');
      if (!selectedMember) {
        setError('Bitte Mitglied wählen');
        return;
      }
      if (!start || !end) {
        setError('Start & Ende angeben');
        return;
      }
      const s = new Date(start); const e = new Date(end);
      const days = Math.floor((e.getTime() - s.getTime()) / 86400000) + 1;
      if (days < 7) {
        setShowWarn('Mindestens 7 Tage auswählen');
        return;
      }
      // UI-level validation: prevent overlapping absences for better UX
      const existing = getUserAbsences(selectedMember) as any[];
      const overlaps = existing.some((a: any) => {
        const as = new Date(a.startDate).getTime();
        const ae = new Date(a.endDate).getTime();
        return !(e.getTime() < as || s.getTime() > ae); // overlap if not strictly before/after
      });
      if (overlaps) {
        setError('Absence overlaps with an existing period');
        return;
      }
  const idBefore = Date.now().toString(); // pseudo id marker
  const added = addAbsence(selectedMember, new Date(start), new Date(end), 'gone fishing');
  setRecentlyAddedId((added && added.id) || idBefore);
      setStart(''); 
      setEnd('');
      setSelectedMember('');
  // reason bleibt stehen für Komfort
    } catch (err: any) { 
      setError(err.message); 
    }
  };

  const members = currentWG.memberIds.map((id: string) => {
    const u = state.users[id];
    return {
      id,
      name: u?.name || 'Unknown',
      emoji: (u?.avatar || u?.emoji) || '👤',
      absences: getUserAbsences(id).length
    };
  });

  const currentAbsences = currentWG.memberIds.flatMap((uid: string) => {
    const user = state.users[uid];
    const absences = getUserAbsences(uid);
    return absences.map((absence: any) => ({
      ...absence,
      userId: uid,
      userName: user?.name || 'Unknown'
    }));
  }).sort((a: any, b: any) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="p-8 bg-[linear-gradient(135deg,#f6f1ee,#efe7e4)] border-b border-[#e0d6d2]">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onBack}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </Button>
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-1 text-[#2d2830] tracking-tight flex items-center justify-center gap-2">
            <span className="text-4xl" aria-hidden>🏝️</span>
            <span className="bg-clip-text text-transparent bg-[linear-gradient(90deg,#3f3d56,#302c3a)]">Abwesenheit melden</span>
          </h1>
          <p className="text-[15px] text-[#5d5862] font-medium">Trage deine Abwesenheitszeiten ein für faire Punkteverteilung</p>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto">
        {/* Add Absence Form */}
        <Card className="mb-8 p-6 shadow-lg">
          <h2 className="text-xl font-semibold mb-6">Abwesenheiten verwalten</h2>

          <form onSubmit={handleAddAbsence} className="flex flex-col gap-6">
            <div className="flex flex-col md:flex-row md:items-end gap-4">
              <div className="flex flex-col w-full md:max-w-xs">
                <label className="text-xs font-semibold tracking-wide uppercase text-gray-600 mb-1">Start</label>
                <Input type="date" value={start} onChange={e => setStart(e.target.value)} data-testid="absence-start" className="focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col w-full md:max-w-xs">
                <label className="text-xs font-semibold tracking-wide uppercase text-gray-600 mb-1">Ende</label>
                <Input type="date" value={end} onChange={e => setEnd(e.target.value)} data-testid="absence-end" className="focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="flex flex-col md:pb-[2px] w-full md:max-w-[160px]">
                <label className="text-xs font-semibold tracking-wide uppercase text-transparent mb-1 select-none">&nbsp;</label>
                <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-full text-sm tracking-wide" data-testid="add-absence-btn">
                  Hinzufügen
                </Button>
              </div>
            </div>
            {/* Inline member cards selection */}
            <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4" data-testid="member-selection-cards">
              {members.map((m: { id: string; name: string; emoji: string; absences: number }) => {
                const active = m.id === selectedMember;
                return (
                  <Card
                    key={m.id}
                    role="button"
                    aria-pressed={active}
                    tabIndex={0}
                    onClick={() => setSelectedMember(m.id)}
                    onKeyDown={(e:any) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedMember(m.id); } }}
                    data-selected={active || undefined}
                    data-active={active || undefined}
                    className={`member-card relative p-4 text-center rounded-2xl border group select-none outline-none transition-all duration-150 ease-out font-medium
                      focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white
                      ${active ? 'scale-[1.05]' : 'bg-white/80 backdrop-blur-sm border-[#d9d4d0] hover:border-amber-400 hover:shadow-md hover:scale-[1.03] text-[#2e2a32]'}
                    `}
                    data-testid={`member-card-${m.id}`}
                  >
                    <div className={`relative text-3xl mb-1 transition-transform duration-200 ${active ? 'scale-110 drop-shadow-sm' : 'group-hover:scale-105'}`} aria-hidden>
                      {m.emoji}
                    </div>
                    <div className={`relative text-sm truncate tracking-wide ${active ? 'text-white' : 'text-[#2e2a32]'}`}>
                      {m.name}
                    </div>
                    {m.absences > 0 && (
                      <div className={`absolute -top-1 -right-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full tracking-wide shadow-sm
                        ${active ? 'bg-white text-amber-700' : 'bg-amber-600 text-white'}
                      `}
                        data-testid={`absence-count-${m.id}`}
                      >
                        {m.absences}
                      </div>
                    )}
                    {active && (<div className="absolute inset-0 rounded-2xl ring-2 ring-amber-300/60 pointer-events-none" />)}
                  </Card>
                );
              })}
            </div>
          </form>

          {error && (
            <div className="mt-4 text-red-600 text-sm bg-red-50 p-3 rounded-lg" data-testid="absence-error">
              {error}
            </div>
          )}
        </Card>
        {/* Current Absences */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            📋 Aktuelle Abwesenheiten
          </h2>
          
          {currentAbsences.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="text-gray-500">Noch keine Abwesenheiten eingetragen</div>
            </Card>
          ) : (
            <div className="space-y-4">
              {currentAbsences.map((absence: any) => {
                const startDate = new Date(absence.startDate);
                const endDate = new Date(absence.endDate);
                const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
                
                const highlight = absence.id === recentlyAddedId;
                return (
                  <Card key={absence.id} className={`p-4 relative overflow-hidden ${highlight ? 'animate-[fadeSlideIn_0.5s_ease]' : ''}`} data-testid={`absence-entry-${absence.userId}`}>
                    {highlight && <div className="absolute inset-0 bg-indigo-50/70 pointer-events-none" />}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">
                          {state.users[absence.userId]?.emoji || '👤'}
                        </div>
                        <div>
                          <div className="font-medium">{absence.userName}</div>
                          <div className="text-sm text-gray-600">
                            {startDate.toLocaleDateString('de-DE')} – {endDate.toLocaleDateString('de-DE')} 
                            <span className="text-gray-500 ml-2">({days} Tage)</span>
                          </div>
                          {/* Reason bewusst entfernt für kompaktere Darstellung */}
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => removeAbsence(absence.userId, absence.id)}
                        className="text-red-600 hover:bg-red-50"
                        data-testid="remove-absence-btn"
                      >
                        ✕
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* Warn Modal */}
      {showWarn && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" data-testid="absence-warn-overlay">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm flex flex-col gap-4" role="alertdialog">
            <div className="text-lg font-semibold">⚠️ Hinweis</div>
            <div className="text-sm text-gray-700">{showWarn}</div>
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowWarn('')} data-testid="warn-close-btn">Ok</Button>
            </div>
          </div>
        </div>
      )}
      {/* Debug helper */}
      {dataManager.isDebugMode() && (
        <div className="fixed bottom-4 right-4 flex flex-col gap-2" data-testid="debug-absence-tools">
          <Button size="sm" variant="outline" onClick={() => {
            try {
              const ids = currentWG.memberIds;
              const pick = ids[Math.floor(Math.random()*ids.length)];
              // Generate random length 7-12 days starting today or within current month
              const len = 7 + Math.floor(Math.random()*6);
              const startD = new Date();
              const endD = new Date(startD.getTime() + (len-1)*86400000);
              const added = addAbsence(pick, startD, endD, 'gone fishing');
              if (added?.id) setRecentlyAddedId(added.id);
            } catch (e:any) { setError(e.message); }
          }} data-testid="debug-add-random-absence">Debug: Random Abwesenheit</Button>
        </div>
      )}
    </div>
  );
};
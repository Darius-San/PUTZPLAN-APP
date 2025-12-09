import React, { useState, useMemo } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { Card, Button, Input } from '../ui';
import { AVATAR_OPTIONS } from '../../types';
import { dataManager } from '../../services/dataManager';

interface WGCreationWizardProps {
  onComplete: () => void;
  onCancel: () => void;
}

// Steps: 0 Name, 1 Size, 2 Members, 3 Summary
export const WGCreationWizard: React.FC<WGCreationWizardProps> = ({ onComplete, onCancel }) => {
  const { createWG, createUser, debugMode } = usePutzplanStore() as any;
  const [step, setStep] = useState(0);
  const [wgName, setWgName] = useState('');
  const [size, setSize] = useState(debugMode ? 1 : 2); // Debug-Modus: Start mit 1 Mitglied
  const [memberDrafts, setMemberDrafts] = useState<{ name: string; avatar: string }[]>([]);
  const [touched, setTouched] = useState(false);
  const maxSize = 12;

  // Initialize member drafts when size changes
  React.useEffect(() => {
    setMemberDrafts(prev => {
      const next = [...prev];
      if (next.length < size) {
        for (let i = next.length; i < size; i++) {
          next.push({ name: '', avatar: AVATAR_OPTIONS[i % AVATAR_OPTIONS.length].emoji });
        }
      } else if (next.length > size) {
        next.length = size;
      }
      return next;
    });
  }, [size]);

  const nameError = useMemo(() => {
    if (!touched) return '';
    if (wgName.trim().length < 3) return 'Name muss mindestens 3 Zeichen haben';
    if (wgName.trim().length > 40) return 'Name zu lang (max 40)';
    return '';
  }, [wgName, touched]);

  const sizeError = useMemo(() => {
    if (step !== 1) return '';
    // Im Debug-Modus: 1 Mitglied erlaubt, sonst mindestens 2
    const minSize = debugMode ? 1 : 2;
    if (size < minSize) return debugMode ? 'Mindestens 1 Mitglied' : 'Mindestens 2 Mitglieder';
    if (size > maxSize) return `Maximal ${maxSize} Mitglieder`;
    return '';
  }, [size, step, debugMode]);

  const memberErrors = useMemo(() => {
    if (step !== 2) return [] as string[];
    const errors: string[] = [];
    const names = memberDrafts.map(m => m.name.trim()).filter(Boolean);
    memberDrafts.forEach((m, idx) => {
      const n = m.name.trim();
      if (!n) errors.push(`Mitglied ${idx + 1}: Name fehlt`); else if (n.length > 24) errors.push(`${n}: zu lang (>24)`);
    });
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    if (dupes.length) errors.push(`Doppelte Namen: ${Array.from(new Set(dupes)).join(', ')}`);
    return errors;
  }, [memberDrafts, step]);

  const canNext = () => {
    if (step === 0) return !nameError && wgName.trim().length >= 3;
    if (step === 1) return !sizeError;
    if (step === 2) return memberErrors.length === 0;
    return true;
  };

  const goNext = () => { if (canNext()) setStep(s => Math.min(3, s + 1)); else setTouched(true); };
  const goBack = () => setStep(s => Math.max(0, s - 1));

  const chooseAvatar = (memberIndex: number, emoji: string) => {
    setMemberDrafts(d => d.map((m, i) => i === memberIndex ? { ...m, avatar: emoji } : m));
  };

  const updateMemberName = (idx: number, value: string) => {
    setMemberDrafts(d => d.map((m, i) => i === idx ? { ...m, name: value } : m));
  };

  const handleCreate = () => {
    if (!canNext()) return;
    // 1. Erstelle WG
    const wg = createWG({ name: wgName.trim(), monthlyPointsTarget: 100 });
    const createdUsers: string[] = [];
    memberDrafts.forEach((m, idx) => {
      const user = createUser({
        name: m.name.trim(),
        avatar: m.avatar,
        targetMonthlyPoints: 100
      });
      createdUsers.push(user.id);
    });
    // Persist memberIds and optional whatsapp contacts
    // Collect whatsappContact values from DOM-managed drafts (we'll persist as empty if not provided)
    const membersWithContacts = memberDrafts.map((m, i) => ({ name: m.name.trim(), avatar: m.avatar, whatsappContact: (m as any).whatsappContact || '' }));
    // First ensure users have whatsappContact updated in dataManager
    membersWithContacts.forEach((mData, i) => {
      const uid = createdUsers[i];
      if (mData.whatsappContact) {
        dataManager.updateUser(uid, { whatsappContact: mData.whatsappContact });
      }
    });
    dataManager.updateWG(wg.id, { memberIds: createdUsers });
    // Nach createUser ist automatisch der zuletzt erstellte User currentUser; akzeptieren wir (oder bevorzugt ersten?)
    // Optional: Wenn wir den ersten bevorzugen: dataManager.setCurrentUser(createdUsers[0]);
    dataManager.setCurrentUser(createdUsers[0]);
    onComplete();
  };

  const StepHeader = () => (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-xl font-semibold text-slate-800">
        {step === 0 && 'WG Namen festlegen'}
        {step === 1 && 'WG Größe wählen'}
        {step === 2 && 'Mitglieder hinzufügen'}
        {step === 3 && 'Zusammenfassung'}
      </h2>
      <div className="text-sm text-slate-500">Schritt {step + 1} / 4</div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto py-10">
      <Card className="p-8 space-y-6">
        <StepHeader />
        {step === 0 && (
          <div className="space-y-4" data-testid="step-name">
            <label className="block text-sm font-medium text-slate-700">WG Name</label>
            <Input value={wgName} onChange={e => { setWgName(e.target.value); setTouched(true); }} placeholder="z.B. Sonnen WG" />
            {nameError && <div className="text-red-600 text-sm" role="alert">{nameError}</div>}
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4" data-testid="step-size">
            <label className="block text-sm font-medium text-slate-700">Anzahl Mitglieder</label>
            {debugMode && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded border">
                🐛 Debug-Modus: Einzelperson-WG erlaubt (für Tests)
              </div>
            )}
            <Input type="number" min={debugMode ? 1 : 2} max={maxSize} value={size} onChange={e => setSize(Number(e.target.value))} />
            {sizeError && <div className="text-red-600 text-sm" role="alert">{sizeError}</div>}
          </div>
        )}
        {step === 2 && (
          <div className="space-y-6" data-testid="step-members">
            {memberDrafts.map((m, i) => (
              <div key={i} className="p-4 border rounded-lg bg-white space-y-3">
                <div className="flex items-center gap-4">
                  <div className="text-3xl" aria-label={`Avatar-${i}`}>{m.avatar}</div>
                  <Input placeholder={`Mitglied ${i + 1} Name`} value={m.name} onChange={e => updateMemberName(i, e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {AVATAR_OPTIONS.slice(0,10).map(opt => (
                    <button key={opt.id} type="button" onClick={() => chooseAvatar(i, opt.emoji)} className={`px-2 py-1 text-xl rounded border ${m.avatar === opt.emoji ? 'bg-indigo-100 border-indigo-400' : 'bg-slate-50 hover:bg-slate-100'}`}>{opt.emoji}</button>
                  ))}
                </div>
              </div>
            ))}
            {memberErrors.length > 0 && (
              <ul className="text-sm text-red-600 list-disc pl-5" role="alert">
                {memberErrors.map((er, idx) => <li key={idx}>{er}</li>)}
              </ul>
            )}
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4" data-testid="step-summary">
            <div>
              <h3 className="font-semibold text-slate-700 mb-2">WG Übersicht</h3>
              <p className="text-sm text-slate-600">Name: <strong>{wgName.trim()}</strong></p>
              <p className="text-sm text-slate-600">Mitglieder: {memberDrafts.length}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {memberDrafts.map((m,i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 border rounded-full bg-white">
                  <span className="text-xl">{m.avatar}</span>
                  <span className="text-sm font-medium">{m.name || '—'}</span>
                </div>
              ))}
            </div>
            {memberErrors.length === 0 && memberDrafts.every(m => m.name.trim()) ? (
              <div className="text-green-600 text-sm">Bereit zum Erstellen ✓</div>
            ) : (
              <div className="text-amber-600 text-sm">Bitte prüfe Namen & Duplikate vor dem Erstellen.</div>
            )}
          </div>
        )}

        <div className="flex justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
            {step > 0 && <Button variant="ghost" onClick={goBack}>Zurück</Button>}
          </div>
          {step < 3 && (
            <Button onClick={goNext} disabled={!canNext()} data-testid="next-btn">Weiter</Button>
          )}
          {step === 3 && (
            <Button onClick={handleCreate} disabled={memberErrors.length>0 || memberDrafts.some(m=>!m.name.trim())}>WG erstellen</Button>
          )}
        </div>
      </Card>
    </div>
  );
};

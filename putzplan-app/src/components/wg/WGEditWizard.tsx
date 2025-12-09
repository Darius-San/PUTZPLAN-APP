import React, { useState } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { dataManager } from '../../services/dataManager';
import { Card, Button, Input } from '../ui';
import { AVATAR_OPTIONS } from '../../types';
import { generateId } from '../../utils/taskUtils';

interface WGEditWizardProps {
  wgId: string;
  onCancel: () => void;
  onComplete: () => void;
}

// Minimal Skeleton: rename WG + list members for future editing
export const WGEditWizard: React.FC<WGEditWizardProps> = ({ wgId, onCancel, onComplete }) => {
  const { state, setCurrentWG, updateWG } = usePutzplanStore() as any;
  const wg = (state.wgs || {})[wgId];
  const [name, setName] = useState(wg?.name || '');
  const [members, setMembers] = useState(() => wg?.memberIds.map((id: string) => state.users[id]).filter(Boolean) || []);
  const [editing, setEditing] = useState(false);
  const [groupSendEnabled, setGroupSendEnabled] = useState<boolean>(() => !!(wg?.settings?.groupSendEnabled));
  const [whatsappGroupName, setWhatsappGroupName] = useState<string>(() => wg?.settings?.whatsapp?.groupName || '');
  const [whatsappGroupId, setWhatsappGroupId] = useState<string>(() => wg?.settings?.whatsapp?.groupId || '');

  if (!wg) return <div className="p-6">WG nicht gefunden</div>;

  const handleSave = () => {
    // Persist updated member names/avatars
    members.forEach((m: any) => {
      const existing = state.users[m.id];
      // Persist name/avatar and whatsappContact if changed
      const updates: any = {};
      if (existing && existing.name !== m.name) updates.name = m.name;
      if (existing && existing.avatar !== m.avatar) updates.avatar = m.avatar;
      if (existing && String(existing.whatsappContact || '') !== String(m.whatsappContact || '')) updates.whatsappContact = m.whatsappContact;
      if (Object.keys(updates).length) {
        dataManager.updateUser(m.id, updates);
      }
    });
    // Persist memberIds order
    const whatsappSettings = {
      ...(wg.settings || {}),
      groupSendEnabled,
      whatsapp: {
        groupName: whatsappGroupName,
        groupId: whatsappGroupId,
        enabled: groupSendEnabled && !!(whatsappGroupName || whatsappGroupId)
      }
    };
    updateWG(wgId, { name, memberIds: members.map((m: any) => m.id), settings: whatsappSettings });
    setCurrentWG(wgId);
    onComplete();
  };

  const updateMember = (id: string, changes: any) => {
    setMembers(members.map((m: any) => m.id === id ? { ...m, ...changes } : m));
  };

  const addMember = () => {
    const idx = members.length + 1;
    const newUser = {
      id: generateId(),
      name: `Mitglied ${idx}`,
      email: undefined,
      avatar: AVATAR_OPTIONS[(idx-1) % AVATAR_OPTIONS.length].emoji,
      joinedAt: new Date(),
      isActive: true,
      currentMonthPoints: 0,
      targetMonthlyPoints: 100,
      totalCompletedTasks: 0
    };
    // Add raw user via dataManager to global state
    dataManager.addUser(newUser);
    setMembers([...members, newUser]);
  };

  const removeMember = (id: string) => {
    if (members.length <= 1) return;
    setMembers(members.filter((m: any) => m.id !== id));
  };

  const AvatarPicker: React.FC<{value: string; onChange:(val:string)=>void}> = ({ value, onChange }) => {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {AVATAR_OPTIONS.map(opt => (
          <button key={opt.id} type="button" className={`w-8 h-8 rounded-full flex items-center justify-center border text-lg ${value===opt.emoji? 'border-indigo-500 ring-2 ring-indigo-300':'border-slate-300'}`} onClick={()=>onChange(opt.emoji)}>
            {opt.emoji}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="p-6">
          <h1 className="text-xl font-semibold mb-4">WG bearbeiten</h1>
          <label className="block text-sm font-medium mb-1">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} />
          <div className="mt-6 flex justify-between">
            <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
            <Button variant="primary" onClick={handleSave} disabled={!name.trim()}>Speichern</Button>
          </div>
        </Card>
        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Mitglieder bearbeiten</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" type="button" onClick={addMember}>+ Mitglied</Button>
            </div>
          </div>
          <div className="space-y-4">
            {members.map((m: any, idx: number) => (
              <div key={m.id} className="border rounded p-3 bg-white">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="flex flex-col">
                    <span className="text-xs text-slate-500">Avatar</span>
                    <AvatarPicker value={m.avatar} onChange={val => updateMember(m.id, { avatar: val })} />
                  </div>
                  <div className="flex-1 min-w-[160px]">
                    <label className="text-xs text-slate-500">Name</label>
                    <Input value={m.name} onChange={e => updateMember(m.id, { name: e.target.value })} />
                    <label className="text-xs text-slate-500 mt-2">WhatsApp / Kontakt (optional)</label>
                    <Input placeholder="z.B. +491701234567 oder Gruppenname" value={m.whatsappContact || ''} onChange={e => updateMember(m.id, { whatsappContact: e.target.value })} />
                  </div>
                  <div className="flex flex-col justify-end">
                    <Button size="sm" variant="ghost" type="button" disabled={members.length<=1} onClick={() => removeMember(m.id)}>Entfernen</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold mb-2">WG WhatsApp Einstellungen</h2>
          <div className="flex items-center gap-3 mb-4">
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={groupSendEnabled} onChange={e => setGroupSendEnabled(e.target.checked)} />
              <span className="text-sm">Nachrichten an WG-Gruppe senden (statt einzelne Kontakte)</span>
            </label>
          </div>
          {groupSendEnabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">WG Gruppenname</label>
                <Input 
                  value={whatsappGroupName} 
                  onChange={e => setWhatsappGroupName(e.target.value)} 
                  placeholder="z.B. Meine WG" 
                />
                <div className="text-xs text-slate-400 mt-1">
                  Anzeigename für die Gruppe (optional)
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Gruppen-ID</label>
                <Input 
                  value={whatsappGroupId} 
                  onChange={e => setWhatsappGroupId(e.target.value)} 
                  placeholder="z.B. 120363213460007871@g.us" 
                  className="font-mono text-sm"
                />
                <div className="text-xs text-slate-400 mt-1">
                  WhatsApp Gruppen-ID für Hot Task Benachrichtigungen
                </div>
              </div>
              
              {(whatsappGroupName || whatsappGroupId) && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                  <div className="text-sm text-green-700">
                    ✅ WhatsApp-Gruppe konfiguriert
                    {whatsappGroupName && <div>📝 Name: {whatsappGroupName}</div>}
                    {whatsappGroupId && <div className="font-mono">🆔 ID: {whatsappGroupId}</div>}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

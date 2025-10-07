import React from 'react';
import { Card, Button, Badge } from '../ui';
import { ThemeSwitcher } from '../ui/ThemeSwitcher';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';

interface ProfileOverviewProps {
  onCreateNew: () => void;
  onSelectExisting: () => void; // triggers when a user is selected
  onEditWG?: (wgId: string) => void; // lift WG edit into React event system (replaces CustomEvent approach)
}

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ onCreateNew, onSelectExisting, onEditWG }) => {
  const { state, setCurrentUser, setCurrentWG } = usePutzplanStore() as any;
  const users = Object.values(state.users || {}) as any[];
  const wgMap = state.wgs || {}; // alle WGs
  const wgList = Object.values(wgMap);
  const wg = state.currentWG; // aktuelle WG (falls gewählt)

  const selectWG = () => {
    if (users.length === 0) return;
    // Auto: nimm ersten aktiven User als "Session User" für die WG
    const primary: any = users.find((u: any) => u.isActive) || users[0];
    if (primary) setCurrentUser(primary.id);
    onSelectExisting();
  };

  const handleSelect = (userId: string) => {
    setCurrentUser(userId);
    onSelectExisting();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
    <h1 className="text-2xl font-bold text-slate-900">Wähle eine WG</h1>
    <div className="bg-white/70 backdrop-blur rounded border border-slate-200 p-2 shadow-sm inline-flex items-center">
      <ThemeSwitcher />
    </div>
  </div>
        {!wg && users.length === 0 && (
          <Card className="mb-6 text-center p-10">
            <p className="text-slate-600 mb-4">Noch keine Profile vorhanden.</p>
            <Button onClick={onCreateNew}>+ Neues Profil anlegen</Button>
          </Card>
        )}
        {wgList.length > 0 && (
          <>
            <div className="grid gap-6 mb-10">
              {wgList.map((wgItem: any) => {
                const memberObjs = wgItem.memberIds.map((id: string) => users.find(u => u.id === id)).filter(Boolean);
                return (
                  <Card key={wgItem.id} className="cursor-pointer hover:shadow-lg transition border-2 border-transparent hover:border-indigo-300" onClick={() => {
                    // wähle primären User (ersten member) und setze currentWG
                    const primaryUser = memberObjs[0];
                    if (primaryUser) setCurrentUser(primaryUser.id);
                    setCurrentWG(wgItem.id);
                    onSelectExisting();
                  }}>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                      <div className="flex -space-x-3">
                        {memberObjs.slice(0,5).map((u: any) => (
                          <div key={u.id} className="w-12 h-12 rounded-full border bg-white flex items-center justify-center text-2xl" title={u.name}>{u.avatar}</div>
                        ))}
                        {memberObjs.length > 5 && (
                          <div className="w-12 h-12 rounded-full border bg-slate-100 flex items-center justify-center text-xs font-semibold">+{memberObjs.length-5}</div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h2 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                          {wgItem.name} <Badge variant="default" size="sm">{memberObjs.length} Mitglieder</Badge>
                        </h2>
                        <p className="text-sm text-slate-600 line-clamp-2">{wgItem.description || 'WG Profil'}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {memberObjs.slice(0,8).map((u: any) => (
                            <span key={u.id} className="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">{u.name}</span>
                          ))}
                        </div>
                      </div>
                      <div className="md:self-center flex gap-2">
                        <Button size="sm" variant="primary" data-testid={`open-wg-${wgItem.id}`}>WG öffnen</Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEditWG?.(wgItem.id);
                          }}
                        >Bearbeiten</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            <div className="text-right mb-8">
              <Button size="sm" variant="secondary" onClick={onCreateNew} data-testid="create-wg-btn">+ Neue WG erstellen</Button>
            </div>
          </>
        )}

        {/* Einzelne User-Profile (legacy) entfernt: nur noch WG-Karten */}
      </div>
    </div>
  );
};

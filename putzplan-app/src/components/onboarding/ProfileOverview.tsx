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
  const { state, setCurrentUser, setCurrentWG, debugMode, toggleDebugMode, removeOrphanUsers } = usePutzplanStore() as any;
  const users = Object.values(state.users || {}) as any[];
  const wgMap = state.wgs || {}; // alle WGs
  const wgList = Object.values(wgMap);
  const wg = state.currentWG; // aktuelle WG (falls gewählt)
  const memberIdsReferenced = new Set<string>();
  Object.values(wgMap).forEach((w: any) => w.memberIds.forEach((id: string) => memberIdsReferenced.add(id)));
  const orphanUsers = users.filter(u => !memberIdsReferenced.has(u.id));
  const hasOrphans = orphanUsers.length > 0 && wgList.length > 0; // nur zeigen wenn WGs existieren, aber zusätzliche alte Profile rumliegen
  const { clearAllData } = usePutzplanStore() as any;
  const removeOrphans = () => {
    try { removeOrphanUsers(); } catch(e) { console.warn(e); }
  };

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
    <div className="bg-white/70 backdrop-blur rounded border border-slate-200 p-2 shadow-sm inline-flex items-center gap-2">
      <ThemeSwitcher />
      <Button size="sm" variant={debugMode ? 'primary':'outline'} onClick={(e)=> { e.stopPropagation(); toggleDebugMode(); }} data-testid="toggle-debug-mode">
        {debugMode ? 'Debug: AN' : 'Debug: AUS'}
      </Button>
    </div>
  </div>
        {/* Empty: no profiles at all */}
        {!wg && users.length === 0 && (
          <Card className="mb-6 text-center p-10" data-testid="empty-no-profiles">
            <p className="text-slate-600 mb-4">Noch keine Profile vorhanden.</p>
            <Button onClick={onCreateNew} data-testid="create-wg-btn">+ Neue WG erstellen</Button>
          </Card>
        )}
        {/* Gap fix: users exist (legacy profiles / imported) but no WGs created yet */}
        {!wg && users.length > 0 && wgList.length === 0 && (
          <Card className="mb-6 text-center p-10" data-testid="empty-no-wgs">
            <p className="text-slate-600 mb-2">Es existieren bereits {users.length} Profile, aber noch keine WG.</p>
            <p className="text-slate-500 mb-4 text-sm">Lege jetzt eine WG an, um Aufgaben zu verwalten.</p>
            <Button size="sm" variant="primary" onClick={onCreateNew} data-testid="create-wg-btn">+ Neue WG erstellen</Button>
          </Card>
        )}
        {wgList.length > 0 && (
          <>
            {hasOrphans && (
              <Card className="mb-6 border-amber-300 bg-amber-50/60" data-testid="orphan-profiles-warning">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-amber-800">
                    Es existieren {orphanUsers.length} nicht zugeordnet(e) Profil(e) (kein Mitglied einer WG). Du kannst sie bereinigen.
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={removeOrphans} data-testid="cleanup-orphans-btn">Orphans entfernen</Button>
                    <Button size="sm" variant="secondary" onClick={clearAllData} data-testid="full-reset-btn">Komplett Reset</Button>
                  </div>
                </div>
              </Card>
            )}
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

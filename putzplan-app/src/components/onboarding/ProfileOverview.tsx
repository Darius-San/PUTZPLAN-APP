import React from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';

interface ProfileOverviewProps {
  onSelectProfile: () => void; // Wird aufgerufen nachdem ein Profil gewählt wurde
  onCreateProfile: () => void; // Öffnet den Setup Wizard für ein neues Profil / neue WG
}

export const ProfileOverview: React.FC<ProfileOverviewProps> = ({ onSelectProfile, onCreateProfile }) => {
  const { state, setCurrentUser, createUser, loadDemoDataset, forceResetDemo, isDemoDataset } = usePutzplanStore();
  const hasProfiles = Object.keys(state.users).length > 0;
  const likelyMissingSeed = Object.keys(state.users).length < 2; // Heuristik: Seed hat 6 Nutzer

  const handleSelect = (id: string) => {
    setCurrentUser(id);
    onSelectProfile();
  };
  const handleCreate = () => {
    // Erstelle einen Platzhalter-User (wird im Setup Wizard verfeinert)
    const newUser = createUser({ name: 'Neuer User', targetMonthlyPoints: 100 });
    setCurrentUser(newUser.id);
    onCreateProfile();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-6">
      <div className="w-full max-w-lg space-y-6">
        <h1 className="text-2xl font-bold text-center text-gray-800">Profile</h1>
        <p className="text-center text-gray-600 text-sm">
          {hasProfiles ? 'Wähle ein bestehendes Profil oder lege ein neues an.' : 'Noch kein Profil vorhanden – erstelle jetzt eines.'}
        </p>
        {(!isDemoDataset) && (
          <div className="w-full max-w-lg mx-auto -mt-2 mb-2">
            <div className="rounded-md border border-amber-300 bg-amber-50 text-amber-800 text-xs px-3 py-2 flex items-center justify-between">
              <span>Demo-Daten noch nicht geladen.</span>
              <button onClick={loadDemoDataset} className="underline font-medium">Jetzt laden</button>
            </div>
          </div>
        )}
        <div className="flex flex-col items-center gap-3">
          <button onClick={handleCreate} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm">
            <span>+ Neues Profil</span>
          </button>
          <button onClick={loadDemoDataset} className="text-xs text-indigo-600 hover:text-indigo-800 underline">
            Demo-Daten neu laden
          </button>
          <button onClick={forceResetDemo} className="text-[11px] text-rose-600 hover:text-rose-700 underline">
            Hard Reset + Demo
          </button>
          <div className="text-[10px] text-gray-400 tracking-wide">
            users: {Object.keys(state.users).length} · tasks: {Object.keys(state.tasks).length} · wg: {state.currentWG ? 'yes' : 'no'} {isDemoDataset && '· demo'}
          </div>
        </div>

        <div className="bg-white shadow-sm border rounded-lg p-5">
          <h2 className="font-semibold text-gray-800 mb-3">{hasProfiles ? 'Verfügbare Profile' : 'Noch keine Profile'}</h2>
          {hasProfiles ? (
            <ul className="divide-y divide-gray-200">
              {Object.values(state.users).map(u => (
                <li key={u.id} className="py-2 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-xl">{u.avatar || '👤'}</span>
                    <div>
                      <p className="font-medium text-gray-800">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.currentMonthPoints} / {u.targetMonthlyPoints} Punkte</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleSelect(u.id)} className="text-xs md:text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700 font-medium">
                      Öffnen
                    </button>
                    <button className="text-xs md:text-sm px-3 py-1.5 rounded-md bg-gray-200 text-gray-600 cursor-not-allowed" title="Bearbeiten bald verfügbar" disabled>
                      Edit
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-gray-500 text-center py-4">Lege über "Neues Profil" einen ersten Benutzer an.</div>
          )}
        </div>
      </div>
    </div>
  );
};

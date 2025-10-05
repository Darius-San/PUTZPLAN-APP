import React, { useState } from 'react';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { ProfileOverview } from './components/onboarding/ProfileOverview';
import { usePutzplanStore } from './hooks/usePutzplanStore';

function App() {
  const { currentUser, currentWG } = usePutzplanStore();
  // simplified (no TS generic in .jsx)
  const [phase, setPhase] = useState('profiles'); // 'profiles' | 'setup' | 'app'

  // Automatischer Wechsel NUR in den Setup Wizard wenn ein User existiert aber noch keine WG erstellt wurde.
  // Kein automatischer Direkt-Sprung ins Dashboard mehr – der Nutzer soll zuerst explizit entscheiden.
  // Keine automatische Navigation mehr; Wechsel passieren nur durch explizite Aktionen.

  if (phase === 'profiles') {
    return <ProfileOverview
      onSelectProfile={() => {
        // Wenn User gewählt wurde und WG existiert -> Dashboard
        if (currentUser && currentWG) return setPhase('app');
        // Wenn User gewählt, aber keine WG -> Setup
        if (currentUser && !currentWG) return setPhase('setup');
      }}
      onCreateProfile={() => setPhase('setup')}
    />;
  }

  if (phase === 'setup') {
    return <SetupWizard onComplete={() => setPhase('app')} />;
  }

  return <Dashboard />;
}

export default App;

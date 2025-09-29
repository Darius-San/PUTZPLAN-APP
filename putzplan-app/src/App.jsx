import React, { useState, useEffect } from 'react';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { usePutzplanStore } from './hooks/usePutzplanStore';

function App() {
  const { currentUser, currentWG } = usePutzplanStore();
  const [showSetup, setShowSetup] = useState(true);

  useEffect(() => {
    // Prüfe ob User und WG existieren
    if (currentUser && currentWG) {
      setShowSetup(false);
    }
  }, [currentUser, currentWG]);

  const handleSetupComplete = () => {
    setShowSetup(false);
  };

  if (showSetup) {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  return <Dashboard />;
}

export default App;

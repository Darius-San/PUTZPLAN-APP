import React, { useState, useEffect, useMemo, startTransition, useCallback } from 'react';
import { useUIStyle } from './hooks/useUIStyle';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { TaskAdd } from './components/dashboard/TaskAdd';
import { usePutzplanStore } from './hooks/usePutzplanStore';
import { ProfileOverview } from './components/onboarding/ProfileOverview';
import { ensureSeed } from './services/seed';
import { WGCreationWizard } from './components/wg/WGCreationWizard';
import { WGEditWizard } from './components/wg/WGEditWizard';

function App() {
  const { state, currentUser, currentWG } = usePutzplanStore();
  // Ensure UI style attribute is applied (default pill now)
  useUIStyle();
  const users = Object.values(state?.users || {});
  // Keep only explicit edit state; other phases are derived from store shape
  const [editingWGId, setEditingWGId] = useState(null);

  // Previously editing was triggered via a CustomEvent on window which caused
  // React test warnings (state updates outside React's event system). We now
  // expose an onEditWG prop to ProfileOverview so the update originates from
  // a normal React onClick handler (auto wrapped in act() during tests).
  const handleEditWG = useCallback((wgId) => {
    startTransition(() => setEditingWGId(wgId));
  }, []);

  // Backwards compatibility: support legacy CustomEvent used in tests (will be phased out).
  useEffect(() => {
    const legacyHandler = (e) => {
      const id = e.detail?.id;
      if (id) handleEditWG(id);
    };
    window.addEventListener('putzplan-edit-wg', legacyHandler);
    return () => window.removeEventListener('putzplan-edit-wg', legacyHandler);
  }, [handleEditWG]);

  // Initial seeding
  useEffect(() => {
    ensureSeed();
  }, []);

  // Derive phase instead of imperative multi-setState to avoid warnings.
  const phase = useMemo(() => {
    if (editingWGId) return 'wg-edit';
    if (!currentUser) return 'profiles';
    if (currentUser && !currentWG) return 'setup';
    return 'app';
  }, [editingWGId, currentUser, currentWG]);

  // Simple local UI phase for add-task (not persisted)
  const [addingTask, setAddingTask] = useState(false);

  const [createMode, setCreateMode] = useState(false);
  const handleCreateNewProfile = () => { setCreateMode(true); };
  const handleSelectExisting = () => { /* no-op: phase derived */ };

  const effectivePhase = createMode ? 'wg-create' : (addingTask ? 'task-add' : phase);
  console.log('[App render] phase', effectivePhase);

  if (effectivePhase === 'profiles') {
    return <ProfileOverview onCreateNew={handleCreateNewProfile} onSelectExisting={handleSelectExisting} onEditWG={handleEditWG} />;
  }
  if (effectivePhase === 'wg-create') {
    return <WGCreationWizard onComplete={() => { setCreateMode(false); }} onCancel={() => { setCreateMode(false); }} />;
  }
  if (effectivePhase === 'wg-edit' && editingWGId) {
    return <WGEditWizard wgId={editingWGId} onCancel={() => { setEditingWGId(null); }} onComplete={() => { setEditingWGId(null); }} />;
  }
  if (effectivePhase === 'setup') {
    return <SetupWizard onComplete={() => { /* phase auto-derives to app once currentWG present */ }} />;
  }
  if (effectivePhase === 'task-add') {
    return <TaskAdd onBack={()=> setAddingTask(false)} onSaved={()=> { setAddingTask(false); }} />;
  }
  return <Dashboard onAddTask={()=> setAddingTask(true)} />;
}

export default App;

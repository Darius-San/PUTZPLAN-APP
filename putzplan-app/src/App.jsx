import React, { useState, useEffect, useMemo, startTransition, useCallback, useLayoutEffect } from 'react';
import { useUIStyle } from './hooks/useUIStyle';
import { SetupWizard } from './components/setup/SetupWizard';
import { Dashboard } from './components/dashboard/Dashboard';
import { TaskAdd } from './components/dashboard/TaskAdd';
import { RatingsOverview } from './components/ratings/RatingsOverview';
import { MemberRatings } from './components/ratings/MemberRatings';
import PeriodSettings from './components/period/PeriodSettings';
import { AbsenceManagement } from './components/absences/AbsenceManagement';
import { TaskTablePage } from './components/taskTable/TaskTablePage';
import SettingsPage from './components/settings/SettingsPage';
import { StateRestoreModal } from './components/stateRestore/StateRestoreModal';
import { StateRestorePage } from './components/stateRestore/StateRestorePage';
import { AnalyticsPage } from './components/analytics/AnalyticsPage';
import { CompactAnalytics } from './components/analytics/CompactAnalytics';
import { UserAnalyticsPage } from './components/analytics/UserAnalyticsPage';
import { usePutzplanStore } from './hooks/usePutzplanStore';
import { ProfileOverview } from './components/onboarding/ProfileOverview';
import { ensureSeed } from './services/seed';
import { dataManager } from './services/dataManager';
import { WGCreationWizard } from './components/wg/WGCreationWizard';
import { WGEditWizard } from './components/wg/WGEditWizard';
import { UrgentTaskProvider } from './contexts/UrgentTaskContext';
import { WhatsAppTestPanel } from './components/WhatsAppTestPanel';
import { BrowserSyncDebug } from './components/debug/BrowserSyncDebug';
import { whatsappService } from './services/whatsappService';

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

  // Initial seeding (& early debug hash detection before first paint completion)
  useLayoutEffect(() => {
    ensureSeed();
    try {
      if (window?.location?.hash?.includes('debug') && !dataManager.isDebugMode()) {
        dataManager.toggleDebugMode();
      }
      // Ensure font-family is present on root even if external CSS fails to load in tests
      const htmlEl = document.documentElement;
      const ff = htmlEl.style.fontFamily || '';
      if (!ff.toLowerCase().includes('inter')) {
        htmlEl.style.fontFamily = "Inter, system-ui, Avenir, Helvetica, Arial, sans-serif";
      }
    } catch {/* noop */}
  }, []);

  // Check and auto-start WAHA on app startup
  useEffect(() => {
    const checkWahaOnStartup = async () => {
      try {
        console.log('🚀 App gestartet - prüfe WAHA Status...');
        const result = await whatsappService.ensureWahaRunning();
        
        if (!result.success && result.needsManualStart) {
          // Zeige einmal einen dezenten Hinweis, aber störe nicht den Workflow
          setTimeout(() => {
            console.log('💡 WAHA Info:', result.message);
          }, 2000);
        }
      } catch (error) {
        console.log('⚠️ WAHA Check fehlgeschlagen:', error);
      }
    };
    
    checkWahaOnStartup();
    
    // Load analytics debugger in development
    if (process.env.NODE_ENV === 'development') {
      import('./utils/analyticsDebugger.js').then(() => {
        console.log('🔧 Analytics Debugger loaded!');
      }).catch(e => console.warn('Analytics Debugger load failed:', e));
      
      import('./utils/taskTableAnalyticsComparison.js').then(() => {
        console.log('🔧 TaskTable Analytics Comparison loaded!');
      }).catch(e => console.warn('Comparison tool load failed:', e));
      
      import('./utils/debugAnalyticsTest.js').then(() => {
        console.log('🛠️ Debug Analytics Test Utils loaded!');
      }).catch(e => console.warn('Debug Analytics Test Utils load failed:', e));
      
      import('./utils/enhancedDataMismatchDebug.js').then(() => {
        console.log('🔍 Enhanced Data Mismatch Debug Tool loaded!');
      }).catch(e => console.warn('Enhanced Debug Tool load failed:', e));

      import('./debug/addNovemberData.js').then(() => {
        console.log('🗓️ November Test Data Creator loaded!');
      }).catch(e => console.warn('November Test Data Creator load failed:', e));

      import('./debug/testPeriodReset.js').then(() => {
        console.log('🧪 Period Reset Test Tools loaded!');
      }).catch(e => console.warn('Period Reset Test Tools load failed:', e));
    }
  }, []);  // Ensure period initialized once after mount (prevents computePeriodTargets from
  // triggering state updates during render via fallback logic).
  useEffect(() => {
    // Guard: only initialize if missing
    if (!dataManager.getState().currentPeriod) {
      dataManager.ensureCurrentPeriod();
    }
  }, []);

  // (Hash handled in initial layout effect above)

  // Derive phase instead of imperative multi-setState to avoid warnings.
  const phase = useMemo(() => {
    if (editingWGId) return 'wg-edit';
    if (!currentUser) return 'profiles';
    if (currentUser && !currentWG) return 'setup';
    return 'app';
  }, [editingWGId, currentUser, currentWG]);

  // Simple local UI phase for add-task (not persisted)
  const [addingTask, setAddingTask] = useState(false);
  const [ratingOverview, setRatingOverview] = useState(false);
  const [ratingUserId, setRatingUserId] = useState(null);
  const [showPeriod, setShowPeriod] = useState(false);
  const [showAbsences, setShowAbsences] = useState(false);
  const [showTaskTable, setShowTaskTable] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showStateRestore, setShowStateRestore] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const [createMode, setCreateMode] = useState(false);
  const handleCreateNewProfile = () => { setCreateMode(true); };
  const handleSelectExisting = () => { /* no-op: phase derived */ };

  let effectivePhase = phase;
  if (createMode) effectivePhase = 'wg-create';
  else if (addingTask) effectivePhase = 'task-add';
  else if (ratingOverview) effectivePhase = ratingUserId ? 'member-rating' : 'ratings-overview';
  else if (showPeriod) effectivePhase = 'period-settings';
  else if (showAbsences) effectivePhase = 'absence-management';
  else if (showTaskTable) effectivePhase = 'task-table';
  else if (showSettings) effectivePhase = 'settings';
  else if (showStateRestore) effectivePhase = 'state-restore';
  else if (showAnalytics) effectivePhase = selectedUserId ? 'user-analytics' : 'analytics';
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
  if (effectivePhase === 'ratings-overview') {
    return <RatingsOverview onBack={()=> setRatingOverview(false)} onSelectUser={(uid)=> setRatingUserId(uid)} />;
  }
  if (effectivePhase === 'member-rating' && ratingUserId) {
    return <MemberRatings userId={ratingUserId} onBack={()=> setRatingUserId(null)} />;
  }
  if (effectivePhase === 'period-settings') {
    return <PeriodSettings onBack={()=> setShowPeriod(false)} />;
  }
  if (effectivePhase === 'absence-management') {
    return <AbsenceManagement onBack={()=> setShowAbsences(false)} />;
  }
  if (effectivePhase === 'task-table') {
    return <TaskTablePage onBack={()=> setShowTaskTable(false)} />;
  }
  if (effectivePhase === 'settings') {
    return <SettingsPage onBack={()=> setShowSettings(false)} />;
  }
  if (effectivePhase === 'state-restore') {
    return <StateRestorePage onBack={()=> setShowStateRestore(false)} />;
  }
  if (effectivePhase === 'analytics') {
    return <CompactAnalytics onBack={() => { setShowAnalytics(false); setSelectedUserId(null); }} />;
  }
  if (effectivePhase === 'user-analytics' && selectedUserId) {
    return <UserAnalyticsPage userId={selectedUserId} onBack={()=> setSelectedUserId(null)} />;
  }
  return (
    <>
      <Dashboard onAddTask={()=> setAddingTask(true)} onRate={()=> { setRatingOverview(true); }} onPeriod={()=> setShowPeriod(true)} onAbsences={()=> setShowAbsences(true)} onTaskTable={()=> setShowTaskTable(true)} onSettings={()=> setShowSettings(true)} onStateRestore={()=> setShowStateRestore(true)} onAnalytics={()=> setShowAnalytics(true)} />
    </>
  );
}

function AppWithProviders() {
  const [isDebugMode, setIsDebugMode] = useState(() => dataManager.isDebugMode());
  
  // Debug mode changes listener
  useEffect(() => {
    const checkDebugMode = () => {
      setIsDebugMode(dataManager.isDebugMode());
    };
    
    // Check periodically for debug mode changes (when hash changes)
    const interval = setInterval(checkDebugMode, 1000);
    
    // Also check on hash changes
    const handleHashChange = () => {
      setTimeout(checkDebugMode, 100); // Small delay to let dataManager process
    };
    
    window.addEventListener('hashchange', handleHashChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

  return (
    <UrgentTaskProvider>
      <App />
      {isDebugMode && <WhatsAppTestPanel />}
      <BrowserSyncDebug onClose={() => {}} />
    </UrgentTaskProvider>
  );
}

export default AppWithProviders;

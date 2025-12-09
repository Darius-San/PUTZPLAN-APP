import React, { useState } from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { dataManager } from '../../services/dataManager';
import PeriodCreation from './PeriodCreation';
import PeriodSelection from './PeriodSelection';
import PeriodInfo from './PeriodInfo';
import { normalizePeriods, formatShortLabel } from './periodUtils';
import { useToast } from '../ui/ToastContext';
import { Button } from '../ui/Button';

interface PeriodSettingsProps {
  onBack: () => void;
}

// Mock data for demonstration
const mockPeriods = [
  {
    id: '1',
    start: '2024-01-01',
    end: '2024-01-31',
    isExpired: true
  },
  {
    id: '2', 
    start: '2024-02-01',
    end: '2024-02-29',
    isExpired: false
  }
];

const mockWgInfo = {
  name: 'Demo WG',
  memberCount: 4,
  taskCount: 8,
  totalExecutions: 25
};

const PeriodSettings: React.FC<PeriodSettingsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'select' | 'info'>('select');
  const [periodReloadKey, setPeriodReloadKey] = useState(0);
  
  const { 
    state, 
    currentWG, 
    setCustomPeriod, 
    resetForNewPeriod, 
    getHistoricalPeriods, 
    setDisplayPeriod, 
    getDisplayPeriod 
  } = usePutzplanStore() as any;

  const toast = useToast();

  const currentPeriod = state?.currentPeriod;
  const currentMembers = currentWG?.members?.filter((m: any) => m.isActive) || [];
  const tasks = Object.values(state?.tasks || {});
  
  // Real data for period creation
  const getOverlappingPeriods = (startDate: string, endDate: string) => {
    const historicalPeriods = getHistoricalPeriods() || [];
    const newStart = new Date(startDate);
    const newEnd = new Date(endDate);
    
    return historicalPeriods.filter((period: any) => {
      const periodStart = new Date(period.start);
      const periodEnd = new Date(period.end);
      return newStart <= periodEnd && newEnd >= periodStart;
    }).map((period: any) => ({
      id: period.id,
      name: `Zeitraum ${period.start} - ${period.end}`,
      startDate: period.start,
      endDate: period.end,
      isActive: period.isActive
    }));
  };

  const handleCreatePeriod = (startDate: string, endDate: string, resetData: boolean) => {
    try {
      const success = setCustomPeriod(new Date(startDate), new Date(endDate), resetData);
      if (success) {
        toast.success(resetData ? '✅ Neuer Zeitraum erstellt und alle Daten zurückgesetzt!' : '✅ Neuer Zeitraum erfolgreich erstellt!');
        setActiveTab('select');
        setPeriodReloadKey(k => k + 1); // Trigger reload
      } else {
        toast.error('❌ Fehler beim Erstellen des Zeitraums!');
      }
    } catch (error) {
      console.error('Error creating period:', error);
      toast.error('❌ Fehler beim Erstellen des Zeitraums!');
    }
  };

  // Real data for period selection
  // Load periods from store or dataManager, then normalize to a shared canonical shape
  let rawPeriods: any[] = [];
  try {
    if (typeof getHistoricalPeriods === 'function') {
      const result = getHistoricalPeriods();
      rawPeriods = Array.isArray(result) ? result : [];
    } else {
      const result = dataManager.getHistoricalPeriods && dataManager.getHistoricalPeriods();
      rawPeriods = Array.isArray(result) ? result : [];
    }
  } catch (e) {
    console.error('Fehler beim Laden der Perioden:', e);
    rawPeriods = [];
  }

  const normalized = normalizePeriods(rawPeriods, currentPeriod?.id);

  // Debug logging to match Analytics behavior
  console.log('🔍 [PeriodSettings] getHistoricalPeriods returned:', rawPeriods.length, 'periods');
  console.log('🔍 [PeriodSettings] Normalized periods:', normalized.map((p: any) => ({ id: p.id, startDate: p.startDate, endDate: p.endDate, isActive: p.isActive })));

  const periodOptions = normalized.map((period: any) => ({
    id: period.id,
    name: formatShortLabel(period),
    startDate: period.startDate,
    endDate: period.endDate,
    isActive: period.isActive,
    isHistorical: !period.isActive
  }));

  // Debug period options for synchronization test
  console.log('🔍 [PeriodSettings] Period options mapped:', periodOptions.length);
  console.log('🔍 [PeriodSettings] Period options:', periodOptions.map(p => ({ id: p.id, name: p.name, isActive: p.isActive })));

  const handlePeriodSelect = (periodId: string | null) => {
    if (periodId) {
      setDisplayPeriod(periodId);
    }
  };

  const handleViewHistoricalPeriod = (periodId: string) => {
    setDisplayPeriod(periodId);
    setActiveTab('info');
  };
  
  const handleDeletePeriod = (periodId: string) => {
    try {
      console.log('🗑️ Deleting period:', periodId);
      // Call DataManager to delete the period (updates state and persists)
      if (dataManager && typeof dataManager.deletePeriod === 'function') {
        dataManager.deletePeriod(periodId);
        toast.success('✅ Zeitraum erfolgreich gelöscht!');
      } else {
        console.warn('dataManager.deletePeriod not available');
        toast.error('❌ Löschen nicht möglich (Debugger-Modus)');
      }
    } catch (error) {
      console.error('Error deleting period:', error);
      toast.error('❌ Fehler beim Löschen des Zeitraums!');
    }
  };

  // Real data for period info
  const wgInfoData = {
    name: currentWG?.name || 'Unbenannte WG',
    memberCount: currentMembers.length,
    taskCount: tasks.length,
    totalExecutions: Object.values(state?.executions || {}).length
  };

  const periodStatsData = currentPeriod ? {
    totalTasks: tasks.length * currentMembers.length,
    completedTasks: Object.values(state?.executions || {}).filter((exec: any) => 
      exec.periodId === currentPeriod.id
    ).length,
    activeMembers: currentMembers.length,
    averageTasksPerMember: currentMembers.length > 0 ? tasks.length : 0,
    daysRemaining: Math.max(0, Math.ceil((new Date(currentPeriod.end).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))),
    totalDays: Math.ceil((new Date(currentPeriod.end).getTime() - new Date(currentPeriod.start).getTime()) / (1000 * 60 * 60 * 24))
  } : null;

  const currentPeriodData = currentPeriod ? {
    id: currentPeriod.id,
    name: `Zeitraum ${currentPeriod.start} - ${currentPeriod.end}`,
    startDate: currentPeriod.start,
    endDate: currentPeriod.end
  } : null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header mit prominentem Zurück-Button */}
        <div className="flex items-center justify-between bg-white rounded-lg p-4 shadow-sm border-2 border-blue-200">
          <Button
            onClick={onBack}
            variant="primary"
            size="lg"
            className="font-bold px-8 py-4 rounded-lg shadow-lg border-2 border-orange-500 bg-orange-400 text-white hover:bg-orange-500 hover:border-orange-600"
            style={{ marginRight: 'auto' }}
          >
            Zurück
          </Button>
          <div className="text-center flex-1 ml-4">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📅 Zeitraumanagement</h1>
            <p className="text-gray-600">Verwalte die Planungszeiträume für euren WG-Putzplan</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 flex space-x-1">
          <button
            data-testid="period-tab-select"
            onClick={() => setActiveTab('select')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'select' 
                ? 'bg-blue-100 text-blue-800 border border-blue-200' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            📋 Zeitraum auswählen
          </button>
          <button
            data-testid="period-tab-create"
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'create' 
                ? 'bg-green-100 text-green-800 border border-green-200' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            ✨ Neuen Zeitraum erstellen
          </button>
          <button
            data-testid="period-tab-info"
            onClick={() => setActiveTab('info')}
            className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
              activeTab === 'info' 
                ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            📊 Zeitraum Info
          </button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'create' && (
            <PeriodCreation 
              onCreatePeriod={handleCreatePeriod}
              getOverlappingPeriods={getOverlappingPeriods}
            />
          )}

          {activeTab === 'select' && (
            <PeriodSelection 
              periods={Array.isArray(periodOptions) ? periodOptions : []}
              currentPeriodId={currentPeriod?.id || null}
              onPeriodSelect={handlePeriodSelect}
              onViewHistoricalPeriod={handleViewHistoricalPeriod}
              onDeletePeriod={handleDeletePeriod}
            />
          )}

          {activeTab === 'info' && (
            <PeriodInfo 
              currentPeriod={currentPeriodData}
              wgInfo={wgInfoData}
              periodStats={periodStatsData}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default PeriodSettings;
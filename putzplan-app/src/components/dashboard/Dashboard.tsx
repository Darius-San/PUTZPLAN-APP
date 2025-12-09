import React from 'react';
import { Button } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { useSettings } from '../../services/settingsManager';
import { Plus } from 'lucide-react';

// Minimal Dashboard version: only profile switch + centered add task button
export const Dashboard: React.FC<{ onAddTask?: () => void; onRate?: () => void; onPeriod?: () => void; onAbsences?: () => void; onTaskTable?: () => void; onSettings?: () => void; onStateRestore?: () => void; onAnalytics?: () => void }> = ({ onAddTask, onRate, onPeriod, onAbsences, onTaskTable, onSettings, onStateRestore, onAnalytics }) => {
  const { currentUser, currentWG, clearCurrentUser, clearCurrentWG } = usePutzplanStore() as any;

  if (!currentUser || !currentWG) return <div>Loading...</div>;

  const handleProfileSwitch = () => {
    if (window.confirm('Zur Profilübersicht zurückkehren?')) {
      clearCurrentUser();
      clearCurrentWG();
    }
  };
  const { getDashboardButtonWidthClass, getDashboardButtonSizeClass, getDashboardIconClass } = useSettings();
  const widthClass = getDashboardButtonWidthClass();
  const sizeClass = getDashboardButtonSizeClass();
  const iconClass = getDashboardIconClass();

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* UrgentTaskPanel removed per user request: hot tasks are not shown on dashboard */}
      <div className="flex-1 flex items-center justify-center py-4 px-4">
        {/* All buttons in one grid including profile switch - centered and larger */}
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-6 items-center">
          
          {/* Profile switch button as first button (left-aligned small wrapper to match layout tests) */}
          <div className="flex justify-center">
            <Button
              onClick={handleProfileSwitch}
              data-testid="profile-switch-btn"
              size="lg"
              variant="outline"
              className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center bg-rose-600 text-white border-rose-600 hover:bg-rose-700 hover:border-rose-700`}
            >
              <span>👤 Profile wechseln</span>
            </Button>
          </div>
          
          {/* Each button is full-width and uses consistent padding to ensure equal size */}
          <Button
            onClick={onAddTask}
            data-testid="add-task-btn"
            size="lg"
            className={`${widthClass} ${sizeClass} font-semibold shadow-xl rounded-2xl flex items-center justify-center`}
          >
            <Plus className={iconClass} />
            <span>Task hinzufügen</span>
          </Button>

          <Button
            onClick={onRate}
            data-testid="rate-tasks-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center`}
          >
            <span>⭐ Tasks bewerten</span>
          </Button>

          <Button
            onClick={onPeriod}
            data-testid="period-settings-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center`}
          >
            <span>📅 Zeitraum</span>
          </Button>

          <Button
            onClick={onAbsences}
            data-testid="absence-management-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center`}
          >
            <span>🏝️ Abwesenheit verwalten</span>
          </Button>

          <Button
            onClick={onTaskTable}
            data-testid="task-table-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center`}
          >
            <span>📊 Task-Tabelle</span>
          </Button>

          <Button
            onClick={onSettings}
            data-testid="settings-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center`}
          >
            <span>⚙️ Einstellungen</span>
          </Button>

          <Button
            onClick={onStateRestore}
            data-testid="state-restore-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center bg-gradient-to-r from-blue-500 to-purple-600 text-white border-transparent hover:from-blue-600 hover:to-purple-700 shadow-lg`}
          >
            <span>🔄 State wiederherstellen</span>
          </Button>

          <Button
            onClick={onAnalytics}
            data-testid="analytics-btn"
            size="lg"
            variant="outline"
            className={`${widthClass} ${sizeClass} font-semibold rounded-2xl flex items-center justify-center bg-gradient-to-r from-green-500 to-blue-600 text-white border-transparent hover:from-green-600 hover:to-blue-700 shadow-lg`}
          >
            <span>📊 Statistics</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
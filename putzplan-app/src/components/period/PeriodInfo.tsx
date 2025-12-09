import React from 'react';
import { Card } from '../ui';

interface PeriodInfoProps {
  currentPeriod: {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
  } | null;
  wgInfo: {
    name: string;
    memberCount: number;
    taskCount: number;
    totalExecutions: number;
  } | null;
  periodStats: {
    totalTasks: number;
    completedTasks: number;
    activeMembers: number;
    averageTasksPerMember: number;
    daysRemaining: number;
    totalDays: number;
  } | null;
}

export const PeriodInfo: React.FC<PeriodInfoProps> = ({ 
  currentPeriod, 
  wgInfo, 
  periodStats 
}) => {
  const formatDateRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate).toLocaleDateString('de-DE', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
    const end = new Date(endDate).toLocaleDateString('de-DE', { 
      weekday: 'short',
      day: 'numeric', 
      month: 'short',
      year: 'numeric'
    });
    return { start, end };
  };

  const getProgressPercentage = () => {
    if (!periodStats || periodStats.totalDays === 0) return 0;
    const elapsedDays = periodStats.totalDays - periodStats.daysRemaining;
    return Math.min(100, Math.max(0, (elapsedDays / periodStats.totalDays) * 100));
  };

  const getTaskCompletionPercentage = () => {
    if (!periodStats || periodStats.totalTasks === 0) return 0;
    return (periodStats.completedTasks / periodStats.totalTasks) * 100;
  };

  if (!currentPeriod) {
    return (
      <Card className="p-6 bg-white shadow-lg border rounded-xl">
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-4">📅</div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Kein aktiver Zeitraum</h3>
          <p className="text-gray-600 text-sm">
            Erstelle oder wähle einen Zeitraum aus, um Informationen zu sehen.
          </p>
        </div>
      </Card>
    );
  }

  const dateRange = formatDateRange(currentPeriod.startDate, currentPeriod.endDate);
  const progressPercentage = getProgressPercentage();
  const taskCompletionPercentage = getTaskCompletionPercentage();

  return (
    <Card className="p-6 bg-white shadow-lg border rounded-xl">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
            <span className="text-white">📈</span>
          </div>
          Aktueller Zeitraum
        </h2>
        <p className="text-gray-600 mt-2">Übersicht über den aktiven Zeitraum und Statistiken</p>
      </div>

      <div className="space-y-6">
        {/* Period Details */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
          <h3 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
            <span className="text-purple-600">🗓️</span>
            {currentPeriod.name}
          </h3>
          
          <div className="grid gap-3 md:grid-cols-2">
            <div className="flex items-center gap-2">
              <span className="text-green-600">🟢</span>
              <div className="text-sm">
                <div className="font-semibold text-gray-700">Start</div>
                <div className="text-gray-600">{dateRange.start}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-red-600">🔴</span>
              <div className="text-sm">
                <div className="font-semibold text-gray-700">Ende</div>
                <div className="text-gray-600">{dateRange.end}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          {periodStats && (
            <div className="mt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">Zeitfortschritt</span>
                <span className="text-sm text-gray-600">
                  {periodStats.daysRemaining > 0 
                    ? `${periodStats.daysRemaining} Tage verbleibend`
                    : 'Zeitraum beendet'
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progressPercentage}%` }}
                ></div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {Math.round(progressPercentage)}% abgeschlossen
              </div>
            </div>
          )}
        </div>

        {/* WG Info */}
        {wgInfo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-blue-600">👥</span>
              WG Information
            </h4>
            
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-blue-600">{wgInfo.memberCount}</div>
                <div className="text-xs text-gray-600">Mitglieder</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-600">{wgInfo.taskCount}</div>
                <div className="text-xs text-gray-600">Aufgaben</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-purple-600">{wgInfo.totalExecutions}</div>
                <div className="text-xs text-gray-600">Erledigungen</div>
              </div>
              
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-orange-600">{wgInfo.name}</div>
                <div className="text-xs text-gray-600">WG Name</div>
              </div>
            </div>
          </div>
        )}

        {/* Period Statistics */}
        {periodStats && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
              <span className="text-green-600">📊</span>
              Zeitraum Statistiken
            </h4>
            
            <div className="space-y-4">
              {/* Task Progress */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-semibold text-gray-700">Aufgaben-Fortschritt</span>
                  <span className="text-sm text-gray-600">
                    {periodStats.completedTasks} / {periodStats.totalTasks}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${taskCompletionPercentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {Math.round(taskCompletionPercentage)}% abgeschlossen
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-2 grid-cols-2">
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-green-600">{periodStats.activeMembers}</div>
                  <div className="text-xs text-gray-600">Aktive Mitglieder</div>
                </div>
                
                <div className="bg-white rounded-lg p-3 text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {periodStats.averageTasksPerMember.toFixed(1)}
                  </div>
                  <div className="text-xs text-gray-600">Ø Aufgaben/Mitglied</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h4 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-gray-600">⚡</span>
            Schnellaktionen
          </h4>
          <div className="text-sm text-gray-600 space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span>Bearbeite Zeiträume über die Auswahl-Sektion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span>Erstelle neue Zeiträume in der Erstellungs-Sektion</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              <span>Statistiken werden automatisch aktualisiert</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default PeriodInfo;
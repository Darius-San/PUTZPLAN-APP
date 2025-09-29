import React from 'react';
import { Card, ProgressBar, Badge, Button } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { TaskSuggestion } from '../../types';
import { Bell, Plus, CheckCircle, AlertTriangle, Calendar, Camera } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const {
    currentUser,
    currentWG,
    taskSuggestions,
    overdueTasksCount,
    currentUserProgress,
    recentExecutions,
    unreadNotificationsCount
  } = usePutzplanStore();

  if (!currentUser || !currentWG) {
    return <div>Loading...</div>;
  }

  const progress = currentUserProgress;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Hi {currentUser.name}! 👋
              </h1>
              <p className="text-sm text-gray-600">{currentWG.name}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button className="relative p-2 text-gray-600 hover:text-gray-900">
                <Bell className="w-5 h-5" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
              <Button size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Neuer Task
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Progress Overview */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Dein Fortschritt diesen Monat
            </h2>
            <Badge 
              variant={progress.percentage >= 100 ? 'success' : progress.percentage >= 75 ? 'warning' : 'default'}
            >
              {progress.points}/{progress.target} Punkte
            </Badge>
          </div>
          
          <ProgressBar
            value={progress.points}
            max={progress.target}
            label="Monatsziel"
            color={progress.percentage >= 100 ? 'green' : progress.percentage >= 75 ? 'yellow' : 'blue'}
          />
          
          <div className="mt-4 grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{currentUser.totalCompletedTasks}</div>
              <div className="text-sm text-gray-600">Tasks erledigt</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{overdueTasksCount}</div>
              <div className="text-sm text-gray-600">Überfällig</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{Math.round(progress.percentage)}%</div>
              <div className="text-sm text-gray-600">Erreicht</div>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        {overdueTasksCount > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <div className="flex items-center space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-900">
                  Achtung: {overdueTasksCount} überfällige Tasks!
                </h3>
                <p className="text-sm text-orange-700">
                  Diese Tasks sollten dringend erledigt werden.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Task Suggestions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Empfohlene Tasks für dich
            </h2>
            <Button variant="ghost" size="sm">Alle anzeigen</Button>
          </div>
          
          {taskSuggestions.length > 0 ? (
            <div className="space-y-3">
              {taskSuggestions.slice(0, 5).map((suggestion) => (
                <TaskSuggestionCard key={suggestion.task.id} suggestion={suggestion} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-500" />
              <p>Keine dringenden Tasks! 🎉</p>
              <p className="text-sm">Du bist auf einem guten Weg.</p>
            </div>
          )}
        </Card>

        {/* Recent Activity */}
        <Card>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Kürzlich erledigt
          </h2>
          
          {recentExecutions.length > 0 ? (
            <div className="space-y-3">
              {recentExecutions.map((execution) => (
                <div key={execution.id} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {execution.task?.title || 'Unbekannter Task'}
                    </p>
                    <p className="text-sm text-gray-600">
                      von {execution.user?.name || 'Unbekannt'} • +{execution.pointsAwarded} Punkte
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-500">
                      {new Date(execution.executedAt).toLocaleDateString('de-DE')}
                    </div>
                    {execution.photo && (
                      <Camera className="w-4 h-4 text-blue-500 mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <Calendar className="w-8 h-8 mx-auto mb-2" />
              <p>Noch keine Tasks erledigt</p>
            </div>
          )}
        </Card>
      </main>
    </div>
  );
};

// Separate component for task suggestions
const TaskSuggestionCard: React.FC<{ suggestion: TaskSuggestion }> = ({ suggestion }) => {
  const { executeTask } = usePutzplanStore();
  
  const getPriorityColor = (priority: number) => {
    if (priority >= 0.7) return 'danger';
    if (priority >= 0.4) return 'warning';
    return 'default';
  };

  const formatReasons = (reasons: any[]) => {
    const reasonMap: Record<string, string> = {
      'overdue': 'Überfällig',
      'user_behind_points': 'Punkte benötigt',
      'balanced_workload': 'Fair verteilen',
      'constraint_ending': 'Zeitfenster läuft ab'
    };
    
    return reasons.map(r => reasonMap[r] || r).join(', ');
  };

  const handleExecute = () => {
    executeTask(suggestion.task.id, {
      notes: 'Über Dashboard ausgeführt'
    });
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
      <div className="flex-1">
        <div className="flex items-center space-x-2 mb-1">
          <h3 className="font-medium text-gray-900">{suggestion.task.title}</h3>
          <Badge variant={getPriorityColor(suggestion.priority)} size="sm">
            +{suggestion.pointsForUser} Punkte
          </Badge>
          {suggestion.daysOverdue && (
            <Badge variant="danger" size="sm">
              {suggestion.daysOverdue} Tage überfällig
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600">{suggestion.task.description}</p>
        <p className="text-xs text-gray-500 mt-1">
          Grund: {formatReasons(suggestion.reason)}
        </p>
      </div>
      
      <div className="ml-4">
        <Button size="sm" onClick={handleExecute}>
          Erledigen
        </Button>
      </div>
    </div>
  );
};
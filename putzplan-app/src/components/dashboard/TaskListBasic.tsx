import React from 'react';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { Card, Button, Badge } from '../ui';

export const TaskListBasic: React.FC = () => {
  const { tasks, executeTask, currentUser } = usePutzplanStore() as any;
  const taskArray = Object.values(tasks || {}).sort((a: any,b: any)=> a.title.localeCompare(b.title));

  if (!currentUser) {
    return <Card><p className="text-sm text-gray-600">Bitte zuerst ein Profil wählen.</p></Card>;
  }

  const handleExec = (taskId: string) => {
    try {
      executeTask(taskId, { notes: 'Seed Exec' });
    } catch(e) {
      console.error('Task execution failed', e);
    }
  };

  return (
    <Card>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Alle Tasks</h2>
      <div className="space-y-2">
        {taskArray.map((t: any)=> (
          <div key={t.id} className="flex items-center justify-between border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition">
            <div className="flex items-center gap-3">
              <span className="text-xl">{t.emoji}</span>
              <div>
                <div className="font-medium text-gray-800">{t.title}</div>
                <div className="text-xs text-gray-500">alle ~{t.constraints?.minDaysBetween || 0}/{t.constraints?.maxDaysBetween} Tage</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge size="sm">{t.pointsPerExecution}P</Badge>
              <Button size="sm" onClick={() => handleExec(t.id)}>Erledigt</Button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

import React from 'react';
import { Button } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { Plus } from 'lucide-react';

// Minimal Dashboard version: only profile switch + centered add task button
export const Dashboard: React.FC<{ onAddTask?: () => void }> = ({ onAddTask }) => {
  const { currentUser, currentWG, clearCurrentUser, clearCurrentWG } = usePutzplanStore() as any;

  if (!currentUser || !currentWG) return <div>Loading...</div>;

  const handleProfileSwitch = () => {
    if (window.confirm('Zur Profilübersicht zurückkehren?')) {
      clearCurrentUser();
      clearCurrentWG();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="p-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={handleProfileSwitch}>
          Profile wechseln
        </Button>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <Button
          onClick={onAddTask}
          data-testid="add-task-btn"
          size="lg"
          className="px-10 py-8 text-2xl font-semibold shadow-xl rounded-2xl flex items-center gap-3"
        >
          <Plus className="w-8 h-8" />
          Task hinzufügen
        </Button>
      </div>
    </div>
  );
};
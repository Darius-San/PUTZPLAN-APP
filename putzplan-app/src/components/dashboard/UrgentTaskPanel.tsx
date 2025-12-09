import React from 'react';
import { useUrgentTask } from '../../contexts/UrgentTaskContext';
import { motion, AnimatePresence } from 'framer-motion';
import { dataManager } from '../../services/dataManager';

export const UrgentTaskPanel: React.FC = () => {
  const { urgentTaskIds } = useUrgentTask();
  const tasks = (urgentTaskIds || []).map(id => dataManager.getState().tasks[id]).filter(Boolean as any) as any[];

  return (
    <AnimatePresence>
      {tasks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.3 }}
          className="fixed top-4 right-4 bg-red-50 border-2 border-red-200 rounded-lg p-4 shadow-lg z-30"
          data-testid="urgent-task-panel"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="text-sm font-medium text-red-600 mb-1">
                Dringender Task:
              </div>
              {tasks.length === 1 ? (
                <div className="flex items-center gap-2">
                  <span className="text-lg">{tasks[0].emoji}</span>
                  <span className="font-semibold text-red-900" data-testid="urgent-task-name">{tasks[0].title}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1" data-testid="urgent-task-list">
                  {tasks.map(t => (
                    <div key={t.id} className="flex items-center gap-2">
                      <span className="text-lg">{t.emoji}</span>
                      <span className="font-semibold text-red-900">{t.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
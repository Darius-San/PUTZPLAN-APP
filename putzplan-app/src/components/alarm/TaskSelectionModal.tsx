import React from 'react';
import { dataManager } from '../../services/dataManager';
import { motion, AnimatePresence } from 'framer-motion';
import { Task } from '../../types';

interface TaskSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTask: (task: Task) => void;
  tasks: Task[];
}

export const TaskSelectionModal: React.FC<TaskSelectionModalProps> = ({
  isOpen,
  onClose,
  onSelectTask,
  tasks
}) => {
  const handleTaskClick = (task: Task) => {
    // Do not persist here — parent caller handles persisting (to avoid double-toggle)
    onSelectTask(task);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleBackdropClick}
          data-testid="task-selection-modal-backdrop"
        >
          {/* Backdrop with blur */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          
          {/* Modal content */}
          <motion.div
            className="relative bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 max-h-[70vh] overflow-hidden"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ 
              type: "spring", 
              damping: 25, 
              stiffness: 300,
              duration: 0.2 
            }}
            data-testid="task-selection-modal"
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">
                  🚨 Dringenden Task auswählen
                </h2>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  data-testid="close-modal-button"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Task list */}
              <div className="p-6 overflow-y-auto max-h-96">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Keine Tasks verfügbar
                </div>
              ) : (
                <div className="space-y-3">
                  {tasks.map((task) => {
                    const alarmed = !!task.isAlarmed;
                    const btnClass = `w-full p-4 text-left ${alarmed ? 'bg-red-50 border border-red-200' : 'bg-gray-50 border border-gray-200'} rounded-lg transition-colors group`;
                    const titleClass = `font-medium ${alarmed ? 'text-red-900' : 'text-gray-900'} group-hover:text-red-900`;
                    const descClass = `${alarmed ? 'text-red-600' : 'text-gray-500'} text-sm`;

                    return (
                      <button
                        key={task.id}
                        onClick={() => handleTaskClick(task)}
                        className={btnClass}
                        data-testid={`task-option-${task.id}`}
                        data-alarmed={alarmed ? 'true' : 'false'}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{task.emoji}</span>
                            <div>
                              <div className={titleClass}>
                                {task.title}
                              </div>
                              {task.description && (
                                <div className={descClass}>
                                  {task.description}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className={`text-sm font-semibold ${alarmed ? 'text-red-700 bg-red-100' : 'text-emerald-700 bg-emerald-100'} px-2 py-1 rounded-full`}>
                            {task.pointsPerExecution || '?'}P
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
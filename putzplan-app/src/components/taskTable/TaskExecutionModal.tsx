import React from 'react';
import { ModalPortal } from '../ui/ModalPortal';
import { Card, Button } from '../ui';
import { Task, User } from '../../types';

interface TaskExecutionModalProps {
  task: Task;
  members: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
}

export const TaskExecutionModal: React.FC<TaskExecutionModalProps> = ({ task, members, onSelect, onClose }) => {
  // Debug marker to help verify the currently deployed layout version in the browser.
  if (process.env.NODE_ENV !== 'test') {
    // This will print once per render mount (fast refresh may re-run in dev)
    // Allows the user to confirm the build actually contains the center-only variant.
    // Version tag increment if layout changes again.
    // eslint-disable-next-line no-console
    console.log('[TaskExecutionModal] mounted layout="centered-v2" task=', task.title);
  }
  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose}
      ariaLabel="Task Ausführung wählen"
      dataTestId="task-exec-modal"
      initialFocusSelector='button[data-testid^="exec-select-"]'
      size="lg"
      className="modal-accent"
    >
      {/* Width constrainer to make the modal visually tighter than the portal's max-w-2xl */}
      <div className="w-full max-w-xl mx-auto" data-testid="task-exec-inner">
      {/* Gradient frame wrapper to strengthen visual separation from ambient amber background */}
  <div className="rounded-2xl overflow-hidden shadow-[0_8px_30px_-6px_rgba(0,0,0,0.3)] relative" style={{background:'linear-gradient(135deg, rgba(255,196,120,0.8), rgba(255,255,255,0.55) 45%, rgba(255,240,220,0.7))', padding:'2px'}}>
      {/* Soft glow */}
  <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-amber-200/40 via-amber-300/20 to-transparent blur-2xl opacity-90 pointer-events-none" />
      <Card
        className="p-7 w-full rounded-[inherit] shadow-lg backdrop-blur-xl relative pointer-events-auto border border-amber-300/70 animate-modal-in"
        data-modal="task-execution"
        data-modal-animate
        style={{
          background: 'linear-gradient(180deg, rgba(255,244,230,0.92) 0%, rgba(250,226,198,0.94) 100%)',
          boxShadow: '0 4px 18px -4px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.4)',
          borderTopLeftRadius: '16px', borderTopRightRadius: '16px', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px'
        }}
      >
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" id="task-exec-heading">
          <span className="text-2xl" aria-hidden>{task.emoji}</span>
          <span>{task.title}</span>
        </h2>
        <p className="text-sm text-slate-600 mb-6">Wer hat diesen Task erledigt?</p>
        <div className="grid grid-cols-2 gap-4 mb-8">
          {members.map(m => (
            <button
              key={m.id}
              onClick={()=> onSelect(m)}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-white hover:border-amber-400 hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-amber-500"
              data-testid={`exec-select-${m.id}`}
            >
              <span className="text-2xl" aria-hidden>{m.avatar || '👤'}</span>
              <span className="text-xs font-medium truncate max-w-[100px]">{m.name}</span>
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-3">
          <Button size="sm" variant="outline" onClick={onClose} className="px-5">Abbrechen</Button>
        </div>
      </Card>
      </div>
      </div>
    </ModalPortal>
  );
};

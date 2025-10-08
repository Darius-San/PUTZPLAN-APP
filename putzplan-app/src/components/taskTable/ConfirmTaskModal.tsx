import React, { useState } from 'react';
import { ModalPortal } from '../ui/ModalPortal';
import { Card, Button } from '../ui';
import { Task, User } from '../../types';

interface ConfirmTaskModalProps {
  task: Task;
  user: User;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
}

export const ConfirmTaskModal: React.FC<ConfirmTaskModalProps> = ({ task, user, onBack, onConfirm, onClose }) => {
  const checklist = task.checklist || [];
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  const allChecked = checklist.length === 0 || checklist.every((_, idx) => checked[idx]);

  return (
    <ModalPortal
      isOpen={true}
      onClose={onClose}
      ariaLabel="Task Ausführung bestätigen"
      dataTestId="confirm-task-modal"
      initialFocusSelector='[data-testid="confirm-exec-btn"]'
      size="lg"
      className="modal-accent"
    >
      <div className="w-full max-w-xl mx-auto" data-testid="task-confirm-inner">
        <div className="rounded-2xl overflow-hidden shadow-[0_8px_30px_-6px_rgba(0,0,0,0.3)] relative" style={{background:'linear-gradient(135deg, rgba(255,196,120,0.8), rgba(255,255,255,0.55) 45%, rgba(255,240,220,0.7))', padding:'2px'}}>
          <div aria-hidden className="absolute -inset-6 rounded-[40px] bg-gradient-to-br from-amber-200/40 via-amber-300/20 to-transparent blur-2xl opacity-90 pointer-events-none" />
          <Card
            className="p-7 w-full rounded-[inherit] shadow-lg backdrop-blur-xl relative pointer-events-auto border border-amber-300/70 animate-modal-in"
            data-modal="task-confirm"
            data-modal-animate
            style={{
              background: 'linear-gradient(180deg, rgba(255,244,230,0.92) 0%, rgba(250,226,198,0.94) 100%)',
              boxShadow: '0 4px 18px -4px rgba(0,0,0,0.25), inset 0 0 0 1px rgba(255,255,255,0.4)'
            }}
          >
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2" id="task-confirm-heading">
          <span className="text-2xl" aria-hidden>{task.emoji}</span>
          <span>{task.title}</span>
        </h2>
        <p className="text-sm text-slate-600 mb-6">Bestätige die Ausführung für <strong>{user.name}</strong>.</p>
        {checklist.length > 0 && (
          <div className="mb-6 space-y-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Checkliste</div>
            {checklist.map((item, idx) => (
              <label key={idx} className="flex items-center gap-3 text-sm cursor-pointer select-none p-2 rounded-md hover:bg-amber-50/60 transition">
                <input
                  type="checkbox"
                  checked={!!checked[idx]}
                  onChange={()=> setChecked(c => ({ ...c, [idx]: !c[idx] }))}
                  className="accent-amber-600 w-5 h-5"
                  data-testid={`check-${idx}`}
                />
                <span className={checked[idx] ? 'line-through text-slate-400' : ''}>{item}</span>
              </label>
            ))}
          </div>
        )}
        <div className="flex justify-between gap-3 pt-2">
          <Button size="sm" variant="outline" onClick={onBack} className="px-5">Zurück</Button>
          <div className="flex gap-3">
            <Button size="sm" variant="outline" onClick={onClose} className="px-5">Abbrechen</Button>
            <Button size="sm" onClick={onConfirm} disabled={!allChecked} data-testid="confirm-exec-btn" className={`px-6 ${!allChecked ? 'opacity-60 cursor-not-allowed' : ''}`}>Bestätigen</Button>
          </div>
        </div>
          </Card>
        </div>
      </div>
    </ModalPortal>
  );
};

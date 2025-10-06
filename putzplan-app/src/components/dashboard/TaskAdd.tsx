import React, { useState } from 'react';
import { Card, Button, Input } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { TaskCategory } from '../../types';

interface Props {
  onBack: () => void;
  onSaved: () => void;
}

export const TaskAdd: React.FC<Props> = ({ onBack, onSaved }) => {
  const { createTask, updateTask, state } = usePutzplanStore() as any;
  const { tasks, currentWG } = state;

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('🧽');
  const [useMinInterval, setUseMinInterval] = useState(false);
  const [minDaysBetween, setMinDaysBetween] = useState<number>(7);
  const [checkItem, setCheckItem] = useState('');
  const [checklist, setChecklist] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [emojiOpen, setEmojiOpen] = useState(false);

  // Curated emoji list for quick selection
  const emojiOptions = ['🧽','🧹','🛁','🗑️','🍽️','🧼','🪴','📝','🪟','🔥','👕','🧴','🥗'];

  const addChecklistItem = () => {
    const val = checkItem.trim();
    if (!val) return;
    setChecklist(prev => [...prev, val]);
    setCheckItem('');
  };
  const removeChecklistItem = (idx: number) => {
    setChecklist(prev => prev.filter((_,i)=> i!==idx));
  };

  const filteredTasks = Object.values(tasks || {}).filter((t: any) => !t.wgId || t.wgId === currentWG?.id);

  const canSave = title.trim().length > 0;

  const resetForm = () => {
    setEditingTaskId(null);
    setTitle('');
    setEmoji('🧽');
    setUseMinInterval(false);
    setMinDaysBetween(7);
    setChecklist([]);
    setCheckItem('');
  };

  const startEdit = (task: any) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setEmoji(task.emoji);
    const minVal = task.constraints?.minDaysBetween;
    setUseMinInterval(!!minVal);
    if (minVal) setMinDaysBetween(minVal);
    setChecklist(task.checklist || []);
  };

  const handleSave = () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const computedMax = useMinInterval ? Math.max(minDaysBetween * 2, minDaysBetween + 1) : 14;
      if (editingTaskId) {
        updateTask(editingTaskId, {
          title: title.trim(),
          emoji,
          constraints: {
            ...state.tasks[editingTaskId].constraints,
            minDaysBetween: useMinInterval ? minDaysBetween : undefined,
            maxDaysBetween: computedMax,
            requiresPhoto: false
          },
          checklist: [...checklist]
        });
      } else {
        const newTask = createTask({
          title: title.trim(),
          description: 'Manuell hinzugefügt',
          emoji,
          category: TaskCategory.GENERAL,
          timeEstimate: 30,
          difficultyScore: 5,
            unpleasantnessScore: 5,
          maxDaysBetween: computedMax,
          requiresPhoto: false,
          minDaysBetween: useMinInterval ? minDaysBetween : undefined
        });
        if (checklist.length > 0) updateTask(newTask.id, { checklist: [...checklist] });
      }
      onSaved();
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold" data-testid="task-editor-title">Tasks bearbeiten</h1>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onBack}>Zurück</Button>
            {editingTaskId && <Button variant="outline" size="sm" onClick={resetForm} data-testid="cancel-edit-btn">Neu</Button>}
            <Button size="sm" disabled={!canSave || saving} onClick={handleSave}>{editingTaskId ? 'Änderungen speichern' : 'Task speichern'}</Button>
          </div>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <div className="grid gap-8 md:grid-cols-2">
          <Card className="p-5 space-y-5" data-testid="task-form-card">
            <Input label="Task Name" value={title} onChange={e=> setTitle(e.target.value)} placeholder="z.B. Boden fegen" data-testid="task-name-input" />
            <div className="space-y-2">
              <label className="text-sm font-semibold flex items-center gap-2">Icon
                <button type="button" className="text-xs px-2 py-1 border rounded bg-white hover:bg-slate-50" onClick={()=> setEmojiOpen(o=>!o)} data-testid="toggle-emoji-picker">
                  {emojiOpen ? 'Schließen' : 'Wählen'}
                </button>
                <span className="text-xl" data-testid="current-emoji">{emoji}</span>
              </label>
              {emojiOpen && (
                <div className="border rounded p-2 bg-white shadow-sm max-h-48 overflow-auto grid grid-cols-8 gap-1" data-testid="emoji-picker">
                  {emojiOptions.map(e => (
                    <button
                      key={e}
                      type="button"
                      data-testid={`emoji-option-${e}`}
                      onClick={()=> { setEmoji(e); setEmojiOpen(false); }}
                      className={`text-xl p-1 rounded hover:bg-slate-100 ${e===emoji ? 'ring-2 ring-indigo-500' : ''}`}
                      aria-label={`Icon ${e}`}
                    >{e}</button>
                  ))}
                </div>
              )}
              <Input label="Direkt eingeben" value={emoji} maxLength={4} onChange={e=> setEmoji(e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input type="checkbox" checked={useMinInterval} onChange={e=> setUseMinInterval(e.target.checked)} data-testid="min-interval-toggle" />
                Mindestabstand aktivieren
              </label>
              {useMinInterval && (
                <Input
                  label="Mindesttage"
                  type="number"
                  min={1}
                  value={minDaysBetween}
                  onChange={e=> setMinDaysBetween(Math.max(1, Number(e.target.value)||1))}
                  className="w-32"
                  data-testid="min-interval-input"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Checkliste</label>
              <div className="flex gap-2">
                <Input placeholder="Punkt hinzufügen" value={checkItem} onChange={e=> setCheckItem(e.target.value)} onKeyDown={e=> { if (e.key==='Enter') { e.preventDefault(); addChecklistItem(); } }} data-testid="checklist-input" />
                <Button size="sm" variant="outline" onClick={addChecklistItem} disabled={!checkItem.trim()} data-testid="checklist-add-btn">Add</Button>
              </div>
              {checklist.length === 0 && <p className="text-xs text-gray-500" data-testid="checklist-empty">Noch keine Punkte.</p>}
              {checklist.length > 0 && (
                <ul className="space-y-2" data-testid="checklist-list">
                  {checklist.map((c,i)=>(
                    <li key={i} className="flex items-center justify-between bg-gray-50 rounded px-3 py-2 text-sm">
                      <span>{c}</span>
                      <button onClick={()=> removeChecklistItem(i)} className="text-gray-400 hover:text-red-600 text-xs" data-testid={`check-remove-${i}`}>Entfernen</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card className="p-5 space-y-4" data-testid="task-list-card">
            <h2 className="text-sm font-semibold flex items-center justify-between">Vorhandene Tasks <span className="text-xs text-slate-500">({filteredTasks.length})</span></h2>
            {filteredTasks.length === 0 && <p className="text-xs text-slate-500" data-testid="empty-task-list">Noch keine Tasks angelegt.</p>}
            {filteredTasks.length > 0 && (
              <ul className="divide-y" data-testid="task-list">
                {filteredTasks.map((t: any)=> (
                  <li key={t.id} className="py-2 flex items-center gap-3">
                    <span className="text-xl" aria-hidden>{t.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      {t.constraints?.minDaysBetween && <div className="text-[10px] text-slate-500">min {t.constraints.minDaysBetween} Tage</div>}
                    </div>
                    <Button size="sm" variant={editingTaskId===t.id? 'primary':'outline'} onClick={()=> startEdit(t)} data-testid={`edit-task-${t.id}`}>{editingTaskId===t.id? 'Aktiv' : 'Edit'}</Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
};

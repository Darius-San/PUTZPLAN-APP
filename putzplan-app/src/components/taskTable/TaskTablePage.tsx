import React, { useMemo, useState, useCallback } from 'react';
import { Button, Card } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { dataManager } from '../../services/dataManager';
import { Task, User } from '../../types';
import { TaskExecutionModal, ConfirmTaskModal } from './index';

interface TaskTablePageProps { onBack?: () => void; }

// Temporary in-memory executed matrix (taskId -> userId -> count)
// Will be replaced by real executions lookup

export const TaskTablePage: React.FC<TaskTablePageProps> = ({ onBack }) => {
  const { state, currentWG, currentUser } = usePutzplanStore() as any;
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  // Persistente Executions werden aus globalem State abgeleitet

  if (!currentWG || !currentUser) return <div>Loading...</div>;

  const members: User[] = currentWG.memberIds.map((id:string)=> state.users[id]).filter(Boolean);
  const tasks: Task[] = (Object.values(state.tasks) as Task[]).filter(t=> t.wgId === currentWG.id && t.isActive);

  // Dummy fallback if no tasks
  const rows = tasks.length ? tasks : [];

  const executions = useMemo(()=> Object.values(state.executions).filter((e: any) => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === currentWG.id;
  }), [state.executions, state.tasks, currentWG.id]);

  const executionCountMap = useMemo(()=> {
    const map: Record<string, Record<string, number>> = {};
    executions.forEach((e: any) => {
      if (!map[e.taskId]) map[e.taskId] = {};
      map[e.taskId][e.executedBy] = (map[e.taskId][e.executedBy] || 0) + 1;
    });
    return map;
  }, [executions]);

  const totals = useMemo(() => {
    const base: Record<string, number> = {};
    members.forEach(m => base[m.id] = 0);
    rows.forEach(task => {
      const perExec = task.pointsPerExecution || task.basePoints || 0;
      members.forEach(m => {
        const count = executionCountMap[task.id]?.[m.id] || 0;
        base[m.id] += count * perExec;
      });
    });
    return base;
  }, [executionCountMap, rows, members]);

  const possibleTotals = useMemo(()=>{
    const base: Record<string, number> = {};
    members.forEach(m => base[m.id] = 0);
    rows.forEach(task => {
      const monthly = task.totalMonthlyPoints || ((task.pointsPerExecution || task.basePoints) * (task.monthlyFrequency || 0)) || 0;
      members.forEach(m => { base[m.id] += monthly; });
    });
    return base;
  }, [rows, members]);

  const percent = (uid:string) => {
    const max = possibleTotals[uid] || 0;
    if (!max) return 0;
    return Math.round((totals[uid] / max) * 100);
  };

  // Debug: mehrere Demo Tasks generieren
  const generateDemoTasks = useCallback((count?: number) => {
    if (!dataManager.isDebugMode()) return;
    const n = count && count > 0 ? count : Math.floor(Math.random()*6)+3; // 3-8
    const names = ['Küche putzen','Müll rausbringen','Staubsaugen','Einkauf erledigen','Bad reinigen','Fenster wischen','Boden fegen','Pflanzen gießen','Wäsche waschen','Tisch abwischen'];
    for (let i=0;i<n;i++) {
      const title = names[i % names.length] + (n>names.length?` #${i+1}`:'');
      // Skip if task with same title already exists
      if (tasks.find(t=> t.title === title)) continue;
      const emojiPool = ['🧽','🗑️','🧹','🛒','🛁','🪟','🧺','🌱','🍽️','🧴'];
      const emoji = emojiPool[i % emojiPool.length];
      // Random member assignment for demo; stored in assignedUserId
      const assigned = members.length ? members[Math.floor(Math.random()*members.length)].id : undefined;
      // map pseudo timeEstimate into difficulty/unpleasantness variety
      const diff = 3 + (i % 5);
      const unpl = 2 + (i % 6);
      const baseTask = dataManager.createTask({
        title,
        description: 'Auto Demo',
        emoji,
        category: 'general' as any,
        averageMinutes: 20 + ((i * 3) % 25),
        averagePainLevel: diff,
        averageImportance: unpl,
        monthlyFrequency: Math.max(1, (i % 4) + 1),
        difficultyScore: diff,
        unpleasantnessScore: unpl,
        pointsPerExecution: 10 + diff * 2 + unpl,
        totalMonthlyPoints: 0,
        constraints: {
          maxDaysBetween: 7 + (i % 10),
          minDaysBetween: (i % 2) ? undefined : 2,
          requiresPhoto: false
        },
        isActive: true,
        setupComplete: false
      } as any);
      dataManager.updateTask(baseTask.id, {
        assignedUserId: assigned,
        checklist: (i%2===0)? ['Vorbereitung','Ausführen','Kontrolle'] : undefined
      } as any);
    }
  }, [tasks, members]);

  // Responsive width calculation: first column clamped, remaining width split among member columns
  const memberCount = members.length || 1;
  const tableStyle: React.CSSProperties = {
    '--col-task-width': 'clamp(220px, 18vw, 300px)',
    '--col-member-width': `minmax(90px, calc((100% - (var(--col-task-width))) / ${memberCount}))`
  } as any;

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="px-2 pb-4 flex-1 overflow-auto">
        <Card className="p-0 overflow-hidden" data-testid="task-table-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-white sticky top-0 z-20" data-testid="task-table-controls">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onBack} data-testid="tt-back-btn">Zurück</Button>
            </div>
            <div className="flex gap-2 flex-wrap">
              {dataManager.isDebugMode() && (
                <>
                  <Button size="sm" variant="outline" data-testid="debug-generate-demo-tasks" onClick={()=> generateDemoTasks()}>Demo Tasks (Multi)</Button>
                  <Button size="sm" variant="outline" data-testid="debug-random-exec" onClick={()=>{
                    if (!rows.length) return;
                    const task = rows[Math.floor(Math.random()*rows.length)];
                    const user = members[Math.floor(Math.random()*members.length)];
                    dataManager.executeTaskForUser(task.id, user.id, {});
                  }}>Random Exec</Button>
                </>
              )}
            </div>
          </div>
          <div className="overflow-x-auto max-w-full">
            <table className="w-full border-collapse text-sm" data-testid="task-table" style={tableStyle}>
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-3 md:px-4 py-3 font-semibold text-slate-700 border-b sticky left-0 bg-slate-50 z-10 shadow-[2px_0_0_0_#e2e8f0]" style={{width:'var(--col-task-width)'}} data-testid="col-task">Task</th>
                  {members.map(m => (
                    <th key={m.id} className="px-3 md:px-4 py-3 font-semibold text-slate-700 border-b text-center truncate" style={{width:'var(--col-member-width)'}} data-testid={`col-member-${m.id}`}>{m.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(task => {
                  return (
                    <tr key={task.id} className="transition-colors">
                      <td className="px-3 md:px-4 py-2 border-b align-top sticky left-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 z-10 shadow-[2px_0_0_0_#e2e8f0]" style={{width:'var(--col-task-width)'}}>
                        <button
                          className="group flex items-center gap-2 font-medium text-slate-800 w-full text-left rounded-md bg-white hover:bg-amber-50/80 focus-visible:ring-2 ring-amber-500/60 focus:outline-none border border-transparent"
                          onClick={()=> setSelectedTask(task)}
                          data-testid={`tt-task-${task.id}`}
                        >
                          <span className="text-lg flex-shrink-0" aria-hidden>{task.emoji}</span>
                          {(() => {
                            const userExecCount = executionCountMap[task.id]?.[currentUser.id] || 0;
                            const titleClass = userExecCount > 0 ? 'truncate flex-1 pr-2 line-through text-slate-400' : 'truncate flex-1 pr-2';
                            return <span className={titleClass} data-testid={`task-title-${task.id}`}>{task.title}</span>;
                          })()}
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full flex-shrink-0">{task.pointsPerExecution || task.basePoints}P</span>
                        </button>
                      </td>
                      {members.map(m => {
                        const count = executionCountMap[task.id]?.[m.id] || 0;
                        const groups = Math.floor(count / 5);
                        const remainder = count % 5;
                        const renderGroup = () => {
                          if (count === 0) return <span className="tally-empty" data-tally="empty">—</span>;
                          const parts: React.ReactNode[] = [];
                          for (let g=0; g<groups; g++) {
                            parts.push(
                              <span key={`g-${g}`} className="tally-group" aria-label="5 Ausführungen" data-tally="group">
                                <span className="tally-strokes">
                                  <span className="tally-stroke" />
                                  <span className="tally-stroke" />
                                  <span className="tally-stroke" />
                                  <span className="tally-stroke" />
                                </span>
                                <span className="tally-cross"><span className="tally-cross-line" data-tally="cross" /></span>
                              </span>
                            );
                          }
                          for (let r=0; r<remainder; r++) {
                            parts.push(<span key={`r-${r}`} className="tally-single" data-tally="single" />);
                          }
                          return parts;
                        };
                        return (
                          <td key={m.id} className="px-3 md:px-4 py-2 border-b text-center text-[11px] font-normal tracking-wide" style={{width:'var(--col-member-width)'}} data-testid={`exec-${task.id}-${m.id}`}>{renderGroup()}</td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 sticky bottom-12">
                    <th className="px-3 md:px-4 py-3 text-left font-semibold text-slate-800 border-t sticky left-0 bg-gradient-to-r from-slate-100 to-slate-200 z-10 shadow-[2px_0_0_0_rgba(0,0,0,0.04)]">Gesamt</th>
                    {members.map(m => (
                      <td key={m.id} className="px-3 md:px-4 py-3 text-center font-bold text-emerald-700 border-t" data-testid={`total-${m.id}`}>{totals[m.id]}P</td>
                    ))}
                  </tr>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 sticky bottom-0">
                    <th className="px-3 md:px-4 py-3 text-left font-semibold text-slate-800 border-t sticky left-0 bg-gradient-to-r from-slate-100 to-slate-200 z-10 shadow-[2px_0_0_0_rgba(0,0,0,0.04)]">Erfüllung</th>
                    {members.map(m => (
                      <td key={m.id} className="px-3 md:px-4 py-3 text-center font-semibold text-slate-600 border-t" data-testid={`percent-${m.id}`}>{percent(m.id)}%</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {rows.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-sm">Noch keine aktiven Tasks</div>
          )}
        </Card>
      </div>

      {selectedTask && !pendingUser && (
        <TaskExecutionModal
          task={selectedTask}
          members={members}
          onSelect={(user: User)=> { setPendingUser(user); }}
          onClose={()=> setSelectedTask(null)}
        />
      )}
      {selectedTask && pendingUser && (
        <ConfirmTaskModal
          task={selectedTask}
          user={pendingUser}
          onBack={()=> setPendingUser(null)}
          onConfirm={()=> {
            dataManager.executeTaskForUser(selectedTask.id, pendingUser.id, {});
            setSelectedTask(null); setPendingUser(null); setConfirmTask(null);
          }}
          onClose={()=> { setSelectedTask(null); setPendingUser(null); }}
        />
      )}
    </div>
  );
};

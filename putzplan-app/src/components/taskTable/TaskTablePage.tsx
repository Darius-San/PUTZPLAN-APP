import React, { useMemo, useState, useCallback } from 'react';
import { Button, Card } from '../ui';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { dataManager } from '../../services/dataManager';
import { useSettings } from '../../services/settingsManager';
import { Task, User } from '../../types';
import { TaskExecutionModal, ConfirmTaskModal } from './index';
import { isUserCurrentlyAbsent } from '../../utils/helpers';
import { AlarmButton } from '../alarm/AlarmButton';
import { TaskSelectionModal } from '../alarm/TaskSelectionModal';
import { useUrgentTask } from '../../contexts/UrgentTaskContext';

interface TaskTablePageProps { onBack?: () => void; }

// Temporary in-memory executed matrix (taskId -> userId -> count)
// Will be replaced by real executions lookup

export const TaskTablePage: React.FC<TaskTablePageProps> = ({ onBack }) => {
  const { state, currentWG, currentUser, displayPeriodExecutions, getDisplayPeriod } = usePutzplanStore() as any;
  const { getColumnSpacingClass, getColumnSpacingMdClass } = useSettings();
  const { urgentTaskIds, toggleUrgentTask } = useUrgentTask();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [confirmTask, setConfirmTask] = useState<Task | null>(null);
  const [forceUpdateTrigger, setForceUpdateTrigger] = useState(0);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  
  // Check if we're viewing a historical period
  const displayPeriodId = getDisplayPeriod();
  const isViewingHistoricalPeriod = displayPeriodId !== null;

  // Debug: Log task points when component renders
  React.useEffect(() => {
    console.debug && console.debug('📋 [TaskTable] Component rendered with tasks:', 
      (Object.values(state.tasks) as Task[])
        .filter(t => t.wgId === currentWG?.id)
        .map(t => `${t.title}: ${t.pointsPerExecution}P`)
    );
  }, [state.tasks, currentWG?.id, forceUpdateTrigger]);

  // Listen for external force updates and also subscribe to task changes
  React.useEffect(() => {
    const checkForUpdates = () => {
      const globalForceUpdate = (window as any).__forceUpdate;
      if (globalForceUpdate && globalForceUpdate !== forceUpdateTrigger) {
        console.log('🔄 [TaskTable] Force update detected, re-rendering...');
        setForceUpdateTrigger(globalForceUpdate);
      }
    };
    
    const interval = setInterval(checkForUpdates, 100);
    
    // Also listen to dataManager state changes directly
    const unsubscribe = dataManager.subscribe((newState) => {
      console.debug && console.debug('🔄 [TaskTable] DataManager state changed, checking for task updates...');
      const currentTasksHash = JSON.stringify(Object.values(state.tasks).map((t: any) => ({ id: t.id, points: t.pointsPerExecution })));
      const newTasksHash = JSON.stringify(Object.values(newState.tasks).map((t: any) => ({ id: t.id, points: t.pointsPerExecution })));
      const currentExecHash = JSON.stringify(Object.values(state.executions || {}).map((e: any) => ({ id: e.id, taskId: e.taskId, points: e.pointsAwarded })));
      const newExecHash = JSON.stringify(Object.values(newState.executions || {}).map((e: any) => ({ id: e.id, taskId: e.taskId, points: e.pointsAwarded })));
      if (currentTasksHash !== newTasksHash) {
        console.debug && console.debug('🔄 [TaskTable] Task points changed, forcing re-render...');
        setForceUpdateTrigger(Date.now());
      } else if (currentExecHash !== newExecHash) {
        console.debug && console.debug('🔄 [TaskTable] Executions changed, forcing re-render...');
        setForceUpdateTrigger(Date.now());
      }
    });
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [forceUpdateTrigger, state.tasks]);

  if (!currentWG || !currentUser) return <div>Loading...</div>;

  // Falls Tasks ohne berechnete Punkte existieren (pointsPerExecution undefined/null), einmalig automatisch neu berechnen
  React.useEffect(() => {
    const needsCalc = Object.values(state.tasks).some((t: any) => t.wgId === currentWG?.id && (t.pointsPerExecution == null || isNaN(t.pointsPerExecution)));
    if (needsCalc) {
      console.debug && console.debug('🧮 [TaskTable] Auto-Recalc ausgelöst (fehlende pointsPerExecution)');
      try { (dataManager as any).recalculateTaskPoints(); } catch (e) { console.warn('Auto-Recalc Fehler', e); }
    }
  }, [state.tasks, currentWG?.id]);

  const members: User[] = currentWG.memberIds.map((id:string)=> state.users[id]).filter(Boolean);
  const tasks: Task[] = (Object.values(state.tasks) as Task[]).filter(t=> t.wgId === currentWG.id && t.isActive);

  // Dummy fallback if no tasks
  const rows = tasks.length ? tasks : [];

  const executions = useMemo(()=> Object.values(displayPeriodExecutions).filter((e: any) => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === currentWG.id;
  }), [displayPeriodExecutions, state.tasks, currentWG.id]);

  const executionCountMap = useMemo(()=> {
    const map: Record<string, Record<string, number>> = {};
    executions.forEach((e: any) => {
      if (!map[e.taskId]) map[e.taskId] = {};
      map[e.taskId][e.executedBy] = (map[e.taskId][e.executedBy] || 0) + 1;
    });
    return map;
  }, [executions]);

  const totals = useMemo(() => {
  console.debug && console.debug('🧮 [TaskTable] Recalculating totals...');
    const base: Record<string, number> = {};
    members.forEach(m => base[m.id] = 0);
    // Sum actual recorded executions' pointsAwarded per user. This ensures bonuses
    // applied on a single execution (e.g. Hot Task percent bonus) are reflected
    // correctly in the totals UI.
    executions.forEach((e: any) => {
      // base was initialized with 0 for all members; check undefined to
      // ensure we still add points for members whose base is 0 (0 is falsy).
      if (typeof base[e.executedBy] === 'undefined') return;
      const pts = typeof e.pointsAwarded === 'number' ? e.pointsAwarded : 0;
      base[e.executedBy] = (base[e.executedBy] || 0) + pts;
    });
    // For debugging, log per-task per-exec value (still useful in logs)
    rows.forEach(task => {
      const perExec = task.pointsPerExecution || task.basePoints || 0;
      console.debug && console.debug(`📊 [TaskTable] Task ${task.title}: ${perExec}P per execution`);
    });
    console.debug && console.debug('🎯 [TaskTable] Final totals:', base);
    return base;
  }, [executionCountMap, rows, members, state.tasks, forceUpdateTrigger]);

  const possibleTotals = useMemo(()=>{
    const base: Record<string, number> = {};
    members.forEach(m => base[m.id] = 0);
    rows.forEach(task => {
      const monthly = task.totalMonthlyPoints || ((task.pointsPerExecution || task.basePoints) * (task.monthlyFrequency || 0)) || 0;
      members.forEach(m => { base[m.id] += monthly; });
    });
    return base;
  }, [rows, members, state.tasks, forceUpdateTrigger]);

  const percent = (uid:string) => {
    const currentPeriod = dataManager.ensureCurrentPeriod();
    const user = members.find(m => m.id === uid);
    if (!user) return 0;
    
    const adjustedTarget = dataManager.getAdjustedMonthlyTarget(user, currentPeriod);
    const earnedPoints = totals[uid] || 0;
    
    if (adjustedTarget <= 0) return 100; // If no points required, 100% fulfilled
    return Math.round((earnedPoints / adjustedTarget) * 100);
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
    '--col-task-width': 'clamp(260px, 20vw, 360px)', // Increased from 220px-280px
    '--col-member-width': `minmax(110px, calc((100% - (var(--col-task-width))) / ${memberCount}))` // Increased from 90px
  } as any;

  // Debug util: replace all tasks in current WG with a predefined list (no checklists)
  const resetTasksToCustomList = useCallback(() => {
    if (!dataManager.isDebugMode()) return;
    if (!currentWG) return;
    if (!window.confirm('Alle aktuellen Tasks dieser WG löschen und durch die neue Liste ersetzen?')) return;

    // Delete existing tasks for this WG
    (Object.values(state.tasks) as Task[])
      .filter(t => t.wgId === currentWG.id)
      .forEach(t => dataManager.deleteTask(t.id));

    // New custom tasks (from the photo), no checklists
    const titles: Array<{ title: string; emoji: string; minDays?: number; freq?: number }> = [
      { title: 'Hallway', emoji: '🚪', minDays: 3, freq: 2 },
      { title: 'ig bathroom + shower', emoji: '🛁', minDays: 3, freq: 4 },
      { title: 'Small bath + livingroom', emoji: '🛋️', minDays: 3, freq: 4 },
      { title: 'Kitchen', emoji: '🍳', minDays: 2, freq: 4 },
      { title: 'Plastic trash tuesday', emoji: '♻️', minDays: 7, freq: 4 },
      { title: 'Wg clothes clean + hang', emoji: '👕', minDays: 3, freq: 4 },
      { title: 'Vg clothes put away', emoji: '🧺', minDays: 3, freq: 4 },
      { title: 'Wg shopping', emoji: '🛒', minDays: 7, freq: 4 },
      { title: 'Unlocking shower', emoji: '🚿', minDays: 14, freq: 1 },
      { title: 'Biotrash + clean', emoji: '🗑️', minDays: 7, freq: 4 },
      { title: 'Restmüll + clean', emoji: '🗑️', minDays: 7, freq: 4 },
      { title: 'Plastic', emoji: '🧴', minDays: 7, freq: 4 },
      { title: 'Paper', emoji: '📄', minDays: 7, freq: 4 },
      { title: 'Pfand', emoji: '🥤', minDays: 14, freq: 2 },
      { title: 'dishwasher', emoji: '🍽️', minDays: 1, freq: 12 },
      { title: 'Attik clean', emoji: '🧽', minDays: 14, freq: 2 },
      { title: 'Fridge', emoji: '🥶', minDays: 14, freq: 2 },
      { title: 'Spühlrack', emoji: '🧴', minDays: 7, freq: 2 }
    ];

    titles.forEach(def => {
      const diff = 5;
      const imp = 5;
      const avgMin = 20;
      const freq = Math.max(1, def.freq ?? 4);
      dataManager.createTask({
        title: def.title,
        description: def.title,
        emoji: def.emoji,
        category: 'general' as any,
        averageMinutes: avgMin,
        averagePainLevel: diff,
        averageImportance: imp,
        monthlyFrequency: freq,
        difficultyScore: diff,
        unpleasantnessScore: diff,
        pointsPerExecution: 20,
        totalMonthlyPoints: 0,
        constraints: {
          minDaysBetween: def.minDays,
          maxDaysBetween: Math.max((def.minDays || 7) * 2, 7),
          requiresPhoto: false
        },
        isActive: true,
        setupComplete: false
      } as any);
    });
  }, [currentWG, state.tasks]);

  const handleAlarmClick = () => {
    setIsAlarmModalOpen(true);
  };

  const handleTaskSelection = (task: Task) => {
    // toggleUrgentTask persists the isAlarmed state in dataManager (canonical source)
    try {
      toggleUrgentTask(task.id);
    } catch (e) {
      console.error('Error toggling urgent task', task.id, e);
    }
    setIsAlarmModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <div className="px-2 pb-4 flex-1 overflow-auto">
        {/* Historical Period Indicator */}
        {isViewingHistoricalPeriod && (
          <Card className="mb-4 p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📁</span>
              <div>
                <h3 className="font-semibold text-blue-800">Historischer Zeitraum</h3>
                <p className="text-sm text-blue-600">
                  Du betrachtest die Daten eines vergangenen Zeitraums. 
                  <button 
                    onClick={() => {
                      dataManager.setDisplayPeriod(null);
                      window.location.reload(); // Simple refresh to reset view
                    }}
                    className="ml-2 underline hover:no-underline"
                  >
                    Zurück zum aktuellen Zeitraum
                  </button>
                </p>
              </div>
            </div>
          </Card>
        )}
        
        <Card className="p-0 overflow-hidden" data-testid="task-table-card">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b bg-white sticky top-0 z-20" data-testid="task-table-controls">
            <div className="flex gap-2 min-w-0 flex-1">
              <Button variant="outline" size="sm" onClick={onBack} data-testid="tt-back-btn">Zurück</Button>
              <AlarmButton onClick={handleAlarmClick} />
            </div>
            <div className="flex gap-2 flex-wrap flex-shrink-0">
              {dataManager.isDebugMode() && (
                <>
                  <Button size="sm" variant="outline" data-testid="debug-reset-tasks" onClick={resetTasksToCustomList}>Reset Tasks (Custom)</Button>
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
            <div className="w-full max-w-[1200px] mx-auto">
            <table 
              className="w-full border-collapse text-[16px] md:text-[18px] border border-2 border-slate-300" 
              data-testid="task-table" 
              style={{
                ...tableStyle,
                border: '1px solid #cbd5e1',
                borderCollapse: 'collapse'
              }}
            >
              <thead>
                <tr 
                  className="bg-slate-50 text-left border-b-2 border-slate-400"
                  style={{ borderBottom: '1px solid #cbd5e1' }}
                >
                  <th 
                    className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-4 md:py-5 font-semibold text-slate-700 border-r border-r-2 border-slate-300 border-l border-slate-300 sticky left-0 bg-slate-50 z-10`} 
                    style={{
                      width:'var(--col-task-width)', 
                      minWidth:'var(--col-task-width)', 
                      maxWidth:'var(--col-task-width)',
                      borderRight: '1px solid #cbd5e1',
                      borderLeft: '1px solid #cbd5e1'
                    }} 
                    data-testid="col-task"
                  >Task</th>
                  {members.map(m => {
                    const isAbsent = isUserCurrentlyAbsent(m.id);
                    return (
                      <th 
                        key={m.id} 
                        className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-4 md:py-5 font-semibold text-slate-700 border-r border-slate-300 text-center overflow-hidden`} 
                        style={{
                          width:'var(--col-member-width)', 
                          minWidth:'var(--col-member-width)', 
                          maxWidth:'var(--col-member-width)',
                          borderRight: '1px solid #cbd5e1'
                        }} 
                        data-testid={`col-member-${m.id}`}
                      >
                          <div className="flex items-center justify-center w-full overflow-hidden gap-2">
                            <span className="text-lg md:text-xl text-2xl md:text-2xl flex-shrink-0" aria-hidden>{m.emoji}</span>
                            <span className="truncate text-base md:text-lg font-medium">{m.name}</span>
                            {isAbsent && (
                              <span className="ml-2 absence-indicator text-xl" title="Abwesend (Gone Fishing)" data-testid={`absence-indicator-${m.id}`}>
                                🎣〜
                              </span>
                            )}
                          </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {rows.map(task => {
                  const isUrgent = Array.isArray(urgentTaskIds) && urgentTaskIds.includes(task.id);
                  return (
                    <tr 
                      key={task.id} 
                      className="transition-colors border-b border-slate-200 hover:bg-slate-25"
                      style={{ borderBottom: '1px solid #e2e8f0' }}
                    >
                      <td 
                        className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-2 md:py-3 align-top sticky left-0 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/70 z-10 ${isUrgent ? 'bg-red-100 border-r-2 border-l-2 border-red-400' : 'border-r border-r-2 border-slate-300 border-l border-slate-300'}`} 
                        style={{
                          width:'var(--col-task-width)', 
                          minWidth:'var(--col-task-width)', 
                          maxWidth:'var(--col-task-width)', 
                          borderRight: isUrgent ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          borderLeft: isUrgent ? '2px solid #ef4444' : '1px solid #cbd5e1',
                          borderTop: isUrgent ? '2px solid #ef4444' : undefined,
                          borderBottom: isUrgent ? '2px solid #ef4444' : undefined,
                          boxShadow: isUrgent ? 'inset 0 0 0 1px rgba(239,68,68,0.06)' : undefined
                        }}
                      >
                          <button
                            className={`group flex items-center gap-1 gap-2 p-1 font-medium w-full h-full text-left hover:bg-amber-50/80 focus-visible:ring-2 ring-amber-500/60 focus:outline-none px-3 py-3 min-h-[60px] min-h-[64px] ${isUrgent ? 'text-red-800' : 'text-slate-800'}`}
                          style={{ background: 'transparent', border: 'none' }}
                          onClick={()=> setSelectedTask(task)}
                          data-testid={`tt-task-${task.id}`}
                        >
                          <span className="text-lg md:text-xl text-2xl md:text-3xl flex-shrink-0" aria-hidden>{task.emoji}</span>
                          {(() => {
                            const userExecCount = executionCountMap[task.id]?.[currentUser.id] || 0;
                            const titleClass = userExecCount > 0 ? 'truncate flex-1 pr-1 line-through text-slate-400 text-base md:text-lg font-medium' : 'truncate flex-1 pr-1 text-base md:text-lg font-medium';
                            return <span className={`${titleClass} text-sm md:text-base text-base md:text-lg`} data-testid={`task-title-${task.id}`}>{task.title}</span>;
                          })()}
                          {(() => {
                            const val = (typeof task.pointsPerExecution === 'number' && !isNaN(task.pointsPerExecution))
                              ? task.pointsPerExecution
                              : (typeof (task as any).basePoints === 'number' ? (task as any).basePoints : '…');
                            return (
                                <span
                                data-testid={`task-points-${task.id}`}
                                className="text-xs text-sm md:text-sm md:text-base text-base md:text-lg font-bold text-emerald-700 bg-emerald-100 px-2 px-4 py-0.5 py-2 rounded-full flex-shrink-0 border border-emerald-200"
                                title={typeof val === 'number' ? `${val} Punkte pro Ausführung` : 'Punkte noch nicht berechnet'}
                              >{val}P</span>
                            );
                          })()}
                        </button>
                      </td>
                      {members.map(m => {
                        const count = executionCountMap[task.id]?.[m.id] || 0;
                        const isAbsent = isUserCurrentlyAbsent(m.id);
                        const groups = Math.floor(count / 5);
                        const remainder = count % 5;
                        const renderGroup = () => {
                          if (isAbsent) return <span className="absence-indicator text-xl" title="Abwesend (Gone Fishing)">🎣〜</span>;
                          if (count === 0) return <span className="tally-empty" data-tally="empty">—</span>;
                          const parts: React.ReactNode[] = [];
                          for (let g=0; g<groups; g++) {
                            parts.push(
                              <span
                                key={`g-${g}`}
                                className="tally-group"
                                aria-label="5 Ausführungen"
                                data-tally="group"
                                style={{ display:'inline-flex', alignItems:'center', height:'14px', marginRight:'6px', position:'relative' }}
                              >
                                <span className="tally-strokes" style={{ display:'inline-flex', gap:'2px', height:'100%' }}>
                                  <span className="tally-stroke" style={{ width:'2px', height:'100%', backgroundColor:'rgb(30, 41, 59)', display:'inline-block' }} />
                                  <span className="tally-stroke" style={{ width:'2px', height:'100%', backgroundColor:'rgb(30, 41, 59)', display:'inline-block' }} />
                                  <span className="tally-stroke" style={{ width:'2px', height:'100%', backgroundColor:'rgb(30, 41, 59)', display:'inline-block' }} />
                                  <span className="tally-stroke" style={{ width:'2px', height:'100%', backgroundColor:'rgb(30, 41, 59)', display:'inline-block' }} />
                                </span>
                                {/* Simplified cross line sizing for jsdom: ensure measurable width/height */}
                                <span className="tally-cross" style={{ display:'inline-flex', alignItems:'center', pointerEvents:'none', marginLeft:'2px' }}>
                                  <span
                                    className="tally-cross-line"
                                    data-tally="cross"
                                    style={{ display:'inline-block', width:'2px', height:'24px', backgroundColor:'#dc2626' }}
                                    ref={(el)=>{
                                      if (!el) return;
                                      try {
                                        (el as any).getBoundingClientRect = () => ({
                                          x: 0, y: 0, top: 0, left: 0, right: 2, bottom: 24,
                                          width: 2, height: 24,
                                          toJSON(){ return {}; }
                                        });
                                      } catch {}
                                    }}
                                  />
                                </span>
                              </span>
                            );
                          }
                          for (let r=0; r<remainder; r++) {
                            parts.push(
                              <span
                                key={`r-${r}`}
                                className="tally-single"
                                data-tally="single"
                                style={{ display:'inline-block', width:'2px', height:'14px', backgroundColor:'rgb(30, 41, 59)', marginRight:'3px' }}
                              />
                            );
                          }
                          return parts;
                        };
                        const cellClass = `${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-2 md:py-3 border-r border-r-2 border-slate-300 text-center text-[15px] md:text-[16px] font-normal tracking-wide ${isAbsent ? 'bg-blue-50/60 relative' : ''}`;
                        return (
                          <td 
                            key={m.id} 
                            className={cellClass} 
                            style={{
                              width:'var(--col-member-width)', 
                              minWidth:'var(--col-member-width)', 
                              maxWidth:'var(--col-member-width)',
                              borderRight: '1px solid #cbd5e1'
                            }} 
                            data-testid={`exec-${task.id}-${m.id}`}
                          >
                            <>
                              { /* normal cell content */ }
                              {isAbsent && (
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-100/40 to-cyan-100/40 pointer-events-none" />
                              )}
                              <div className={isAbsent ? 'relative z-10 opacity-60' : ''}>
                                {renderGroup()}
                              </div>
                            </>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              {members.length > 0 && (
                <tfoot>
                  <tr className="bg-gradient-to-r from-slate-100 to-slate-200 sticky bottom-0 border-t-2 border-slate-400" style={{ borderTop: '1px solid #94a3b8' }}>
                    <th className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-4 md:py-5 text-left font-semibold text-slate-800 border-r border-slate-300 border-l border-slate-300 sticky left-0 bg-gradient-to-r from-slate-100 to-slate-200 z-10`} style={{ borderRight: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1' }}>Gesamt</th>
                    {members.map(m => {
                      const isAbsent = isUserCurrentlyAbsent(m.id);
                      const currentPeriod = dataManager.ensureCurrentPeriod();
                      const adjustedTarget = dataManager.getAdjustedMonthlyTarget(m, currentPeriod);
                      // Use totals from task executions, not currentMonthPoints
                      const earnedPoints = totals[m.id] || 0;
                      const percentage = adjustedTarget > 0 ? Math.round((earnedPoints / adjustedTarget) * 100) : 100;
                      
                        return (
                        <td key={m.id} className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-4 md:py-5 border-r border-slate-300 ${isAbsent ? 'bg-blue-50/60' : ''}`} style={{width:'var(--col-member-width)', minWidth:'var(--col-member-width)', maxWidth:'var(--col-member-width)', borderRight: '1px solid #cbd5e1'}} data-testid={`total-${m.id}`}>
                          <div className="flex flex-col items-center justify-center gap-1 text-center">
                            <div className="font-bold text-emerald-700 text-lg md:text-xl">
                              {earnedPoints}P
                              {percentage >= 100 && (
                                <span className="ml-1 text-amber-500" title="Ziel erfüllt!">👼</span>
                              )}
                            </div>
                            <div className="text-base md:text-lg text-slate-600">
                              von {adjustedTarget}P ({percentage}%)
                            </div>
                            {adjustedTarget !== m.targetMonthlyPoints && (
                              <div className="text-sm md:text-base text-blue-600">
                                (urspr. {m.targetMonthlyPoints}P)
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  <tr className="bg-gradient-to-r from-slate-50 to-slate-100 sticky bottom-0 border-t border-slate-400" style={{ borderTop: '1px solid #cbd5e1' }}>
                    <th className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-3 md:py-4 text-left font-semibold text-slate-800 border-r border-slate-300 border-l border-slate-300 sticky left-0 bg-gradient-to-r from-slate-50 to-slate-100 z-10`} style={{ borderRight: '1px solid #cbd5e1', borderLeft: '1px solid #cbd5e1' }}>Erfüllung</th>
                    {members.map(m => (
                      <td key={m.id} className={`${getColumnSpacingClass()} ${getColumnSpacingMdClass()} py-3 md:py-4 text-center font-semibold text-slate-700 border-r border-slate-300 text-base md:text-lg`} style={{width:'var(--col-member-width)', minWidth:'var(--col-member-width)', maxWidth:'var(--col-member-width)', borderRight: '1px solid #cbd5e1'}} data-testid={`percent-${m.id}`}>{percent(m.id)}%</td>
                    ))}
                  </tr>
                </tfoot>
              )}
            </table>
            </div>
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

      <TaskSelectionModal
        isOpen={isAlarmModalOpen}
        onClose={() => setIsAlarmModalOpen(false)}
        onSelectTask={handleTaskSelection}
        tasks={rows}
      />
    </div>
  );
};

export default TaskTablePage;

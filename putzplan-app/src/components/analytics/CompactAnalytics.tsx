import React, { useMemo, useState } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { Bar, Pie } from 'react-chartjs-2';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, BarChart, Bar as RechartsBar } from 'recharts';
import { usePutzplanStore } from '../../hooks/usePutzplanStore';
import { dataManager } from '../../services/dataManager';
import { formatShortLabel, dedupeByDate } from '../period/periodUtils';
import { ArrowLeft } from 'lucide-react';
import styles from './CompactAnalytics.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend, ChartDataLabels);

interface MonthData {
  key: string;
  month: string;
  year: number;
  monthIndex: number;
  totalPoints: number;
  completedTasks: number;
  executions: any[];
}

interface UserStat {
  userId: string;
  username: string;
  totalPoints: number;
  completedTasks: number;
  averagePoints: number;
}

interface CompactAnalyticsProps {
  onBack?: () => void;
}

export const CompactAnalytics: React.FC<CompactAnalyticsProps> = ({ onBack }) => {
  const { state, currentWG, getHistoricalPeriods, displayPeriodExecutions, getDisplayPeriod } = usePutzplanStore() as any;
  const displayPeriodId = getDisplayPeriod && typeof getDisplayPeriod === 'function' ? getDisplayPeriod() : null;
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(Date.now()); // Cache busting
  const [hiddenMonths, setHiddenMonths] = useState<Set<string>>(new Set());
  const [deletedMonths, setDeletedMonths] = useState<Map<string, MonthData>>(new Map());
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);

  // Debug: Log raw state for inspection
  React.useEffect(() => {
    if (currentWG) {
      const allExecutions = Object.values(state.executions || {});
      console.log(`📊 [CompactAnalytics] Raw state inspection:`);
      console.log(`📊 Total executions in state: ${allExecutions.length}`);
      
      // Filter and validate executions
      const sample = allExecutions[0] as any;
      if (sample) {
        console.log(`📊 Sample execution structure:`, sample);
        try {
          console.log(`📊 Sample execution fields:`, Object.keys(sample));
        } catch (_) {
          console.log('📊 Sample execution fields: <unable to enumerate>');
        }
        console.log(`📊 Sample pointsAwarded:`, sample.pointsAwarded);
        console.log(`📊 Sample points:`, sample.points);
      }

      const filteredExecs = allExecutions.filter((e: any) => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
      
      console.log(`📊 Executions for WG ${currentWG.name}: ${filteredExecs.length}`);
      filteredExecs.forEach((exec: any) => {
        console.log(`📊 Exec ${exec.id}: taskId=${exec.taskId}, userId=${exec.executedBy}, points=${exec.pointsAwarded || exec.points || 0}, date=${exec.executedAt || exec.date}`);
      });
    }
  }, [state, currentWG]);

  // Load deletion state from localStorage for browser consistency
  React.useEffect(() => {
    try {
      const savedDeletionState = localStorage.getItem('analytics-deletion-state');
      if (savedDeletionState) {
        const parsed = JSON.parse(savedDeletionState);
        if (parsed.hiddenMonths && Array.isArray(parsed.hiddenMonths)) {
          setHiddenMonths(new Set(parsed.hiddenMonths));
        }
        if (parsed.deletedMonths) {
          setDeletedMonths(new Map(Object.entries(parsed.deletedMonths)));
        }
        console.log(`📖 [CompactAnalytics] Loaded deletion state from localStorage:`, {
          hidden: parsed.hiddenMonths?.length || 0,
          deleted: Object.keys(parsed.deletedMonths || {}).length
        });
      }
    } catch (error) {
      console.error('❌ [CompactAnalytics] Failed to load deletion state:', error);
    }
  }, []);

  // Generate available months from executions
  const availableMonths = useMemo(() => {
    if (!currentWG) return [];

    // Use the store-provided `displayPeriodExecutions` for the currently displayed (live) period
    // so Analytics and TaskTable share the same source for live/current view. When a historical
    // display period is selected, fall back to scanning `state.executions` (historical handled later).
    const displayPeriodId = getDisplayPeriod();
    let executions: any[] = [];
    if (!displayPeriodId) {
      const map = displayPeriodExecutions || {};
      executions = Object.values(map).filter((e: any) => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
    } else {
      executions = Object.values(state.executions || {}).filter((e: any) => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
    }

    console.log(`📊 [AvailableMonths] Found ${executions.length} executions for WG ${currentWG.name}`);
    console.log(`📊 [AvailableMonths] Sample executions:`, executions.slice(0, 3).map(e => ({
      id: (e as any).id,
      taskId: (e as any).taskId,
      executedBy: (e as any).executedBy,
      pointsAwarded: (e as any).pointsAwarded,
      points: (e as any).points,
      executedAt: (e as any).executedAt,
      date: (e as any).date
    })));

    const monthsMap = new Map<string, MonthData>();
    const now = new Date();

    const currentMonthKey = `${now.getFullYear()}-${now.getMonth()}`;

    // Always ensure current month is included (short label TT.MM – TT.MM)
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const currentMonthName = formatShortLabel({ startDate: currentMonthStart.toISOString(), endDate: currentMonthEnd.toISOString() } as any);
    monthsMap.set(currentMonthKey, {
      key: currentMonthKey,
      month: currentMonthName,
      startDate: currentMonthStart.toISOString(),
      endDate: currentMonthEnd.toISOString(),
      year: now.getFullYear(),
      monthIndex: now.getMonth(),
      totalPoints: 0,
      completedTasks: 0,
      executions: []
    });

    executions.forEach((e: any) => {
      const execDate = new Date(e.executedAt || e.date);
      const year = execDate.getFullYear();
      const month = execDate.getMonth();
      const monthKey = `${year}-${month}`;
      const monthStart = new Date(year, month, 1);
      const monthEnd = new Date(year, month + 1, 0);
      const monthName = formatShortLabel({ startDate: monthStart.toISOString(), endDate: monthEnd.toISOString() } as any);

      if (!monthsMap.has(monthKey)) {
        monthsMap.set(monthKey, {
          key: monthKey,
          month: monthName,
          startDate: monthStart.toISOString(),
          endDate: monthEnd.toISOString(),
          year,
          monthIndex: month,
          totalPoints: 0,
          completedTasks: 0,
          executions: []
        });
      }

      const monthData = monthsMap.get(monthKey)!;
      monthData.executions.push(e);
      const points = e.pointsAwarded || 0; // Use the primary field pointsAwarded, same as TaskTable
      monthData.totalPoints += points;
      monthData.completedTasks += 1;
      
      // Debug: Log each execution being added
      console.log(`📊 [AvailableMonths] Adding execution for ${monthName}: ${points} points (pointsAwarded: ${e.pointsAwarded}, taskId: ${e.taskId}, userId: ${e.executedBy})`);
    });

    // Sort by date (newest first)
    let combined = Array.from(monthsMap.values()).sort((a: MonthData, b: MonthData) => b.year - a.year || b.monthIndex - a.monthIndex);

    // Also include custom historical periods from the store (if any)
    try {
      const historical = dataManager.getHistoricalPeriods();
      if (Array.isArray(historical) && historical.length > 0) {
        const histItems: any[] = [];
        historical.forEach((p: any) => {
          try {
            const rawStart = p.start || p.startDate || p.startAt || p.startISO || p.startTimestamp;
            const rawEnd = p.end || p.endDate || p.endAt || p.endISO || p.endTimestamp;
            const start = rawStart ? new Date(rawStart) : new Date(NaN);
            const end = rawEnd ? new Date(rawEnd) : new Date(NaN);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              console.warn('[CompactAnalytics] Skipping historical period with invalid dates', p);
              return;
            }

            // Prefer using a period's savedState snapshot if present — this keeps
            // analytics consistent with the TaskTable view which reads savedState
            // when displaying historical periods. Fall back to scanning global
            // state.executions for legacy data.
            let periodExecs: any[] = [];
            try {
              if (p && (p as any).savedState && Array.isArray((p as any).savedState.executions)) {
                periodExecs = (p as any).savedState.executions.filter((ex: any) => {
                  const task = state.tasks[ex.taskId] || null;
                  // If the saved snapshot contains tasks without matching live tasks,
                  // include them anyway as they are part of the archived snapshot.
                  return !task || task.wgId === currentWG.id;
                });
              } else {
                periodExecs = Object.values(state.executions || {}).filter((ex: any) => {
                  const task = state.tasks[ex.taskId];
                  if (!task || task.wgId !== currentWG.id) return false;

                  // Prefer explicit period binding when present (newer executions)
                  if (ex.periodId !== undefined && ex.periodId !== null) {
                    return ex.periodId === p.id;
                  }

                  // Fallback for legacy executions without periodId: use executedAt/date range
                  const d = new Date(ex.executedAt || ex.date);
                  return d >= start && d <= end;
                });
              }
            } catch (err) {
              console.warn('[CompactAnalytics] Failed to read savedState for period, falling back to live executions', err);
              periodExecs = Object.values(state.executions || {}).filter((ex: any) => {
                const task = state.tasks[ex.taskId];
                if (!task || task.wgId !== currentWG.id) return false;
                if (ex.periodId !== undefined && ex.periodId !== null) return ex.periodId === p.id;
                const d = new Date(ex.executedAt || ex.date);
                return d >= start && d <= end;
              });
            }

            const totalPoints = periodExecs.reduce((sum: number, ex: any) => sum + (ex.pointsAwarded || 0), 0);
            const completedTasks = periodExecs.length;
            const label = formatShortLabel({ startDate: start.toISOString(), endDate: end.toISOString() } as any) || p.name;

            // Determine task count for this period: count tasks that actually have
            // at least one execution in the snapshot (i.e. "abgehakte" tasks)
            let taskCount = 0;
            try {
              if (Array.isArray(periodExecs) && periodExecs.length > 0) {
                taskCount = Array.from(new Set((periodExecs || []).map((ex: any) => ex.taskId))).filter(Boolean).length;
              } else if (p && (p as any).savedState && Array.isArray((p as any).savedState.tasks)) {
                // Fallback: if there are no executions, fall back to counting tasks in snapshot
                taskCount = (p as any).savedState.tasks.filter((t: any) => !t.wgId || t.wgId === currentWG.id).length;
              } else {
                taskCount = 0;
              }
            } catch (err) {
              taskCount = Array.from(new Set((periodExecs || []).map((ex: any) => ex.taskId))).filter(Boolean).length;
            }

            histItems.push({
              id: p.id,
              key: `period-${p.id}`,
              month: label,
              startDate: start.toISOString(),
              endDate: end.toISOString(),
              year: start.getFullYear(),
              monthIndex: start.getMonth(),
              totalPoints,
              completedTasks,
              taskCount,
              executions: periodExecs,
              isHistorical: true
            });
          } catch (err) {
            console.warn('[CompactAnalytics] Failed to process historical period', p, err);
          }
        });

        // Prepend historical items so they appear before months
        combined = [...histItems, ...combined];
      }
    } catch (err) {
      console.warn('[CompactAnalytics] getHistoricalPeriods failed', err);
    }

    // For regular months (not historical periods) compute taskCount = unique tasks referenced by executions
    combined = combined.map((m: any) => {
      try {
        if (!m.isHistorical) {
          m.taskCount = Array.from(new Set((m.executions || []).map((e: any) => e.taskId))).filter(Boolean).length;
        }
      } catch (err) {
        m.taskCount = m.taskCount || 0;
      }
      return m;
    });

    // Deduplicate by start/end date (prefer live/active periods)
    try {
      combined = dedupeByDate(combined as any) as any[];
    } catch (err) {
      console.warn('[CompactAnalytics] dedupe failed', err);
    }

    console.log(`📊 [AvailableMonths] Generated ${combined.length} months:`, combined.map(m => `${m.month}: ${m.totalPoints}P`));

    return combined;
  }, [state, currentWG, expandedMonth]);

  // Ensure we don't set state inside useMemo; set initial expanded month here when availableMonths changes
  React.useEffect(() => {
    if (expandedMonth !== null) return;
    if (availableMonths.length === 0) return;
    // Prefer the month with the most data
    const monthWithMostData = availableMonths.reduce((best: any, current: any) =>
      current.totalPoints > (best?.totalPoints || 0) ? current : best
    , availableMonths[0]);
    setExpandedMonth(monthWithMostData.key);
  }, [availableMonths]);

  // Filter out hidden months
  const visibleMonths = availableMonths.filter(month => !hiddenMonths.has(month.key));

  // Analytics for expanded month
  const expandedAnalytics = useMemo(() => {
    if (!currentWG || !expandedMonth) return null;

    const monthData = visibleMonths.find(m => m.key === expandedMonth);
    if (!monthData) return null;

    const users = currentWG.memberIds?.map((id: string) => state.users[id]).filter(Boolean) || [];
    
    // Calculate user stats for the month
    const userStats = users.map((user: any) => {
      const userExecutions = monthData.executions.filter((e: any) => e.executedBy === user.id);
      
      // Debug: Log execution details
      console.log(`📊 [CompactAnalytics] User ${user.name} executions:`, userExecutions.map(e => ({
        id: e.id,
        taskId: e.taskId,
        pointsAwarded: e.pointsAwarded,
        points: e.points,
        executedAt: e.executedAt,
        date: e.date
      })));
      
      const totalPoints = userExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
      const completedTasks = userExecutions.length;
      const averagePoints = completedTasks > 0 ? totalPoints / completedTasks : 0;

      // Debug logging for user names
      console.log(`📊 [CompactAnalytics] User: ${user.name || 'UNNAMED'} (id: ${user.id}), Points: ${totalPoints}, Tasks: ${completedTasks}`);

      return {
        userId: user.id,
        username: user.name || user.username || `User ${user.id}`, // Fallback for missing names
        totalPoints,
        completedTasks,
        averagePoints
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    return {
      totalPoints: monthData.totalPoints,
      completedTasks: monthData.completedTasks,
      userStats
    };
  }, [currentWG, expandedMonth, visibleMonths, state.users]);

  // Handle month deletion
  const handleDeleteMonth = (monthKey: string) => {
    const monthToDelete = availableMonths.find(m => m.key === monthKey);
    if (monthToDelete) {
      // Backup month data for potential restoration
      setDeletedMonths(prev => new Map([...prev, [monthKey, monthToDelete]]));
      console.log(`🗑️ [CompactAnalytics] Month ${monthToDelete.month} backed up for restoration`);
    }
    
    setHiddenMonths(prev => new Set([...prev, monthKey]));
    
    // If the deleted month is currently expanded, close it
    if (expandedMonth === monthKey) {
      setExpandedMonth(null);
    }
    
    setShowDeleteModal(null);
    
    // Persist deletion state to localStorage for browser consistency
    try {
      const newHiddenMonths = [...hiddenMonths, monthKey];
      const newDeletedMonths = monthToDelete ? 
        Object.fromEntries([...deletedMonths, [monthKey, monthToDelete]]) :
        Object.fromEntries(deletedMonths);
        
      const deletionState = {
        hiddenMonths: newHiddenMonths,
        deletedMonths: newDeletedMonths,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('analytics-deletion-state', JSON.stringify(deletionState));
      console.log(`💾 [CompactAnalytics] Deletion state saved to localStorage`);
    } catch (error) {
      console.error('❌ [CompactAnalytics] Failed to save deletion state:', error);
    }
  };
  
  // Handle month restoration
  const handleRestoreMonth = (monthKey: string) => {
    setHiddenMonths(prev => {
      const newSet = new Set(prev);
      newSet.delete(monthKey);
      return newSet;
    });
    
    setDeletedMonths(prev => {
      const newMap = new Map(prev);
      newMap.delete(monthKey);
      return newMap;
    });
    
    // Update localStorage
    try {
      const deletionState = {
        hiddenMonths: [...hiddenMonths].filter(k => k !== monthKey),
        deletedMonths: Object.fromEntries([...deletedMonths].filter(([k]) => k !== monthKey)),
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('analytics-deletion-state', JSON.stringify(deletionState));
      console.log(`🔄 [CompactAnalytics] Month ${monthKey} restored and state saved`);
    } catch (error) {
      console.error('❌ [CompactAnalytics] Failed to save restore state:', error);
    }
    
    setShowRestoreModal(false);
  };

  // Note: Do not return early here — keep hooks (useMemo/useEffect) declarations
  // above this point to ensure hook call order remains stable across renders.
  // Empty-state rendering is handled later in the main JSX return.

  const expandedMonthData = visibleMonths.find(m => m.key === expandedMonth);
  
  // Timeline data for LineChart (Zeit/Punkte)
  const timelineData = useMemo(() => {
    if (!expandedAnalytics || !expandedMonthData) return [];
    
    console.log('🔍 [TimelineData] Starting timeline generation...');
    console.log('🔍 [TimelineData] Month data:', expandedMonthData);
    console.log('🔍 [TimelineData] User stats:', expandedAnalytics.userStats);
    
    const executions = expandedMonthData.executions;
    console.log('🔍 [TimelineData] Raw executions:', executions.length);
    
    // Filter and validate executions
    const validExecutions = executions.filter((execution: any) => {
      const hasValidDate = execution.executedAt || execution.date;
      const hasValidUser = execution.executedBy || execution.userId;
      const hasPoints = (execution.pointsAwarded || execution.points || 0) > 0;
      
      if (!hasValidDate || !hasValidUser) {
        console.warn('📊 [TimelineData] Invalid execution:', {
          id: execution.id,
          date: execution.executedAt || execution.date,
          user: execution.executedBy || execution.userId,
          points: execution.pointsAwarded || execution.points
        });
        return false;
      }
      
      return true;
    });
    
    console.log('🔍 [TimelineData] Valid executions:', validExecutions.length);
    
    const timelineMap = new Map();
    
    // Initialize timeline for the month
    const startDate = new Date(expandedMonthData.year, expandedMonthData.monthIndex, 1);
    const endDate = new Date(expandedMonthData.year, expandedMonthData.monthIndex + 1, 0);
    const today = new Date();
    const actualEndDate = endDate > today ? today : endDate;
    
    console.log('🔍 [TimelineData] Date range:', {
      start: startDate.toISOString().split('T')[0],
      end: actualEndDate.toISOString().split('T')[0],
      monthIndex: expandedMonthData.monthIndex,
      year: expandedMonthData.year
    });
    
    // Create timeline points for each day
    for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dataPoint: any = {
        date: `${d.getDate()}.${d.getMonth() + 1}`,
        originalDate: dateStr
      };
      
      // Initialize each user's points to 0
      expandedAnalytics.userStats.forEach((userStat: UserStat) => {
        dataPoint[userStat.username] = 0;
      });
      
      timelineMap.set(dateStr, dataPoint);
    }
    
    console.log('🔍 [TimelineData] Timeline days created:', timelineMap.size);
    
    // Process executions and add to timeline
    validExecutions.forEach((execution: any) => {
      const execDate = new Date(execution.executedAt || execution.date);
      const dateStr = `${execDate.getFullYear()}-${String(execDate.getMonth() + 1).padStart(2, '0')}-${String(execDate.getDate()).padStart(2, '0')}`;
      
      const dataPoint = timelineMap.get(dateStr);
      if (!dataPoint) {
        console.warn(`📊 [TimelineData] No dataPoint found for ${dateStr}`);
        return;
      }
      
      const userId = execution.executedBy || execution.userId;
      const user = state.users[userId];
      if (!user) {
        console.warn(`📊 [TimelineData] User not found for ID ${userId}`);
        return;
      }
      
      const userStat = expandedAnalytics.userStats.find((us: UserStat) => us.userId === userId);
      if (!userStat) {
        console.warn(`📊 [TimelineData] UserStat not found for user ${user.name} (${userId})`);
        return;
      }
      
      const points = execution.pointsAwarded || 0;
      const existingPoints = dataPoint[userStat.username] || 0;
      dataPoint[userStat.username] = existingPoints + points;
      
      console.log(`📊 [TimelineData] Added ${points}P for ${userStat.username} on ${dateStr} (daily total: ${dataPoint[userStat.username]})`);
    });    // Convert to cumulative points
    const timeline = Array.from(timelineMap.values()).sort((a, b) => 
      new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime()
    );
    
    const userCumulative: Record<string, number> = {};
    
    // Initialize cumulative counters
    expandedAnalytics.userStats.forEach((userStat: UserStat) => {
      userCumulative[userStat.username] = 0;
    });
    
    // Calculate cumulative points
    const cumulativeTimeline = timeline.map((day, index) => {
      const result = { ...day };
      
      expandedAnalytics.userStats.forEach((userStat: UserStat) => {
        const dailyPoints = day[userStat.username] || 0;
        userCumulative[userStat.username] += dailyPoints;
        result[userStat.username] = userCumulative[userStat.username];
        
        if (dailyPoints > 0) {
          console.log(`📊 [TimelineData] Day ${day.date}: ${userStat.username} +${dailyPoints}P, cumulative = ${result[userStat.username]}P`);
        }
      });
      
      return result;
    });
    
    console.log('🔍 [TimelineData] Final timeline length:', cumulativeTimeline.length);
    console.log('🔍 [TimelineData] Final user totals:', userCumulative);
    if (cumulativeTimeline.length > 0) {
      console.log('🔍 [TimelineData] Last timeline entry:', cumulativeTimeline[cumulativeTimeline.length - 1]);
    }
    
    return cumulativeTimeline;
  }, [expandedAnalytics, expandedMonthData, state.users]);

  // Compute analytics + timeline for an arbitrary monthData (used per-month when rendering)
  const computeMonthAnalytics = (monthData: any) => {
    if (!currentWG || !monthData) return null;

    // Build user list from WG members plus any user IDs referenced in executions
    const memberIds = Array.isArray(currentWG.memberIds) ? [...currentWG.memberIds] : [];
    const execUserIds = Array.from(new Set((monthData.executions || []).map((e: any) => e.executedBy).filter(Boolean)));
    const allUserIds = Array.from(new Set([...memberIds, ...execUserIds]));

    const users = allUserIds.map((id: string) => {
      const u = state.users[id];
      if (u) return u;
      // Fallback placeholder for executions that reference users not present in state
      return { id, name: `User ${String(id).slice(0,6)}`, username: `User ${String(id).slice(0,6)}` } as any;
    }).filter(Boolean) || [];

    const userStats = users.map((user: any) => {
      const userExecutions = (monthData.executions || []).filter((e: any) => e.executedBy === user.id);
      const totalPoints = userExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
      const completedTasks = userExecutions.length;
      const averagePoints = completedTasks > 0 ? totalPoints / completedTasks : 0;
      return {
        userId: user.id,
        username: user.name || user.username || `User ${user.id}`,
        totalPoints,
        completedTasks,
        averagePoints
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    const analytics = {
      totalPoints: monthData.totalPoints || 0,
      completedTasks: monthData.completedTasks || 0,
      userStats
    };

    // Build timeline similar to timelineData useMemo
    const executions = monthData.executions || [];
    const validExecutions = executions.filter((execution: any) => {
      const hasValidDate = execution.executedAt || execution.date;
      const hasValidUser = execution.executedBy || execution.userId;
      return !!hasValidDate && !!hasValidUser;
    });

    const timelineMap = new Map<string, any>();
    const startDate = monthData.startDate ? new Date(monthData.startDate) : new Date(monthData.year, monthData.monthIndex, 1);
    const endDate = monthData.endDate ? new Date(monthData.endDate) : new Date(monthData.year, monthData.monthIndex + 1, 0);
    const today = new Date();
    const actualEndDate = endDate > today ? today : endDate;

    for (let d = new Date(startDate); d <= actualEndDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dataPoint: any = { date: `${d.getDate()}.${d.getMonth() + 1}`, originalDate: dateStr };
      analytics.userStats.forEach((userStat: UserStat) => { dataPoint[userStat.username] = 0; });
      timelineMap.set(dateStr, dataPoint);
    }

    validExecutions.forEach((execution: any) => {
      const execDate = new Date(execution.executedAt || execution.date);
      const dateStr = `${execDate.getFullYear()}-${String(execDate.getMonth() + 1).padStart(2, '0')}-${String(execDate.getDate()).padStart(2, '0')}`;
      const dataPoint = timelineMap.get(dateStr);
      if (!dataPoint) return;
      const userId = execution.executedBy || execution.userId;
      const userStat = analytics.userStats.find((us: UserStat) => us.userId === userId);
      if (!userStat) return;
      const points = execution.pointsAwarded || 0;
      dataPoint[userStat.username] = (dataPoint[userStat.username] || 0) + points;
    });

    const timeline = Array.from(timelineMap.values()).sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
    const userCumulative: Record<string, number> = {};
    analytics.userStats.forEach((userStat: UserStat) => { userCumulative[userStat.username] = 0; });

    const cumulativeTimeline = timeline.map((day: any) => {
      const result = { ...day };
      analytics.userStats.forEach((userStat: UserStat) => {
        const dailyPoints = day[userStat.username] || 0;
        userCumulative[userStat.username] += dailyPoints;
        result[userStat.username] = userCumulative[userStat.username];
      });
      return result;
    });

    return { analytics, timeline: cumulativeTimeline };
  };
  
  // Task Progress Data - Säulendiagramm für Task-Häufigkeiten
  const taskProgressData = useMemo(() => {
    if (!expandedAnalytics || !expandedMonthData || !state.tasks) return [];
    
    const executions = expandedMonthData.executions;
    const taskCounts = new Map();
    
    // Count executions per task
    executions.forEach((execution: any) => {
      const task = state.tasks[execution.taskId];
      if (task) {
        taskCounts.set(task.id, (taskCounts.get(task.id) || 0) + 1);
      }
    });
    
    // Create data for each task
    const taskData = Object.values(state.tasks)
      .filter((task: any) => task.wgId === state.currentWG?.id)
      .map((task: any) => {
        const actualCount = taskCounts.get(task.id) || 0;
        // Estimate expected frequency (tasks per month based on constraints)
        const daysInMonth = 30;
        const expectedFreq = task.constraints?.maxDaysBetween ? 
          Math.floor(daysInMonth / task.constraints.maxDaysBetween) : 4;
        
        return {
          taskName: task.title?.length > 15 ? task.title.substring(0, 15) + '...' : task.title,
          actual: actualCount,
          expected: expectedFreq,
          percentage: expectedFreq > 0 ? Math.min(100, (actualCount / expectedFreq) * 100) : 0
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
    
    return taskData;
  }, [expandedAnalytics, expandedMonthData, state.tasks, state.currentWG]);
  
  // Generate consistent colors for both charts
  const generateColors = (count: number) => {
    const colors = [
      '#E53E3E', '#3182CE', '#38A169', '#D69E2E', 
      '#9F7AEA', '#ED8936', '#00B5D8', '#EF4444'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };
  
  // Chart data for user points distribution (keep for pie chart)
  // Ensure consistent sorting and referencing for legend sync
  const chartData = expandedAnalytics ? (() => {
    // Sort userStats by totalPoints (descending) for consistent ordering
    const sortedUserStats = [...expandedAnalytics.userStats].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    console.log('🍰 [PIE CHART] Original user stats:', expandedAnalytics.userStats);
    console.log('🍰 [PIE CHART] Sorted user stats:', sortedUserStats);
    
    const chartData = {
      labels: sortedUserStats.map((u: any) => u.username),
      datasets: [{
        label: 'Punkte',
        data: sortedUserStats.map((u: any) => u.totalPoints),
        backgroundColor: generateColors(sortedUserStats.length),
        borderWidth: 2,
        borderColor: '#fff',
        // Store user stats reference for legend generation
        userStatsRef: sortedUserStats
      }]
    };
    
    console.log('🍰 [PIE CHART] Final chart data:', chartData);
    console.log('🍰 [PIE CHART] Labels-Data mapping:', 
      chartData.labels.map((label, i) => `${label} → ${chartData.datasets[0].data[i]}P`)
    );
    
    return chartData;
  })() : null;

    // Now that all hooks and memos are declared, we can safely return early for empty states.
    if (!currentWG) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>📊 Analytics</h2>
            <p>Keine WG ausgewählt</p>
          </div>
        </div>
      );
    }

    if (visibleMonths.length === 0) {
      return (
        <div className={styles.container}>
          <div className={styles.emptyState}>
            <h2>📊 Analytics</h2>
            <p>Noch keine Daten verfügbar</p>
          </div>
        </div>
      );
    }

    return (
    <div className={styles.container}>
      <div className={styles.header}>
        {(onBack || displayPeriodId == null) && (
          <button 
            className={styles.backButton}
            onClick={() => {
              if (onBack) return onBack();
              // If no onBack provided, fallback to clearing display period so
              // the app shows the current/live period (acts as a "Zurück").
              try {
                dataManager.setDisplayPeriod(null);
                // Also ensure currentPeriod exists
                dataManager.ensureCurrentPeriod();
                console.log('🔙 [CompactAnalytics] Fallback back action: cleared display period');
              } catch (err) {
                console.warn('🔙 [CompactAnalytics] Failed to perform fallback back action', err);
              }
            }}
            aria-label="Zurück"
          >
            <ArrowLeft size={20} />
            Zurück
          </button>
        )}
        <h1>📈 Analytics für {currentWG.name}</h1>
        <div style={{ position: 'absolute', right: '0', top: '50%', transform: 'translateY(-50%)', display: 'flex', gap: '8px' }}>
          {deletedMonths.size > 0 && (
            <button
              onClick={() => setShowRestoreModal(true)}
              style={{
                padding: '0.5rem 1rem',
                background: 'linear-gradient(135deg, #10B981, #34D399)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}
              title="Gelöschte Zeiträume wiederherstellen"
            >
              🔄 Wiederherstellen ({deletedMonths.size})
            </button>
          )}
          <button 
            onClick={() => {
              setChartRefreshKey(Date.now());
              // Force complete chart refresh
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
              console.log('🔄 [CompactAnalytics] Hard refresh triggered');
            }}
            style={{
              padding: '0.5rem 1rem',
              background: 'linear-gradient(135deg, #2196F3, #21CBF3)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: '500'
            }}
            title="Charts komplett neu laden"
          >
            🔄 Hard Refresh
          </button>
        </div>
      </div>

      <div className={styles.monthTabs} data-testid="analytics-periods">
        {visibleMonths.map((monthData) => {
          const isExpanded = expandedMonth === monthData.key;
          const localView = isExpanded ? computeMonthAnalytics(monthData) : null;
          const localTaskProgressData = isExpanded ? (() => {
            const executions = monthData.executions || [];
            const taskCounts = new Map<string, number>();
            executions.forEach((execution: any) => {
              const task = state.tasks[execution.taskId];
              if (task) taskCounts.set(task.id, (taskCounts.get(task.id) || 0) + 1);
            });
            const taskData = Object.values(state.tasks || {})
              .filter((task: any) => task.wgId === state.currentWG?.id)
              .map((task: any) => {
                const actualCount = taskCounts.get(task.id) || 0;
                const daysInMonth = 30;
                const expectedFreq = task.constraints?.maxDaysBetween ? Math.floor(daysInMonth / task.constraints.maxDaysBetween) : 4;
                return {
                  taskName: task.title?.length > 15 ? task.title.substring(0, 15) + '...' : task.title,
                  actual: actualCount,
                  expected: expectedFreq,
                  percentage: expectedFreq > 0 ? Math.min(100, (actualCount / expectedFreq) * 100) : 0
                };
              })
              .sort((a, b) => b.percentage - a.percentage);
            return taskData;
          })() : [];
          const localChartData = isExpanded && localView ? (() => {
            const sortedUserStats = [...localView.analytics.userStats].sort((a: any, b: any) => (b.totalPoints || 0) - (a.totalPoints || 0));
            return {
              labels: sortedUserStats.map((u: any) => u.username),
              datasets: [{
                label: 'Punkte',
                data: sortedUserStats.map((u: any) => u.totalPoints),
                backgroundColor: generateColors(sortedUserStats.length),
                borderWidth: 2,
                borderColor: '#fff',
                userStatsRef: sortedUserStats
              }]
            };
          })() : null;
          return (
            <div key={monthData.key} className={styles.monthTab} data-testid={monthData.key.startsWith('period-') ? `analytics-period-${monthData.key.replace('period-', '')}` : `analytics-month-${monthData.key}`}>
              <button 
                className={`${styles.monthTabHeader} ${isExpanded ? styles.expanded : ''}`}
                onClick={() => setExpandedMonth(isExpanded ? null : monthData.key)}
              >
                <div className={styles.monthTitle}>
                  <span className={styles.monthName} data-testid={monthData.key.startsWith('period-') ? `analytics-period-${monthData.key.replace('period-', '')}-name` : `analytics-month-${monthData.key}-name`}>
                    {(() => {
                      // For periods, use the period name directly
                      if (monthData.key.startsWith('period-')) {
                        return monthData.month; // This should be the period name like "Zeitraum 1.8.2025"
                      }
                      
                      // For regular months, calculate date range
                      const startDay = 1;
                      const endDate = new Date(monthData.year, monthData.monthIndex + 1, 0);
                      const today = new Date();
                      
                      // If this is current month, end at today
                      const isCurrentMonth = monthData.year === today.getFullYear() && 
                                            monthData.monthIndex === today.getMonth();
                      const endDay = isCurrentMonth ? Math.min(today.getDate(), endDate.getDate()) : endDate.getDate();
                      
                      return `${startDay}.${monthData.monthIndex + 1} - ${endDay}.${monthData.monthIndex + 1}`;
                    })()
                    }
                  </span>
                  <div className={styles.monthSummary}>
                    <span data-testid={`${monthData.key.startsWith('period-') ? `analytics-period-${monthData.key.replace('period-', '')}-totalPoints` : `analytics-month-${monthData.key}-totalPoints`}`}>{monthData.totalPoints}P</span>
                    <span>•</span>
                    {/* Prefer explicit taskCount when available (historical period snapshots),
                        otherwise fall back to completedTasks (executions count) */}
                    <span data-testid={`${monthData.key.startsWith('period-') ? `analytics-period-${monthData.key.replace('period-', '')}-completed` : `analytics-month-${monthData.key}-completed`}`}>{typeof (monthData as any).taskCount === 'number' ? (monthData as any).taskCount : monthData.completedTasks} Tasks</span>
                    {((typeof (monthData as any).taskCount === 'number' ? (monthData as any).taskCount : monthData.completedTasks) === 0) && (
                      <span style={{ color: '#999', fontSize: '0.8rem' }}>(leer)</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteModal(monthData.key);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '4px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.2s ease',
                      opacity: 0.7
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#fee2e2';
                      e.currentTarget.style.opacity = '1';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.opacity = '0.7';
                    }}
                    title="Zeitraum löschen"
                    aria-label="Zeitraum löschen"
                  >
                    🗑️
                  </button>
                  <span className={styles.expandIcon}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </button>
              
              {isExpanded && localView && (
                <div className={styles.monthContent}>
                  {/* Compact Stats */}
                  <div className={styles.compactStats}>
                    <div className={styles.compactStatCard}>
                      <span className={styles.compactStatLabel}>💰 Gesamtpunkte</span>
                      <span className={styles.compactStatValue}>{localView.analytics.totalPoints}P</span>
                    </div>
                    <div className={styles.compactStatCard}>
                      <span className={styles.compactStatLabel}>✅ Tasks erledigt</span>
                      <span className={styles.compactStatValue}>{localView.analytics.completedTasks}</span>
                    </div>
                  </div>

                  {/* Charts */}
                  {/* Render charts when we have timeline/userStats; otherwise show a friendly placeholder */}
                  {localView && localView.timeline && localView.timeline.length > 0 && localView.analytics.userStats.length > 0 ? (
                    <div className={styles.chartsSection}>
                      <div className={styles.chartContainer}>
                        <h3>📈 Progress</h3>
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart data={localView.timeline} key={`line-chart-${chartRefreshKey}`}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              angle={-45}
                              textAnchor="end"
                              height={60}
                              tickFormatter={(value) => {
                                // Extract only day.month from the date string
                                return value; // Already formatted as "16.11"
                              }}
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              label={{ 
                                value: 'Punkte 🎯', 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { textAnchor: 'middle', fontWeight: 'bold', fill: '#374151' }
                              }}
                            />
                            <RechartsTooltip 
                              labelFormatter={(value, payload) => {
                                const dataPoint = payload?.[0]?.payload;
                                if (dataPoint) {
                                  const date = new Date(dataPoint.originalDate);
                                  return `${date.getDate()}.${date.getMonth() + 1}.${date.getFullYear()}`;
                                }
                                return value;
                              }}
                            />
                            <RechartsLegend 
                              verticalAlign="bottom"
                              align="center"
                              layout="horizontal"
                              iconType="rect"
                              wrapperStyle={{
                                paddingTop: '10px',
                                fontSize: '12px',
                                fontFamily: 'inherit'
                              }}
                              formatter={(value, entry) => {
                                // Remove points from legend, show only name
                                return value.replace(/ \(\d+P\)/, '');
                              }}
                            />
                            
                            {/* Member Lines */}
                            {localView.analytics.userStats.map((userStat: any, index: number) => {
                              const colors = generateColors(localView.analytics.userStats.length);
                              console.log(`📊 [Chart] Rendering line for ${userStat.username} with dataKey "${userStat.username}"`);
                              console.log(`📊 [Chart] Sample timeline data for user:`, localView.timeline.slice(0, 3).map((d: any) => ({ date: d.date, [userStat.username]: d[userStat.username] })));
                              return (
                                <Line
                                  key={userStat.userId}
                                  type="monotone"
                                  dataKey={userStat.username}
                                  stroke={colors[index]}
                                  strokeWidth={2}
                                  name={`${userStat.username} (${userStat.totalPoints}P)`}
                                  connectNulls={false}
                                  dot={false}
                                  activeDot={{ r: 4, stroke: colors[index], strokeWidth: 1 }}
                                />
                              );
                            })}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      {/* Task Progress Chart */}
                      <div className={styles.chartContainer}>
                        <h3>⏳ Task-Fortschritt</h3>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={localTaskProgressData} key={`task-progress-${chartRefreshKey}`}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="taskName" 
                              tick={{ fontSize: 10, fill: '#64748b' }}
                              angle={-45}
                              textAnchor="end"
                              height={80}
                            />
                            <YAxis 
                              tick={{ fontSize: 11, fill: '#64748b' }}
                              label={{ 
                                value: 'Häufigkeit', 
                                angle: -90, 
                                position: 'insideLeft',
                                style: { textAnchor: 'middle', fontWeight: 'bold', fill: '#374151' }
                              }}
                            />
                            <RechartsTooltip 
                              formatter={(value, name) => {
                                if (name === 'actual') return [value, 'Ist-Häufigkeit'];
                                if (name === 'expected') return [value, 'Soll-Häufigkeit'];
                                return [value, name];
                              }}
                            />
                            <RechartsLegend 
                              verticalAlign="bottom"
                              align="center"
                              layout="horizontal"
                              iconType="rect"
                              wrapperStyle={{
                                paddingTop: '10px',
                                fontSize: '12px'
                              }}
                            />
                            <RechartsBar dataKey="expected" fill="#E2E8F0" name="Soll-Häufigkeit" />
                            <RechartsBar dataKey="actual" fill="#3182CE" name="Ist-Häufigkeit" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Placeholder Chart */}
                      <div className={styles.chartContainer}>
                        <h3>🚀 Weitere Analyse</h3>
                        <div style={{
                          height: '300px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: '#f8fafc',
                          border: '2px dashed #cbd5e1',
                          borderRadius: '8px',
                          color: '#64748b',
                          fontSize: '16px',
                          fontWeight: '500'
                        }}>
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
                            <div>Hier kommt später noch eine weitere Analyse</div>
                            <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '8px' }}>
                              Platzhalter für zukünftige Features
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {localChartData && (
                        <div className={styles.chartContainer}>
                          <h3>🍰 Gesamtpunkte Verteilung</h3>
                          <Pie 
                            key={`pie-chart-${chartRefreshKey}`}
                            data={localChartData}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { 
                                  display: true,
                                  position: 'bottom' as const,
                                  labels: {
                                    usePointStyle: true,
                                    generateLabels: (chart: any) => {
                                      const original = ChartJS.defaults.plugins.legend.labels.generateLabels;
                                      const labels = original.call(this, chart);
                                      
                                      console.log('🏷️ [Legend] Chart object:', chart);
                                      console.log('🏷️ [Legend] Original labels from Chart.js:', labels);
                                      
                                      // FIXED: Verwende die echten Chart-Labels und -Daten direkte von Chart.js
                                      // anstatt unsere userStatsRef, da Chart.js möglicherweise eine andere Reihenfolge verwendet
                                      if (labels && chart?.data?.labels && chart?.data?.datasets?.[0]?.data) {
                                        const chartLabels = chart.data.labels;
                                        const chartData = chart.data.datasets[0].data;
                                        const userStatsRef = chart.data.datasets[0].userStatsRef;
                                        
                                        console.log('🏷️ [Legend] Chart labels:', chartLabels);
                                        console.log('🏷️ [Legend] Chart data:', chartData);
                                        
                                        labels.forEach((label: any, i: number) => {
                                          if (i < chartLabels.length) {
                                            const username = chartLabels[i];
                                            const points = chartData[i];
                                            
                                            // Finde den echten Benutzer anhand des Namens für zusätzliche Daten
                                            const userStat = userStatsRef?.find((u: any) => u.username === username);
                                            
                                            const shortName = username.length > 12 ? 
                                              username.substring(0, 10) + '...' : 
                                              username;
                                            
                                            label.text = `${shortName} (${points}P)`;
                                            
                                            // Debug logging to verify correct mapping
                                            console.log(`🏷️ [Legend] Index ${i}: ${shortName} → ${points}P (Chart: ${username})`, {
                                              originalLabel: label.text,
                                              chartLabel: username,
                                              chartData: points,
                                              userStat,
                                              dataIndex: i
                                            });
                                          }
                                        });
                                      }
                                      return labels;
                                    }
                                  }
                                },
                                datalabels: {
                                  display: true,
                                  color: '#ffffff',
                                  font: {
                                    size: 11,
                                    weight: 'bold'
                                  },
                                  formatter: (value: number, context: any) => {
                                    const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                                    if (total === 0) return '';
                                    const percentage = Math.round((value / total) * 100);
                                    
                                    // Only show labels for segments larger than 8% to avoid clutter
                                    if (percentage < 8) return '';
                                    
                                    // FIXED: Verwende Chart-Daten direkt für konsistente Zuordnung
                                    const chartLabels = context.chart?.data?.labels;
                                    const chartDataValues = context.chart?.data?.datasets?.[0]?.data;
                                    
                                    if (chartLabels && chartDataValues && context.dataIndex < chartLabels.length) {
                                      const userName = chartLabels[context.dataIndex];
                                      const shortName = userName.length > 8 ? userName.substring(0, 6) + '...' : userName;
                                      
                                      // Debug logging for data labels
                                      console.log(`🏷️ [DataLabel] Index ${context.dataIndex}: ${shortName} → ${value}P (${percentage}%) [Chart: ${userName}]`, {
                                        userName,
                                        totalValue: value,
                                        percentage,
                                        chartData: chartDataValues[context.dataIndex]
                                      });
                                      
                                      return `${shortName}\n${value}P\n(${percentage}%)`;
                                    }
                                    
                                    // Fallback wenn Chart-Daten nicht verfügbar
                                    return `${percentage}%`;
                                  },
                                  anchor: 'center' as const,
                                  align: 'center' as const,
                                  backgroundColor: 'rgba(0, 0, 0, 0.7)',
                                  borderColor: '#ffffff',
                                  borderWidth: 1,
                                  borderRadius: 4,
                                  padding: {
                                    top: 3,
                                    bottom: 3,
                                    left: 4,
                                    right: 4
                                  }
                                }
                              }
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '24px', background: '#fff7ed', borderRadius: 8, border: '1px solid #fdeacc', color: '#92400e' }}>
                      <h4 style={{ margin: 0, fontSize: '16px' }}>Keine Diagrammdaten</h4>
                      <p style={{ margin: '8px 0 0 0', color: '#92400e' }}>Für diesen Zeitraum sind derzeit keine ausreichenden Daten vorhanden, um Diagramme anzuzeigen.</p>
                    </div>
                  )}

                  {/* User Stats */}
                  {expandedAnalytics.userStats.length > 0 && (
                    <div className={styles.userStatsSection}>
                      <h3>Benutzer-Details</h3>
                      <div className={styles.userStatsCompact}>
                        {expandedAnalytics.userStats.map((userStat: UserStat) => (
                          <div key={userStat.userId} className={styles.userStatCompact}>
                            <span className={styles.userName} data-testid="user-name">{userStat.username}</span>
                            <div className={styles.userStatNumbers}>
                              <span>{userStat.totalPoints}P</span>
                              <span>•</span>
                              <span>{userStat.completedTasks} Tasks</span>
                              <span>•</span>
                              <span>⌀ {userStat.averagePoints.toFixed(1)}P</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Restore Modal */}
      {showRestoreModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#374151'
            }}>
              🔄 Zeiträume wiederherstellen
            </h3>
            <p style={{
              margin: '0 0 20px 0',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Wähle gelöschte Zeiträume aus, die du wiederherstellen möchtest:
            </p>
            <div style={{ marginBottom: '24px' }}>
              {Array.from(deletedMonths.entries()).map(([key, monthData]) => (
                <div key={key} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  marginBottom: '8px'
                }}>
                  <div>
                    <strong>{monthData.month}</strong>
                    <div style={{ fontSize: '14px', color: '#6b7280' }}>
                      {monthData.totalPoints}P • {monthData.completedTasks} Tasks
                    </div>
                  </div>
                  <button
                    onClick={() => handleRestoreMonth(key)}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: '#10B981',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#059669';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#10B981';
                    }}
                  >
                    Wiederherstellen
                  </button>
                </div>
              ))}
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowRestoreModal(false)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{
              margin: '0 0 16px 0',
              fontSize: '18px',
              fontWeight: 'bold',
              color: '#374151'
            }}>
              🗑️ Zeitraum löschen
            </h3>
            <p style={{
              margin: '0 0 24px 0',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Möchtest du den Zeitraum "{visibleMonths.find(m => m.key === showDeleteModal)?.month}" wirklich aus der Analytics-Ansicht entfernen?
            </p>
            <p style={{
              margin: '0 0 24px 0',
              fontSize: '14px',
              color: '#9ca3af',
              fontStyle: 'italic'
            }}>
              Hinweis: Dies entfernt nur die Anzeige aus dieser Ansicht. Die ursprünglichen Daten bleiben erhalten.
            </p>
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDeleteModal(null)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={() => handleDeleteMonth(showDeleteModal)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#ef4444';
                }}
              >
                🗑️ Löschen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
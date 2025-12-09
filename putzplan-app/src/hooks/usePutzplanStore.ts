import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, Task, User, WG, TaskExecution, TaskSuggestion } from '../types';
import { dataManager } from '../services/dataManager';
import { generateTaskSuggestions } from '../utils/taskUtils';

// ========================================
// REACT HOOK FÜR PUTZPLAN STATE MANAGEMENT
// ========================================

export function usePutzplanStore() {
  const [state, setState] = useState<AppState>(dataManager.getState());

  // Subscribe to data manager changes
  useEffect(() => {
    const unsubscribe = dataManager.subscribe(setState);
    return unsubscribe;
  }, []);

  // ========================================
  // USER ACTIONS
  // ========================================

  const createUser = useCallback((userData: {
    name: string;
    email?: string;
    avatar?: string;
    targetMonthlyPoints: number;
  }) => {
    return dataManager.createUser({
      ...userData,
      avatar: userData.avatar || '👤', // Default avatar
      isActive: true
    });
  }, []);

  const setCurrentUser = useCallback((userId: string) => {
    dataManager.setCurrentUser(userId);
  }, []);

  const clearCurrentUser = useCallback(() => {
    dataManager.clearCurrentUser();
  }, []);

  const updateUserPoints = useCallback((userId: string, points: number) => {
    const user = state.users[userId];
    if (user) {
      dataManager.updateUser(userId, {
        currentMonthPoints: user.currentMonthPoints + points
      });
    }
  }, [state.users]);

  // ========================================
  // WG ACTIONS
  // ========================================

  const createWG = useCallback((wgData: {
    name: string;
    description?: string;
    monthlyPointsTarget: number;
  }) => {
    const wg = dataManager.createWG({
      ...wgData,
      settings: {
        monthlyPointsTarget: wgData.monthlyPointsTarget,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });
    return wg;
  }, []);

  const joinWG = useCallback((inviteCode: string) => {
    if (!state.currentUser) throw new Error('No current user');
    return dataManager.joinWG(inviteCode, state.currentUser.id);
  }, [state.currentUser]);

  // Direct add methods for setup
  const addUser = useCallback((user: User) => {
    dataManager.addUser(user);
  }, []);

  const addWG = useCallback((wg: WG) => {
    dataManager.addWG(wg);
  }, []);

  const setCurrentWG = useCallback((wgId: string) => {
    dataManager.setCurrentWG(wgId);
  }, []);

  const updateWG = useCallback((wgId: string, updates: Partial<WG>) => {
    dataManager.updateWG(wgId, updates);
  }, []);

  const clearCurrentWG = useCallback(() => {
    dataManager.clearCurrentWG();
  }, []);

  // Hard reset of all member targets to WG target (debug/recovery)
  const resetMembersTargetsToWgTarget = useCallback((wgId?: string) => {
    return (dataManager as any).resetMembersTargetsToWgTarget(wgId);
  }, []);

  const addTask = useCallback((task: Task) => {
    dataManager.addTask(task);
  }, []);

  const updateTask = useCallback((taskId: string, updates: Partial<Task>) => {
    dataManager.updateTask(taskId, updates as any);
  }, []);

  const deleteTask = useCallback((taskId: string) => {
    dataManager.deleteTask(taskId);
  }, []);

  // ========================================
  // TASK ACTIONS
  // ========================================

  const createTask = useCallback((taskData: {
    title: string;
    description: string;
    emoji?: string;
    category: any; // TaskCategory
    timeEstimate: number;
    difficultyScore: number;
    unpleasantnessScore: number;
    maxDaysBetween: number;
    requiresPhoto: boolean;
    minDaysBetween?: number;
  }) => {
    return dataManager.createTask({
      ...taskData,
      emoji: taskData.emoji || '📋', // Default emoji
      averageMinutes: taskData.timeEstimate || 30, // Default 30 min
      averagePainLevel: taskData.difficultyScore || 5, // Default middle difficulty
      averageImportance: taskData.unpleasantnessScore || 5, // Default middle importance
      monthlyFrequency: Math.max(1, Math.round(30 / (taskData.maxDaysBetween || 7))), // Calculate from max days
      pointsPerExecution: taskData.timeEstimate * 0.5 + taskData.difficultyScore * 2, // Calculate points
      totalMonthlyPoints: 0, // Will be calculated
      difficultyScore: taskData.difficultyScore,
      unpleasantnessScore: taskData.unpleasantnessScore,
      constraints: {
        maxDaysBetween: taskData.maxDaysBetween,
        minDaysBetween: taskData.minDaysBetween,
        requiresPhoto: taskData.requiresPhoto
      },
      isActive: true,
      setupComplete: false // Initially not complete
    });
  }, []);

  const executeTask = useCallback((taskId: string, data: {
    photo?: string;
    notes?: string;
  }) => {
    return dataManager.executeTask(taskId, data);
  }, []);

  const verifyTaskExecution = useCallback((executionId: string) => {
    if (!state.currentUser) throw new Error('No current user');
    dataManager.verifyExecution(executionId, state.currentUser.id);
  }, [state.currentUser]);

  // ========================================
  // COLLABORATIVE TASK RATINGS
  // ========================================
  const upsertTaskRating = useCallback((taskId: string, data: { estimatedMinutes: number; painLevel: number; importance: number; suggestedFrequency: number; }) => {
    return dataManager.upsertTaskRating(taskId, data);
  }, []);

  const upsertTaskRatingForUser = useCallback((userId: string, taskId: string, data: { estimatedMinutes: number; painLevel: number; importance: number; suggestedFrequency: number; }) => {
    return dataManager.upsertTaskRatingForUser(userId, taskId, data);
  }, []);

  const getRatingsForUser = useCallback((userId: string) => {
    return dataManager.getRatingsForUser(userId);
  }, []);

  const isUserRatingsComplete = useCallback((userId: string) => {
    return dataManager.isUserRatingsComplete(userId);
  }, []);

  const recalculateTaskPoints = useCallback(() => {
    console.debug && console.debug('🔄 [Store] recalculateTaskPoints gestartet');
    console.debug && console.debug('📋 [Store] Tasks vor Update:', Object.values(state.tasks).map(t => `${t.title}: ${t.pointsPerExecution}P`));
    
    dataManager.recalculateTaskPoints();
    
    console.debug && console.debug('📋 [Store] Tasks nach dataManager Update:', Object.values(dataManager.getState().tasks).map(t => `${t.title}: ${t.pointsPerExecution}P`));
    
    // Force re-render durch neue Object-Referenz
    const newState = { ...dataManager.getState() };
    newState.tasks = { ...newState.tasks };
    
    // Zusätzlich: Force Update mit einem neuen Timestamp
    (window as any).__forceUpdate = Date.now();
    
    setState(newState);
    
    console.debug && console.debug('📋 [Store] Tasks nach setState:', Object.values(newState.tasks).map(t => `${t.title}: ${t.pointsPerExecution}P`));
    console.debug && console.debug('✅ [Store] recalculateTaskPoints abgeschlossen, Force Update:', (window as any).__forceUpdate);
  }, [state.tasks]);

  const recalculateWGPointDistribution = useCallback(() => {
    const result = dataManager.recalculateWGPointDistribution();
    // Force re-render um sicherzustellen, dass die Komponenten die aktualisierten WG-Daten sehen
    setState(dataManager.getState());
    return result;
  }, []);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const taskSuggestions = useCallback((): TaskSuggestion[] => {
    if (!state.currentUser) return [];

    const allTasks = Object.values(state.tasks);
    const allExecutions = Object.values(state.executions);
    const allRatings = Object.values(state.ratings);
    const allUsers = Object.values(state.users);

    return generateTaskSuggestions(
      state.currentUser,
      allTasks,
      allExecutions,
      allRatings,
      allUsers
    ).slice(0, 10); // Top 10 Vorschläge
  }, [state.currentUser, state.tasks, state.executions, state.ratings, state.users]);

  const overdueTasksCount = useCallback((): number => {
    const now = Date.now();
    const allTasks = Object.values(state.tasks);
    const allExecutions = Object.values(state.executions);
    
    return allTasks.filter(task => {
      if (!task.isActive) return false;
      
      const lastExecution = allExecutions
        .filter(e => e.taskId === task.id)
        .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())[0];
      
      const daysSince = Math.floor(
        (now - (lastExecution ? 
          new Date(lastExecution.executedAt).getTime() : 
          new Date(task.createdAt).getTime()
        )) / (1000 * 60 * 60 * 24)
      );
      
      return daysSince > task.constraints.maxDaysBetween;
    }).length;
  }, [state.tasks, state.executions]);

  // Min-Intervall & Dringlichkeit
  const canExecuteTaskNow = useCallback((task: Task): boolean => {
    const executions = Object.values(state.executions).filter(e => e.taskId === task.id).sort((a,b)=> new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    const last = executions[0];
    if (!task.constraints.minDaysBetween) return true;
    if (!last) return true;
    const daysSince = Math.floor((Date.now() - new Date(last.executedAt).getTime()) / 86400000);
    return daysSince >= task.constraints.minDaysBetween;
  }, [state.executions]);

  const nextEarliestExecutionDate = useCallback((task: Task): Date | null => {
    if (!task.constraints.minDaysBetween) return null;
    const executions = Object.values(state.executions).filter(e => e.taskId === task.id).sort((a,b)=> new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    const last = executions[0];
    if (!last) return null;
    const d = new Date(last.executedAt);
    d.setDate(d.getDate() + task.constraints.minDaysBetween);
    return d;
  }, [state.executions]);

  const isTaskUrgent = useCallback((task: Task): boolean => {
    const executions = Object.values(state.executions).filter(e => e.taskId === task.id).sort((a,b)=> new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime());
    const last = executions[0];
    const since = Math.floor((Date.now() - (last ? new Date(last.executedAt).getTime() : new Date(task.createdAt).getTime())) / 86400000);
    return since > task.constraints.maxDaysBetween;
  }, [state.executions]);

  // Pending Ratings (post-execution) – vereinfachter Ansatz: alle fremden Executions ohne vorhandenes Rating des currentUser
  const pendingRatingsCount = useCallback((): number => {
    if (!state.currentUser) return 0;
    const ratedPairs = new Set(
      Object.values(state.postExecutionRatings || {})
        .filter(r => r.ratedBy === state.currentUser!.id)
        .map(r => r.executionId)
    );
    return Object.values(state.executions)
      .filter(exec => exec.executedBy !== state.currentUser!.id)
      .filter(exec => !ratedPairs.has(exec.id))
      .length;
  }, [state.postExecutionRatings, state.executions, state.currentUser]);

  // Adjusted monthly target based on absences
  const adjustedMonthlyTarget = useCallback(() => {
    // Avoid calling dataManager.ensureCurrentPeriod() here because it mutates state.
    // We set the current period once in an effect (see below). During render we only
    // derive the value if both currentUser and currentPeriod exist.
    if (!state.currentUser || !state.currentPeriod) return 0;
    return dataManager.getAdjustedMonthlyTarget(state.currentUser, state.currentPeriod);
  }, [state.currentUser, state.currentPeriod]);

  const temporaryResidentMultiplier = useCallback(() => {
    return dataManager.getTemporaryResidentMultiplier();
  }, [state.temporaryResidents]);

  // Absences
  // Abwesenheit: Grund ist fest 'gone fishing'
  const addAbsence = useCallback((userId: string, startDate: Date, endDate: Date, reason: string = 'gone fishing') => {
    return dataManager.addAbsence({ userId, reason, startDate, endDate });
  }, []);
  const removeAbsence = useCallback((userId: string, absenceId: string) => {
    return dataManager.removeAbsence(userId, absenceId);
  }, []);
  const getUserAbsences = useCallback((userId: string) => {
    return (state.absences?.[userId] || []);
  }, [state.absences]);

  // Orphan cleanup
  const removeOrphanUsers = useCallback(() => {
    // direct dataManager call; triggers state update & subscriber notify
    return (dataManager as any).removeOrphanUsers();
  }, []);

  // Period / Metric exposure
  const setCustomPeriod = useCallback((start: Date, end: Date, resetData: boolean = false) => {
    return dataManager.setCustomPeriod(start, end, resetData);
  }, []);

  const resetForNewPeriod = useCallback(() => {
    return dataManager.resetForNewPeriod();
  }, []);

  const getHistoricalPeriods = useCallback(() => {
    return dataManager.getHistoricalPeriods();
  }, []);
  
  // Period display selection for historical viewing
  const setDisplayPeriod = useCallback((periodId: string | null) => {
    return dataManager.setDisplayPeriod(periodId);
  }, []);
  
  const getDisplayPeriod = useCallback(() => {
    return dataManager.getDisplayPeriod();
  }, []);
  
  const displayPeriodExecutions = useMemo(() => {
    return dataManager.getDisplayPeriodExecutions();
  }, [state]); // Re-compute when state changes

  const periodTargets = useCallback(() => {
    return dataManager.computePeriodTargets();
  }, [state.currentWG, state.currentPeriod, state.tasks, state.ratings]);

  const currentUserProgress = useCallback(() => {
    if (!state.currentUser) return { percentage: 0, points: 0, target: 100 };
    
    const percentage = state.currentUser.targetMonthlyPoints > 0 
      ? (state.currentUser.currentMonthPoints / state.currentUser.targetMonthlyPoints) * 100
      : 0;
    
    return {
      percentage: Math.min(percentage, 100),
      points: state.currentUser.currentMonthPoints,
      target: state.currentUser.targetMonthlyPoints
    };
  }, [state.currentUser]);

  const recentExecutions = useCallback((limit: number = 5) => {
    return Object.values(state.executions)
      .sort((a, b) => new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime())
      .slice(0, limit)
      .map(execution => ({
        ...execution,
        task: state.tasks[execution.taskId],
        user: state.users[execution.executedBy]
      }));
  }, [state.executions, state.tasks, state.users]);

  const unreadNotificationsCount = useCallback(() => {
    return Object.values(state.notifications).filter(n => !n.isRead).length;
  }, [state.notifications]);

  // ========================================
  // UTILITY ACTIONS
  // ========================================

  const clearAllData = useCallback(() => {
    dataManager.clearAllData();
  }, []);

  // ========================================
  // ONE-TIME PERIOD INITIALIZATION
  // ========================================
  // ensureCurrentPeriod previously ran implicitly inside adjustedMonthlyTarget during render,
  // causing React warnings (state update during render). We now perform it once after mount.
  useEffect(() => {
    dataManager.ensureCurrentPeriod();
    // No dependencies: only run once on mount. If you later need to recompute for a new month,
    // you can add a timer or check date boundaries elsewhere.
  }, []);

  const exportData = useCallback(() => {
    return dataManager.exportData();
  }, []);

  const importData = useCallback((jsonData: string) => {
    dataManager.importData(jsonData);
  }, []);

  // ========================================
  // RETURN HOOK INTERFACE
  // ========================================

  return {
    // State
    state,
    debugMode: state.debugMode,
    toggleDebugMode: () => dataManager.toggleDebugMode(),
    
    // User actions
    createUser,
    setCurrentUser,
  clearCurrentUser,
    updateUserPoints,
    
    // WG actions
    createWG,
    joinWG,
    addUser,
    addWG,
  setCurrentWG,
  updateWG,
  clearCurrentWG,
  resetMembersTargetsToWgTarget,
  addTask,
  updateTask,
  deleteTask,
    
    // Task actions
    createTask,
    executeTask,
    verifyTaskExecution,
    
    // Computed values
    taskSuggestions: taskSuggestions(),
    overdueTasksCount: overdueTasksCount(),
    currentUserProgress: currentUserProgress(),
    recentExecutions: recentExecutions(),
    unreadNotificationsCount: unreadNotificationsCount(),
    upsertTaskRating,
    upsertTaskRatingForUser,
    getRatingsForUser,
    isUserRatingsComplete,
    recalculateTaskPoints,
    recalculateWGPointDistribution,
  pendingRatingsCount: pendingRatingsCount(),
  adjustedMonthlyTarget: adjustedMonthlyTarget(),
  temporaryResidentMultiplier: temporaryResidentMultiplier(),
  periodTargets: periodTargets(),
  setCustomPeriod,
  resetForNewPeriod,
  getHistoricalPeriods,
  setDisplayPeriod,
  getDisplayPeriod,
  displayPeriodExecutions,
  addAbsence,
  removeAbsence,
  getUserAbsences,
  removeOrphanUsers,
    
    // Utility
    clearAllData,
    exportData,
    importData,
    
    // Direct state access (for specific components)
    currentUser: state.currentUser,
    currentWG: state.currentWG,
    tasks: state.tasks,
    executions: state.executions,
    isLoading: state.isLoading,
    canExecuteTaskNow,
    nextEarliestExecutionDate,
    isTaskUrgent
  };
}

// ========================================
// HELPER HOOKS FÜR SPEZIFISCHE USE CASES
// ========================================

/**
 * Hook für Task-spezifische Operationen
 */
export function useTask(taskId: string) {
  const { state, executeTask } = usePutzplanStore();
  
  const task = state.tasks[taskId];
  const executions = Object.values(state.executions).filter(e => e.taskId === taskId);
  const lastExecution = executions.sort((a, b) => 
    new Date(b.executedAt).getTime() - new Date(a.executedAt).getTime()
  )[0];
  
  const isOverdue = task ? (() => {
    const daysSince = Math.floor(
      (Date.now() - (lastExecution ? 
        new Date(lastExecution.executedAt).getTime() : 
        new Date(task.createdAt).getTime()
      )) / (1000 * 60 * 60 * 24)
    );
    return daysSince > task.constraints.maxDaysBetween;
  })() : false;

  return {
    task,
    executions,
    lastExecution,
    isOverdue,
    executeTask: (data: { photo?: string; notes?: string }) => executeTask(taskId, data)
  };
}

/**
 * Hook für Benachrichtigungen
 */
export function useNotifications() {
  const { state } = usePutzplanStore();
  
  const notifications = Object.values(state.notifications)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const markAsRead = useCallback((notificationId: string) => {
    dataManager.markNotificationAsRead(notificationId);
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead
  };
}
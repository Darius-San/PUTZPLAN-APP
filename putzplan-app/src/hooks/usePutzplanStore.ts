import { useState, useEffect, useCallback } from 'react';
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

  const addTask = useCallback((task: Task) => {
    dataManager.addTask(task);
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
    
    // User actions
    createUser,
    setCurrentUser,
    updateUserPoints,
    
    // WG actions
    createWG,
    joinWG,
    addUser,
    addWG,
    addTask,
    
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
    
    // Utility
    clearAllData,
    exportData,
    importData,
    
    // Direct state access (for specific components)
    currentUser: state.currentUser,
    currentWG: state.currentWG,
    tasks: state.tasks,
    executions: state.executions,
    isLoading: state.isLoading
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
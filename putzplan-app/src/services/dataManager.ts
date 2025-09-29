import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus } from '../types';
import { generateId } from '../utils/taskUtils';

// ========================================
// LOKALES DATENMANAGEMENT MIT LOCALSTORAGE
// ========================================

const STORAGE_KEY = 'putzplan-app-data';
const STORAGE_VERSION = '1.0';

/**
 * Initialer App-Zustand
 */
const initialState: AppState = {
  currentUser: null,
  currentWG: null,
  users: {},
  tasks: {},
  executions: {},
  ratings: {},
  notifications: {},
  monthlyStats: {},
  taskSuggestions: [],
  isLoading: false,
  lastSyncAt: undefined
};

/**
 * Daten-Manager Klasse für lokale Datenverwaltung
 */
export class DataManager {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  getState(): AppState {
    return { ...this.state };
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    this.saveToStorage();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // ========================================
  // STORAGE MANAGEMENT
  // ========================================

  private loadFromStorage(): AppState {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return initialState;

      const data = JSON.parse(stored);
      
      // Version check
      if (data.version !== STORAGE_VERSION) {
        console.warn('Storage version mismatch, resetting data');
        return initialState;
      }

      // Datum-Strings zu Date-Objekten konvertieren
      const state = this.deserializeDates(data.state);
      return { ...initialState, ...state };
      
    } catch (error) {
      console.error('Error loading from storage:', error);
      return initialState;
    }
  }

  private saveToStorage(): void {
    try {
      const data = {
        version: STORAGE_VERSION,
        state: this.state,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  }

  private deserializeDates(obj: any): any {
    if (!obj) return obj;
    
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
      return new Date(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeDates(item));
    }
    
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        result[key] = this.deserializeDates(obj[key]);
      }
      return result;
    }
    
    return obj;
  }

  // ========================================
  // USER MANAGEMENT
  // ========================================

  createUser(userData: Omit<User, 'id' | 'joinedAt' | 'currentMonthPoints' | 'totalCompletedTasks'>): User {
    const user: User = {
      ...userData,
      id: generateId(),
      joinedAt: new Date(),
      currentMonthPoints: 0,
      totalCompletedTasks: 0,
      isActive: true
    };

    this.updateState({
      users: { ...this.state.users, [user.id]: user },
      currentUser: user
    });

    return user;
  }

  updateUser(userId: string, updates: Partial<User>): void {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');

    const updatedUser = { ...user, ...updates };
    this.updateState({
      users: { ...this.state.users, [userId]: updatedUser },
      currentUser: this.state.currentUser?.id === userId ? updatedUser : this.state.currentUser
    });
  }

  setCurrentUser(userId: string): void {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');
    
    this.updateState({ currentUser: user });
  }

  // ========================================
  // WG MANAGEMENT
  // ========================================

  createWG(wgData: Omit<WG, 'id' | 'createdAt' | 'memberIds' | 'inviteCode'>): WG {
    const wg: WG = {
      ...wgData,
      id: generateId(),
      createdAt: new Date(),
      memberIds: this.state.currentUser ? [this.state.currentUser.id] : [],
      inviteCode: this.generateInviteCode()
    };

    this.updateState({
      currentWG: wg
    });

    return wg;
  }

  joinWG(inviteCode: string, userId: string): WG {
    // In einer echten App würde das über eine API laufen
    // Hier simulieren wir das lokale Beitreten
    const wg: WG = {
      id: generateId(),
      name: 'Demo WG',
      createdAt: new Date(),
      memberIds: [userId],
      inviteCode,
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    };

    this.updateState({ currentWG: wg });
    return wg;
  }

  private generateInviteCode(): string {
    return Math.random().toString(36).substr(2, 8).toUpperCase();
  }

  // Direct add methods for setup
  addUser(user: User): void {
    this.updateState({
      users: { ...this.state.users, [user.id]: user }
    });
  }

  addWG(wg: WG): void {
    this.updateState({
      currentWG: wg
    });
  }

  addTask(task: Task): void {
    this.updateState({
      tasks: { ...this.state.tasks, [task.id]: task }
    });
  }

  // ========================================
  // TASK MANAGEMENT
  // ========================================

  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'basePoints'>): Task {
    if (!this.state.currentUser) throw new Error('No current user');

    // Berechne basePoints basierend auf difficulty und unpleasantness
    const basePoints = Math.round(
      10 + (taskData.difficultyScore - 5) * 2 + (taskData.unpleasantnessScore - 5) * 3
    );

    const task: Task = {
      ...taskData,
      id: generateId(),
      createdAt: new Date(),
      createdBy: this.state.currentUser.id,
      basePoints: Math.max(1, basePoints) // Mindestens 1 Punkt
    };

    this.updateState({
      tasks: { ...this.state.tasks, [task.id]: task }
    });

    return task;
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.state.tasks[taskId];
    if (!task) throw new Error('Task not found');

    const updatedTask = { ...task, ...updates };
    this.updateState({
      tasks: { ...this.state.tasks, [taskId]: updatedTask }
    });
  }

  deleteTask(taskId: string): void {
    const { [taskId]: deleted, ...remainingTasks } = this.state.tasks;
    this.updateState({ tasks: remainingTasks });
  }

  // ========================================
  // TASK EXECUTION
  // ========================================

  executeTask(taskId: string, data: { photo?: string; notes?: string }): TaskExecution {
    if (!this.state.currentUser) throw new Error('No current user');
    
    const task = this.state.tasks[taskId];
    if (!task) throw new Error('Task not found');

    // Punkte berechnen (vereinfacht, ohne Ratings)
    const pointsAwarded = task.basePoints * 
      (1 + (task.difficultyScore - 1) * 0.2) * 
      (1 + (task.unpleasantnessScore - 1) * 0.3);

    const execution: TaskExecution = {
      id: generateId(),
      taskId,
      executedBy: this.state.currentUser.id,
      executedAt: new Date(),
      photo: data.photo,
      notes: data.notes,
      pointsAwarded: Math.round(pointsAwarded),
      status: task.constraints.requiresVerification ? ExecutionStatus.PENDING_VERIFICATION : ExecutionStatus.VERIFIED,
      isVerified: !task.constraints.requiresVerification
    };

    // User-Punkte aktualisieren
    if (execution.isVerified) {
      this.updateUser(this.state.currentUser.id, {
        currentMonthPoints: this.state.currentUser.currentMonthPoints + execution.pointsAwarded,
        totalCompletedTasks: this.state.currentUser.totalCompletedTasks + 1
      });
    }

    this.updateState({
      executions: { ...this.state.executions, [execution.id]: execution }
    });

    return execution;
  }

  verifyExecution(executionId: string, verifierId: string): void {
    const execution = this.state.executions[executionId];
    if (!execution) throw new Error('Execution not found');

    const updatedExecution: TaskExecution = {
      ...execution,
      verifiedBy: verifierId,
      verifiedAt: new Date(),
      isVerified: true,
      status: ExecutionStatus.VERIFIED
    };

    // Punkte dem Ausführer gutschreiben
    const executor = this.state.users[execution.executedBy];
    if (executor) {
      this.updateUser(execution.executedBy, {
        currentMonthPoints: executor.currentMonthPoints + execution.pointsAwarded,
        totalCompletedTasks: executor.totalCompletedTasks + 1
      });
    }

    this.updateState({
      executions: { ...this.state.executions, [executionId]: updatedExecution }
    });
  }

  // ========================================
  // RATINGS
  // ========================================

  rateTask(taskId: string, ratings: Omit<TaskRating, 'id' | 'createdAt' | 'userId'>): TaskRating {
    if (!this.state.currentUser) throw new Error('No current user');

    const rating: TaskRating = {
      ...ratings,
      id: generateId(),
      userId: this.state.currentUser.id,
      taskId,
      createdAt: new Date()
    };

    this.updateState({
      ratings: { ...this.state.ratings, [rating.id]: rating }
    });

    return rating;
  }

  // ========================================
  // NOTIFICATIONS
  // ========================================

  createNotification(notificationData: Omit<Notification, 'id' | 'createdAt' | 'isRead'>): Notification {
    const notification: Notification = {
      ...notificationData,
      id: generateId(),
      createdAt: new Date(),
      isRead: false
    };

    this.updateState({
      notifications: { ...this.state.notifications, [notification.id]: notification }
    });

    return notification;
  }

  markNotificationAsRead(notificationId: string): void {
    const notification = this.state.notifications[notificationId];
    if (!notification) return;

    const updatedNotification = { ...notification, isRead: true };
    this.updateState({
      notifications: { ...this.state.notifications, [notificationId]: updatedNotification }
    });
  }

  // ========================================
  // UTILITY METHODS
  // ========================================

  clearAllData(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state = initialState;
    this.notifyListeners();
  }

  exportData(): string {
    return JSON.stringify({
      version: STORAGE_VERSION,
      exportedAt: new Date().toISOString(),
      data: this.state
    }, null, 2);
  }

  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      const state = this.deserializeDates(data.data);
      this.state = { ...initialState, ...state };
      this.saveToStorage();
      this.notifyListeners();
    } catch (error) {
      throw new Error('Invalid data format');
    }
  }
}

// Singleton Instance
export const dataManager = new DataManager();
import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus, Absence, TemporaryResident, PostExecutionRating, PeriodInfo } from '../types';
import { generateId } from '../utils/taskUtils';

// Minimal localStorage polyfill for non-browser / early import contexts (e.g. Vitest module eval order)
// Ensures DataManager can construct even if jsdom not initialized yet.
const ls: Storage = (() => {
  try {
    if (typeof localStorage !== 'undefined') return localStorage;
  } catch (_) { /* ignore */ }
  let mem: Record<string, string> = {};
  return {
    getItem: (k: string) => (k in mem ? mem[k] : null),
    setItem: (k: string, v: string) => { mem[k] = v; },
    removeItem: (k: string) => { delete mem[k]; },
    clear: () => { mem = {}; },
    key: (i: number) => Object.keys(mem)[i] || null,
    get length() { return Object.keys(mem).length; }
  } as Storage;
})();

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
  wgs: {},
  users: {},
  tasks: {},
  executions: {},
  ratings: {},
  notifications: {},
  monthlyStats: {},
  taskSuggestions: [],
  isLoading: false,
  lastSyncAt: undefined,
  // Neue optionale Strukturen
  absences: {},
  temporaryResidents: {},
  postExecutionRatings: {},
  currentPeriod: undefined
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
      // In test environments the DataManager can be constructed before jsdom provides localStorage.
      if (typeof (globalThis as any).localStorage === 'undefined') {
        return { ...initialState };
      }
      const stored = ls.getItem(STORAGE_KEY);
      if (!stored) return initialState;

      const data = JSON.parse(stored);
      
      // Version check
      if (data.version !== STORAGE_VERSION) {
        console.warn('Storage version mismatch, resetting data');
        return initialState;
      }

      // Datum-Strings zu Date-Objekten konvertieren
      const state = this.deserializeDates(data.state);
      const merged = { ...initialState, ...state } as AppState;
      // Defensive repair: if we lost the wgs map but still have a currentWG restore it
      if (!merged.wgs) merged.wgs = {} as any;
      if (Object.keys(merged.wgs as any).length === 0 && merged.currentWG) {
        merged.wgs = { [merged.currentWG.id]: merged.currentWG } as any;
      }
      // If tasks reference a wgId not present, reconstruct minimal WG shells (prevents empty overview)
      if (merged.tasks && Object.keys(merged.tasks).length > 0) {
        const missingIds = new Set<string>();
  Object.values(merged.tasks).forEach((t: any) => { if (t.wgId && !(merged.wgs as any)[t.wgId]) missingIds.add(t.wgId); });
        if (missingIds.size) {
          merged.wgs = { ...merged.wgs } as any;
            missingIds.forEach(id => {
              (merged.wgs as any)[id] = (merged.wgs as any)[id] || ({ id, name: `WG ${id.substring(0,4)}`, description: 'Reconstructed', createdAt: new Date(), memberIds: [], inviteCode: 'RECOVER', settings: { monthlyPointsTarget: 100, reminderSettings: { lowPointsThreshold: 20, overdueDaysThreshold: 3, enablePushNotifications: false } } });
            });
        }
      }
      return merged;
      
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
  ls.setItem(STORAGE_KEY, JSON.stringify(data));
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

  /**
   * Entfernt die aktuelle User-Referenz (zurück zur Profilübersicht)
   */
  clearCurrentUser(): void {
    if (this.state.currentUser) {
      this.updateState({ currentUser: null });
    }
  }

  clearCurrentWG(): void {
    if (this.state.currentWG) {
      this.updateState({ currentWG: null });
    }
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
      currentWG: wg,
      wgs: { ...(this.state.wgs || {}), [wg.id]: wg }
    });

    return wg;
  }

  /**
   * Aktualisiert Eigenschaften der aktuellen WG (z.B. memberIds)
   */
  updateWG(wgId: string, updates: Partial<WG>): void {
    const existing = (this.state.wgs || {})[wgId] || (this.state.currentWG && this.state.currentWG.id === wgId ? this.state.currentWG : undefined);
    if (!existing) return;
    const updated = { ...existing, ...updates } as WG;
    const newWgs = { ...(this.state.wgs || {}), [wgId]: updated };
    this.updateState({ currentWG: this.state.currentWG?.id === wgId ? updated : this.state.currentWG, wgs: newWgs });
  }
  
  joinWG(inviteCode: string, userId: string): WG {
    // Simuliertes lokales Beitreten: erzeugt eine neue WG Instanz
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
    this.updateState({ currentWG: wg, wgs: { ...(this.state.wgs || {}), [wg.id]: wg } });
    return wg;
  }

  setCurrentWG(wgId: string) {
    const wg = (this.state.wgs || {})[wgId];
    if (!wg) return;
    this.updateState({ currentWG: wg });
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
      currentWG: wg,
      wgs: { ...(this.state.wgs || {}), [wg.id]: wg }
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

  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'basePoints' | 'wgId'>): Task {
    if (!this.state.currentUser) throw new Error('No current user');

    // Berechne basePoints basierend auf difficulty und unpleasantness
    const basePoints = Math.round(
      10 + (taskData.difficultyScore - 5) * 2 + (taskData.unpleasantnessScore - 5) * 3
    );

    const task: Task = {
      ...taskData,
      id: generateId(),
      wgId: this.state.currentWG?.id,
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

    // Basis-Punkteberechnung
    let pointsAwarded = task.basePoints *
      (1 + (task.difficultyScore - 1) * 0.2) *
      (1 + (task.unpleasantnessScore - 1) * 0.3);

    // Temporäre Bewohner Multiplikator
    const multiplier = this.getTemporaryResidentMultiplier();
    pointsAwarded = pointsAwarded * multiplier;
    pointsAwarded = Math.round(pointsAwarded);

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

  // Nachträgliche Bewertung einer konkreten Ausführung (vereinfachtes Rating-Modell)
  rateExecution(executionId: string, data: { score: number; notes?: string }): PostExecutionRating {
    if (!this.state.currentUser) throw new Error('No current user');
    if (!this.state.executions[executionId]) throw new Error('Execution not found');

    const execution = this.state.executions[executionId];
    const rating: PostExecutionRating = {
      id: generateId(),
      executionId,
      taskId: execution.taskId,
      createdAt: new Date(),
      ratedBy: this.state.currentUser.id,
      score: Math.max(1, Math.min(5, data.score)),
      notes: data.notes
    };
    const merged = { ...(this.state.postExecutionRatings || {}), [rating.id]: rating };
    this.updateState({ postExecutionRatings: merged });
    return rating;
  }

  // ========================================
  // ABSENCES (Abwesenheiten)
  // ========================================

  addAbsence(absenceData: Omit<Absence, 'id' | 'createdAt' | 'updatedAt' | 'daysCached'>): Absence {
    const absence: Absence = {
      ...absenceData,
      id: generateId(),
      createdAt: new Date()
    };
    const userAbsences = this.state.absences?.[absence.userId] || [];
    this.updateState({ absences: { ...(this.state.absences || {}), [absence.userId]: [...userAbsences, absence] } });
    return absence;
  }

  removeAbsence(userId: string, absenceId: string): void {
    const userAbsences = this.state.absences?.[userId] || [];
    this.updateState({ absences: { ...(this.state.absences || {}), [userId]: userAbsences.filter(a => a.id !== absenceId) } });
  }

  getActiveAbsences(userId: string, date: Date = new Date()): Absence[] {
    return (this.state.absences?.[userId] || []).filter(a => date >= new Date(a.startDate) && date <= new Date(a.endDate));
  }

  // Berechnet Reduktion des Monatsziels (vereinfachte Version)
  getAdjustedMonthlyTarget(user: User, period: PeriodInfo): number {
    const absences = this.state.absences?.[user.id] || [];
    if (absences.length === 0) return user.targetMonthlyPoints;
    const totalAbsentDays = absences.reduce((sum, a) => {
      const start = new Date(a.startDate) < period.start ? period.start : new Date(a.startDate);
      const end = new Date(a.endDate) > period.end ? period.end : new Date(a.endDate);
      if (end < period.start || start > period.end) return sum;
      const days = Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);
      return sum + days;
    }, 0);
    const reduction = (user.targetMonthlyPoints / period.days) * totalAbsentDays;
    return Math.max(0, Math.round(user.targetMonthlyPoints - reduction));
  }

  // ========================================
  // TEMPORARY RESIDENTS
  // ========================================

  addTemporaryResident(residentData: Omit<TemporaryResident, 'id' | 'addedAt'>): TemporaryResident {
    const resident: TemporaryResident = { ...residentData, id: generateId(), addedAt: new Date() };
    const list = this.state.temporaryResidents?.[resident.profileId] || [];
    this.updateState({ temporaryResidents: { ...(this.state.temporaryResidents || {}), [resident.profileId]: [...list, resident] } });
    return resident;
  }

  removeTemporaryResident(profileId: string, id: string): void {
    const list = this.state.temporaryResidents?.[profileId] || [];
    this.updateState({ temporaryResidents: { ...(this.state.temporaryResidents || {}), [profileId]: list.filter(r => r.id !== id) } });
  }

  getActiveTemporaryResidents(date: Date = new Date()): TemporaryResident[] {
    const profileId = this.state.currentWG?.id;
    if (!profileId) return [];
    return (this.state.temporaryResidents?.[profileId] || []).filter(r => date >= new Date(r.startDate) && date <= new Date(r.endDate));
  }

  getTemporaryResidentMultiplier(date: Date = new Date()): number {
    const active = this.getActiveTemporaryResidents(date).length;
    if (active === 0) return 1;
    return 1 + active / 6; // Legacy Logik
  }

  // ========================================
  // PERIOD / MONTHLY STATS (Basis)
  // ========================================
  ensureCurrentPeriod(): PeriodInfo {
    const now = new Date();
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (this.state.currentPeriod && this.state.currentPeriod.id === id) return this.state.currentPeriod;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const days = end.getDate();
    const period: PeriodInfo = { id, start, end, days };
    this.updateState({ currentPeriod: period });
    return period;
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
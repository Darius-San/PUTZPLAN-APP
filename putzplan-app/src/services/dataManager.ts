import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus, Absence, TemporaryResident, UrgentTask, QualityRating } from '../types';
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
  absences: {},
  temporaryResidents: {},
  urgentTasks: {},
  qualityRatings: {},
  monthlyStats: {},
  taskSuggestions: [],
  isLoading: false,
  lastSyncAt: undefined,
  appMeta: { initialLaunchDone: false }
};

/**
 * Daten-Manager Klasse für lokale Datenverwaltung
 */
export class DataManager {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();

  constructor() {
    this.state = this.loadFromStorage();
    // Automatische Demo-Seeding wenn komplett leer
    const search = typeof window !== 'undefined' ? window.location.search : '';
    const forceDemo = /[?&](demo|seed|demoSeed)=1/i.test(search);
    if (
      forceDemo ||
      (Object.keys(this.state.users).length === 0 && Object.keys(this.state.tasks).length === 0 && !this.state.currentWG)
    ) {
      this.seedDefaultDataset();
      this.saveToStorage();
    }
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

  /**
   * Seedet eine vorkonfigurierte Darius WG mit 6 Mitgliedern und 18 Tasks.
   * Es wird KEIN currentUser gesetzt, damit der Nutzer zuerst die Profilübersicht sieht.
   */
  private seedDefaultDataset(): void {
    const memberNames = [
      { name: 'Darius', avatar: '🧑‍🚀' },
      { name: 'Anna', avatar: '🧘' },
      { name: 'Ben', avatar: '🛠️' },
      { name: 'Clara', avatar: '🎨' },
      { name: 'Elias', avatar: '🎧' },
      { name: 'Frida', avatar: '📚' }
    ];
    const users: Record<string, User> = {};
    memberNames.forEach(m => {
      const u: User = {
        id: generateId(),
        name: m.name,
        avatar: m.avatar,
        email: undefined,
        joinedAt: new Date(),
        isActive: true,
        currentMonthPoints: 0,
        targetMonthlyPoints: 150,
        totalCompletedTasks: 0
      };
      users[u.id] = u;
    });
    const userIds = Object.keys(users);

    const wg: WG = {
      id: generateId(),
      name: 'Darius WG',
      description: 'Vorkonfigurierte WG mit Beispiel-Tasks',
      createdAt: new Date(),
      memberIds: userIds,
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
      settings: {
        monthlyPointsTarget: 800,
        reminderSettings: {
          lowPointsThreshold: 50,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    };

    // Helper to create tasks quickly
    const makeTask = (data: Partial<Task> & { title: string; description: string; emoji: string; avgMin: number; diff: number; pain: number; maxGap: number; freq: number; }) : Task => {
      const basePoints = Math.max(1, Math.round(10 + (data.diff - 5) * 2 + (data.pain - 5) * 3));
      return {
        id: generateId(),
        title: data.title,
        description: data.description,
        emoji: data.emoji,
        category: (data as any).category || 'CLEANING',
        createdBy: userIds[0],
        createdAt: new Date(),
        averageMinutes: data.avgMin,
        averagePainLevel: data.pain,
        averageImportance: 5,
        monthlyFrequency: data.freq,
        basePoints,
        difficultyScore: data.diff,
        unpleasantnessScore: data.pain,
        pointsPerExecution: basePoints,
        totalMonthlyPoints: basePoints * data.freq,
        constraints: {
          maxDaysBetween: data.maxGap,
          minDaysBetween: undefined,
          requiresPhoto: false,
          requiresVerification: undefined
        },
        isActive: true,
        setupComplete: true
      } as Task;
    };

    const taskDefs = [
      ['Küche putzen', 'Oberflächen & Boden reinigen', '🧽', 30, 6, 5, 7, 4],
      ['Müll rausbringen', 'Rest- & Papiermüll entsorgen', '🗑️', 10, 3, 4, 3, 8],
      ['Bad reinigen', 'Dusche, Waschbecken, WC', '🚿', 25, 7, 6, 10, 3],
      ['Staubsaugen', 'Alle Wohnräume saugen', '🧹', 35, 5, 4, 7, 4],
      ['Boden wischen', 'Hartböden feucht wischen', '🧼', 30, 6, 5, 14, 2],
      ['Fenster putzen', 'Alle Fenster reinigen', '🪟', 50, 7, 6, 30, 1],
      ['Kühlschrank säubern', 'Innenflächen auswischen', '🥶', 20, 4, 4, 21, 1],
      ['Backofen reinigen', 'Eingebrannte Reste entfernen', '🔥', 40, 8, 7, 30, 1],
      ['Spülmaschine filtern', 'Filter säubern & prüfen', '🧴', 10, 2, 3, 14, 2],
      ['Pflanzen gießen', 'Alle Pflanzen versorgen', '🌿', 8, 1, 1, 3, 8],
      ['Wäsche waschen', 'Gemeinschaftswäsche waschen', '🧺', 45, 5, 4, 7, 4],
      ['Regale abstauben', 'Staub von Oberflächen entfernen', '🪵', 18, 3, 2, 14, 2],
      ['Flur aufräumen', 'Schuhe & Ordnung herstellen', '🧥', 12, 2, 2, 7, 4],
      ['Einkauf planen', 'Liste erstellen & koordinieren', '🛒', 25, 4, 3, 7, 4],
      ['Biomüll leeren', 'Bioabfall entsorgen', '🥬', 8, 2, 3, 3, 8],
      ['Papier sortieren', 'Altpapier bündeln', '📦', 15, 2, 2, 14, 2],
      ['Altglas wegbringen', 'Glas zur Sammelstelle bringen', '🍾', 20, 3, 3, 21, 1],
      ['Essbereich wischen', 'Tisch & Stühle reinigen', '🍽️', 15, 3, 2, 7, 4]
    ];

    const tasks: Record<string, Task> = {};
    taskDefs.forEach(def => {
      const t = makeTask({
        title: def[0] as string,
        description: def[1] as string,
        emoji: def[2] as string,
        avgMin: def[3] as number,
        diff: def[4] as number,
        pain: def[5] as number,
        maxGap: def[6] as number,
        freq: def[7] as number
      });
      tasks[t.id] = t;
    });

    this.state = {
      ...this.state,
      users,
      tasks,
      currentWG: wg,
      appMeta: { initialLaunchDone: false }
      // currentUser ABSICHTLICH null lassen
    };
  }

  /**
   * TEST ONLY: Setzt internen Zustand zurück (ohne öffentliche clearAllData API zu verwenden)
   * und leert localStorage für deterministische Tests.
   */
  resetForTests(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {
      /* ignore */
    }
    this.state = { ...initialState };
    this.seedDefaultDataset();
    this.notifyListeners();
  }

  /**
   * Manuelles Neu-Laden des Demo-Datensatzes (für UI Button / Debug)
   * Setzt aktuelle Nutzer/WG zurück und seedet erneut, ohne Testspezifisches Reset.
   */
  reloadDemoDataset(): void {
    this.state = { ...initialState };
    this.seedDefaultDataset();
    this.saveToStorage();
    this.notifyListeners();
  }

  /** Komplett-Reset: LocalStorage löschen + Demo neu */
  forceResetDemo(): void {
    try { localStorage.removeItem(STORAGE_KEY); } catch(_){}
    this.state = { ...initialState };
    this.seedDefaultDataset();
    this.saveToStorage();
    this.notifyListeners();
  }

  isDemoDataset(): boolean {
    // Heuristik: WG Name + Anzahl Nutzer >= 6 + einige Tasks
    return !!(this.state.currentWG && /darius/i.test(this.state.currentWG.name) && Object.keys(this.state.users).length >= 6 && Object.keys(this.state.tasks).length >= 15);
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
  // ABSENCES
  // ========================================

  createAbsence(absenceData: Omit<Absence, 'id' | 'createdAt' | 'isApproved' | 'approvedBy'> & { autoApprove?: boolean }): Absence {
    const absence: Absence = {
      ...absenceData,
      id: generateId(),
      createdAt: new Date(),
      isApproved: !!absenceData.autoApprove,
      approvedBy: absenceData.autoApprove ? absenceData.createdBy : undefined
    };

    this.updateState({
      absences: { ...(this.state.absences || {}), [absence.id]: absence }
    });

    return absence;
  }

  listAbsences(filter?: { userId?: string; activeOnly?: boolean; at?: Date }): Absence[] {
    const at = filter?.at || new Date();
    return Object.values(this.state.absences || {}).filter(a => {
      if (filter?.userId && a.userId !== filter.userId) return false;
      if (filter?.activeOnly) {
        return a.startDate <= at && a.endDate >= at;
      }
      return true;
    });
  }

  // ========================================
  // TEMPORARY RESIDENTS
  // ========================================

  addTemporaryResident(data: Omit<TemporaryResident, 'id' | 'addedAt'>): TemporaryResident {
    const resident: TemporaryResident = {
      ...data,
      id: generateId(),
      addedAt: new Date()
    };

    this.updateState({
      temporaryResidents: { ...(this.state.temporaryResidents || {}), [resident.id]: resident }
    });

    return resident;
  }

  listActiveTemporaryResidents(at: Date = new Date()): TemporaryResident[] {
    return Object.values(this.state.temporaryResidents || {}).filter(r => r.startDate <= at && r.endDate >= at);
  }

  // ========================================
  // URGENT TASKS
  // ========================================

  createUrgentTask(data: Omit<UrgentTask, 'id' | 'createdAt' | 'active' | 'resolvedAt' | 'resolvedBy'>): UrgentTask {
    const urgent: UrgentTask = {
      ...data,
      id: generateId(),
      createdAt: new Date(),
      active: true
    };

    this.updateState({
      urgentTasks: { ...(this.state.urgentTasks || {}), [urgent.id]: urgent }
    });

    return urgent;
  }

  resolveUrgentTask(id: string, resolverId: string): UrgentTask | null {
    const existing = this.state.urgentTasks?.[id];
    if (!existing) return null;
    const updated: UrgentTask = { ...existing, active: false, resolvedAt: new Date(), resolvedBy: resolverId };
    this.updateState({
      urgentTasks: { ...(this.state.urgentTasks || {}), [id]: updated }
    });
    return updated;
  }

  listUrgentTasks(activeOnly = true): UrgentTask[] {
    return Object.values(this.state.urgentTasks || {}).filter(u => (activeOnly ? u.active : true));
  }

  // ========================================
  // QUALITY RATINGS (Execution Quality)
  // ========================================

  addQualityRating(data: Omit<QualityRating, 'id' | 'createdAt'>): QualityRating {
    const quality: QualityRating = { ...data, id: generateId(), createdAt: new Date() };
    this.updateState({
      qualityRatings: { ...(this.state.qualityRatings || {}), [quality.id]: quality }
    });
    return quality;
  }

  listQualityRatingsForExecution(executionId: string): QualityRating[] {
    return Object.values(this.state.qualityRatings || {}).filter(q => q.taskExecutionId === executionId);
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
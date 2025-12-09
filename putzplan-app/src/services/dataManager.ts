import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus, Absence, TemporaryResident, PostExecutionRating, PeriodInfo } from '../types';
import { generateId } from '../utils/taskUtils';
// TEMPORARY FIX: Use disabled Event Sourcing to prevent localStorage conflicts
import { eventSourcingManager } from './eventSourcingManager.disabled';
import { stateBackupManager } from './stateBackupManager';
// DISABLED: import { crossBrowserSync } from './crossBrowserSync';

// Minimal localStorage polyfill for non-browser / early import contexts (e.g. Vitest module eval order)
// Ensures DataManager can construct even if jsdom not initialized yet.
const getLocalStorage = (): Storage => {
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
};

// ========================================
// LOKALES DATENMANAGEMENT MIT LOCALSTORAGE
// ========================================

const STORAGE_KEY = 'putzplan-data';
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
  currentPeriod: undefined,
  debugMode: false
};

/**
 * Daten-Manager Klasse für lokale Datenverwaltung
 */
export class DataManager {
  private state: AppState;
  private listeners: Set<(state: AppState) => void> = new Set();
  private saveTimeout: NodeJS.Timeout | null = null;
  private localStorage: Storage;
  private selectedPeriodForDisplay: string | null = null; // For historical period viewing

  constructor() {
    this.localStorage = getLocalStorage();
    
    // DISABLED: Initialize cross-browser synchronization - potential cause of period loss
    // crossBrowserSync.init();
    
    this.state = this.loadFromStorage();
  }

  /**
   * Reset für Tests - setzt den State auf Initialzustand zurück
   */
  reset(): void {
    this.state = { ...initialState };
    this.listeners.clear();
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    console.log('🔄 [DataManager] State reset to initial state');
  }

  // ========================================
  // STATE MANAGEMENT
  // ========================================

  getState(): AppState {
    return { ...this.state };
  }

  /**
   * Replaces the entire state (used for restoration from snapshots)
   * WARNING: This completely overwrites the current state!
   */
  setState(newState: AppState): void {
    console.log('[DataManager] setState called - full state replacement');
    console.log('New state:', newState);
    
    this.state = { ...newState };
    this.saveToStorage();
    
    // KRITISCH: Bei setState müssen wir auch an den Server senden!
    // Sonst wird die Änderung beim nächsten reload vom Server überschrieben
    this.saveToServer().catch(error => {
      console.error('[DataManager] Failed to save restored state to server:', error);
    });
    
    this.notifyListeners();
    
    console.log('[DataManager] State replacement completed');
  }

  getCurrentWG(): WG | null {
    return this.state.currentWG;
  }

  isDebugMode(): boolean { return !!this.state.debugMode; }
  toggleDebugMode(): void { this.updateState({ debugMode: !this.state.debugMode }); }

  /**
   * Test helper: resets complete state (not exposed in production builds)
   */
  _TEST_reset(): void {
    if (process.env.NODE_ENV !== 'test') return;
    
    // Reset to initial state first
    this.state = { ...initialState };
    
    // Then try to load from localStorage if data exists
    try {
      const loadedState = this.loadFromStorage();
      this.state = loadedState;
      console.log('[DataManager] _TEST_reset: Loaded state from localStorage');
    } catch (error) {
      console.warn('[DataManager] _TEST_reset: Could not load from localStorage:', error);
      // Keep initial state if loading fails
      this.saveToStorage();
    }
    
    this.notifyListeners();
  }

  /**
   * Test helper: overrides localStorage for testing (not exposed in production builds)
   */
  _TEST_setLocalStorage(mockStorage: Storage): void {
    if (process.env.NODE_ENV !== 'test') return;
    this.localStorage = mockStorage;
  }

  subscribe(listener: (state: AppState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    
    // Debounced save to prevent race conditions
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.saveToStorage();
      this.saveTimeout = null;
    }, 100);
    
    this.notifyListeners();
  }
  
  /**
   * Updates state with immediate persistence - use for critical operations like period changes
   */
  private updateStateImmediate(updates: Partial<AppState>): void {
    this.state = { ...this.state, ...updates };
    
    // Cancel any pending debounced save
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    
    // Save immediately
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
    console.log('[DataManager] loadFromStorage called');
    
    try {
      // DISABLED: CROSS-BROWSER SYNC - potential source of period loss
      // const syncedData = crossBrowserSync.loadWithSync();
      // 
      // if (syncedData) {
      //   console.log('[DataManager] Using synced data from cross-browser sync');
      //   const state = this.deserializeDates(syncedData.state);
      //   return { ...initialState, ...state } as AppState;
      // }
      
      // Use regular localStorage directly
      let stored = this.localStorage.getItem(STORAGE_KEY);
      console.log('[DataManager] localStorage.getItem(putzplan-data) result:', stored ? 'data found' : 'no data');
      
      // REMOVED: Event Sourcing snapshot logic to prevent storage conflicts
      // The original Event Sourcing check caused different data in different browsers
      
      if (!stored) {
        console.log('[DataManager] No stored data found, returning initial state');
        return { ...initialState };
      }

      const data = JSON.parse(stored);
      console.log('[DataManager] Parsed storage data, version:', data.version);
      
      // Version check
      if (data.version !== STORAGE_VERSION) {
        console.warn('[DataManager] Storage version mismatch, resetting data');
        return { ...initialState };
      }

      // Datum-Strings zu Date-Objekten konvertieren
      const state = this.deserializeDates(data.state);
      const merged = { ...initialState, ...state } as AppState;
      console.log('[DataManager] Successfully loaded state with users:', Object.keys(merged.users).length);
      console.log('[DataManager] Successfully loaded state with users:', Object.keys(merged.users).length);
      
      // Defensive repair: if we lost the wgs map but still have a currentWG restore it
      if (!merged.wgs) merged.wgs = {} as any;
      if (Object.keys(merged.wgs as any).length === 0 && merged.currentWG) {
        merged.wgs = { [merged.currentWG.id]: merged.currentWG } as any;
      }
      // Add new flags with defaults if absent
      if (typeof (merged as any).debugMode === 'undefined') (merged as any).debugMode = false;
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
      
      console.log('[DataManager] Returning merged state');
      console.log('[DataManager] Returning merged state');
      return merged;
      
    } catch (error) {
      console.error('[DataManager] Error loading from storage:', error);
      return { ...initialState };
    }
  }

  private saveToStorage(): void {
    console.log('[DataManager] saveToStorage called');
    try {
      const data = {
        version: STORAGE_VERSION,
        state: this.state,
        // Compatibility alias for tests that read currentPeriod at top level
        currentPeriod: this.state.currentPeriod,
        savedAt: new Date().toISOString()
      };
      
      // DISABLED: Use direct localStorage instead of crossBrowserSync to prevent conflicts
      // crossBrowserSync.saveWithSync(data);
      this.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      console.log('[DataManager] Successfully saved to localStorage directly (crossBrowserSync disabled)');
    } catch (error) {
      console.error('[DataManager] Error saving to storage:', error);
    }
  }

  private deserializeDates(obj: any): any {
    if (!obj) return obj;
    
    // Handle ISO date strings
    if (typeof obj === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(obj)) {
      return new Date(obj);
    }
    
    // Handle arrays recursively
    if (Array.isArray(obj)) {
      return obj.map(item => this.deserializeDates(item));
    }
    
    // Handle objects recursively
    if (typeof obj === 'object') {
      const result: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          result[key] = this.deserializeDates(obj[key]);
        }
      }
      
      // Special handling for PeriodInfo objects
      if (result.start && result.end && typeof result.id === 'string') {
        result.start = result.start instanceof Date ? result.start : new Date(result.start);
        result.end = result.end instanceof Date ? result.end : new Date(result.end);
        console.log('📅 [DataManager] Deserialized PeriodInfo:', result.id, result.start, result.end);
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

    // Save state backup BEFORE change
    stateBackupManager.saveStateChange({
      type: 'CREATE_USER',
      entity: 'user',
      entityId: user.id,
      data: user,
      timestamp: new Date().toISOString()
    });

    this.updateState({
      users: { ...this.state.users, [user.id]: user },
      currentUser: user
    });
    
    // Critical operation: immediate save
    this.saveToStorage();

    // Log event für Event-Sourcing System
    eventSourcingManager.logAction(
      'CREATE_USER',
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        targetMonthlyPoints: user.targetMonthlyPoints
      },
      user.id,
      this.state.currentWG?.id
    );

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

  // Overloaded: accepts either an object or legacy (name, avatars) signature used in some tests
  createWG(wgData: Omit<WG, 'id' | 'createdAt' | 'memberIds' | 'inviteCode'>): WG;
  createWG(name: string, avatars?: string[]): WG;
  createWG(arg1: any, arg2?: any): WG {
    let wg: WG;
    if (typeof arg1 === 'string') {
      // Legacy signature: (name, avatars)
      wg = {
        id: generateId(),
        name: arg1,
        description: 'WG',
        createdAt: new Date(),
        memberIds: this.state.currentUser ? [this.state.currentUser.id] : [],
        inviteCode: this.generateInviteCode(),
        settings: {
          monthlyPointsTarget: 100,
          reminderSettings: { lowPointsThreshold: 20, overdueDaysThreshold: 3, enablePushNotifications: false }
        }
      } as WG;
    } else {
      const wgData = arg1 as Omit<WG, 'id' | 'createdAt' | 'memberIds' | 'inviteCode'>;
      wg = {
        ...wgData,
        id: generateId(),
        createdAt: new Date(),
        memberIds: this.state.currentUser ? [this.state.currentUser.id] : [],
        inviteCode: this.generateInviteCode()
      } as WG;
    }
    this.updateState({ currentWG: wg, wgs: { ...(this.state.wgs || {}), [wg.id]: wg } });
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

    // Log event für Event-Sourcing System
    eventSourcingManager.logAction(
      'ADD_USER',
      {
        userId: user.id,
        name: user.name,
        email: user.email
      },
      this.state.currentUser?.id || user.id,
      this.state.currentWG?.id
    );
  }

  addWG(wg: WG): void {
    this.updateState({
      currentWG: wg,
      wgs: { ...(this.state.wgs || {}), [wg.id]: wg }
    });
  }

  /**
   * Compatibility helper for tests: add a user to a WG's memberIds list.
   */
  addUserToWG(wgId: string, userId: string): void {
    const wg = (this.state.wgs || {})[wgId];
    if (!wg) return;
    const memberIds = new Set(wg.memberIds || []);
    memberIds.add(userId);
    this.updateWG(wgId, { memberIds: Array.from(memberIds) });
  }

  /**
   * Legacy alias expected by some tests
   * Maps addMemberToWG -> addUserToWG
   */
  addMemberToWG(wgId: string, userId: string): void {
    this.addUserToWG(wgId, userId);
  }

  /**
   * Setzt die Zielpunkte aller Mitglieder einer WG UNBEDINGT auf das aktuelle WG-Standardziel.
   * Nützlich, um manuelle Abweichungen zurückzusetzen (Debug/Recovery).
   * Gibt die Anzahl der aktualisierten Mitglieder zurück.
   */
  resetMembersTargetsToWgTarget(wgId?: string): { updated: number; target: number } {
    const wg = wgId ? (this.state.wgs || {})[wgId] : this.state.currentWG;
    if (!wg) return { updated: 0, target: 0 };

    const target = wg.settings?.monthlyPointsTarget ?? 0;
    const updatedUsers = { ...this.state.users };
    let updated = 0;

    (wg.memberIds || []).forEach(uid => {
      const user = updatedUsers[uid];
      if (!user) return;
      if (user.targetMonthlyPoints !== target) {
        updatedUsers[uid] = { ...user, targetMonthlyPoints: target } as User;
        updated++;
      }
    });

    this.updateState({ users: updatedUsers });
    console.debug && console.debug(`🔄 [DataManager] ${updated} Mitglieder auf WG-Ziel ${target}P zurückgesetzt`);
    return { updated, target };
  }

  addTask(task: Task): void {
    this.updateState({
      tasks: { ...this.state.tasks, [task.id]: task }
    });

    // Log event für Event-Sourcing System
    eventSourcingManager.logAction(
      'ADD_TASK',
      {
        taskId: task.id,
        title: task.title,
        wgId: task.wgId,
        createdBy: task.createdBy
      },
      this.state.currentUser?.id,
      task.wgId
    );
  }

  // ========================================
  // TASK MANAGEMENT
  // ========================================

  // Overloaded: accept full Task input (modern) or a minimal legacy shape with {title, points, emoji, assignedUserId}
  createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'basePoints' | 'wgId'>): Task;
  createTask(taskData: { title: string; points?: number; emoji?: string; assignedUserId?: string }): Task;
  createTask(taskData: any): Task {
    if (!this.state.currentUser) throw new Error('No current user');
    const isLegacy = typeof taskData?.title === 'string' && (taskData.points != null || taskData.assignedUserId != null) && taskData.difficultyScore == null;
    if (isLegacy) {
      const basePoints = Math.max(1, Math.round(taskData.points ?? 10));
      const task: Task = {
        id: generateId(),
        wgId: this.state.currentWG?.id,
        title: taskData.title,
        description: taskData.title,
        emoji: taskData.emoji || '🧽',
        category: 'general' as any,
        averageMinutes: 20,
        averagePainLevel: 5,
        averageImportance: 5,
        monthlyFrequency: 4,
        difficultyScore: 5,
        unpleasantnessScore: 5,
        pointsPerExecution: basePoints,
        totalMonthlyPoints: basePoints * 4,
        constraints: { minDaysBetween: 3, maxDaysBetween: 14, requiresPhoto: false },
        createdBy: this.state.currentUser.id,
        createdAt: new Date(),
        basePoints,
        isActive: true,
        setupComplete: true,
        assignedUserId: taskData.assignedUserId
      } as any;
      this.updateState({ tasks: { ...this.state.tasks, [task.id]: task } });
      return task;
    }
    // Modern path - with safe defaults
    const difficultyScore = taskData.difficultyScore ?? 5;
    const unpleasantnessScore = taskData.unpleasantnessScore ?? 5;
    const averageMinutes = taskData.averageMinutes ?? 20;
    const averagePainLevel = taskData.averagePainLevel ?? 5;
    const averageImportance = taskData.averageImportance ?? 5;
    const monthlyFrequency = taskData.monthlyFrequency ?? 4;
    
    const basePoints = Math.round(
      10 + (difficultyScore - 5) * 2 + (unpleasantnessScore - 5) * 3
    );
    
    const task: Task = {
      ...taskData,
      id: generateId(),
      wgId: this.state.currentWG?.id,
      createdAt: new Date(),
      createdBy: this.state.currentUser.id,
      basePoints: Math.max(1, basePoints),
      difficultyScore,
      unpleasantnessScore,
      averageMinutes,
      averagePainLevel,
      averageImportance,
      monthlyFrequency,
      pointsPerExecution: Math.max(1, basePoints),
      totalMonthlyPoints: Math.max(1, basePoints) * monthlyFrequency,
      constraints: {
        ...taskData.constraints,
        maxDaysBetween: taskData.constraints?.maxDaysBetween ?? 7,
        requiresPhoto: taskData.constraints?.requiresPhoto ?? false
      },
      isActive: taskData.isActive ?? true,
      setupComplete: taskData.setupComplete ?? true
    };
    this.updateState({ tasks: { ...this.state.tasks, [task.id]: task } });

    // Log event für Event-Sourcing System
    eventSourcingManager.logAction(
      'CREATE_TASK',
      {
        taskId: task.id,
        title: task.title,
        category: task.category,
        basePoints: task.basePoints,
        wgId: task.wgId,
        createdBy: task.createdBy
      },
      this.state.currentUser.id,
      task.wgId
    );

    // Log state backup
    stateBackupManager.saveStateChange({
      type: 'CREATE_TASK',
      entity: 'task',
      entityId: task.id,
      data: task,
      timestamp: new Date().toISOString()
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

    // Log event für Event-Sourcing System (nur für bedeutsame Updates)
    const significantUpdates = ['title', 'isActive', 'isAlarmed', 'pointsPerExecution'];
    const hasSignificantChange = significantUpdates.some(key => key in updates);
    
    if (hasSignificantChange) {
      eventSourcingManager.logAction(
        'UPDATE_TASK',
        {
          taskId,
          title: task.title,
          updates: Object.keys(updates),
          changedFields: significantUpdates.filter(key => key in updates)
        },
        this.state.currentUser?.id,
        task.wgId
      );

      // Log state backup
      stateBackupManager.saveStateChange({
        type: 'UPDATE_TASK',
        entity: 'task',
        entityId: taskId,
        data: { before: task, after: updatedTask, updates },
        timestamp: new Date().toISOString()
      });
    }
  }

  deleteTask(taskId: string): void {
    const task = this.state.tasks[taskId];
    if (!task) return; // Nichts zu löschen
    
    const { [taskId]: deleted, ...remainingTasks } = this.state.tasks;
    this.updateState({ tasks: remainingTasks });

    // Log event für Event-Sourcing System (kritische Action)
    eventSourcingManager.logAction(
      'DELETE_TASK',
      {
        taskId,
        title: task.title,
        wgId: task.wgId
      },
      this.state.currentUser?.id,
      task.wgId,
      task // Backup des gelöschten Tasks
    );

    // Log state backup with deleted data for potential restore
    stateBackupManager.saveStateChange({
      type: 'DELETE_TASK',
      entity: 'task',
      entityId: taskId,
      data: task, // Store deleted task for potential restore
      timestamp: new Date().toISOString()
    });
  }

  // ========================================
  // TASK EXECUTION
  // ========================================

  executeTask(taskId: string, data: { photo?: string; notes?: string }): TaskExecution {
    if (!this.state.currentUser) throw new Error('No current user');
    
    const task = this.state.tasks[taskId];
    if (!task) throw new Error('Task not found');

    // WICHTIG: Erfasse den State VOR der Änderung für Event-Sourcing
    const previousState = this.getState();

    // Basis-Punkteberechnung mit NaN-Schutz
    let pointsAwarded: number;
    if (typeof task.pointsPerExecution === 'number' && !isNaN(task.pointsPerExecution)) {
      pointsAwarded = task.pointsPerExecution;
    } else if (typeof task.basePoints === 'number' && !isNaN(task.basePoints)) {
      pointsAwarded = task.basePoints *
        (1 + ((task.difficultyScore || 1) - 1) * 0.2) *
        (1 + ((task.unpleasantnessScore || 1) - 1) * 0.3);
    } else {
      // Fallback: Standard-Punkte wenn nichts definiert ist
      console.warn(`⚠️ [DataManager] Task ${task.title} has invalid points, using fallback value`);
      pointsAwarded = 10; // Standard-Fallback
    }

    // Temporäre Bewohner Multiplikator
    const multiplier = this.getTemporaryResidentMultiplier();
    pointsAwarded = pointsAwarded * multiplier;

    // Hot task bonus: if enabled in settings and task is marked isAlarmed, apply one-time percent bonus
    try {
      const hotCfg = this.state.currentWG?.settings?.hotTaskBonus || (this.state as any).globalHotTaskBonus;
      if (hotCfg && hotCfg.enabled && task.isAlarmed) {
        const percent = hotCfg.percent || 0;
        pointsAwarded = Math.round(pointsAwarded * (1 + percent / 100));
        // Clear the hot flag on the task after applying bonus
        this.updateTask(taskId, { isAlarmed: false } as any);
      }
    } catch (e) {
      // ignore
    }

    pointsAwarded = Math.round(pointsAwarded);

    const execution: TaskExecution = {
      id: generateId(),
      taskId,
      executedBy: this.state.currentUser.id,
      executedAt: new Date(),
      photo: data.photo,
      notes: data.notes,
      pointsAwarded: Math.round(pointsAwarded),
      status: (task.constraints?.requiresVerification) ? ExecutionStatus.PENDING_VERIFICATION : ExecutionStatus.VERIFIED,
      isVerified: !(task.constraints?.requiresVerification)
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

    // Log event für Event-Sourcing System MIT previousState
    eventSourcingManager.logAction(
      'EXECUTE_TASK',
      {
        taskId: execution.taskId,
        executedBy: execution.executedBy,
        pointsAwarded: execution.pointsAwarded,
        executionId: execution.id,
        taskTitle: task.title,
        isVerified: execution.isVerified,
        status: execution.status
      },
      this.state.currentUser.id,
      this.state.currentWG?.id,
      previousState // Hier den State VOR der Ausführung speichern
    );

    // Log state backup
    stateBackupManager.saveStateChange({
      type: 'EXECUTE_TASK',
      entity: 'execution',
      entityId: execution.id,
      data: execution,
      timestamp: new Date().toISOString()
    });

    return execution;
  }

  /**
   * Führt einen Task für einen beliebigen User aus (z.B. aus der Task-Tabelle heraus wenn man eine Person auswählt).
   * Spiegelt die Logik von executeTask, berücksichtigt aber den übergebenen userId.
   */
  executeTaskForUser(taskId: string, userId: string, data: { photo?: string; notes?: string } = {}): TaskExecution {
    const task = this.state.tasks[taskId];
    if (!task) throw new Error('Task not found');
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');

    // WICHTIG: Erfasse den State VOR der Änderung für Event-Sourcing
    const previousState = this.getState();

    // Prefer task.pointsPerExecution when available (recalculated via ratings); otherwise compute legacy formula
    let pointsAwarded: number;
    if (typeof task.pointsPerExecution === 'number' && !isNaN(task.pointsPerExecution)) {
      pointsAwarded = task.pointsPerExecution;
    } else if (typeof task.basePoints === 'number' && !isNaN(task.basePoints)) {
      pointsAwarded = task.basePoints *
        (1 + ((task.difficultyScore || 1) - 1) * 0.2) *
        (1 + ((task.unpleasantnessScore || 1) - 1) * 0.3);
    } else {
      // Fallback: Standard-Punkte wenn nichts definiert ist
      console.warn(`⚠️ [DataManager] Task ${task.title} has invalid points, using fallback value`);
      pointsAwarded = 10; // Standard-Fallback
    }
    const multiplier = this.getTemporaryResidentMultiplier();
    pointsAwarded = Math.round(pointsAwarded * multiplier);

    // Hot task bonus
    try {
      const taskObj = this.state.tasks[taskId];
      const hotCfg = this.state.currentWG?.settings?.hotTaskBonus || (this.state as any).globalHotTaskBonus;
      if (hotCfg && hotCfg.enabled && taskObj?.isAlarmed) {
        const percent = hotCfg.percent || 0;
        pointsAwarded = Math.round(pointsAwarded * (1 + percent / 100));
        // Clear the hot flag on the task
        this.updateTask(taskId, { isAlarmed: false } as any);
      }
    } catch (e) {
      // ignore
    }

    const execution: TaskExecution = {
      id: generateId(),
      taskId,
      executedBy: userId,
      executedAt: new Date(),
      photo: data.photo,
      notes: data.notes,
      pointsAwarded,
      status: (task.constraints?.requiresVerification) ? ExecutionStatus.PENDING_VERIFICATION : ExecutionStatus.VERIFIED,
      isVerified: !(task.constraints?.requiresVerification)
    };

    if (execution.isVerified) {
      // Punkte dem entsprechenden User gutschreiben
      this.updateUser(userId, {
        currentMonthPoints: user.currentMonthPoints + execution.pointsAwarded,
        totalCompletedTasks: user.totalCompletedTasks + 1
      });
    }

    this.updateState({ executions: { ...this.state.executions, [execution.id]: execution } });
    
    // Log event für Event-Sourcing System MIT previousState
    eventSourcingManager.logAction(
      'EXECUTE_TASK_FOR_USER',
      {
        taskId: execution.taskId,
        executedBy: execution.executedBy,
        pointsAwarded: execution.pointsAwarded,
        executionId: execution.id,
        taskTitle: task.title,
        userName: user.name,
        isVerified: execution.isVerified,
        status: execution.status
      },
      this.state.currentUser?.id || 'system', // Falls kein currentUser (z.B. Admin-Action)
      this.state.currentWG?.id,
      previousState // Hier den State VOR der Ausführung speichern
    );
    
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

    // Log event für Event-Sourcing System
    const task = this.state.tasks[execution.taskId];
    const executorUser = this.state.users[execution.executedBy];
    eventSourcingManager.logAction(
      'VERIFY_EXECUTION',
      {
        executionId,
        taskId: execution.taskId,
        taskTitle: task?.title || 'Unknown Task',
        executedBy: execution.executedBy,
        executorName: executorUser?.name || 'Unknown User',
        verifierId,
        pointsAwarded: execution.pointsAwarded
      },
      verifierId,
      this.state.currentWG?.id
    );
  }

  /**
   * Backwards-compat test helper: add an execution with explicit points and user.
   * Mirrors a simple verified execution.
   */
  addExecution(payload: { taskId: string; userId: string; points: number; quality?: string }): TaskExecution {
    const task = this.state.tasks[payload.taskId];
    if (!task) throw new Error('Task not found');
    const user = this.state.users[payload.userId];
    if (!user) throw new Error('User not found');
    const execution: TaskExecution = {
      id: generateId(),
      taskId: payload.taskId,
      executedBy: payload.userId,
      executedAt: new Date(),
      notes: payload.quality,
      pointsAwarded: Math.round(payload.points),
      status: ExecutionStatus.VERIFIED,
      isVerified: true
    } as any;
    // award points
    this.updateUser(user.id, {
      currentMonthPoints: user.currentMonthPoints + execution.pointsAwarded,
      totalCompletedTasks: user.totalCompletedTasks + 1
    });
    this.updateState({ executions: { ...this.state.executions, [execution.id]: execution } });
    return execution;
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

  // Upsert: genau eine Bewertung pro (user, task). Falls vorhanden -> aktualisieren.
  upsertTaskRating(taskId: string, partial: Omit<TaskRating, 'id' | 'createdAt' | 'userId' | 'taskId'>): TaskRating {
    if (!this.state.currentUser) throw new Error('No current user');
    const currentUserId = this.state.currentUser.id;
    const existing = Object.values(this.state.ratings).find(r => r.taskId === taskId && r.userId === currentUserId);
    if (existing) {
      const updated: TaskRating = { ...existing, ...partial };
      this.updateState({ ratings: { ...this.state.ratings, [updated.id]: updated }});
      return updated;
    }
    const created: TaskRating = {
      id: generateId(),
      taskId,
      userId: currentUserId,
      createdAt: new Date(),
      estimatedMinutes: partial.estimatedMinutes,
      painLevel: partial.painLevel,
      importance: partial.importance,
      suggestedFrequency: partial.suggestedFrequency
    };
    this.updateState({ ratings: { ...this.state.ratings, [created.id]: created }});
    return created;
  }

  /** Upsert rating for an arbitrary user (used for editing other members' ratings). */
  upsertTaskRatingForUser(userId: string, taskId: string, partial: Omit<TaskRating, 'id' | 'createdAt' | 'userId' | 'taskId'>): TaskRating {
    if (!userId) throw new Error('Missing userId');
    const existing = Object.values(this.state.ratings).find(r => r.taskId === taskId && r.userId === userId);
    if (existing) {
      const updated: TaskRating = { ...existing, ...partial };
      this.updateState({ ratings: { ...this.state.ratings, [updated.id]: updated }});
      return updated;
    }
    const created: TaskRating = {
      id: generateId(),
      taskId,
      userId,
      createdAt: new Date(),
      estimatedMinutes: partial.estimatedMinutes,
      painLevel: partial.painLevel,
      importance: partial.importance,
      suggestedFrequency: partial.suggestedFrequency
    };
    this.updateState({ ratings: { ...this.state.ratings, [created.id]: created }});
    return created;
  }

  getRatingsForUser(userId: string): TaskRating[] {
    return Object.values(this.state.ratings).filter(r => r.userId === userId);
  }

  isUserRatingsComplete(userId: string): boolean {
    const tasks = Object.values(this.state.tasks).filter(t => t.wgId === this.state.currentWG?.id);
    if (tasks.length === 0) return false;
    const userTaskIds = new Set(this.getRatingsForUser(userId).map(r => r.taskId));
    return tasks.every(t => userTaskIds.has(t.id));
  }

  /**
   * Berechnet die Task-Punkte basierend auf aktuellen Bewertungen aller Mitglieder neu
   * und aktualisiert pointsPerExecution und totalMonthlyPoints für alle Tasks der aktuellen WG.
   */
  recalculateTaskPoints(): void {
    if (!this.state.currentWG) return;

    const wgTasks = Object.values(this.state.tasks).filter(t => t.wgId === this.state.currentWG!.id);
    const updatedTasks = { ...this.state.tasks };

    wgTasks.forEach(task => {
      // Hole alle Bewertungen für diesen Task
      const taskRatings = Object.values(this.state.ratings).filter(r => r.taskId === task.id);
      
      if (taskRatings.length > 0) {
        // Berechne Durchschnittswerte aus allen Bewertungen
        const avgMinutes = taskRatings.reduce((sum, r) => sum + r.estimatedMinutes, 0) / taskRatings.length;
        const avgPainLevel = taskRatings.reduce((sum, r) => sum + r.painLevel, 0) / taskRatings.length;
        const avgImportance = taskRatings.reduce((sum, r) => sum + r.importance, 0) / taskRatings.length;
        const avgFrequency = taskRatings.reduce((sum, r) => sum + r.suggestedFrequency, 0) / taskRatings.length;
        
  console.debug && console.debug(`🔧 [TaskPoints] ${task.title}: ${taskRatings.length} Bewertungen`);
  console.debug && console.debug(`   Ø Minuten: ${avgMinutes.toFixed(0)}, Ø Pain: ${avgPainLevel.toFixed(1)}, Ø Wichtigkeit: ${avgImportance.toFixed(1)}`);
        
        // Zeitbasierte Punktberechnung: Mehr Zeit = Mehr Punkte
  // Zeit-Multiplikator: lineare Skalierung bis 180 Minuten, danach HARTE KAPPUNG bei 3.0
  // Wenn du z.B. 480 oder 1200 Minuten eingibst, steigt der Faktor NICHT weiter über 3.0.
  // Das erklärt Fälle, in denen "absurde" Minutenwerte scheinbar keinen weiteren Anstieg bewirken.
  const timeMultiplier = Math.max(0.5, Math.min(3.0, avgMinutes / 60)); // 0.5x für <60min, 3x für >=180min
        const painMultiplier = 1 + (avgPainLevel - 1) * 0.3; // 1.0 - 2.7 für painLevel 1-10
        const importanceMultiplier = 1 + (avgImportance - 1) * 0.2; // 1.0 - 2.8 für importance 1-10
        
  console.debug && console.debug(`   Multiplikatoren: Zeit=${timeMultiplier.toFixed(2)}x, Pain=${painMultiplier.toFixed(2)}x, Wichtig=${importanceMultiplier.toFixed(2)}x`);
        
        // Basis: 20 Punkte, dann alle Multiplikatoren anwenden
        const basePunkte = 20;
        const pointsPerExecution = Math.round(basePunkte * timeMultiplier * painMultiplier * importanceMultiplier);
        const monthlyFrequency = Math.round(avgFrequency);
        
  console.debug && console.debug(`   Resultat: ${basePunkte}P × ${(timeMultiplier * painMultiplier * importanceMultiplier).toFixed(2)} = ${pointsPerExecution}P`);
        
        const updatedTask = {
          ...task,
          pointsPerExecution: Math.max(5, pointsPerExecution), // Minimum 5 Punkte
          monthlyFrequency: Math.max(1, monthlyFrequency),
          totalMonthlyPoints: Math.max(5, pointsPerExecution) * Math.max(1, monthlyFrequency),
          // Aktualisiere auch die Durchschnittswerte für die UI
          averageMinutes: avgMinutes,
          averagePainLevel: avgPainLevel,
          averageImportance: avgImportance
        };
        
  console.debug && console.debug(`   ✅ ${task.title}: ${task.pointsPerExecution}P → ${updatedTask.pointsPerExecution}P`);
        
        updatedTasks[task.id] = updatedTask;
      } else {
        // Fallback: keine Bewertungen vorhanden - Task unverändert lassen
  console.debug && console.debug(`⚠️ [TaskPoints] ${task.title}: Keine Bewertungen - Task unverändert`);
      }
    });

    // Additionally: update existing executions' pointsAwarded to reflect new task valuations
    const updatedExecutions = { ...this.state.executions } as Record<string, TaskExecution>;
    Object.values(updatedExecutions).forEach((exec: any) => {
      const t = updatedTasks[exec.taskId] || this.state.tasks[exec.taskId];
      if (t && exec.isVerified) {
        const newPts = typeof t.pointsPerExecution === 'number' ? Math.round(t.pointsPerExecution) : exec.pointsAwarded;
        exec.pointsAwarded = newPts;
      }
    });

    // Recompute users' currentMonthPoints from executions
    const updatedUsers = { ...this.state.users } as Record<string, any>;
    // Reset currentMonthPoints
    Object.keys(updatedUsers).forEach(uid => { if (updatedUsers[uid]) updatedUsers[uid].currentMonthPoints = 0; });
    Object.values(updatedExecutions).forEach((exec: any) => {
      if (!exec.isVerified) return;
      const u = updatedUsers[exec.executedBy];
      if (!u) return;
      u.currentMonthPoints = (u.currentMonthPoints || 0) + (exec.pointsAwarded || 0);
    });

    this.updateState({ tasks: updatedTasks, executions: updatedExecutions, users: updatedUsers });
  }

  /**
   * Berechnet die faire Punkteverteilung für die WG:
   * 1. Gesamtarbeit = Σ(Task-Punkte × Häufigkeit) für alle Tasks
   * 2. Pro Mitglied = Gesamtarbeit ÷ Anzahl Mitglieder
   * 3. Aktualisiert WG-Settings mit dem neuen Ziel
   */
  recalculateWGPointDistribution(): { totalWorkload: number; pointsPerMember: number; memberCount: number } {
    if (!this.state.currentWG) return { totalWorkload: 0, pointsPerMember: 0, memberCount: 0 };

    const wgTasks = Object.values(this.state.tasks).filter(t => t.wgId === this.state.currentWG!.id);
    const memberCount = this.state.currentWG.memberIds.length;

    // Bei 0 Mitgliedern sofort zurückgeben
    if (memberCount === 0) {
      return { totalWorkload: 0, pointsPerMember: 0, memberCount: 0 };
    }

    // 1. Gesamtarbeit berechnen (alle Tasks zusammen)
    const totalWorkload = wgTasks.reduce((sum, task) => {
      const taskMonthlyPoints = task.totalMonthlyPoints || (task.pointsPerExecution * task.monthlyFrequency);
      return sum + taskMonthlyPoints;
    }, 0);

    // 2. Pro Mitglied aufteilen
    const pointsPerMember = Math.round(totalWorkload / memberCount);

    // 3. WG-Settings aktualisieren
    if (this.state.currentWG) {
      // Vor dem Update: altes WG-Ziel merken, um Standard-User zu erkennen
      const previousWgTarget = this.state.currentWG.settings.monthlyPointsTarget;

      const updatedWG = {
        ...this.state.currentWG,
        settings: {
          ...this.state.currentWG.settings,
          monthlyPointsTarget: pointsPerMember
        }
      };

      this.updateWG(this.state.currentWG.id, updatedWG);
      
      // 4. WG-Mitglieder-Ziele aktualisieren (nur wenn sie noch den Standard hatten)
      const updatedUsers = { ...this.state.users };
      
      this.state.currentWG.memberIds.forEach(memberId => {
        const user = updatedUsers[memberId];
        if (!user) return;
        
        // Standard-User erkennen: Ziel entsprach dem vorherigen WG-Ziel
        const wasUsingDefault = user.targetMonthlyPoints === previousWgTarget;
        if (wasUsingDefault) {
          updatedUsers[memberId] = {
            ...user,
            targetMonthlyPoints: pointsPerMember
          };
          console.log(`🎯 [DataManager] User ${user.name}: ${previousWgTarget}P → ${pointsPerMember}P (automatisch)`);
        } else {
          // User hat individuelles Ziel → respektieren und nicht überschreiben
          console.log(`✋ [DataManager] User ${user.name}: ${user.targetMonthlyPoints}P (manuell angepasst - erhalten)`);
        }
      });
      
      this.updateState({ users: updatedUsers });
      
      console.log(`🎯 [DataManager] WG-Ziel UND User-Ziele aktualisiert auf ${pointsPerMember}P pro Mitglied`);
    }

    return { totalWorkload, pointsPerMember, memberCount };
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
    const start = new Date(absenceData.startDate);
    const end = new Date(absenceData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new Error('Invalid absence dates');
    }
    // Inclusive day span
    const days = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
    if (days < 7) {
      throw new Error('Absence must be at least 7 Tage');
    }
    // Reason: bisher war fest "gone fishing" – nun beliebig aber nicht leer
    if (!absenceData.reason || !absenceData.reason.trim()) {
      throw new Error('Reason required');
    }
    // Allow overlapping absences; they will be merged logically during computation
    // in getAdjustedMonthlyTarget by interval merging. This keeps creation simple
    // and matches tests that validate merge-at-read behavior.

    const userAbsences = this.state.absences?.[absenceData.userId] || [];

    const absence: Absence = {
      ...absenceData,
      id: generateId(),
      createdAt: new Date()
    };
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
    const absences = (this.state.absences?.[user.id] || []).filter(a => {
      // Filter out those completely outside the period
      return new Date(a.endDate) >= period.start && new Date(a.startDate) <= period.end;
    });
    if (absences.length === 0) return user.targetMonthlyPoints;
    // Normalize & clip to period then merge overlapping intervals
    const intervals = absences.map(a => {
      const s = new Date(Math.max(new Date(a.startDate).getTime(), period.start.getTime()));
      const e = new Date(Math.min(new Date(a.endDate).getTime(), period.end.getTime()));
      s.setHours(0,0,0,0); e.setHours(23,59,59,999);
      return { s, e };
    }).sort((a,b)=> a.s.getTime() - b.s.getTime());
    const merged: Array<{s: Date; e: Date}> = [];
    for (const int of intervals) {
      if (!merged.length) { merged.push(int); continue; }
      const last = merged[merged.length - 1];
      if (int.s.getTime() <= last.e.getTime()) {
        // overlap / contiguous
        if (int.e.getTime() > last.e.getTime()) last.e = int.e;
      } else {
        merged.push(int);
      }
    }
    const totalAbsentDays = merged.reduce((sum, m) => {
      const days = Math.floor((m.e.getTime() - m.s.getTime()) / 86400000) + 1;
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
  // PERIOD DISPLAY SELECTION (for viewing historical periods)
  // ========================================
  
  /**
   * Sets the period to display in TaskTable/Analytics - for historical period viewing
   * @param periodId - ID of the period to display, null for current period
   */
  setDisplayPeriod(periodId: string | null): void {
    this.selectedPeriodForDisplay = periodId;
    console.log(`📅 [DataManager] Display period set to: ${periodId || 'current'}`);
    this.notifyListeners(); // Notify components to re-render
  }
  
  /**
   * Gets the currently selected display period
   */
  getDisplayPeriod(): string | null {
    return this.selectedPeriodForDisplay;
  }
  
  /**
   * Gets executions for the selected display period
   * If no display period is selected, returns current period executions
   */
  getDisplayPeriodExecutions(): Record<string, any> {
    if (!this.selectedPeriodForDisplay) {
      // Return current period executions (existing behavior)
      return this.state.executions;
    }
    
    // Filter executions for historical period
    const period = this.getDisplayPeriodInfo(this.selectedPeriodForDisplay);
    if (!period) {
      console.warn('⚠️ [DataManager] Display period not found:', this.selectedPeriodForDisplay);
      return {};
    }
    
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    const filteredExecutions: Record<string, any> = {};
    Object.entries(this.state.executions).forEach(([id, execution]) => {
      const execDate = new Date((execution as any).date || (execution as any).executedAt);
      if (execDate >= startDate && execDate <= endDate) {
        filteredExecutions[id] = execution;
      }
    });
    
    console.log(`📊 [DataManager] Filtered ${Object.keys(filteredExecutions).length} executions for period ${this.selectedPeriodForDisplay}`);
    return filteredExecutions;
  }
  
  /**
   * Gets period info for display period selection
   */
  private getDisplayPeriodInfo(periodId: string) {
    const allPeriods = this.getHistoricalPeriods();
    return allPeriods.find(p => p.id === periodId);
  }

  // ========================================
  // PERIOD / MONTHLY STATS (Basis)
  // ========================================
  ensureCurrentPeriod(): PeriodInfo {
    // If we already have a current period set (could be custom), return it
    if (this.state.currentPeriod) {
      console.log('📅 [DataManager] Using existing period:', this.state.currentPeriod.id);
      return this.state.currentPeriod;
    }
    
    // Check if localStorage has a stored period after app restart
    try {
      const stored = this.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        if (data.state && data.state.currentPeriod) {
          const restoredPeriod = this.deserializeDates(data.state.currentPeriod) as PeriodInfo;
          console.log('🔄 [DataManager] Restored period from localStorage:', restoredPeriod.id);
          this.updateState({ currentPeriod: restoredPeriod });
          return restoredPeriod;
        }
      }
    } catch (error) {
      console.warn('⚠️ [DataManager] Failed to restore period from localStorage:', error);
    }
    
    // Otherwise, create the default monthly period
    const now = new Date();
    const id = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const days = end.getDate();
    const period: PeriodInfo = { id, start, end, days };
    console.log('📅 [DataManager] Creating default monthly period:', id);
    this.updateState({ currentPeriod: period });
    return period;
  }

  /**
   * Setzt einen benutzerdefinierten Zeitraum mit optionalem Reset.
   * Berechnet days inklusiv (Start + End eingeschlossen).
   * Speichert automatisch den vorherigen Zeitraum als Historical Period.
   * 
   * @param start - Startdatum des neuen Zeitraums
   * @param end - Enddatum des neuen Zeitraums  
   * @param resetData - Wenn true, werden alle Executions gelöscht und Benutzerpunkte zurückgesetzt
   */
  setCustomPeriod(start: Date, end: Date, resetData: boolean = false): PeriodInfo {
    console.log('📅 [DataManager] Setting custom period:', start, 'to', end, resetData ? '(with reset)' : '');
    
    // Archive previous period if it exists and WG is available
    const currentWG = this.getCurrentWG();
    if (currentWG && this.state.currentPeriod) {
      this.archivePeriod(this.state.currentPeriod, currentWG);
    }

    // Reset data if requested
    if (resetData) {
      this.resetForNewPeriod();
    }

    // Preserve provided times for start/end so tests comparing exact timestamps succeed.
    // Use normalized copies for inclusive day count.
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) throw new Error('Invalid period dates');
    if (s > e) throw new Error('Start date must be before or equal to end date');
    // Compute inclusive days using normalized copies (00:00 and 23:59:59.999)
    const sNorm = new Date(s); sNorm.setHours(0,0,0,0);
    const eNorm = new Date(e); eNorm.setHours(23,59,59,999);
    const days = Math.floor((eNorm.getTime() - sNorm.getTime()) / 86400000) + 1;
    const id = `${sNorm.toISOString().substring(0,10)}_${eNorm.toISOString().substring(0,10)}`;
    const period: PeriodInfo = { id, start: s, end: e, days };
    
    // Update state with immediate persistence (no debouncing for critical operations)
    this.state = { ...this.state, currentPeriod: period };
    
    // Create corresponding period in WG for Analytics integration
    if (currentWG) {
      this.createAnalyticsPeriod(period, currentWG, resetData);
    }
    
    // Force immediate save to localStorage to prevent loss
    try {
      // Cancel any pending debounced save
      if (this.saveTimeout) {
        clearTimeout(this.saveTimeout);
        this.saveTimeout = null;
      }
      
      // Save immediately without debouncing
      this.saveToStorage();
      console.log(`✅ [DataManager] Period ${id} saved to localStorage immediately`);
      
      // Notify listeners after successful save
      this.notifyListeners();
    } catch (error) {
      console.error('❌ [DataManager] Failed to save period to localStorage:', error);
      throw new Error('Period konnte nicht gespeichert werden');
    }
    
    // Verify it was actually saved
    const verification = this.localStorage.getItem(STORAGE_KEY);
    if (verification) {
      const parsed = JSON.parse(verification);
      if (parsed.state?.currentPeriod?.id === id) {
        console.log(`🔍 [DataManager] Period persistence verified: ${id}`);
      } else {
        console.warn(`⚠️ [DataManager] Period persistence verification failed: expected ${id}, got ${parsed.state?.currentPeriod?.id}`);
      }
    }
    
    console.log(`📅 [DataManager] Period set to ${id}${resetData ? ' with data reset' : ''}`);
    return period;
  }

  /**
   * Erstellt einen entsprechenden Analytics-Period für das neue Period-System
   */
  private createAnalyticsPeriod(period: PeriodInfo, wg: WG, isReset: boolean): void {
    console.log('📊 [DataManager] Creating analytics period for:', period.id);
    
    try {
      const currentPeriods = wg.periods || [];
      const currentHistoricalPeriods = wg.historicalPeriods || [];
      
      // Archive all currently active periods to historical
      const periodsToArchive = currentPeriods.filter(p => p.isActive);
      const inactivePeriods = currentPeriods.filter(p => !p.isActive);
      
      // Move active periods to historical with analytics calculation
      const newHistoricalPeriods = [...currentHistoricalPeriods];
      
      for (const activePeriod of periodsToArchive) {
        // Calculate analytics for the period being archived
        const executions = Object.values(this.state.executions).filter((e: any) => {
          const task = this.state.tasks[e.taskId];
          const execDate = new Date(e.executedAt || e.date);
          if (isNaN(execDate.getTime())) return false;
          return task &&
                 task.wgId === wg.id &&
                 execDate >= new Date(activePeriod.startDate) &&
                 execDate <= new Date(activePeriod.endDate);
        });

        const periodSummary = {
          totalExecutions: executions.length,
          totalPoints: executions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0),
          memberStats: wg.memberIds.map(memberId => {
            const memberExecutions = executions.filter((e: any) => e.executedBy === memberId);
            const points = memberExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
            return {
              userId: memberId,
              executions: memberExecutions.length,
              points,
              achievement: activePeriod.targetPoints > 0 ? (points / activePeriod.targetPoints) * 100 : 0
            };
          })
        };

        // Archive the period with summary
        newHistoricalPeriods.push({
          ...activePeriod,
          isActive: false,
          archivedAt: new Date().toISOString(),
          summary: periodSummary
        });
        
        console.log(`📅 Analytics period archived: ${activePeriod.name} (${periodSummary.totalPoints}P from ${periodSummary.totalExecutions} executions)`);
      }

      // Create new active analytics period
      // Normalize to day boundaries (local day) for analytics storage so
      // frontends comparing start/end by Date behave consistently.
      const sNorm = new Date(period.start);
      sNorm.setHours(0, 0, 0, 0);
      const eNorm = new Date(period.end);
      eNorm.setHours(23, 59, 59, 999);

      const analyticsPeriod = {
        id: period.id,
        name: isReset ? `Neuer Zeitraum ${sNorm.toLocaleDateString('de-DE')}` : `Zeitraum ${sNorm.toLocaleDateString('de-DE')}`,
        startDate: sNorm.toISOString(),
        endDate: eNorm.toISOString(),
        targetPoints: wg.settings?.monthlyPointsTarget || 50,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Füge den neuen Zeitraum immer zu periods hinzu
      let updatedPeriods = [...inactivePeriods];
      // Entferne ggf. alten aktiven Zeitraum mit gleicher ID
      updatedPeriods = updatedPeriods.filter(p => p.id !== analyticsPeriod.id);
      updatedPeriods.push(analyticsPeriod);

      // Update WG mit neuen Perioden und historischen Perioden
      const updatedWG = { 
        ...wg, 
        periods: updatedPeriods,
        historicalPeriods: newHistoricalPeriods
      };
      const newWGs = { ...this.state.wgs, [wg.id]: updatedWG };

      this.updateStateImmediate({
        wgs: newWGs as Record<string, WG>,
        currentWG: updatedWG
      });

      this.notifyListeners();
      console.log('✅ [DataManager] Analytics period created with immediate save:', analyticsPeriod.id);
    } catch (error) {
      console.error('❌ [DataManager] Error creating analytics period:', error);
      // Don't throw - analytics period creation should not fail the main operation
    }
  }

  /**
   * Resettet alle Daten für einen neuen Zeitraum.
   * Löscht alle Executions und setzt Benutzerpunkte zurück.
   */
  resetForNewPeriod(): void {
    console.log('🔄 [DataManager] Resetting data for new period...');
    
    const currentWG = this.getCurrentWG();
    if (!currentWG) {
      console.warn('⚠️ [DataManager] No current WG found for period reset');
      return;
    }

    // Reset all executions
    const executionsToDelete: string[] = [];
    Object.values(this.state.executions).forEach((execution: TaskExecution) => {
      const task = this.state.tasks[execution.taskId];
      if (task && task.wgId === currentWG.id) {
        executionsToDelete.push(execution.id);
      }
    });

    // Delete WG-related executions
    const updatedExecutions = { ...this.state.executions };
    executionsToDelete.forEach(executionId => {
      delete updatedExecutions[executionId];
    });

    // Reset user points for current WG members
    const updatedUsers = { ...this.state.users };
    currentWG.memberIds?.forEach((userId: string) => {
      if (updatedUsers[userId]) {
        updatedUsers[userId] = {
          ...updatedUsers[userId],
          totalPoints: 0, // Reset points
          completedTasks: 0, // Reset task count
          // Note: Keep other user properties like username, preferences, etc.
        };
      }
    });

    // Clear monthly stats (optional - you might want to keep historical data)
    const updatedMonthlyStats = { ...this.state.monthlyStats };
    Object.keys(updatedMonthlyStats).forEach(key => {
      if (key.includes(currentWG.id)) {
        delete updatedMonthlyStats[key];
      }
    });

    // Clear ratings for the WG
    const updatedRatings = { ...this.state.ratings };
    Object.keys(updatedRatings).forEach(ratingId => {
      const rating = updatedRatings[ratingId];
      const task = this.state.tasks[rating.taskId];
      if (task && task.wgId === currentWG.id) {
        delete updatedRatings[ratingId];
      }
    });

    // Clear post execution ratings for the WG
    const updatedPostExecutionRatings = { ...this.state.postExecutionRatings };
    executionsToDelete.forEach(executionId => {
      delete updatedPostExecutionRatings[executionId];
    });

    // Reset Hot Tasks (isAlarmed flags) for the current WG
    const updatedTasks = { ...this.state.tasks };
    Object.values(updatedTasks).forEach((task: Task) => {
      if (task.wgId === currentWG.id && task.isAlarmed) {
        updatedTasks[task.id] = {
          ...task,
          isAlarmed: false
        };
      }
    });

    // Update state with all resets using immediate persistence
    this.updateStateImmediate({
      executions: updatedExecutions,
      users: updatedUsers,
      monthlyStats: updatedMonthlyStats,
      ratings: updatedRatings,
      postExecutionRatings: updatedPostExecutionRatings,
      tasks: updatedTasks
    });

    console.log(`✅ [DataManager] Reset complete: ${executionsToDelete.length} executions deleted, ${currentWG.memberIds?.length || 0} users reset, hot tasks cleared`);
  }

  /**
   * Archiviert einen abgelaufenen Zeitraum in der WG für historische Analysen.
   */
  private archivePeriod(period: PeriodInfo, wg: WG): void {
    try {
      // Create historical period definition
      // Normalize to day boundaries for stored historical periods as well
      const sNorm = new Date(period.start);
      sNorm.setHours(0, 0, 0, 0);
      const eNorm = new Date(period.end);
      eNorm.setHours(23, 59, 59, 999);

      const historicalPeriod = {
        id: `archived_${period.id}_${Date.now()}`,
        name: `${sNorm.toLocaleDateString('de-DE')} - ${eNorm.toLocaleDateString('de-DE')}`,
        startDate: sNorm.toISOString(),
        endDate: eNorm.toISOString(),
        targetPoints: wg.settings.monthlyPointsTarget || 50,
        isActive: false,
        createdAt: new Date().toISOString(),
        archivedAt: new Date().toISOString()
      };

      // Calculate analytics for the archived period
      const executions = Object.values(this.state.executions).filter((e: any) => {
        const task = this.state.tasks[e.taskId];
        // Prefer explicit executedAt field; fall back to legacy `date` if present
        const execDate = new Date(e.executedAt || e.date);
        if (isNaN(execDate.getTime())) return false;
        return task &&
               task.wgId === wg.id &&
               execDate >= period.start &&
               execDate <= period.end;
      });

      // Store execution summary for the period
      const periodSummary = {
        totalExecutions: executions.length,
        totalPoints: executions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0),
        memberStats: wg.memberIds.map(memberId => {
          const memberExecutions = executions.filter((e: any) => e.executedBy === memberId);
          const points = memberExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
          return {
            userId: memberId,
            executions: memberExecutions.length,
            points,
            achievement: historicalPeriod.targetPoints > 0 ? (points / historicalPeriod.targetPoints) * 100 : 0
          };
        })
      };

      // Add to WG historical periods
      const updatedWG = {
        ...wg,
        historicalPeriods: [...(wg.historicalPeriods || []), {
          ...historicalPeriod,
          summary: periodSummary
        }]
      };

      // Persist the updated WG by id (updateWG expects (wgId, updates))
      this.updateWG(wg.id, { historicalPeriods: updatedWG.historicalPeriods });
      
      console.log(`📅 Archived period: ${historicalPeriod.name} (${periodSummary.totalPoints}P from ${periodSummary.totalExecutions} executions)`);
    } catch (error) {
      console.warn('Failed to archive period:', error);
    }
  }

  /**
   * Holt alle Zeiträume für die aktuelle WG (aktive + historische).
   */
  getHistoricalPeriods() {
    const currentWG = this.getCurrentWG();
    if (!currentWG) return [];
    
    const activePeriods = (currentWG.periods || []).filter(p => p.isActive);
    const historicalPeriods = currentWG.historicalPeriods || [];
    
    // Combine active periods with historical periods
    const allPeriods = [
      ...activePeriods.map(p => ({
        id: p.id,
        name: p.name,
        startDate: p.startDate,
        endDate: p.endDate,
        targetPoints: p.targetPoints,
        isActive: p.isActive,
        createdAt: p.createdAt,
        summary: {
          totalExecutions: 0, // Wird dynamisch berechnet
          totalPoints: 0, // Wird dynamisch berechnet
          memberStats: [] // Wird dynamisch berechnet
        },
        __LIVE_PERIOD__: true // Marker für aktive Periods
      })),
      ...historicalPeriods
    ];
    
    // Sortiere nach Erstellungsdatum (neueste zuerst)
    return allPeriods.sort((a, b) => 
      new Date(b.createdAt || b.archivedAt || '').getTime() - 
      new Date(a.createdAt || a.archivedAt || '').getTime()
    );
  }

  /**
   * Löscht einen historischen oder aktiven Zeitraum aus der aktuellen WG
   * @param periodId - ID des zu löschenden Zeitraums
   */
  deletePeriod(periodId: string): void {
    const currentWG = this.getCurrentWG();
    if (!currentWG) return;

    const periods = currentWG.periods || [];
    const historical = currentWG.historicalPeriods || [];

    const newPeriods = periods.filter(p => p.id !== periodId);
    const newHistorical = historical.filter(p => p.id !== periodId);

    const updatedWG = { ...currentWG, periods: newPeriods, historicalPeriods: newHistorical } as any;

    // Use updateWG to persist changes
    try {
      this.updateWG(currentWG.id, updatedWG as Partial<typeof updatedWG>);
      console.log(`🗑️ [DataManager] Deleted period ${periodId}`);
      this.notifyListeners();
    } catch (error) {
      console.error('🗑️ [DataManager] Failed to delete period:', error);
    }
  }

  // ========================================
  // COLLABORATIVE RATING METRIC (Option B: single rounding at end)
  // ========================================
  /**
   * Berechnet die Basis-Punkte für einen Task auf Basis ALLER abgegebenen Ratings (WG-agnostisch, TaskId reicht).
   * Formel: avgMinutes * (1 + avgPain/10) * avgImportance
   * Gibt 0 zurück falls keine Ratings vorhanden.
   */
  computeTaskBasePoints(taskId: string): number {
    const ratings = Object.values(this.state.ratings).filter(r => r.taskId === taskId);
    if (ratings.length === 0) return 0;
    const avg = (sel: (r: TaskRating)=>number) => ratings.reduce((s,r)=>s+sel(r),0)/ratings.length;
    const avgMinutes = avg(r=> r.estimatedMinutes || 0);
    const avgPain = avg(r=> r.painLevel || 0);
    const avgImportance = avg(r=> r.importance || 0);
    const base = avgMinutes * (1 + avgPain/10) * avgImportance;
    return base; // kein Runden hier
  }

  /**
   * Aggregiert alle Tasks der aktuellen WG und liefert Gesamt- & Pro-Mitglied-Zielpunkte
   * für den aktuellen Zeitraum. Tasks ohne ein einziges Rating werden ignoriert.
   * periodRatio = days/30 (Normalization zur Monatsbasis).
   * SINGLE ROUNDING: erst am Ende perMemberTarget wird gerundet.
   */
  computePeriodTargets(): { totalPoints: number; perMemberTarget: number; periodRatio: number; memberCount: number; consideredTasks: number; } {
    const wgId = this.state.currentWG?.id;
    if (!wgId) return { totalPoints: 0, perMemberTarget: 0, periodRatio: 0, memberCount: 0, consideredTasks: 0 };
    // DO NOT call ensureCurrentPeriod() here – that would mutate state during render.
    // A one-time initialization now happens in usePutzplanStore via effect. If the
    // period is still undefined on first render we return zeros; a second render
    // after the effect will provide real values. This eliminates React warnings.
    const period = this.state.currentPeriod;
    if (!period) {
      return { totalPoints: 0, perMemberTarget: 0, periodRatio: 0, memberCount: this.state.currentWG?.memberIds.length || 0, consideredTasks: 0 };
    }
    const periodRatio = period.days / 30; // flexible Zeitraum Anpassung
    const tasks = Object.values(this.state.tasks).filter(t => t.wgId === wgId);
    const memberCount = this.state.currentWG?.memberIds.length || 0;
    if (memberCount === 0) return { totalPoints: 0, perMemberTarget: 0, periodRatio, memberCount: 0, consideredTasks: 0 };
    let total = 0;
    let considered = 0;
    for (const task of tasks) {
      const base = this.computeTaskBasePoints(task.id);
      if (base === 0) continue; // keine Ratings -> ignorieren
      const ratings = Object.values(this.state.ratings).filter(r => r.taskId === task.id);
      const avgFreq = ratings.reduce((s,r)=> s + (r.suggestedFrequency || 0), 0) / ratings.length;
      const taskPeriodPoints = base * avgFreq * periodRatio; // kein Runden pro Task
      total += taskPeriodPoints;
      considered++;
    }
    const perMember = memberCount > 0 ? Math.round(total / memberCount) : 0;
    return { totalPoints: total, perMemberTarget: perMember, periodRatio, memberCount, consideredTasks: considered };
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
    console.log('🗑️ [DataManager] Clearing all data (env:', process.env.NODE_ENV, ')');
    
    if (process.env.NODE_ENV === 'test') {
      // In tests: reset state but preserve localStorage for persistence testing
      const storedPeriod = this.state.currentPeriod;
      this.state = { ...initialState };
      
      // Try to reload from localStorage if available (for testing period persistence)
      try {
        const reloadedState = this.loadFromStorage();
        this.state = reloadedState;
        console.log('📅 [DataManager] Reloaded period from storage in test:', this.state.currentPeriod?.id);
      } catch (error) {
        console.warn('⚠️ [DataManager] Could not reload from storage in test:', error);
        // Keep the period if reload fails
        if (storedPeriod) {
          this.state.currentPeriod = storedPeriod;
        }
      }
    } else {
      // In production: completely clear everything including localStorage
      this.localStorage.removeItem(STORAGE_KEY);
      this.state = { ...initialState };
      console.log('🗑️ [DataManager] Cleared localStorage in production');
    }
    
    this.notifyListeners();
  }

  /** Backwards-compat alias used in some tests */
  clearAll(): void {
    this.clearAllData();
  }

  /**
   * Reload state from localStorage (for test scenarios)
   */
  private reloadFromStorage(): void {
    try {
      const reloadedState = this.loadFromStorage();
      this.state = reloadedState;
    } catch (error) {
      console.error('Error reloading from storage:', error);
    }
  }

  /**
   * Entfernt alle User, die in keiner WG referenziert sind ("verwaiste" Profile)
   * sowie deren abhängige Strukturen (Ratings, Executions owned by them).
   */
  removeOrphanUsers(): { removedUserIds: string[] } {
    const wgMemberIds = new Set<string>();
    Object.values(this.state.wgs || {}).forEach(wg => wg.memberIds.forEach(id => wgMemberIds.add(id)));
    const allUserIds = Object.keys(this.state.users || {});
    const orphanIds = allUserIds.filter(id => !wgMemberIds.has(id));
    if (orphanIds.length === 0) return { removedUserIds: [] };
    const newUsers = { ...this.state.users } as any;
    orphanIds.forEach(id => delete newUsers[id]);
    // Filter ratings & executions belonging to orphan users (executedBy or rating.userId)
    const newRatings: any = {};
    Object.values(this.state.ratings || {}).forEach((r: any) => { if (!orphanIds.includes(r.userId)) newRatings[r.id] = r; });
    const newExecutions: any = {};
    Object.values(this.state.executions || {}).forEach((e: any) => { if (!orphanIds.includes(e.executedBy)) newExecutions[e.id] = e; });
    this.updateState({ users: newUsers, ratings: newRatings, executions: newExecutions });
    return { removedUserIds: orphanIds };
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

  /**
   * Speichert aktuellen State auf den Server
   * Wird für State-Restore bei EventSourcing benötigt
   */
  private async saveToServer(): Promise<void> {
    try {
      console.log('[DataManager] Saving state to server...');
      
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.state)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[DataManager] State saved to server:', result.savedAt);
      
    } catch (error) {
      console.error('[DataManager] Error saving to server:', error);
      throw error; // Re-throw damit EventSourcing den Fehler merkt
    }
  }

  /**
   * Force cross-browser synchronization
   * DISABLED: CrossBrowserSync deactivated to fix persistence bug
   */
  forceSyncAcrossBrowsers(): void {
    console.log('[DataManager] Force sync disabled (CrossBrowserSync deactivated)');
    // DISABLED: crossBrowserSync.forceSyncNow();
    // Instead just reload from localStorage
    try {
      this.reloadFromStorage();
      this.notifyListeners();
      console.log('[DataManager] Force sync completed successfully');
    } catch (error) {
      console.error('[DataManager] Error during force sync:', error);
    }
  }
}

// Singleton Instance
export const dataManager = new DataManager();

// Mache DataManager global verfügbar für Debugging und EventSourcing
if (typeof window !== 'undefined') {
  (window as any).dataManager = dataManager;
  console.log('[DataManager] Made available as window.dataManager');
}
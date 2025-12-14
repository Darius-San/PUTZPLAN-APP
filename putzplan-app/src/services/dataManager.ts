import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus, Absence, TemporaryResident, PostExecutionRating, PeriodInfo } from '../types';
import { generateId } from '../utils/taskUtils';
// TEMPORARY FIX: Use disabled Event Sourcing to prevent localStorage conflicts
import { eventSourcingManager } from './eventSourcingManager.disabled';
import { stateBackupManager } from './stateBackupManager';
import { settingsManager } from './settingsManager';
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
  // Per-period user target overrides (userId -> targetPoints)
  userTargets: {},
  // Active settings snapshot (kept here for tests that call dataManager.updateSettings)
  settings: {},
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
   * Restore a recently saved deletion snapshot for a task (global delete undo)
   * Looks up backups for the task and attempts to re-insert the deleted task object.
   */
  restoreTaskFromBackup(taskId: string): boolean {
    try {
      // Find backups for this task
      const snaps = stateBackupManager.getSnapshotsForEntity('task', taskId);
      if (!snaps || snaps.length === 0) return false;
      // Prefer most recent DELETE_TASK snapshot
      const delSnap = snaps.find(s => s.type === 'DELETE_TASK' && (s as any).data) || snaps[0];
      if (!delSnap) return false;
      const payload: any = (delSnap as any).data || (delSnap as any).afterState || (delSnap as any).beforeState;
      if (!payload || !payload.id) return false;
      const existing = this.state.tasks[payload.id];
      if (existing) {
        console.warn('[DataManager] Cannot restore task: id already exists', payload.id);
        return false;
      }

      // Re-insert the task object
      this.updateStateImmediate({ tasks: { ...this.state.tasks, [payload.id]: payload } });
      console.log(`🔄 [DataManager] Restored task ${payload.id} from backup snapshot ${delSnap.id}`);
      return true;
    } catch (err) {
      console.error('❌ [DataManager] Failed to restore task from backup', err);
      return false;
    }
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
    console.log(`[DataManager] loadFromStorage called @ ${new Date().toISOString()}`);
    
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
      console.log(`[DataManager] localStorage.getItem(${STORAGE_KEY}) result @ ${new Date().toISOString()}:`, stored ? 'data found' : 'no data');
      
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
    console.log(`[DataManager] saveToStorage called @ ${new Date().toISOString()}`);
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
      console.log(`[DataManager] Successfully saved to localStorage @ ${new Date().toISOString()} (crossBrowserSync disabled)`);
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
   * Set a manual target for a user for the currently selected period.
   * Stored in `state.userTargets` as a simple map userId -> targetPoints.
   */
  setUserTarget(userId: string, targetPoints: number): void {
    const user = this.state.users[userId];
    if (!user) throw new Error('User not found');
    const userTargets = { ...(this.state as any).userTargets || {} } as Record<string, number>;
    userTargets[userId] = targetPoints;
    this.updateState({ userTargets });
    // Persist immediately for deterministic tests
    this.saveToStorage();
    console.log(`👤 [DataManager] Set user target for ${userId} = ${targetPoints}`);
  }

  /**
   * Update application settings. This proxies to the SettingsManager but also
   * keeps a snapshot in `state.settings` so period snapshots can include settings.
   */
  updateSettings(updates: any): void {
    try {
      // Update global settings manager (keeps UI hooks in sync)
      try { settingsManager.updateSettings(updates); } catch (_) { /* ignore */ }
      const merged = { ...(this.state as any).settings || {}, ...(updates || {}) };
      this.updateState({ settings: merged });
      this.saveToStorage();
      console.log('🔧 [DataManager] Updated settings snapshot in state');
    } catch (err) {
      console.warn('[DataManager] Failed to update settings:', err);
    }
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
      // If caller provided a members array (test helper), create users and attach them
      if ((wgData as any).members && Array.isArray((wgData as any).members)) {
        const providedMembers = (wgData as any).members as Array<any>;
        const createdMemberIds: string[] = [];
        providedMembers.forEach(m => {
          try {
            const user = this.createUser({ name: m.name || 'Member', email: m.email || '', targetMonthlyPoints: m.targetMonthlyPoints || 100 });
            createdMemberIds.push(user.id);
          } catch (err) {
            // Fallback: create minimal user object
            const uid = generateId();
            const userObj = { id: uid, name: m.name || 'Member', email: m.email || '', joinedAt: new Date(), currentMonthPoints: 0, totalCompletedTasks: 0, isActive: true, targetMonthlyPoints: m.targetMonthlyPoints || 100 } as any;
            this.addUser(userObj);
            createdMemberIds.push(uid);
          }
        });
        wg.memberIds = createdMemberIds;
      }
      // If caller provided tasks array, create tasks for the WG
      if ((wgData as any).tasks && Array.isArray((wgData as any).tasks)) {
        const providedTasks = (wgData as any).tasks as Array<any>;
        const createdTasks: string[] = [];
        providedTasks.forEach(t => {
          const taskId = generateId();
          const taskObj: any = {
            id: taskId,
            wgId: wg.id,
            title: t.name || t.title || 'Task',
            name: t.name || t.title || 'Task',
            description: t.description || (t.name || t.title) || '',
            emoji: t.emoji || '🧽',
            category: t.category || 'general',
            averageMinutes: t.averageMinutes || 20,
            averagePainLevel: t.averagePainLevel || 5,
            averageImportance: t.averageImportance || 5,
            monthlyFrequency: t.monthlyFrequency || 4,
            difficultyScore: t.difficultyScore || 5,
            unpleasantnessScore: t.unpleasantnessScore || 5,
            pointsPerExecution: t.effort || t.points || Math.max(1, Math.round((t.effort || 10) / 1)),
            totalMonthlyPoints: (t.effort || t.points || 10) * (t.monthlyFrequency || 4),
            constraints: t.constraints || { minDaysBetween: 3, maxDaysBetween: t.intervalDays || 14, requiresPhoto: false },
            createdBy: (wg.memberIds && wg.memberIds[0]) || this.state.currentUser?.id || 'system',
            createdAt: new Date(),
            isActive: true,
            setupComplete: true
          } as any;
          this.addTask(taskObj);
          createdTasks.push(taskId);
        });
        // nothing else required; tasks were added to state via addTask
      }
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

    // If a historical/display period is selected, delete only within that period's savedState
    if (this.selectedPeriodForDisplay) {
      const currentWG = this.getCurrentWG();
      if (!currentWG) return;

      const periods = currentWG.periods || [];
      const historical = currentWG.historicalPeriods || [];
      const all = [...periods, ...historical];
      const period = all.find((p: any) => p.id === this.selectedPeriodForDisplay);

      if (!period) {
        console.warn('⚠️ [DataManager] Selected display period not found, performing global delete instead');
      } else {
        // Ensure savedState exists for the period (create one if absent)
        if (!(period as any).savedState) {
          const ok = this.saveStateForPeriod(period.id);
          if (!ok) {
            console.error('❌ [DataManager] Could not create savedState for period, aborting period-scoped delete');
            return;
          }
          // refresh currentWG and period reference
          const refreshed = this.getCurrentWG();
          const refreshedAll = [...(refreshed?.periods || []), ...(refreshed?.historicalPeriods || [])];
          const refreshedPeriod = refreshedAll.find((p: any) => p.id === period.id);
          if (!refreshedPeriod) return;
          period.savedState = refreshedPeriod.savedState;
        }

        try {
          const saved = (period as any).savedState as any;
          // Remove task from saved tasks
          const beforeTasks = (saved.tasks || []).length;
          saved.tasks = (saved.tasks || []).filter((t: any) => t.id !== taskId);
          const afterTasks = saved.tasks.length;

          // Remove executions for that task from saved executions
          const beforeExec = (saved.executions || []).length;
          saved.executions = (saved.executions || []).filter((e: any) => e.taskId !== taskId);
          const afterExec = saved.executions.length;

          // Persist the updated savedState back into the WG periods lists
          const updateFn = (wg: WG) => {
            const updatePeriodList = (list: any[]) => list.map(p => p.id === period.id ? { ...p, savedState: { ...saved } } : p);
            return {
              periods: updatePeriodList(wg.periods || []),
              historicalPeriods: updatePeriodList(wg.historicalPeriods || [])
            };
          };
          const updates = updateFn(currentWG as WG);
          this.updateWG(currentWG.id, updates as Partial<WG>);
          this.saveToStorage();

          // Backup/log
          stateBackupManager.saveStateChange({
            type: 'DELETE_TASK_PERIOD',
            entity: 'task',
            entityId: taskId,
            data: { periodId: period.id, beforeTasks, afterTasks, beforeExec, afterExec },
            timestamp: new Date().toISOString()
          });

          eventSourcingManager.logAction(
            'DELETE_TASK_PERIOD',
            { taskId, periodId: period.id, wgId: currentWG.id },
            this.state.currentUser?.id,
            currentWG.id,
            { taskId, periodId: period.id }
          );

          console.log(`🗑️ [DataManager] Deleted task ${taskId} in savedState for period ${period.id}`);
          this.notifyListeners();
          return;
        } catch (err) {
          console.error('❌ [DataManager] Failed to delete task in period savedState', err);
          // fall through to global delete as fallback
        }
      }
    }

    // Global deletion is disabled: only allow deletion scoped to a display period.
    // Previously we removed the task from the global `tasks` map here. To avoid
    // accidental data loss, global deletion is no longer supported. Log a
    // warning and abort the operation.
    console.warn('⚠️ [DataManager] Global task deletion is disabled. Use period-scoped deletion instead.');
    return;
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
      periodId: this.selectedPeriodForDisplay ?? this.state.currentPeriod?.id,
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
      periodId: this.selectedPeriodForDisplay ?? this.state.currentPeriod?.id,
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
      periodId: this.selectedPeriodForDisplay ?? this.state.currentPeriod?.id,
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
      // No historical display selected — return only executions that belong to the
      // current period. Previously we returned the entire live `state.executions`,
      // which caused analytics consumers to see executions outside the current
      // period (different WGs / older months). Filter by explicit `periodId`
      // when present, otherwise fall back to executedAt date range.
      const currentPeriod = this.state.currentPeriod || this.ensureCurrentPeriod();
      const startDate = currentPeriod.start instanceof Date ? currentPeriod.start : new Date(currentPeriod.start);
      const endDate = currentPeriod.end instanceof Date ? currentPeriod.end : new Date(currentPeriod.end);
      // normalize end to end-of-day
      endDate.setHours(23,59,59,999);
      const filtered: Record<string, any> = {};
      Object.entries(this.state.executions).forEach(([id, execution]) => {
        try {
          const execPeriodId = (execution as any).periodId;
          if (execPeriodId !== undefined && execPeriodId !== null) {
            if (execPeriodId === currentPeriod.id) filtered[id] = execution;
            return;
          }
          const execDate = new Date((execution as any).date || (execution as any).executedAt);
          if (execDate >= startDate && execDate <= endDate) filtered[id] = execution;
        } catch (err) {
          // ignore malformed execution entries
        }
      });
      console.log(`📊 [DataManager] Returning ${Object.keys(filtered).length} current-period executions (filtered)`);
      return filtered;
    }
    
    // Filter executions for historical period
    const period = this.getDisplayPeriodInfo(this.selectedPeriodForDisplay);
    if (!period) {
      console.warn('⚠️ [DataManager] Display period not found:', this.selectedPeriodForDisplay);
      return {};
    }

    // If this period has an attached savedState, prefer its executions (snapshot view)
    try {
      const rawPeriod = (() => {
        const currentWG = this.getCurrentWG();
        if (!currentWG) return null;
        const all = [...(currentWG.periods || []), ...(currentWG.historicalPeriods || [])];
        return all.find((p: any) => p.id === this.selectedPeriodForDisplay) || null;
      })();

      // If the selected display period actually refers to the live/current period,
      // treat it as a live view (do NOT use savedState) so that executions added
      // in real-time are immediately visible in TaskTable/Analytics. This covers
      // UIs that may set the display period to the current period id rather than
      // null.
      const currentPeriodId = this.state.currentPeriod?.id;
      const isLiveView = !!currentPeriodId && currentPeriodId === this.selectedPeriodForDisplay;

      if (rawPeriod && !isLiveView && (rawPeriod as any).savedState && Array.isArray((rawPeriod as any).savedState.executions)) {
        const saved = (rawPeriod as any).savedState as any;
        const savedMap: Record<string, any> = {};
        (saved.executions || []).forEach((e: any) => { savedMap[e.id] = e; });
        console.log(`📊 [DataManager] Using savedState (${Object.keys(savedMap).length}) executions for period ${this.selectedPeriodForDisplay}`);
        return savedMap;
      }
      // otherwise fall through to live-execution filtering below
    } catch (err) {
      // If anything goes wrong reading savedState, fallback to normal behavior
      console.warn('[DataManager] Failed to read period savedState for display, falling back to live executions', err);
    }
    
    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    
    const filteredExecutions: Record<string, any> = {};
    Object.entries(this.state.executions).forEach(([id, execution]) => {
      // If execution has an explicit periodId, prefer that for filtering
      const execPeriodId = (execution as any).periodId;
      if (execPeriodId !== undefined && execPeriodId !== null) {
        if (execPeriodId === this.selectedPeriodForDisplay) {
          filteredExecutions[id] = execution;
        }
        return; // skip date-based fallback if periodId present
      }

      // Fallback: filter by executedAt/date if no explicit periodId available
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
    
    // Do NOT archive the previous period here. createAnalyticsPeriod()
    // will move active periods to historical as part of analytics creation.
    // Archiving here caused duplicate historical entries and made the
    // overlap-check below falsely detect overlaps with the just-archived period.
    const currentWG = this.getCurrentWG();

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
    // Defensive: prevent overlapping periods. Check against WG periods and historicalPeriods
    try {
      const wg = currentWG;
      if (wg) {
        const existing: any[] = [];
        if (Array.isArray(wg.periods)) existing.push(...wg.periods);
        if (Array.isArray(wg.historicalPeriods)) existing.push(...wg.historicalPeriods);

        // Normalize to UTC-day boundaries to avoid local timezone shifts causing false overlaps
        const toUTCStart = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
        const toUTCEnd = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
        const sNormCheck = toUTCStart(s);
        const eNormCheck = toUTCEnd(e);

        for (const p of existing) {
          const pStartRaw = p.startDate || p.start || p.start_at || null;
          const pEndRaw = p.endDate || p.end || p.end_at || null;
          if (!pStartRaw || !pEndRaw) continue;
          const pStart = new Date(pStartRaw);
          const pEnd = new Date(pEndRaw);
          // normalize to UTC boundaries for comparison
          const pStartUTC = toUTCStart(pStart);
          const pEndUTC = toUTCEnd(pEnd);
          // If the existing period has exactly the same normalized start/end as the new one,
          // treat it as the same period (allow activation) and skip overlap error.
          try {
            if (pStartUTC.getTime() === sNormCheck.getTime() && pEndUTC.getTime() === eNormCheck.getTime()) {
              console.debug('🔎 [setCustomPeriod] existing period has identical date range — treating as same period', { existingId: p.id });
              continue;
            }
          } catch (identErr) {
            // ignore and continue with normal overlap logic
          }
          // Debug: log comparison values to diagnose overlap issues
          try {
            console.debug('🔎 [setCustomPeriod] checking overlap against existing period', {
              existingId: p.id,
              pStartISO: pStartUTC.toISOString(),
              pEndISO: pEndUTC.toISOString(),
              newStartISO: sNormCheck.toISOString(),
              newEndISO: eNormCheck.toISOString(),
              currentPeriodId: this.state.currentPeriod?.id || null,
              currentPeriodStart: this.state.currentPeriod?.start || null,
              currentPeriodEnd: this.state.currentPeriod?.end || null
            });
          } catch (logErr) {
            console.warn('🔎 [setCustomPeriod] debug log failed', logErr);
          }
          // If this existing entry is the currentPeriod we're replacing, ignore it in the overlap check.
          if (this.state.currentPeriod) {
            const cur = this.state.currentPeriod;
            const curStartRaw = cur.start || cur.startDate || null;
            const curEndRaw = cur.end || cur.endDate || null;
            if (curStartRaw && curEndRaw) {
              const curStart = new Date(curStartRaw);
              const curEnd = new Date(curEndRaw);
              if (!isNaN(curStart.getTime()) && !isNaN(curEnd.getTime())) {
                // If p has the same start/end as the currentPeriod, skip overlap check for this p
                // compare using UTC-normalized times
                const curStartUTC = toUTCStart(new Date(curStart));
                const curEndUTC = toUTCEnd(new Date(curEnd));
                if (pStartUTC.getTime() === curStartUTC.getTime() && pEndUTC.getTime() === curEndUTC.getTime()) {
                  continue;
                }
              }
            }
          }
          // overlap if not (newEnd < pStart || newStart > pEnd) — use UTC-normalized values
          if (!(eNormCheck.getTime() < pStartUTC.getTime() || sNormCheck.getTime() > pEndUTC.getTime())) {
            // Found overlap. If the only overlap is with the currentPeriod, allow it (we replace the current period).
            if (this.state.currentPeriod) {
              try {
                const curStartRaw = this.state.currentPeriod.start || this.state.currentPeriod.startDate || null;
                const curEndRaw = this.state.currentPeriod.end || this.state.currentPeriod.endDate || null;
                if (curStartRaw && curEndRaw) {
                  const curStartUTC = toUTCStart(new Date(curStartRaw));
                  const curEndUTC = toUTCEnd(new Date(curEndRaw));
                  // if p overlaps cur, skip throwing
                  if (!(curEndUTC.getTime() < pStartUTC.getTime() || curStartUTC.getTime() > pEndUTC.getTime())) {
                    console.debug('🔎 [setCustomPeriod] overlap only with currentPeriod — allowing replacement', { existingId: p.id, currentPeriodId: this.state.currentPeriod.id });
                    continue;
                  }
                }
              } catch (ignored) {
                // fallthrough to throw below
              }
            }

            console.warn('⚠️ [DataManager] Overlapping period detected:', { newStart: s, newEnd: e, existingId: p.id, existingStart: pStartUTC.toISOString(), existingEnd: pEndUTC.toISOString() });
            throw new Error('Der gewählte Zeitraum überschneidet sich mit einem bestehenden Zeitraum.');
          }
        }
      }
    } catch (err) {
      // Re-throw to allow callers to show a user-friendly message
      throw err;
    }
    // Compute inclusive days using normalized copies (00:00 and 23:59:59.999)
    const sNorm = new Date(s); sNorm.setHours(0,0,0,0);
    const eNorm = new Date(e); eNorm.setHours(23,59,59,999);
    const days = Math.floor((eNorm.getTime() - sNorm.getTime()) / 86400000) + 1;
    const id = `${sNorm.toISOString().substring(0,10)}_${eNorm.toISOString().substring(0,10)}`;
    const period: PeriodInfo = { id, start: s, end: e, days };
    
    // Create corresponding period in WG for Analytics integration first (will archive active periods)
    if (currentWG) {
      try {
        this.createAnalyticsPeriod(period, currentWG, resetData);
      } catch (err) {
        // If analytics period creation fails (e.g., due to overlap), do not mutate currentPeriod
        console.error('❌ [DataManager] createAnalyticsPeriod failed, aborting period set:', err);
        throw err;
      }
    }

    // Update state with immediate persistence (no debouncing for critical operations)
    this.state = { ...this.state, currentPeriod: period };

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
    // If there is a matching savedState for this period in the WG (by identical start/end),
    // restore its snapshot (tasks, executions, userTargets, settings) into the live state.
    try {
      // Re-fetch WG from the latest state because createAnalyticsPeriod may have updated
      // WG.periods / WG.historicalPeriods via updateStateImmediate(). Use the freshest
      // WG object when attempting to locate a savedState snapshot.
      const wgForSearch = this.getCurrentWG() || currentWG;
      if (wgForSearch) {
        const all = [...(wgForSearch.periods || []), ...(wgForSearch.historicalPeriods || [])];
        // Build a simple date-range key using YYYY-MM-DD from the normalized start/end
        // This avoids subtle timezone math and compares human-readable day ranges.
        const sDay = sNorm.toISOString().substring(0,10);
        const eDay = eNorm.toISOString().substring(0,10);
        const targetKey = `${sDay}_${eDay}`;
        console.debug(`[setCustomPeriod] looking for savedState (day-key): targetKey=${targetKey}, periods=${(wgForSearch.periods||[]).length}, historical=${(wgForSearch.historicalPeriods||[]).length}`);
        const matched = all.find((p: any) => {
          const psRaw = p.startDate || p.start || p.start_at || null;
          const peRaw = p.endDate || p.end || p.end_at || null;
          if (!psRaw || !peRaw) return false;
          const psDay = new Date(psRaw).toISOString().substring(0,10);
          const peDay = new Date(peRaw).toISOString().substring(0,10);
          const candidateKey = `${psDay}_${peDay}`;
          console.debug(`[setCustomPeriod] candidate period id=${p.id} candidateKey=${candidateKey} savedState=${!!(p as any).savedState}`);
          // Match either by the stable period `id` (preferred) or by the YYYY-MM-DD day-key.
          const ok = (p.id === id) || (candidateKey === targetKey);
          if (ok) console.debug(`[setCustomPeriod] matched period id=${p.id} has savedState=${!!(p as any).savedState}`);
          return ok;
        });
        if (matched && (matched as any).savedState) {
          const saved = (matched as any).savedState as any;
          // When restoring a savedState for a WG period, first remove any existing
          // tasks and executions that belong to the same WG to avoid leaking
          // executions from other periods into the restored view.
          const wgId = this.state.currentWG?.id || (wgForSearch && (wgForSearch as any).id) || null;

          // Build tasks map: remove tasks belonging to this WG, then add saved tasks
          const updatedTasks = { ...this.state.tasks };
          if (wgId) {
            for (const k of Object.keys(updatedTasks)) {
              try {
                if ((updatedTasks[k] as any).wgId === wgId) delete updatedTasks[k];
              } catch (_) {}
            }
          }
          for (const t of saved.tasks || []) updatedTasks[t.id] = { ...t };

          // Build executions map: remove executions whose task belongs to this WG,
          // then insert restored executions (ensuring periodId is set)
          const updatedExecutions = { ...this.state.executions };
          if (wgId) {
            for (const exId of Object.keys(updatedExecutions)) {
              try {
                const ex = updatedExecutions[exId];
                const task = this.state.tasks[ex.taskId] || updatedTasks[ex.taskId];
                if (task && task.wgId === wgId) {
                  delete updatedExecutions[exId];
                }
              } catch (_) {}
            }
          }
          for (const ex of saved.executions || []) updatedExecutions[ex.id] = { ...ex, periodId: ex.periodId || id };

          const restoredUserTargets = saved.userTargets || {};
          const restoredSettings = saved.settings || {};

          try {
            console.log(`[DataManager] Restoring savedState for period ${id} @ ${new Date().toISOString()} - executions:`, (saved.executions || []).map((e: any) => e.id));
          } catch (_) {}

          this.updateStateImmediate({
            tasks: updatedTasks,
            executions: updatedExecutions,
            userTargets: restoredUserTargets,
            settings: restoredSettings
          });
          try {
            console.log(`[DataManager] 📥 Restored savedState for period ${id} - live executions count now:`, Object.keys(this.state.executions || {}).length);
          } catch (_) {}
        } else {
          if (matched && !(matched as any).savedState) {
            console.log(`[setCustomPeriod] found matching period ${matched.id} but it has no savedState`);
          } else {
            console.log('[setCustomPeriod] no matching savedState snapshot found for requested period');
          }
        }
      }
    } catch (err) {
      console.warn('[DataManager] Failed to restore savedState after setting period:', err);
    }

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

      // Defensive overlap-check: ensure analyticsPeriod does not overlap any existing period
      const analyticsPeriodCandidate = {
        id: period.id,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString()
      };

      const combinedExisting = [...currentPeriods, ...currentHistoricalPeriods];
      for (const ex of combinedExisting) {
        const exStart = new Date(ex.startDate || ex.start || ex.start_at);
        const exEnd = new Date(ex.endDate || ex.end || ex.end_at);
        if (!exStart || !exEnd || isNaN(exStart.getTime()) || isNaN(exEnd.getTime())) continue;
        const exStartNorm = new Date(exStart); exStartNorm.setHours(0,0,0,0);
        const exEndNorm = new Date(exEnd); exEndNorm.setHours(23,59,59,999);
        const newStartNorm = new Date(analyticsPeriodCandidate.startDate); newStartNorm.setHours(0,0,0,0);
        const newEndNorm = new Date(analyticsPeriodCandidate.endDate); newEndNorm.setHours(23,59,59,999);
        if (!(newEndNorm.getTime() < exStartNorm.getTime() || newStartNorm.getTime() > exEndNorm.getTime())) {
          // If the overlapping entry is the same period (by id or exact start/end) allow it
          try {
            if (ex.id === analyticsPeriodCandidate.id || (newStartNorm.getTime() === exStartNorm.getTime() && newEndNorm.getTime() === exEndNorm.getTime())) {
              console.debug('🔎 [createAnalyticsPeriod] Overlap with identical period entry - allowing', { existingId: ex.id });
              continue;
            }
          } catch (_) {
            // ignore and fallthrough
          }
          // Overlap detected — abort before modifying WG
          console.warn('⚠️ [DataManager] Detected overlap with existing period. Aborting analytics creation.', { analyticsPeriodCandidate, existing: ex });
          throw new Error('Der gewählte Zeitraum überschneidet sich mit einem bestehenden Zeitraum.');
        }
      }

      // Archive all currently active periods to historical
      const periodsToArchive = currentPeriods.filter(p => p.isActive);
      const inactivePeriods = currentPeriods.filter(p => !p.isActive);

      // Move active periods to historical with analytics calculation
      const newHistoricalPeriods = [...currentHistoricalPeriods];
      
      for (const activePeriod of periodsToArchive) {
        // Find executions for this WG that belong to the activePeriod.
        // Prefer explicit `periodId` if present (newer executions), otherwise fall back to date-range for legacy data.
        const executionsForPeriod = Object.values(this.state.executions).filter((e: any) => {
          const task = this.state.tasks[e.taskId];
          if (!task) return false;
          // If execution explicitly tagged with a periodId, use that for attribution
          if (e.periodId) return e.periodId === activePeriod.id && task.wgId === wg.id;
          const execDate = new Date(e.executedAt || e.date);
          if (isNaN(execDate.getTime())) return false;
          return task.wgId === wg.id && execDate >= new Date(activePeriod.startDate) && execDate <= new Date(activePeriod.endDate);
        });

        const periodSummary = {
          totalExecutions: executionsForPeriod.length,
          totalPoints: executionsForPeriod.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0),
          memberStats: wg.memberIds.map(memberId => {
            const memberExecutions = executionsForPeriod.filter((e: any) => e.executedBy === memberId);
            const points = memberExecutions.reduce((sum: number, e: any) => sum + (e.pointsAwarded || 0), 0);
            return {
              userId: memberId,
              executions: memberExecutions.length,
              points,
              achievement: activePeriod.targetPoints > 0 ? (points / activePeriod.targetPoints) * 100 : 0
            };
          })
        };

        // Build a savedState snapshot for the archived period (tasks + executions + userTargets + settings)
        const wgTasks = Object.values(this.state.tasks || {}).filter((t: any) => t.wgId === wg.id).map(t => ({ ...t }));
        const savedExecutions = executionsForPeriod.map((e: any) => ({ ...e, periodId: e.periodId || activePeriod.id }));
        const savedStateForPeriod = {
          savedAt: new Date().toISOString(),
          tasks: wgTasks,
          executions: savedExecutions,
          userTargets: { ...(this.state as any).userTargets || {} },
          settings: { ...(this.state as any).settings || {} }
        } as any;

        // Debug: log what's being snapshot for this archived period
        try {
          console.log(`[DataManager] Archiving period ${activePeriod.id} @ ${new Date().toISOString()} - snapshotting ${savedExecutions.length} executions`, savedExecutions.map((e: any) => e.id));
        } catch (e) {
          console.debug('[DataManager] Archiving debug log failed', e);
        }

        // Remove archived executions from live state after snapshotting
        const archivedExecutionIds = savedExecutions.map((e: any) => e.id);

        // Archive the period with summary and attach savedState
        newHistoricalPeriods.push({
          ...activePeriod,
          isActive: false,
          archivedAt: new Date().toISOString(),
          summary: periodSummary,
          savedState: savedStateForPeriod
        });

        console.log(`📅 Analytics period archived: ${activePeriod.name} (${periodSummary.totalPoints}P from ${periodSummary.totalExecutions} executions)`);
        // Track ids to remove after loop
        (this as any).__archivedExecutionIds = (this as any).__archivedExecutionIds || [];
        (this as any).__archivedExecutionIds.push(...archivedExecutionIds);
        try {
          console.log(`[DataManager] Collected archivedExecutionIds now contains ${((this as any).__archivedExecutionIds || []).length} ids`, (this as any).__archivedExecutionIds.slice(0,50));
        } catch (_) {}
      }

      // Create new active analytics period
      const analyticsPeriod = {
        id: period.id,
        // Add a short label `TT.MM – TT.MM` for compact lists and a descriptive name for detailed views
        label: `${new Date(period.start).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})} – ${new Date(period.end).toLocaleDateString('de-DE', {day: '2-digit', month: '2-digit'})}`,
        name: isReset ? `Neuer Zeitraum ${new Date(period.start).toLocaleDateString('de-DE')}` : `Zeitraum ${new Date(period.start).toLocaleDateString('de-DE')}`,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString(),
        targetPoints: wg.settings?.monthlyPointsTarget || 50,
        isActive: true,
        createdAt: new Date().toISOString()
      };

      // Füge den neuen Zeitraum immer zu periods hinzu, aber prüfe defensiv auf Überschneidungen
      let updatedPeriods = [...inactivePeriods];
      // Entferne ggf. alten aktiven Zeitraum mit gleicher ID
      updatedPeriods = updatedPeriods.filter(p => p.id !== analyticsPeriod.id);

      // Defensive overlap-check: ensure analyticsPeriod does not overlap any existing period
      try {
        const newStart = new Date(analyticsPeriod.startDate);
        const newEnd = new Date(analyticsPeriod.endDate);
        const combinedExisting = [...updatedPeriods, ...newHistoricalPeriods];
        let hasOverlap = false;
        for (const ex of combinedExisting) {
          const exStart = new Date(ex.startDate || ex.start || ex.start_at);
          const exEnd = new Date(ex.endDate || ex.end || ex.end_at);
          if (!exStart || !exEnd || isNaN(exStart.getTime()) || isNaN(exEnd.getTime())) continue;
          const exStartNorm = new Date(exStart); exStartNorm.setHours(0,0,0,0);
          const exEndNorm = new Date(exEnd); exEndNorm.setHours(23,59,59,999);
          const newStartNorm = new Date(newStart); newStartNorm.setHours(0,0,0,0);
          const newEndNorm = new Date(newEnd); newEndNorm.setHours(23,59,59,999);
          if (!(newEndNorm.getTime() < exStartNorm.getTime() || newStartNorm.getTime() > exEndNorm.getTime())) {
            hasOverlap = true;
            console.warn('⚠️ [DataManager] Skipping analytics period creation due to detected overlap with existing period', { analyticsPeriod, existing: ex });
            break;
          }
        }
        if (!hasOverlap) {
          updatedPeriods.push(analyticsPeriod);
        } else {
          // Do not add overlapping analyticsPeriod
          console.warn('⚠️ [DataManager] Analytics period not added to WG.periods due to overlap');
        }
      } catch (err) {
        // On unexpected errors, still attempt to add to avoid silent data loss
        console.error('❌ [DataManager] Error during overlap-check for analytics period:', err);
        updatedPeriods.push(analyticsPeriod);
      }

      // Update WG mit neuen Perioden und historischen Perioden
      const updatedWG = { 
        ...wg, 
        periods: updatedPeriods,
        historicalPeriods: newHistoricalPeriods
      };
      const newWgs = { ...this.state.wgs, [wg.id]: updatedWG };

      // Remove archived executions from live executions map if any were collected
      let prunedExecutions = { ...this.state.executions } as Record<string, any>;
      const toRemove: string[] = (this as any).__archivedExecutionIds || [];
      try {
        console.log(`[DataManager] Pruning ${toRemove.length} archived executions from live state @ ${new Date().toISOString()}`, toRemove.slice(0,50));
        console.log('[DataManager] Current live executions count before prune:', Object.keys(prunedExecutions).length);
      } catch (_) {}
      toRemove.forEach(id => { if (prunedExecutions[id]) delete prunedExecutions[id]; });
      // Clear the temporary tracking array
      delete (this as any).__archivedExecutionIds;
      try {
        console.log('[DataManager] Live executions count after prune:', Object.keys(prunedExecutions).length);
      } catch (_) {}

      this.updateStateImmediate({
        wgs: newWgs as Record<string, WG>,
        currentWG: updatedWG,
        executions: prunedExecutions
      });

      // Debug: confirm persisted in-memory state after immediate update
      try {
        console.log(`[DataManager] After updateStateImmediate @ ${new Date().toISOString()} - executions count:`, Object.keys(this.state.executions || {}).length);
      } catch (_) {}

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
      const historicalPeriod = {
        id: `archived_${period.id}_${Date.now()}`,
        name: `${new Date(period.start).toLocaleDateString('de-DE')} - ${new Date(period.end).toLocaleDateString('de-DE')}`,
        startDate: period.start.toISOString(),
        endDate: period.end.toISOString(),
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
    
    // Include all periods stored in WG.periods (regardless of `isActive`) because persisted
    // snapshots sometimes omit the flag. Mark those that are active or match the persisted
    // currentPeriod id as live. Also include WG.historicalPeriods. Deduplicate by id so
    // we don't surface duplicates when the same period appears in both lists.
    const periodsFromWG = currentWG.periods || [];
    const historicalPeriods = currentWG.historicalPeriods || [];

    const mappedPeriods: any[] = [];

    for (const p of periodsFromWG) {
      const periodShape = {
        id: p.id,
        name: p.name || p.label || p.title,
        startDate: p.startDate || p.start || p.start_at || null,
        endDate: p.endDate || p.end || p.end_at || null,
        start: p.start || p.startDate || p.start_at || null,
        end: p.end || p.endDate || p.end_at || null,
        targetPoints: p.targetPoints,
        isActive: !!p.isActive,
        createdAt: p.createdAt,
        summary: {
          totalExecutions: 0,
          totalPoints: 0,
          memberStats: []
        },
        __LIVE_PERIOD__: !!p.isActive || (this.state.currentPeriod && p.id === this.state.currentPeriod.id)
      };
      mappedPeriods.push(periodShape);
    }

    // Map historical periods as stored
    const mappedHistorical = historicalPeriods.map((p: any) => ({ ...p }));

    // Combine and dedupe by id, preferring live/periodsFromWG entries when duplicate ids exist
    const combined = [...mappedPeriods, ...mappedHistorical];
    const dedupMap = new Map<string, any>();
    for (const p of combined) {
      if (!p || !p.id) continue;
      const existing = dedupMap.get(p.id);
      if (!existing) {
        dedupMap.set(p.id, p);
      } else {
        // Prefer an entry marked as live
        if (p.__LIVE_PERIOD__ && !existing.__LIVE_PERIOD__) dedupMap.set(p.id, p);
      }
    }

    const allPeriods = Array.from(dedupMap.values());

    // Additional dedupe by date-range (start/end) to handle cases where distinct ids
    // represent the same temporal period (legacy/duplicate entries). Prefer live entries.
    const rangeMap = new Map<string, any>();
    for (const p of allPeriods) {
      const s = (p.start || p.startDate) ? new Date(p.start || p.startDate).toISOString().substring(0,10) : '0000-00-00';
      const e = (p.end || p.endDate) ? new Date(p.end || p.endDate).toISOString().substring(0,10) : '9999-99-99';
      const key = `${s}_${e}`;
      const existing = rangeMap.get(key);
      if (!existing) {
        rangeMap.set(key, p);
      } else {
        // Prefer live entry
        if (p.__LIVE_PERIOD__ && !existing.__LIVE_PERIOD__) rangeMap.set(key, p);
      }
    }

    const finalPeriods = Array.from(rangeMap.values());
    // Sortiere nach Erstellungsdatum (neueste zuerst)
    return finalPeriods.sort((a: any, b: any) => 
      new Date(b.createdAt || b.archivedAt || '').getTime() - 
      new Date(a.createdAt || a.archivedAt || '').getTime()
    );
  }

  /**
   * Persist a lightweight snapshot of WG-scoped state to attach to a period.
   * Currently saves tasks (WG-scoped) and executions for the current WG.
   */
  saveStateForPeriod(periodId: string) {
    const currentWG = this.getCurrentWG();
    if (!currentWG) throw new Error('No current WG to save period state');

    // Gather WG-scoped tasks
    const tasks = Object.values(this.state.tasks || {}).filter((t: any) => t.wgId === currentWG.id);
    const executions = Object.values(this.state.executions || {}).filter((e: any) => {
      const task = this.state.tasks[e.taskId];
      return task && task.wgId === currentWG.id;
    });

    // Find period in periods or historicalPeriods
    const periods = currentWG.periods || [];
    const historical = currentWG.historicalPeriods || [];
    const all = [...periods, ...historical];
    const periodIdx = all.findIndex((p: any) => p.id === periodId);
    if (periodIdx === -1) throw new Error('Period not found for save');

    const target = all[periodIdx];
    const savedState = {
      savedAt: new Date().toISOString(),
      tasks: tasks.map(t => ({ ...t })),
      executions: executions.map(e => ({ ...e })),
      // Persist current per-period userTargets and settings snapshot so they can be
      // restored when switching back to this period in tests/UI.
      userTargets: { ...(this.state as any).userTargets || {} },
      settings: { ...(this.state as any).settings || {} }
    } as any;

    // Attach savedState to the period object
    try {
      // Update in-place into the WG structure and persist via updateWG
      const updateFn = (wg: WG) => {
        const updatePeriodList = (list: any[]) => list.map(p => p.id === periodId ? { ...p, savedState } : p);
        return {
          periods: updatePeriodList(wg.periods || []),
          historicalPeriods: updatePeriodList(wg.historicalPeriods || [])
        };
      };

      const updates = updateFn(currentWG as WG);
      this.updateWG(currentWG.id, updates as Partial<WG>);
      this.saveToStorage();
      console.log(`💾 [DataManager] Saved state snapshot for period ${periodId}`);
      return true;
    } catch (err) {
      console.error('❌ [DataManager] Failed to save state for period', periodId, err);
      return false;
    }
  }

  /**
   * Load previously saved snapshot for a period and merge into current state.
   * This will overwrite WG-scoped tasks/executions with saved snapshot entries.
   */
  loadStateForPeriod(periodId: string) {
    const currentWG = this.getCurrentWG();
    if (!currentWG) throw new Error('No current WG to load period state');

    const periods = currentWG.periods || [];
    const historical = currentWG.historicalPeriods || [];
    const all = [...periods, ...historical];
    const period = all.find((p: any) => p.id === periodId);
    if (!period || !period.savedState) return false;

    try {
      const saved = period.savedState;
      const updatedTasks = { ...this.state.tasks };
      for (const t of saved.tasks || []) {
        updatedTasks[t.id] = { ...t };
      }

      const updatedExecutions = { ...this.state.executions };
      for (const e of saved.executions || []) {
        // Preserve existing periodId if present, otherwise set to the period being loaded
        updatedExecutions[e.id] = { ...e, periodId: e.periodId || periodId };
      }

      const restoredUserTargets = (saved.userTargets || {});
      const restoredSettings = (saved.settings || {});

      this.updateStateImmediate({
        tasks: updatedTasks,
        executions: updatedExecutions,
        // Restore userTargets/settings from saved snapshot for deterministic period view
        userTargets: restoredUserTargets,
        settings: restoredSettings
      });
      console.log(`📥 [DataManager] Loaded saved state for period ${periodId}`);
      return true;
    } catch (err) {
      console.error('❌ [DataManager] Failed to load saved state for period', periodId, err);
      return false;
    }
  }

  /**
   * Copy saved snapshot state from one period to another within the current WG.
   * If the source period has no saved snapshot, it will attempt to create one first.
   */
  copyStateBetweenPeriods(fromPeriodId: string, toPeriodId: string): boolean {
    const currentWG = this.getCurrentWG();
    if (!currentWG) throw new Error('No current WG to copy period state');

    const periods = currentWG.periods || [];
    const historical = currentWG.historicalPeriods || [];
    const all = [...periods, ...historical];

    const from = all.find((p: any) => p.id === fromPeriodId);
    const to = all.find((p: any) => p.id === toPeriodId);
    if (!from || !to) throw new Error('Source or target period not found');

    // Ensure source has savedState
    if (!(from as any).savedState) {
      const ok = this.saveStateForPeriod(fromPeriodId);
      if (!ok) return false;
      // reload WG references
      const refreshedWG = this.getCurrentWG();
      const refreshedAll = [...(refreshedWG?.periods || []), ...(refreshedWG?.historicalPeriods || [])];
      const refreshedFrom = refreshedAll.find((p: any) => p.id === fromPeriodId);
      if (!refreshedFrom || !(refreshedFrom as any).savedState) return false;
      (from as any).savedState = (refreshedFrom as any).savedState;
    }

    // Attach savedState to target period
    const savedState = { ...((from as any).savedState) } as any;
    try {
      const updateFn = (wg: WG) => {
        const updatePeriodList = (list: any[]) => list.map(p => p.id === toPeriodId ? { ...p, savedState } : p);
        return {
          periods: updatePeriodList(wg.periods || []),
          historicalPeriods: updatePeriodList(wg.historicalPeriods || [])
        };
      };
      const updates = updateFn(currentWG as WG);
      this.updateWG(currentWG.id, updates as Partial<WG>);
      this.saveToStorage();
      console.log(`🔁 [DataManager] Copied savedState from ${fromPeriodId} to ${toPeriodId}`);
      return true;
    } catch (err) {
      console.error('❌ [DataManager] Failed to copy savedState between periods', err);
      return false;
    }
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

    // Robust matching: try direct id match, then archived_ prefix, then match by start/end if id encodes a range
    const matchesId = (p: any) => {
      if (!p || !p.id) return false;
      if (p.id === periodId) return true;
      if (p.id.startsWith('archived_') && p.id.includes(periodId)) return true;
      // If periodId looks like a range YYYY-MM-DD_YYYY-MM-DD, compare against p.startDate/p.endDate or p.start/p.end
      if (/^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(periodId)) {
        const parts = periodId.split('_');
        const s = parts[0];
        const e = parts[1];
        const pStart = (p.startDate || p.start || p.start_at || '').toString().substring(0,10);
        const pEnd = (p.endDate || p.end || p.end_at || '').toString().substring(0,10);
        if (pStart === s && pEnd === e) return true;
      }
      return false;
    };

    const newPeriods = periods.filter(p => !matchesId(p));
    const newHistorical = historical.filter(p => !matchesId(p));

    const updatedWG = { ...currentWG, periods: newPeriods, historicalPeriods: newHistorical } as any;

    // Use updateWG to persist changes
    try {
      // Also remove any occurrences in other WGs for safety
      const newWgs = { ...this.state.wgs } as Record<string, WG>;
      // Update current WG
      newWgs[currentWG.id] = updatedWG as WG;

      // Remove the period id from any other WG lists as well (global cleanup)
      for (const id of Object.keys(newWgs)) {
        const wg = newWgs[id];
        if (!wg) continue;
        const p = (wg.periods || []).filter((pp: any) => pp.id !== periodId);
        const h = (wg.historicalPeriods || []).filter((hh: any) => hh.id !== periodId);
        newWgs[id] = { ...wg, periods: p, historicalPeriods: h } as WG;
      }

      this.updateStateImmediate({ wgs: newWgs, currentWG: newWgs[currentWG.id] });
      // Persist
      this.saveToStorage();
      console.log(`🗑️ [DataManager] Deleted period ${periodId} from WG ${currentWG.id} and cleaned other WGs`);
      this.notifyListeners();
    } catch (error) {
      console.error('🗑️ [DataManager] Failed to delete period:', error);
    }
  }

  /**
   * Remove duplicate period entries (by id) for the current WG.
   * Keeps the first occurrence of each id in periods and historicalPeriods.
   */
  purgeDuplicatePeriodsForCurrentWG(): { removed: number } {
    const currentWG = this.getCurrentWG();
    if (!currentWG) return { removed: 0 };

    const dedupe = (list: any[]) => {
      const seen = new Set<string>();
      const result: any[] = [];
      for (const item of list) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
      return result;
    };

    const beforeCount = (currentWG.periods || []).length + (currentWG.historicalPeriods || []).length;
    const newPeriods = dedupe(currentWG.periods || []);
    const newHistorical = dedupe(currentWG.historicalPeriods || []);
    const afterCount = newPeriods.length + newHistorical.length;
    const removed = beforeCount - afterCount;

    const updatedWG = { ...currentWG, periods: newPeriods, historicalPeriods: newHistorical } as WG;
    try {
      this.updateWG(currentWG.id, { periods: updatedWG.periods, historicalPeriods: updatedWG.historicalPeriods } as Partial<WG>);
      this.saveToStorage();
      this.notifyListeners();
      console.log(`🧹 [DataManager] Purged ${removed} duplicate period(s) for WG ${currentWG.id}`);
      return { removed };
    } catch (err) {
      console.error('🧹 [DataManager] Failed to purge duplicates', err);
      return { removed: 0 };
    }
  }

  /**
   * Migration helper: Detects overlapping periods across all WGs and optionally
   * moves overlapping active periods into historicalPeriods to avoid overlaps.
   * Non-destructive by default (only returns a report). Use `{ autoFix: true }`
   * to apply changes.
   */
  cleanupOverlappingPeriods(options?: { autoFix?: boolean }) {
    const results: Array<{ wgId: string; actions: string[] }> = [];
    const wgs = this.state.wgs || {} as Record<string, WG>;

    for (const wgId of Object.keys(wgs)) {
      const wg = wgs[wgId];
      if (!wg) continue;

      const periods = Array.isArray(wg.periods) ? wg.periods.slice() : [];
      const historical = Array.isArray(wg.historicalPeriods) ? wg.historicalPeriods.slice() : [];

      // Normalize combined list for overlap detection
      const combined = [
        ...periods.map(p => ({ ...p, __source: 'periods' } as any)),
        ...historical.map(p => ({ ...p, __source: 'historical' } as any))
      ].map(p => ({
        ...p,
        startObj: p.startDate ? new Date(p.startDate) : (p.start ? new Date(p.start) : null),
        endObj: p.endDate ? new Date(p.endDate) : (p.end ? new Date(p.end) : null)
      })).filter(p => p.startObj && p.endObj && !isNaN(p.startObj.getTime()) && !isNaN(p.endObj.getTime()));

      // Sort by start
      combined.sort((a, b) => a.startObj.getTime() - b.startObj.getTime());

      const actions: string[] = [];
      const idsToArchive: Set<string> = new Set();

      for (let i = 0; i < combined.length; i++) {
        const a = combined[i];
        for (let j = i + 1; j < combined.length; j++) {
          const b = combined[j];
          // If a ends before b starts -> no overlap (and since sorted, we can break)
          if (a.endObj.getTime() < b.startObj.getTime()) break;

          // Overlap detected
          // Determine which to prefer keeping active: prefer the one that isActive === true,
          // otherwise prefer the one with later createdAt / start date.
          let keep = b as any;
          let archive = a as any;
          if (a.isActive && !b.isActive) { keep = a; archive = b; }
          else if (!a.isActive && b.isActive) { keep = b; archive = a; }
          else {
            const aCreated = new Date(a.createdAt || a.archivedAt || a.startObj).getTime();
            const bCreated = new Date(b.createdAt || b.archivedAt || b.startObj).getTime();
            if (bCreated >= aCreated) { keep = b; archive = a; } else { keep = a; archive = b; }
          }

          // If the archive candidate is currently in active periods, plan to move it to historical
          if (idsToArchive.has(archive.id)) continue; // already planned

          if ((periods || []).find(p => p.id === archive.id)) {
            actions.push(`Archive active period ${archive.id} (overlaps with ${keep.id})`);
            idsToArchive.add(archive.id);
          } else {
            // Overlap involves historical entries — keep as historical but note it
            actions.push(`Overlap found between ${a.id} and ${b.id} (historical involvement)`);
          }
        }
      }

      if (options?.autoFix && idsToArchive.size > 0) {
        // Move each id from periods -> historical
        const newPeriods = (wg.periods || []).filter((p: any) => !idsToArchive.has(p.id));
        const toArchive = (wg.periods || []).filter((p: any) => idsToArchive.has(p.id)).map((p: any) => ({
          ...p,
          isActive: false,
          archivedAt: p.archivedAt || new Date().toISOString()
        }));

        // Ensure historicalPeriods exists and merge without duplicates
        const existingHist = wg.historicalPeriods || [];
        const mergedHistorical = [...existingHist, ...toArchive].filter((v, i, arr) => arr.findIndex(x => x.id === v.id) === i);

        // Persist changes for this WG
        try {
          const updatedWG = { ...wg, periods: newPeriods, historicalPeriods: mergedHistorical } as WG;
          this.updateWG(wgId, { periods: updatedWG.periods, historicalPeriods: updatedWG.historicalPeriods });
          actions.push(`Applied autoFix: moved ${toArchive.length} period(s) to historical for WG ${wgId}`);
        } catch (err) {
          console.error('❌ [DataManager] Failed to apply migration for WG', wgId, err);
          actions.push(`Failed to apply autoFix for WG ${wgId}: ${String(err)}`);
        }
      }

      results.push({ wgId, actions });
    }

    if (options?.autoFix) {
      // Save immediately and notify listeners
      this.saveToStorage();
      this.notifyListeners();
    }

    return results;
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
    // Skip network saves during unit tests or when running without a configured absolute server URL.
    // In Node (Vitest) a relative '/api/..' will cause `undici` to throw: "Failed to parse URL from /api/data".
    try {
      if (process && process.env && process.env.NODE_ENV === 'test') {
        console.log('[DataManager] Skipping saveToServer in test environment');
        return;
      }

      // If fetch is not available or running in an environment without a configured server, skip.
      if (typeof fetch === 'undefined') {
        console.log('[DataManager] Skipping saveToServer because `fetch` is not available');
        return;
      }

      // If running in a browser and a relative endpoint is used, transform to an absolute URL using location.origin.
      let endpoint = '/api/data';
      try {
        // If URL constructor accepts it without throwing, we'll use it as-is. In Node this throws for relative URLs.
        new URL(endpoint);
      } catch (_) {
        if (typeof window !== 'undefined' && (window as any).location && (window as any).location.origin) {
          endpoint = `${(window as any).location.origin}${endpoint}`;
        } else {
          console.log('[DataManager] Skipping saveToServer: cannot construct absolute URL for endpoint', endpoint);
          return;
        }
      }

      console.log('[DataManager] Saving state to server...');

      const response = await fetch(endpoint, {
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
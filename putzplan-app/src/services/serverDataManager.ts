import { AppState, User, WG, Task, TaskExecution, TaskRating, Notification, ExecutionStatus, Absence, TemporaryResident, PostExecutionRating, PeriodInfo } from '../types';
import { generateId } from '../utils/taskUtils';

// ========================================
// SERVER-BASIERTES DATENMANAGEMENT
// ========================================

const API_BASE = '';  // Same origin
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
  absences: {},
  temporaryResidents: {},
  postExecutionRatings: {},
  currentPeriod: undefined,
  debugMode: false
};

/**
 * Server-basierter DataManager
 * Speichert Daten auf dem Server statt im localStorage
 */
class ServerDataManager {
  private state: AppState = { ...initialState };
  private saveTimeout: NodeJS.Timeout | null = null;
  private isOnline: boolean = true;
  private pendingChanges: boolean = false;

  constructor() {
    this.loadFromServer();
    this.setupOnlineDetection();
  }

  private setupOnlineDetection() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        if (this.pendingChanges) {
          this.saveToServer();
        }
      });
      
      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private async loadFromServer(): Promise<AppState> {
    try {
      const response = await fetch(`${API_BASE}/api/data`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      const state = this.deserializeDates(data.state);
      const merged = { ...initialState, ...state } as AppState;
      
      // Defensive repair: if we lost the wgs map but still have a currentWG restore it
      if (!merged.wgs) merged.wgs = {} as any;
      if (Object.keys(merged.wgs as any).length === 0 && merged.currentWG) {
        merged.wgs = { [merged.currentWG.id]: merged.currentWG } as any;
      }
      
      // Add new flags with defaults if absent
      if (typeof (merged as any).debugMode === 'undefined') (merged as any).debugMode = false;
      
      this.state = merged;
      console.log('📡 Data loaded from server');
      return merged;
      
    } catch (error) {
      console.error('❌ Error loading from server:', error);
      console.log('📱 Using initial state');
      return initialState;
    }
  }

  private async saveToServer(): Promise<void> {
    if (!this.isOnline) {
      this.pendingChanges = true;
      console.log('📡 Offline - saving changes for later');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/api/data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.state)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      this.pendingChanges = false;
      console.log('💾 Data saved to server:', result.savedAt);
      
    } catch (error) {
      console.error('❌ Error saving to server:', error);
      this.pendingChanges = true;
    }
  }

  private debouncedSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    
    this.saveTimeout = setTimeout(() => {
      this.saveToServer();
    }, 500); // Save 500ms after last change
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

  // Public API Methods (same as original dataManager)
  getState(): AppState {
    return this.state;
  }

  getCurrentUser(): User | null {
    return this.state.currentUser;
  }

  getCurrentWG(): WG | null {
    return this.state.currentWG;
  }

  async setCurrentUser(user: User | null): Promise<void> {
    this.state.currentUser = user;
    this.debouncedSave();
  }

  async setCurrentWG(wg: WG | null): Promise<void> {
    this.state.currentWG = wg;
    this.debouncedSave();
  }

  async addUser(user: User): Promise<void> {
    this.state.users[user.id] = user;
    this.debouncedSave();
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<void> {
    if (this.state.users[userId]) {
      this.state.users[userId] = { ...this.state.users[userId], ...updates };
      
      // Update currentUser if it's the same user
      if (this.state.currentUser && this.state.currentUser.id === userId) {
        this.state.currentUser = this.state.users[userId];
      }
      
      this.debouncedSave();
    }
  }

  async deleteUser(userId: string): Promise<void> {
    delete this.state.users[userId];
    
    if (this.state.currentUser && this.state.currentUser.id === userId) {
      this.state.currentUser = null;
    }
    
    this.debouncedSave();
  }

  async addWG(wg: WG): Promise<void> {
    if (!this.state.wgs) this.state.wgs = {};
    this.state.wgs[wg.id] = wg;
    this.debouncedSave();
  }

  async updateWG(wgId: string, updates: Partial<WG>): Promise<void> {
    if (!this.state.wgs) this.state.wgs = {};
    if (this.state.wgs[wgId]) {
      this.state.wgs[wgId] = { ...this.state.wgs[wgId], ...updates };
      
      // Update currentWG if it's the same WG
      if (this.state.currentWG && this.state.currentWG.id === wgId) {
        this.state.currentWG = this.state.wgs[wgId];
      }
      
      this.debouncedSave();
    }
  }

  async deleteWG(wgId: string): Promise<void> {
    if (!this.state.wgs) return;
    delete this.state.wgs[wgId];
    
    if (this.state.currentWG && this.state.currentWG.id === wgId) {
      this.state.currentWG = null;
    }
    
    this.debouncedSave();
  }

  async addTask(task: Task): Promise<void> {
    this.state.tasks[task.id] = task;
    this.debouncedSave();
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<void> {
    if (this.state.tasks[taskId]) {
      this.state.tasks[taskId] = { ...this.state.tasks[taskId], ...updates };
      this.debouncedSave();
    }
  }

  async deleteTask(taskId: string): Promise<void> {
    delete this.state.tasks[taskId];
    this.debouncedSave();
  }

  async addExecution(execution: TaskExecution): Promise<void> {
    this.state.executions[execution.id] = execution;
    this.debouncedSave();
  }

  async updateExecution(executionId: string, updates: Partial<TaskExecution>): Promise<void> {
    if (this.state.executions[executionId]) {
      this.state.executions[executionId] = { ...this.state.executions[executionId], ...updates };
      this.debouncedSave();
    }
  }

  async deleteExecution(executionId: string): Promise<void> {
    delete this.state.executions[executionId];
    this.debouncedSave();
  }

  // Settings management
  setDebugMode(enabled: boolean): void {
    this.state.debugMode = enabled;
    this.debouncedSave();
  }

  getDebugMode(): boolean {
    return this.state.debugMode || false;
  }

  // Force immediate save
  async forceSave(): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    await this.saveToServer();
  }

  // Get sync status
  getSyncStatus(): { isOnline: boolean; pendingChanges: boolean } {
    return {
      isOnline: this.isOnline,
      pendingChanges: this.pendingChanges
    };
  }
}

// Create singleton instance
const serverDataManager = new ServerDataManager();
export default serverDataManager;
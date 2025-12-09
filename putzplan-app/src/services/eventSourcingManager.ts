/**
 * Event-Sourcing Manager für Action-Logging und State-Snapshots
 * Bietet zeitbasierte Wiederherstellung und Audit-Trail Funktionalität
 */

export interface ActionEvent {
  id: string;
  timestamp: number;
  action: string;
  userId?: string;
  wgId?: string;
  data: any;
  previousState?: any; // Nur für kritische Actions
  metadata: {
    userAgent?: string;
    sessionId?: string;
    critical: boolean; // Ob ein Snapshot erstellt werden soll
  };
}

export interface StateSnapshot {
  id: string;
  timestamp: number;
  triggerEvent: string; // Action die den Snapshot ausgelöst hat
  state: any; // Vollständiger App-State
  metadata: {
    version: string;
    size: number;
    compressed?: boolean;
  };
}

export interface RestorePreview {
  targetSnapshot: StateSnapshot;
  affectedData: {
    users: { added: number; modified: number; removed: number };
    tasks: { added: number; modified: number; removed: number };
    wgs: { added: number; modified: number; removed: number };
    ratings: { added: number; modified: number; removed: number };
  };
  lostActions: ActionEvent[]; // Actions die verloren gehen würden
  riskLevel: 'low' | 'medium' | 'high';
}

class EventSourcingManager {
  private events: ActionEvent[] = [];
  private snapshots: StateSnapshot[] = [];
  private maxEvents = 1000; // Maximale Anzahl Events im Memory
  private maxSnapshots = 50; // Maximale Anzahl Snapshots
  private snapshotInterval = 10; // Alle X kritischen Actions ein Snapshot
  private criticalActionCount = 0;

  // Kritische Actions die immer einen Snapshot auslösen
  private criticalActions = [
    'DELETE_WG',
    'DELETE_USER', 
    'DELETE_TASK',
    'BULK_DELETE',
    'RESET_DATA',
    'IMPORT_DATA',
    'BULK_RATING_UPDATE',
    'EXECUTE_TASK',  // Wichtig: Task executions als kritisch behandeln
    'EXECUTE_TASK_FOR_USER',
    'VERIFY_EXECUTION'
  ];

  constructor() {
    this.loadFromStorage();
    this.setupPeriodicCleanup();
  }

  /**
   * Protokolliert eine Action und erstellt bei Bedarf einen Snapshot
   */
  logAction(action: string, data: any, userId?: string, wgId?: string, previousState?: any): string {
    const eventId = this.generateId();
    const isCritical = this.criticalActions.includes(action) || action.includes('DELETE') || action.includes('RESET');
    
    const event: ActionEvent = {
      id: eventId,
      timestamp: Date.now(),
      action,
      userId,
      wgId,
      data,
      previousState: isCritical ? previousState : undefined,
      metadata: {
        userAgent: navigator.userAgent,
        sessionId: this.getSessionId(),
        critical: isCritical
      }
    };

    this.events.push(event);
    
    // Snapshot-Logik
    if (isCritical) {
      this.criticalActionCount++;
      this.createSnapshot(action, this.getCurrentState());
    } else if (this.criticalActionCount > 0 && this.criticalActionCount % this.snapshotInterval === 0) {
      this.createSnapshot(`PERIODIC_${action}`, this.getCurrentState());
    }

    this.pruneOldEvents();
    this.saveToStorage();
    
    console.log(`[EventSourcing] Logged ${isCritical ? 'CRITICAL' : 'regular'} action: ${action}`, { eventId, data });
    
    return eventId;
  }

  /**
   * Erstellt einen State-Snapshot
   */
  private createSnapshot(triggerEvent: string, state: any): string {
    const snapshotId = this.generateId();
    const stateString = JSON.stringify(state);
    
    const snapshot: StateSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      triggerEvent,
      state,
      metadata: {
        version: '1.0',
        size: stateString.length,
        compressed: false
      }
    };

    this.snapshots.push(snapshot);
    this.pruneOldSnapshots();
    this.saveToStorage();
    
    console.log(`[EventSourcing] Created snapshot: ${snapshotId} (trigger: ${triggerEvent}, size: ${stateString.length})`);
    
    return snapshotId;
  }

  /**
   * Gibt alle verfügbaren Snapshots zurück (neueste zuerst)
   */
  getSnapshots(limit?: number): StateSnapshot[] {
    const sorted = [...this.snapshots].sort((a, b) => b.timestamp - a.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Gibt Events in einem Zeitraum zurück
   */
  getEvents(fromTimestamp?: number, toTimestamp?: number, actionFilter?: string[]): ActionEvent[] {
    let filtered = [...this.events];
    
    if (fromTimestamp) {
      filtered = filtered.filter(e => e.timestamp >= fromTimestamp);
    }
    
    if (toTimestamp) {
      filtered = filtered.filter(e => e.timestamp <= toTimestamp);
    }
    
    if (actionFilter && actionFilter.length > 0) {
      filtered = filtered.filter(e => actionFilter.includes(e.action));
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Erstellt eine Vorschau was bei einem Restore passieren würde
   */
  generateRestorePreview(snapshotId: string): RestorePreview {
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} nicht gefunden`);
    }

    const currentState = this.getCurrentState();
    const targetState = snapshot.state;
    
    // Zähle Unterschiede
    const affectedData = {
      users: this.countDifferences(currentState.users, targetState.users),
      tasks: this.countDifferences(currentState.tasks, targetState.tasks),
      wgs: this.countDifferences(currentState.wgs, targetState.wgs),
      ratings: this.countDifferences(currentState.ratings, targetState.ratings)
    };

    // Events die verloren gehen würden
    const lostActions = this.events.filter(e => e.timestamp > snapshot.timestamp);
    
    // Risiko-Bewertung
    const totalChanges = Object.values(affectedData).reduce((sum, diff) => 
      sum + diff.added + diff.modified + diff.removed, 0
    );
    const criticalLostActions = lostActions.filter(e => e.metadata.critical).length;
    
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (totalChanges > 20 || criticalLostActions > 5) riskLevel = 'high';
    else if (totalChanges > 5 || criticalLostActions > 2) riskLevel = 'medium';

    return {
      targetSnapshot: snapshot,
      affectedData,
      lostActions,
      riskLevel
    };
  }

  /**
   * Führt einen State-Restore durch
   */
  async restoreFromSnapshot(snapshotId: string, confirmation: string): Promise<boolean> {
    console.log('[EventSourcing] restoreFromSnapshot called with:', { snapshotId, confirmation });
    
    if (confirmation !== 'CONFIRMED' && confirmation !== 'CONFIRM_RESTORE' && confirmation !== 'RESTORE') {
      throw new Error('Restore muss explizit bestätigt werden');
    }

    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    if (!snapshot) {
      throw new Error(`Snapshot ${snapshotId} nicht gefunden`);
    }

    console.log('[EventSourcing] Found snapshot:', snapshot);

    // Backup des aktuellen States vor Restore
    const currentState = this.getCurrentState();
    this.createSnapshot('PRE_RESTORE_BACKUP', currentState);

    // Restore durchführen
    try {
      console.log('[EventSourcing] Restoring state from snapshot:', snapshotId);
      console.log('Target State:', snapshot.state);
      
      // Versuche über dataManager zu restaurieren
      if (typeof window !== 'undefined' && (window as any).dataManager) {
        console.log('[EventSourcing] Using dataManager to restore state');
        (window as any).dataManager.setState(snapshot.state);
      } else {
        console.warn('[EventSourcing] dataManager not available, state restore incomplete');
      }
      
      // Log the restore action
      this.logAction('RESTORE_FROM_SNAPSHOT', { 
        snapshotId, 
        snapshotTimestamp: snapshot.timestamp,
        restoreTimestamp: Date.now()
      }, undefined, undefined, currentState);

      // Cleanup temporäre Snapshots nach erfolgreichem Restore
      this.cleanupTemporarySnapshots();

      console.log('[EventSourcing] State restore completed successfully');
      return true;
    } catch (error) {
      console.error('[EventSourcing] Restore failed:', error);
      throw error; // Re-throw für bessere Fehlerbehandlung
    }
  }

  /**
   * Hilfsmethoden
   */
  private countDifferences(current: any, target: any): { added: number; modified: number; removed: number } {
    const currentKeys = Object.keys(current || {});
    const targetKeys = Object.keys(target || {});
    
    const added = targetKeys.filter(key => !currentKeys.includes(key)).length;
    const removed = currentKeys.filter(key => !targetKeys.includes(key)).length;
    const modified = currentKeys.filter(key => 
      targetKeys.includes(key) && 
      JSON.stringify(current[key]) !== JSON.stringify(target[key])
    ).length;

    return { added, modified, removed };
  }

  private getCurrentState(): any {
    // Placeholder - in echter Implementierung würde hier dataManager.getState() aufgerufen
    if (typeof window !== 'undefined' && (window as any).dataManager) {
      return (window as any).dataManager.getState();
    }
    return {
      users: {},
      tasks: {},
      wgs: {},
      ratings: {},
      currentUser: null,
      currentWG: null
    };
  }

  private generateId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('eventSourcingSessionId');
    if (!sessionId) {
      sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('eventSourcingSessionId', sessionId);
    }
    return sessionId;
  }

  private pruneOldEvents() {
    if (this.events.length > this.maxEvents) {
      const keepCount = Math.floor(this.maxEvents * 0.8); // Behalte 80%
      this.events = this.events.slice(-keepCount);
      console.log(`[EventSourcing] Pruned events, keeping ${keepCount} of ${this.events.length}`);
    }
  }

  private pruneOldSnapshots() {
    if (this.snapshots.length > this.maxSnapshots) {
      const keepCount = Math.floor(this.maxSnapshots * 0.8);
      this.snapshots.sort((a, b) => b.timestamp - a.timestamp);
      this.snapshots = this.snapshots.slice(0, keepCount);
      console.log(`[EventSourcing] Pruned snapshots, keeping ${keepCount}`);
    }
  }

  private loadFromStorage() {
    try {
      const eventsData = localStorage.getItem('eventSourcing_events');
      if (eventsData) {
        this.events = JSON.parse(eventsData);
      }

      const snapshotsData = localStorage.getItem('eventSourcing_snapshots');
      if (snapshotsData) {
        this.snapshots = JSON.parse(snapshotsData);
      }

      console.log(`[EventSourcing] Loaded ${this.events.length} events and ${this.snapshots.length} snapshots from storage`);
    } catch (error) {
      console.error('[EventSourcing] Failed to load from storage:', error);
      this.events = [];
      this.snapshots = [];
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('eventSourcing_events', JSON.stringify(this.events));
      localStorage.setItem('eventSourcing_snapshots', JSON.stringify(this.snapshots));
    } catch (error) {
      console.error('[EventSourcing] Failed to save to storage:', error);
    }
  }

  private setupPeriodicCleanup() {
    // Cleanup alte Events/Snapshots alle 5 Minuten
    setInterval(() => {
      const oldestAllowed = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 Tage
      
      const eventsBefore = this.events.length;
      this.events = this.events.filter(e => e.timestamp > oldestAllowed);
      
      const snapshotsBefore = this.snapshots.length;
      this.snapshots = this.snapshots.filter(s => s.timestamp > oldestAllowed);
      
      if (eventsBefore !== this.events.length || snapshotsBefore !== this.snapshots.length) {
        console.log(`[EventSourcing] Periodic cleanup: events ${eventsBefore} -> ${this.events.length}, snapshots ${snapshotsBefore} -> ${this.snapshots.length}`);
        this.saveToStorage();
      }
    }, 5 * 60 * 1000);
  }

  // Debug/Test Hilfsmethoden
  generateTestData() {
    const testActions = [
      'CREATE_TASK', 'EXECUTE_TASK', 'RATE_TASK', 'CREATE_USER', 
      'UPDATE_USER', 'CREATE_WG', 'UPDATE_WG_SETTINGS', 'ADD_ABSENCE'
    ];
    
    // Generiere 20 Test-Events über die letzten 2 Stunden
    const now = Date.now();
    for (let i = 0; i < 20; i++) {
      const timestamp = now - (Math.random() * 2 * 60 * 60 * 1000); // Letzten 2 Stunden
      const action = testActions[Math.floor(Math.random() * testActions.length)];
      
      this.events.push({
        id: this.generateId(),
        timestamp,
        action,
        userId: 'test_user_' + Math.floor(Math.random() * 3),
        wgId: 'test_wg_1',
        data: { test: true, value: Math.random() },
        metadata: {
          sessionId: 'test_session',
          critical: Math.random() > 0.7
        }
      });
    }

    // Generiere ein paar Test-Snapshots
    for (let i = 0; i < 5; i++) {
      const timestamp = now - (Math.random() * 24 * 60 * 60 * 1000); // Letzten 24 Stunden
      this.snapshots.push({
        id: this.generateId(),
        timestamp,
        triggerEvent: 'TEST_SNAPSHOT_' + i,
        state: {
          users: { test_user: { name: 'Test User ' + i } },
          tasks: { test_task: { title: 'Test Task ' + i } },
          testData: true
        },
        metadata: {
          version: '1.0',
          size: 1024 * Math.random(),
          compressed: false
        }
      });
    }

    this.saveToStorage();
    console.log('[EventSourcing] Generated test data');
  }

  /**
   * Erstellt einen temporären Snapshot basierend auf einem Event-Zeitpunkt
   * Rekonstruiert den State zum Zeitpunkt des Events
   */
  async createSnapshotFromEvent(eventId: string): Promise<StateSnapshot | null> {
    console.log('[EventSourcing] Creating snapshot from event:', eventId);
    
    const targetEvent = this.events.find(e => e.id === eventId);
    if (!targetEvent) {
      console.error('[EventSourcing] Event not found:', eventId);
      return null;
    }

    // WICHTIG: Verwende den previousState vom Event, falls verfügbar
    // Das ist der echte State VOR der Event-Ausführung
    let stateToRestore: any;
    
    if (targetEvent.previousState) {
      console.log('[EventSourcing] Using previousState from event:', targetEvent.action);
      stateToRestore = targetEvent.previousState;
    } else {
      // Fallback: Finde den nächsten Snapshot vor dem Event und rekonstruiere
      const snapshotsBefore = this.snapshots
        .filter(s => s.timestamp <= targetEvent.timestamp)
        .sort((a, b) => b.timestamp - a.timestamp);

      if (snapshotsBefore.length > 0) {
        const nearestSnapshot = snapshotsBefore[0];
        stateToRestore = nearestSnapshot.state;
        console.log('[EventSourcing] Using base snapshot from:', new Date(nearestSnapshot.timestamp));
      } else {
        console.warn('[EventSourcing] No base snapshot or previousState found, using current state');
        stateToRestore = this.getCurrentState();
      }
    }

    // Erstelle temporären Snapshot mit dem rekonstruierten State
    const tempSnapshot: StateSnapshot = {
      id: `temp_event_${eventId}_${Date.now()}`,
      timestamp: targetEvent.timestamp,
      triggerEvent: `Event: ${targetEvent.action}`,
      state: stateToRestore,
      metadata: {
        version: '1.0',
        size: JSON.stringify(stateToRestore).length,
        compressed: false
      }
    };

    // WICHTIG: Temporären Snapshot zur Liste hinzufügen damit er gefunden wird
    this.snapshots.push(tempSnapshot);
    
    console.log('[EventSourcing] Created temporary snapshot:', tempSnapshot.id);
    console.log('Snapshot state contains users:', Object.keys(tempSnapshot.state.users || {}));
    console.log('Snapshot state contains executions:', Object.keys(tempSnapshot.state.executions || {}));
    
    return tempSnapshot;
  }

  /**
   * Entfernt temporäre Snapshots (die mit temp_ beginnen)
   */
  private cleanupTemporarySnapshots() {
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => !s.id.startsWith('temp_'));
    const after = this.snapshots.length;
    
    if (before !== after) {
      console.log(`[EventSourcing] Cleaned up ${before - after} temporary snapshots`);
      this.saveToStorage();
    }
  }

  clearAllData() {
    this.events = [];
    this.snapshots = [];
    this.criticalActionCount = 0;
    localStorage.removeItem('eventSourcing_events');
    localStorage.removeItem('eventSourcing_snapshots');
    console.log('[EventSourcing] Cleared all data');
  }

  /**
   * Löscht einen einzelnen Snapshot basierend auf der ID
   * @param snapshotId - Die ID des zu löschenden Snapshots
   * @returns boolean - true wenn erfolgreich gelöscht, false wenn nicht gefunden
   */
  deleteSnapshot(snapshotId: string): boolean {
    const initialLength = this.snapshots.length;
    const snapshot = this.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      console.warn(`[EventSourcing] Snapshot mit ID ${snapshotId} nicht gefunden`);
      return false;
    }
    
    // Entferne den Snapshot aus dem Array
    this.snapshots = this.snapshots.filter(s => s.id !== snapshotId);
    
    // Speichere die Änderungen
    this.saveToStorage();
    
    console.log(`[EventSourcing] Snapshot ${snapshotId} erfolgreich gelöscht (${snapshot.triggerEvent})`);
    console.log(`[EventSourcing] Snapshots: ${initialLength} → ${this.snapshots.length}`);
    
    return true;
  }

  getStats() {
    const now = Date.now();
    const last24h = now - (24 * 60 * 60 * 1000);
    const last7d = now - (7 * 24 * 60 * 60 * 1000);
    
    return {
      totalEvents: this.events.length,
      totalSnapshots: this.snapshots.length,
      eventsLast24h: this.events.filter(e => e.timestamp > last24h).length,
      eventsLast7d: this.events.filter(e => e.timestamp > last7d).length,
      criticalEvents: this.events.filter(e => e.metadata.critical).length,
      oldestEvent: this.events.length > 0 ? new Date(Math.min(...this.events.map(e => e.timestamp))) : null,
      newestEvent: this.events.length > 0 ? new Date(Math.max(...this.events.map(e => e.timestamp))) : null,
      averageSnapshotSize: this.snapshots.length > 0 ? 
        this.snapshots.reduce((sum, s) => sum + s.metadata.size, 0) / this.snapshots.length : 0
    };
  }
}

// Singleton Instance
export const eventSourcingManager = new EventSourcingManager();

// Auto-Integration mit dataManager wenn verfügbar
if (typeof window !== 'undefined') {
  (window as any).eventSourcingManager = eventSourcingManager;
  
  // Hook in dataManager updates wenn verfügbar
  setTimeout(() => {
    if ((window as any).dataManager) {
      const originalUpdateState = (window as any).dataManager.updateState;
      (window as any).dataManager.updateState = function(updates: any) {
        // Log vor dem Update
        const previousState = this.getState();
        
        // Original Update durchführen
        const result = originalUpdateState.call(this, updates);
        
        // Event-Sourcing Log
        eventSourcingManager.logAction('UPDATE_STATE', updates, 
          previousState.currentUser?.id, 
          previousState.currentWG?.id, 
          previousState
        );
        
        return result;
      };
      
      console.log('[EventSourcing] Hooked into dataManager.updateState()');
    }
  }, 1000);
}
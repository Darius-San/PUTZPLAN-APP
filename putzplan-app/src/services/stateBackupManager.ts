// Universal State Backup & Restore Manager
// Speichert alle State-Änderungen für vollständige Wiederherstellbarkeit

export interface StateSnapshot {
  id: string;
  timestamp: string;
  description: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE' | 'BULK_UPDATE';
  entity: string; // z.B. 'user', 'wg', 'task', 'execution', 'analytics-month'
  entityId: string;
  beforeState: any;
  afterState: any;
  metadata?: {
    userId?: string;
    wgId?: string;
    context?: string;
  };
}

export interface StateBackupData {
  snapshots: StateSnapshot[];
  lastBackupAt: string;
  version: string;
}

class StateBackupManager {
  private storageKey = 'putzplan-state-backups';
  private maxSnapshots = 100; // Limit to prevent storage overflow
  
  constructor() {
    console.log('🔄 [StateBackup] Manager initialized');
  }

  /**
   * Speichert eine State-Änderung für spätere Wiederherstellung
   */
  saveStateChange(change: Omit<StateSnapshot, 'id' | 'timestamp'>): string {
    const snapshot: StateSnapshot = {
      id: `backup_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      ...change
    };

    try {
      const backups = this.loadBackups();
      backups.snapshots.push(snapshot);
      
      // Keep only recent snapshots
      if (backups.snapshots.length > this.maxSnapshots) {
        backups.snapshots = backups.snapshots.slice(-this.maxSnapshots);
      }
      
      backups.lastBackupAt = new Date().toISOString();
      
      localStorage.setItem(this.storageKey, JSON.stringify(backups));
      
      console.log(`💾 [StateBackup] Saved ${change.type} for ${change.entity}:${change.entityId}`, {
        description: change.description,
        snapshotId: snapshot.id
      });
      
      return snapshot.id;
    } catch (error) {
      console.error('❌ [StateBackup] Failed to save state change:', error);
      return '';
    }
  }

  /**
   * Speichert die Backup-Daten in localStorage
   */
  private saveBackups(backups: StateBackupData): void {
    try {
      const serialized = JSON.stringify(backups);
      localStorage.setItem(this.storageKey, serialized);
      console.log(`💾 [StateBackup] Backups saved (${backups.snapshots.length} snapshots, ${serialized.length} bytes)`);
    } catch (error) {
      console.error('❌ [StateBackup] Failed to save backups:', error);
    }
  }

  /**
   * Lädt alle gespeicherten State-Backups
   */
  loadBackups(): StateBackupData {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return {
          snapshots: [],
          lastBackupAt: new Date().toISOString(),
          version: '1.0.0'
        };
      }
      
      const backups = JSON.parse(stored);
      return backups;
    } catch (error) {
      console.error('❌ [StateBackup] Failed to load backups:', error);
      return {
        snapshots: [],
        lastBackupAt: new Date().toISOString(),
        version: '1.0.0'
      };
    }
  }

  /**
   * Gibt alle Snapshots für eine bestimmte Entity zurück
   */
  getSnapshotsForEntity(entity: string, entityId?: string): StateSnapshot[] {
    const backups = this.loadBackups();
    return backups.snapshots.filter(s => 
      s.entity === entity && (!entityId || s.entityId === entityId)
    ).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Stellt einen bestimmten State-Snapshot wieder her
   */
  restoreSnapshot(snapshotId: string): StateSnapshot | null {
    const backups = this.loadBackups();
    const snapshot = backups.snapshots.find(s => s.id === snapshotId);
    
    if (!snapshot) {
      console.error(`❌ [StateBackup] Snapshot not found: ${snapshotId}`);
      return null;
    }

    console.log(`🔄 [StateBackup] Restoring snapshot: ${snapshot.description}`, {
      type: snapshot.type,
      entity: snapshot.entity,
      entityId: snapshot.entityId,
      timestamp: snapshot.timestamp
    });

    return snapshot;
  }

  /**
   * Löscht alte Snapshots (für Performance)
   */
  cleanupOldSnapshots(olderThanDays: number = 30): number {
    const backups = this.loadBackups();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    const originalCount = backups.snapshots.length;
    backups.snapshots = backups.snapshots.filter(s => 
      new Date(s.timestamp) > cutoffDate
    );
    
    const deletedCount = originalCount - backups.snapshots.length;
    
    if (deletedCount > 0) {
      localStorage.setItem(this.storageKey, JSON.stringify(backups));
      console.log(`🧹 [StateBackup] Cleaned up ${deletedCount} old snapshots`);
    }
    
    return deletedCount;
  }

  /**
   * Erstellt ein Backup des aktuellen gesamten App-States
   */
  createFullStateBackup(description: string, currentState: any): string {
    return this.saveStateChange({
      description: `Full State Backup: ${description}`,
      type: 'BULK_UPDATE',
      entity: 'app-state',
      entityId: 'full-state',
      beforeState: null,
      afterState: currentState,
      metadata: {
        context: 'full-backup'
      }
    });
  }

  /**
   * Exportiert alle Backups für Debugging
   */
  exportBackups(): string {
    const backups = this.loadBackups();
    return JSON.stringify(backups, null, 2);
  }

  /**
   * Gibt Statistiken über gespeicherte Backups zurück
   */
  getBackupStats(): {
    totalSnapshots: number;
    entitiesByType: Record<string, number>;
    oldestBackup: string | null;
    newestBackup: string | null;
    storageSize: number;
  } {
    const backups = this.loadBackups();
    
    const entitiesByType: Record<string, number> = {};
    backups.snapshots.forEach(s => {
      entitiesByType[s.entity] = (entitiesByType[s.entity] || 0) + 1;
    });
    
    const timestamps = backups.snapshots.map(s => s.timestamp).sort();
    
    return {
      totalSnapshots: backups.snapshots.length,
      entitiesByType,
      oldestBackup: timestamps[0] || null,
      newestBackup: timestamps[timestamps.length - 1] || null,
      storageSize: JSON.stringify(backups).length
    };
  }

  /**
   * Bereinigt alte Backups basierend auf Alter (in Millisekunden)
   */
  cleanup(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // Default: 7 Tage
    const backups = this.loadBackups();
    const cutoffTime = new Date(Date.now() - maxAge);
    
    const initialCount = backups.snapshots.length;
    backups.snapshots = backups.snapshots.filter(s => 
      new Date(s.timestamp) > cutoffTime
    );
    
    const removedCount = initialCount - backups.snapshots.length;
    
    if (removedCount > 0) {
      this.saveBackups(backups);
      console.log(`🧹 [StateBackup] Cleaned up ${removedCount} old backups (older than ${new Date(cutoffTime).toLocaleString()})`);
    }
    
    return removedCount;
  }

  /**
   * Löscht alle Backups (für Tests und Reset)
   */
  clearAll(): void {
    const emptyBackups: BackupData = {
      snapshots: [],
      metadata: {
        version: '1.0.0'
      }
    };
    
    this.saveBackups(emptyBackups);
    console.log('🗑️ [StateBackup] All backups cleared');
  }

  /**
   * Gibt alle Snapshots zurück (für Tests und Debugging)
   */
  getAllSnapshots(): StateSnapshot[] {
    const backups = this.loadBackups();
    return [...backups.snapshots]; // Return a copy
  }
}

// Singleton instance
export const stateBackupManager = new StateBackupManager();
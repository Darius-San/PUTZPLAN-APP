// Temporary Fix: Disabled Event Sourcing Manager to prevent localStorage conflicts
// This prevents different data between Simple Browser and normal browser

console.warn('🚨 [Event Sourcing] DISABLED (in-memory fallback for tests)');

type ActionEvent = {
  id: string;
  timestamp: number;
  action: string;
  userId?: string;
  wgId?: string;
  data?: any;
  previousState?: any;
  metadata: { critical?: boolean; sessionId?: string };
};

type StateSnapshot = {
  id: string;
  timestamp: number;
  triggerEvent: string;
  state: any;
  metadata: { version: string; size: number };
};

type RestorePreview = {
  targetSnapshot: StateSnapshot | null;
  lostActions: ActionEvent[];
  riskLevel: 'low' | 'medium' | 'high';
};

class InMemoryEventSourcingManager {
  private events: ActionEvent[] = [];
  private snapshots: StateSnapshot[] = [];
  private criticalActions = ['DELETE_WG','DELETE_USER','DELETE_TASK','BULK_DELETE','RESET_DATA','IMPORT_DATA','BULK_RATING_UPDATE','EXECUTE_TASK','EXECUTE_TASK_FOR_USER','VERIFY_EXECUTION'];

  isEnabled() { return false; }

  logAction(action: string, data: any, userId?: string, wgId?: string, previousState?: any) {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
    const isCritical = this.criticalActions.includes(action) || action.includes('DELETE') || action.includes('RESET');
    const ev: ActionEvent = {
      id,
      timestamp: Date.now(),
      action,
      userId,
      wgId,
      data,
      previousState: isCritical ? previousState : undefined,
      metadata: { critical: isCritical, sessionId: `sess_${Date.now()}` }
    };
    this.events.push(ev);
    if (isCritical) {
      this.createSnapshot(`CRITICAL_${action}`, previousState || this.getCurrentState());
    }
    return id;
  }

  getEvents() { return [...this.events].sort((a,b)=>b.timestamp-a.timestamp); }

  getSnapshots(limit?: number) {
    const sorted = [...this.snapshots].sort((a,b)=>b.timestamp-b.timestamp);
    return limit ? sorted.slice(0, limit) : sorted;
  }

  createSnapshot(triggerEvent: string, state: any) {
    const id = `snap_${Date.now()}_${Math.random().toString(36).slice(2,9)}`;
    const snap: StateSnapshot = {
      id,
      timestamp: Date.now(),
      triggerEvent,
      state: state || this.getCurrentState(),
      metadata: { version: '1.0', size: JSON.stringify(state || {}).length }
    };
    this.snapshots.push(snap);
    return id;
  }

  async createSnapshotFromEvent(eventId: string) {
    const ev = this.events.find(e => e.id === eventId);
    if (!ev) return null;
    const state = ev.previousState || this.snapshots.slice().sort((a,b)=>b.timestamp-a.timestamp)[0]?.state || this.getCurrentState();
    const temp: StateSnapshot = {
      id: `temp_event_${eventId}_${Date.now()}`,
      timestamp: ev.timestamp,
      triggerEvent: `Event: ${ev.action}`,
      state,
      metadata: { version: '1.0', size: JSON.stringify(state).length }
    };
    this.snapshots.push(temp);
    return temp;
  }

  async restoreFromSnapshot(snapshotId: string, confirmation: string) {
    if (!['CONFIRMED','CONFIRM_RESTORE','RESTORE'].includes(confirmation)) throw new Error('Restore muss explizit bestätigt werden');
    const snap = this.snapshots.find(s => s.id === snapshotId);
    if (!snap) throw new Error(`Snapshot ${snapshotId} nicht gefunden`);
    if (typeof window !== 'undefined' && (window as any).dataManager?.setState) {
      (window as any).dataManager.setState(snap.state);
    }

    // Cleanup temporary snapshots created for preview/event operations
    this.snapshots = this.snapshots.filter(s => !s.id.startsWith('temp_'));

    return true;
  }

  generateRestorePreview(snapshotId: string): RestorePreview {
    const target = this.snapshots.find(s => s.id === snapshotId) || null;
    let lostActions: ActionEvent[] = [];
    if (target) {
      // Prefer strictly later events, but fall back to >= and filter heuristics
      lostActions = this.events.filter(e => e.timestamp > target.timestamp);
      if (lostActions.length === 0) {
        // include equal-timestamp events but try to exclude the event that triggered the snapshot
        const candidates = this.events.filter(e => e.timestamp >= target.timestamp);
        lostActions = candidates.filter(e => !(target.triggerEvent && e.action && target.triggerEvent.includes(e.action)));
      }
    }
    const riskLevel: RestorePreview['riskLevel'] = lostActions.length === 0 ? 'low' : (lostActions.length < 5 ? 'medium' : 'high');
    return { targetSnapshot: target, lostActions, riskLevel };
  }

  deleteSnapshot(id: string) {
    const before = this.snapshots.length;
    this.snapshots = this.snapshots.filter(s => s.id !== id);
    return this.snapshots.length < before;
  }

  clearAllData() { this.events = []; this.snapshots = []; }

  generateTestData() {
    // simple deterministic test data
    for (let i=0;i<3;i++) this.logAction('EXECUTE_TASK', { test: i }, `user${i}`, `wg1`);
    this.createSnapshot('TEST_INIT', this.getCurrentState());
  }

  getStats() { return { totalEvents: this.events.length, totalSnapshots: this.snapshots.length }; }

  private getCurrentState() {
    if (typeof window !== 'undefined' && (window as any).dataManager?.getState) return (window as any).dataManager.getState();
    return { users: {}, tasks: {}, wgs: {}, executions: {}, currentWG: null, currentUser: null };
  }
}

export const eventSourcingManager = new InMemoryEventSourcingManager();
export default eventSourcingManager;
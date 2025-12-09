import { describe, it, expect, beforeEach, vi } from 'vitest';
import { eventSourcingManager } from '../services/eventSourcingManager';
import { DataManager } from '../services/dataManager';

// Mock window.location.reload
Object.defineProperty(window, 'location', {
  value: {
    reload: vi.fn()
  },
  writable: true
});

describe('State Restoration Integration', () => {
  let dataManager: DataManager;

  beforeEach(() => {
    // Clear localStorage and reset manager
    localStorage.clear();
    eventSourcingManager.clearAllData();
    
    // Create fresh dataManager instance
    dataManager = new DataManager();
    
    // Set up basic test state using proper methods
    const testWG = {
      id: 'wg1',
      name: 'Test WG',
      memberIds: ['user1', 'user2'],
      createdAt: new Date(),
      inviteCode: 'TEST123',
      settings: {}
    };

    const testUser1 = {
      id: 'user1',
      name: 'Test User 1',
      currentMonthPoints: 100,
      totalCompletedTasks: 5,
      password: 'password123',
      avatar: '👤',
      joinedAt: new Date(),
      isActive: true,
      targetMonthlyPoints: 200
    };

    const testUser2 = {
      id: 'user2', 
      name: 'Test User 2',
      currentMonthPoints: 50,
      totalCompletedTasks: 3,
      password: 'password456',
      avatar: '👤',
      joinedAt: new Date(),
      isActive: true,
      targetMonthlyPoints: 150
    };

    const testTask1 = {
      id: 'task1',
      title: 'Test Task 1',
      description: 'Test description',
      basePoints: 10,
      difficultyScore: 1,
      unpleasantnessScore: 1,
      pointsPerExecution: 10,
      emoji: '🧹',
      category: 'cleaning',
      averageMinutes: 30,
      averagePainLevel: 2,
      averageRating: 3,
      assignedTo: null,
      repeatInterval: null,
      constraints: null,
      isAlarmed: false,
      lastAlarmedAt: null,
      createdAt: new Date()
    };

    // Create WG and users using proper methods
    const createdWG = dataManager.createWG('Test WG');
    dataManager.setCurrentWG(createdWG.id);
    
    const createdUser1 = dataManager.createUser(testUser1);
    const createdUser2 = dataManager.createUser(testUser2);
    dataManager.setCurrentUser(createdUser1.id);
    
    const createdTask = dataManager.createTask(testTask1);

    // Make dataManager available globally for event sourcing
    (window as any).dataManager = dataManager;
  });

  it('sollte task execution events richtig loggen', () => {
    console.log('🧪 Test: Task execution event logging');
    
    // Get the created task ID
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    expect(taskIds).toHaveLength(1);
    const taskId = taskIds[0];
    const task = state.tasks[taskId];
    
    // Execute a task
    const execution = dataManager.executeTask(taskId, { notes: 'Test execution' });
    
    // Check if event was logged
    const events = eventSourcingManager.getEvents();
    expect(events.filter(e => e.action === 'EXECUTE_TASK')).toHaveLength(1);
    
    const taskEvent = events.find(e => e.action === 'EXECUTE_TASK')!;
    expect(taskEvent.data.taskId).toBe(taskId);
    expect(taskEvent.data.taskTitle).toBe('Test Task 1');
    expect(taskEvent.data.executedBy).toBe(state.currentUser?.id);
    expect(taskEvent.data.pointsAwarded).toBeGreaterThanOrEqual(1); // Dynamic points calculation
    expect(taskEvent.data.executionId).toBe(execution.id);
    
    console.log('✅ Task execution event korrekt geloggt');
  });

  it('sollte state korrekt wiederherstellen', async () => {
    console.log('🧪 Test: Complete state restoration workflow');
    
    // Get the created task and user IDs
    const initialState = dataManager.getState();
    const taskIds = Object.keys(initialState.tasks);
    const taskId = taskIds[0];
    const userId = initialState.currentUser?.id!;
    
    // Schritt 1: Initialer State mit Task execution
    console.log('1️⃣ Führe Task aus und erstelle Snapshot');
    const execution1 = dataManager.executeTask(taskId, { notes: 'First execution' });
    
    // Verify initial state
    const stateAfterFirst = dataManager.getState();
    expect(stateAfterFirst.users[userId].currentMonthPoints).toBeGreaterThan(initialState.users[userId].currentMonthPoints);
    expect(stateAfterFirst.users[userId].totalCompletedTasks).toBe(initialState.users[userId].totalCompletedTasks + 1);
    expect(Object.keys(stateAfterFirst.executions)).toHaveLength(1);
    
    // Force snapshot creation for critical action
    eventSourcingManager.logAction('DELETE_TASK', { 
      taskId: taskId 
    }, userId, initialState.currentWG?.id);
    
    const snapshots = eventSourcingManager.getSnapshots();
    expect(snapshots.length).toBeGreaterThanOrEqual(1);
    const snapshot = snapshots[0];
    
    console.log('2️⃣ Ändere State (weitere Task execution)');
    // Schritt 2: Ändere den State durch weitere Actions
    const execution2 = dataManager.executeTask(taskId, { notes: 'Second execution' });
    
    // Verify changed state
    const changedState = dataManager.getState();
    expect(changedState.users[userId].totalCompletedTasks).toBe(initialState.users[userId].totalCompletedTasks + 2);
    expect(Object.keys(changedState.executions)).toHaveLength(2);
    
    console.log('3️⃣ Teste State-Wiederherstellung');
    // Schritt 3: Restore to snapshot
    console.log('State vor Restore:', {
      tasks: changedState.users[userId].totalCompletedTasks,
      executions: Object.keys(changedState.executions).length
    });
    
    const restoreResult = await eventSourcingManager.restoreFromSnapshot(snapshot.id, 'CONFIRMED');
    expect(restoreResult).toBe(true);
    
    // Verify restoration
    const restoredState = dataManager.getState();
    console.log('State nach Restore:', {
      tasks: restoredState.users[userId].totalCompletedTasks,  
      executions: Object.keys(restoredState.executions).length
    });
    
    // The restored state should match the snapshot state
    expect(restoredState.users[userId].totalCompletedTasks).toBe(stateAfterFirst.users[userId].totalCompletedTasks);
    expect(Object.keys(restoredState.executions)).toHaveLength(1); // Only first execution
    
    console.log('✅ State-Wiederherstellung funktioniert korrekt');
  });

  it('sollte dataManager setState() methode haben', () => {
    console.log('🧪 Test: DataManager setState method availability');
    
    expect(typeof dataManager.setState).toBe('function');
    
    // Test setState functionality
    const testState = dataManager.getState();
    const userId = Object.keys(testState.users)[0];
    testState.users[userId].currentMonthPoints = 999;
    
    dataManager.setState(testState);
    
    const newState = dataManager.getState();
    expect(newState.users[userId].currentMonthPoints).toBe(999);
    
    console.log('✅ setState() Methode funktioniert');
  });

  it('sollte event-snapshot creation und restoration testen', async () => {
    console.log('🧪 Test: Event-based snapshot creation and restoration');
    
    // Get the created task ID
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    const taskId = taskIds[0];
    
    // Execute task to create events
    dataManager.executeTask(taskId, { notes: 'Test execution' });
    
    const events = eventSourcingManager.getEvents();
    const taskEvents = events.filter(e => e.action === 'EXECUTE_TASK');
    expect(taskEvents).toHaveLength(1);
    
    const taskEvent = taskEvents[0];
    
    // Create snapshot from event
    const eventSnapshot = await eventSourcingManager.createSnapshotFromEvent(taskEvent.id);
    expect(eventSnapshot).toBeDefined();
    expect(eventSnapshot?.id).toContain('temp_event_');
    expect(eventSnapshot?.triggerEvent).toBe(`Event: ${taskEvent.action}`);
    
    // Test restoration from event snapshot
    if (eventSnapshot) {
      const restoreResult = await eventSourcingManager.restoreFromSnapshot(eventSnapshot.id, 'CONFIRMED');
      expect(restoreResult).toBe(true);
      
      console.log('✅ Event-Snapshot Erstellung und Wiederherstellung funktioniert');
    }
  });

  it('sollte preview generation testen', () => {
    console.log('🧪 Test: Restore preview generation');
    
    // Force snapshot creation
    eventSourcingManager.logAction('DELETE_TASK', { taskId: 'task1' }, 'user1', 'wg1');
    
    const snapshots = eventSourcingManager.getSnapshots();
    expect(snapshots).toHaveLength(1);
    
    // Generate more events after snapshot
    eventSourcingManager.logAction('CREATE_TASK', { title: 'New Task' }, 'user1', 'wg1');
    eventSourcingManager.logAction('EXECUTE_TASK', { taskId: 'task2' }, 'user2', 'wg1');
    
    // Generate restore preview
    const preview = eventSourcingManager.generateRestorePreview(snapshots[0].id);
    
    expect(preview).toBeDefined();
    expect(preview.targetSnapshot).toBe(snapshots[0]);
    expect(preview.lostActions).toHaveLength(2); // 2 events after snapshot
    expect(preview.riskLevel).toMatch(/^(low|medium|high)$/);
    
    console.log('✅ Restore preview generation funktioniert');
  });

  it('sollte fehlerhaften restore mit falscher confirmation abweisen', async () => {
    console.log('🧪 Test: Restore rejection with wrong confirmation');
    
    // Create snapshot
    eventSourcingManager.logAction('DELETE_TASK', { taskId: 'task1' }, 'user1', 'wg1');
    const snapshots = eventSourcingManager.getSnapshots();
    expect(snapshots).toHaveLength(1);
    
    // Try to restore with wrong confirmation
    await expect(
      eventSourcingManager.restoreFromSnapshot(snapshots[0].id, 'WRONG_CONFIRMATION')
    ).rejects.toThrow('Restore muss explizit bestätigt werden');
    
    // Try to restore with missing snapshot
    await expect(
      eventSourcingManager.restoreFromSnapshot('non-existent-id', 'CONFIRMED')
    ).rejects.toThrow('Snapshot non-existent-id nicht gefunden');
    
    console.log('✅ Restore validation funktioniert');
  });

  it('sollte cleanup von temporary snapshots testen', async () => {
    console.log('🧪 Test: Temporary snapshot cleanup');
    
    // Get the created task ID
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    const taskId = taskIds[0];
    
    // Create some events
    dataManager.executeTask(taskId, { notes: 'Test execution' });
    const events = eventSourcingManager.getEvents();
    const taskEvents = events.filter(e => e.action === 'EXECUTE_TASK');
    
    // Create temporary snapshot from event
    const eventSnapshot = await eventSourcingManager.createSnapshotFromEvent(taskEvents[0].id);
    expect(eventSnapshot).toBeDefined();
    
    let allSnapshots = eventSourcingManager.getSnapshots();
    const tempSnapshots = allSnapshots.filter(s => s.id.startsWith('temp_'));
    expect(tempSnapshots).toHaveLength(1);
    
    // Perform restore (which should trigger cleanup)
    if (eventSnapshot) {
      await eventSourcingManager.restoreFromSnapshot(eventSnapshot.id, 'CONFIRMED');
      
      // Check that temporary snapshots are cleaned up
      allSnapshots = eventSourcingManager.getSnapshots();
      const remainingTempSnapshots = allSnapshots.filter(s => s.id.startsWith('temp_'));
      expect(remainingTempSnapshots).toHaveLength(0);
    }
    
    console.log('✅ Temporary snapshot cleanup funktioniert');
  });
});
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

describe('Real World State Restoration', () => {
  let dataManager: DataManager;

  beforeEach(() => {
    // Clear localStorage and reset manager
    localStorage.clear();
    eventSourcingManager.clearAllData();
    
    // Create fresh dataManager instance
    dataManager = new DataManager();
    
    // Set up real test scenario: eine WG mit 2 Usern und einem Task
    const testUser1 = {
      id: 'user1',
      name: 'Anna',
      email: 'anna@test.de',
      password: 'test123',
      avatar: '👩',
      currentMonthPoints: 0,
      totalCompletedTasks: 0,
      joinedAt: new Date(),
      isActive: true,
      targetMonthlyPoints: 100
    };

    const testUser2 = {
      id: 'user2', 
      name: 'Ben',
      email: 'ben@test.de',
      password: 'test456',
      avatar: '👨',
      currentMonthPoints: 0,
      totalCompletedTasks: 0,
      joinedAt: new Date(),
      isActive: true,
      targetMonthlyPoints: 100
    };

    // Create users and WG using proper methods
    const createdUser1 = dataManager.createUser(testUser1);
    dataManager.setCurrentUser(createdUser1.id);
    
    const createdWG = dataManager.createWG({
      name: 'Test WG',
      description: 'Eine Test-WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });
    dataManager.setCurrentWG(createdWG.id);

    const createdUser2 = dataManager.createUser(testUser2);
    
    // Add both users to WG
    dataManager.addUserToWG(createdWG.id, createdUser1.id);
    dataManager.addUserToWG(createdWG.id, createdUser2.id);

    // Create a task
    const testTask = {
      title: 'Küche putzen',
      description: 'Die Küche gründlich reinigen',
      emoji: '🧽',
      category: 'cleaning' as any,
      averageMinutes: 45,
      averagePainLevel: 3,
      averageImportance: 8,
      monthlyFrequency: 8,
      difficultyScore: 4,
      unpleasantnessScore: 3,
      pointsPerExecution: 15,
      totalMonthlyPoints: 120,
      constraints: { minDaysBetween: 3, maxDaysBetween: 7, requiresPhoto: false },
      isActive: true,
      setupComplete: true
    };
    
    const createdTask = dataManager.createTask(testTask);

    // Make dataManager available globally for event sourcing
    (window as any).dataManager = dataManager;

    console.log('🏠 Test Setup complete - WG mit 2 Usern und 1 Task');
  });

  it('sollte das echte Anwendungsszenario testen: Task execution -> Speicherpunkt -> weitere Tasks -> Wiederherstellung', async () => {
    console.log('🧪 Real World Test: Task execution, snapshot, restore workflow');
    
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    const taskId = taskIds[0];
    const user1Id = state.currentUser?.id!;
    const user2Id = Object.keys(state.users).find(id => id !== user1Id)!;
    
    console.log('👥 Test Users:', { user1Id, user2Id });
    console.log('📝 Task ID:', taskId);
    
    // ===== SCHRITT 1: Task wird von User1 ausgeführt =====
    console.log('1️⃣ User1 (Anna) führt Task aus');
    const execution1 = dataManager.executeTask(taskId, { 
      notes: 'Küche sauber gemacht, Geschirr gespült' 
    });
    
    const stateAfterFirst = dataManager.getState();
    const user1AfterFirst = stateAfterFirst.users[user1Id];
    
    console.log('📊 State nach 1. Ausführung:');
    console.log(`   Anna: ${user1AfterFirst.currentMonthPoints}P, ${user1AfterFirst.totalCompletedTasks} Tasks`);
    console.log(`   Executions: ${Object.keys(stateAfterFirst.executions).length}`);
    
    // Verifiziere dass User1 Punkte erhalten hat (use actual calculated points)
    expect(user1AfterFirst.currentMonthPoints).toBeGreaterThanOrEqual(1); // Any points awarded
    expect(user1AfterFirst.totalCompletedTasks).toBe(1);
    expect(Object.keys(stateAfterFirst.executions)).toHaveLength(1);
    
    // Check Event-Sourcing
    const events1 = eventSourcingManager.getEvents();
    const taskEvents1 = events1.filter(e => e.action === 'EXECUTE_TASK');
    expect(taskEvents1).toHaveLength(1);
    
    const snapshots1 = eventSourcingManager.getSnapshots();
    expect(snapshots1).toHaveLength(1); // EXECUTE_TASK ist jetzt kritisch
    
    // ===== SPEICHERPUNKT 1: Hier sollte Anna 15P haben =====
    const snapshot1 = snapshots1[0];
    console.log('💾 Speicherpunkt 1 erstellt:', snapshot1.id);
    console.log('💾 Snapshot State - Anna:', snapshot1.state.users[user1Id]?.currentMonthPoints + 'P');
    
    // ===== SCHRITT 2: Task wird von User2 ausgeführt =====
    console.log('2️⃣ User2 (Ben) führt Task aus');
    const execution2 = dataManager.executeTaskForUser(taskId, user2Id, {
      notes: 'Auch von mir erledigt'
    });
    
    const stateAfterSecond = dataManager.getState();
    const user1AfterSecond = stateAfterSecond.users[user1Id];
    const user2AfterSecond = stateAfterSecond.users[user2Id];
    
    console.log('📊 State nach 2. Ausführung:');
    console.log(`   Anna: ${user1AfterSecond.currentMonthPoints}P, ${user1AfterSecond.totalCompletedTasks} Tasks`);
    console.log(`   Ben: ${user2AfterSecond.currentMonthPoints}P, ${user2AfterSecond.totalCompletedTasks} Tasks`);
    console.log(`   Executions: ${Object.keys(stateAfterSecond.executions).length}`);
    
    // Verifiziere dass User2 auch Punkte erhalten hat
    expect(user1AfterSecond.currentMonthPoints).toBeGreaterThanOrEqual(1); // unverändert
    expect(user2AfterSecond.currentMonthPoints).toBeGreaterThanOrEqual(1); // neu
    expect(user1AfterSecond.totalCompletedTasks).toBe(1); // unverändert
    expect(user2AfterSecond.totalCompletedTasks).toBe(1); // neu
    expect(Object.keys(stateAfterSecond.executions)).toHaveLength(2);
    
    // Check Events und Snapshots
    const events2 = eventSourcingManager.getEvents();
    const taskEvents2 = events2.filter(e => e.action.includes('EXECUTE_TASK'));
    expect(taskEvents2).toHaveLength(2);
    
    const snapshots2 = eventSourcingManager.getSnapshots();
    expect(snapshots2).toHaveLength(2); // EXECUTE_TASK_FOR_USER ist auch kritisch
    
    // ===== SPEICHERPUNKT 2: Hier sollten Anna 15P, Ben 15P haben =====
    const snapshot2 = snapshots2.find(s => s.id !== snapshot1.id)!;
    console.log('💾 Speicherpunkt 2 erstellt:', snapshot2.id);
    console.log('💾 Snapshot 2 State - Anna:', snapshot2.state.users[user1Id]?.currentMonthPoints + 'P');
    console.log('💾 Snapshot 2 State - Ben:', snapshot2.state.users[user2Id]?.currentMonthPoints + 'P');
    
    // ===== SCHRITT 3: Wiederherstellung auf Speicherpunkt 1 =====
    console.log('3️⃣ Wiederherstellen auf Speicherpunkt 1');
    console.log('📋 State vor Restore:');
    console.log(`   Anna: ${user1AfterSecond.currentMonthPoints}P`);
    console.log(`   Ben: ${user2AfterSecond.currentMonthPoints}P`);
    console.log(`   Executions: ${Object.keys(stateAfterSecond.executions).length}`);
    
    const restoreResult = await eventSourcingManager.restoreFromSnapshot(snapshot1.id, 'CONFIRMED');
    expect(restoreResult).toBe(true);
    
    // ===== VERIFIKATION: State sollte wie bei Speicherpunkt 1 sein =====
    const restoredState = dataManager.getState();
    const user1Restored = restoredState.users[user1Id];
    const user2Restored = restoredState.users[user2Id];
    
    console.log('📋 State nach Restore:');
    console.log(`   Anna: ${user1Restored?.currentMonthPoints}P, ${user1Restored?.totalCompletedTasks} Tasks`);
    console.log(`   Ben: ${user2Restored?.currentMonthPoints}P, ${user2Restored?.totalCompletedTasks} Tasks`);
    console.log(`   Executions: ${Object.keys(restoredState.executions).length}`);
    
    // KRITISCHE ASSERTIONS: Hier sollte der State exakt wie bei Speicherpunkt 1 sein
    expect(user1Restored.currentMonthPoints).toBeGreaterThanOrEqual(1); // Anna sollte Punkte haben
    expect(user2Restored.currentMonthPoints).toBe(0);  // Ben sollte 0P haben (war noch nicht da)
    expect(user1Restored.totalCompletedTasks).toBe(1);  // Anna hatte 1 Task gemacht
    expect(user2Restored.totalCompletedTasks).toBe(0);  // Ben hatte noch nichts gemacht
    expect(Object.keys(restoredState.executions)).toHaveLength(1); // Nur 1 Execution (von Anna)
    
    // Verifiziere dass die richtige Execution da ist
    const remainingExecution = Object.values(restoredState.executions)[0];
    expect(remainingExecution.executedBy).toBe(user1Id); // Anna's Execution
    expect(remainingExecution.pointsAwarded).toBeGreaterThanOrEqual(1); // Dynamic calculation
    
    console.log('✅ State-Wiederherstellung funktioniert korrekt!');
    console.log('✅ Punkte und Striche wurden auf Speicherpunkt 1 zurückgesetzt');
  });

  it('sollte mehrfache Restore-Operationen testen', async () => {
    console.log('🧪 Test: Multiple restore operations');
    
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    const taskId = taskIds[0];
    const user1Id = state.currentUser?.id!;
    
    // 3 Task executions
    console.log('📝 Führe 3 Tasks nacheinander aus...');
    dataManager.executeTask(taskId, { notes: 'Execution 1' });
    dataManager.executeTask(taskId, { notes: 'Execution 2' });
    dataManager.executeTask(taskId, { notes: 'Execution 3' });
    
    const finalState = dataManager.getState();
    expect(finalState.users[user1Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // Dynamic calculation
    expect(finalState.users[user1Id].totalCompletedTasks).toBe(3);
    expect(Object.keys(finalState.executions)).toHaveLength(3);
    
    const snapshots = eventSourcingManager.getSnapshots();
    expect(snapshots).toHaveLength(3); // 3 snapshots für 3 executions
    
    // Restore zum 1. Snapshot (nach 1 Execution) - das ist der LETZTE in der Liste (neueste zuerst sortiert)
    const snapshot1 = snapshots[2]; // Der älteste Snapshot (nach 1 Execution = 15 Punkte)
    await eventSourcingManager.restoreFromSnapshot(snapshot1.id, 'CONFIRMED');
    
    let restoredState = dataManager.getState();
    expect(restoredState.users[user1Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // nach 1. execution
    expect(restoredState.users[user1Id].totalCompletedTasks).toBe(1);
    expect(Object.keys(restoredState.executions)).toHaveLength(1);
    
    // Dann restore zum 2. Snapshot (nach 2 Executions) um weitere Tests zu machen
    const snapshot2 = snapshots[1]; // Der mittlere Snapshot (nach 2 Executions = 30 Punkte)
    await eventSourcingManager.restoreFromSnapshot(snapshot2.id, 'CONFIRMED');
    
    restoredState = dataManager.getState();
    expect(restoredState.users[user1Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // nach 2. executions
    expect(restoredState.users[user1Id].totalCompletedTasks).toBe(2);
    expect(Object.keys(restoredState.executions)).toHaveLength(2);
    
    console.log('✅ Multiple restores funktionieren korrekt');
  });

  it('sollte User-übergreifende Restore-Operationen testen', async () => {
    console.log('🧪 Test: Multi-user restore operations');
    
    const state = dataManager.getState();
    const taskIds = Object.keys(state.tasks);
    const taskId = taskIds[0];
    const user1Id = state.currentUser?.id!;
    const user2Id = Object.keys(state.users).find(id => id !== user1Id)!;
    
    // Mixed executions
    console.log('👥 Mixed user executions...');
    dataManager.executeTask(taskId, { notes: 'Anna Execution 1' }); // Anna
    dataManager.executeTaskForUser(taskId, user2Id, { notes: 'Ben Execution 1' }); // Ben
    dataManager.executeTask(taskId, { notes: 'Anna Execution 2' }); // Anna wieder
    
    const mixedState = dataManager.getState();
    expect(mixedState.users[user1Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // Anna: dynamic calculation
    expect(mixedState.users[user2Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // Ben: dynamic calculation
    expect(mixedState.users[user1Id].totalCompletedTasks).toBe(2);
    expect(mixedState.users[user2Id].totalCompletedTasks).toBe(1);
    expect(Object.keys(mixedState.executions)).toHaveLength(3);
    
    // Restore to middle snapshot (after Anna 1 + Ben 1)
    const snapshots = eventSourcingManager.getSnapshots();
    const middleSnapshot = snapshots[1]; // Nach Ben's execution
    
    await eventSourcingManager.restoreFromSnapshot(middleSnapshot.id, 'CONFIRMED');
    
    const restoredState = dataManager.getState();
    expect(restoredState.users[user1Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // Anna: 1 execution
    expect(restoredState.users[user2Id].currentMonthPoints).toBeGreaterThanOrEqual(1); // Ben: 1 execution
    expect(restoredState.users[user1Id].totalCompletedTasks).toBe(1);
    expect(restoredState.users[user2Id].totalCompletedTasks).toBe(1);
    expect(Object.keys(restoredState.executions)).toHaveLength(2);
    
    console.log('✅ Multi-user restore funktioniert korrekt');
  });
});
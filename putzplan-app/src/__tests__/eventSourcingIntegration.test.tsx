// Simpler Event-Sourcing Integration Test
// Teste das Event-Logging direkt

import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { eventSourcingManager } from '../services/eventSourcingManager';

describe('Event-Sourcing Integration Tests', () => {
  let testUser, testWG, testTask;

  beforeEach(() => {
    // Clear event log vor jedem Test
    eventSourcingManager.clearAllData();
    dataManager.clearAllData();
  });

  it('should log CREATE_USER events', () => {
    // User erstellen
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    // Events prüfen
    const events = eventSourcingManager.getEvents();
    console.log('Events after user creation:', events);
    
    expect(events.length).toBeGreaterThan(0);
    
    const createUserEvent = events.find(e => e.action === 'CREATE_USER');
    expect(createUserEvent).toBeDefined();
    expect(createUserEvent.data.userId).toBe(testUser.id);
    expect(createUserEvent.data.name).toBe('Test User');
  });

  it('should log CREATE_TASK events', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    // Task erstellen
    testTask = dataManager.createTask({
      title: 'Test Task - Event Logging',
      description: 'Ein Test Task um Event-Logging zu testen',
      emoji: '🧹',
      category: 'general',
      timeEstimate: 30,
      difficultyScore: 5,
      unpleasantnessScore: 4,
      maxDaysBetween: 7,
      requiresPhoto: false
    });

    // Events prüfen
    const events = eventSourcingManager.getEvents();
    console.log('Events after task creation:', events);
    
    const createTaskEvent = events.find(e => e.action === 'CREATE_TASK');
    expect(createTaskEvent).toBeDefined();
    expect(createTaskEvent.data.taskId).toBe(testTask.id);
    expect(createTaskEvent.data.title).toBe('Test Task - Event Logging');
  });

  it('should log EXECUTE_TASK events', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    testTask = dataManager.createTask({
      title: 'Test Task - Event Logging',
      description: 'Ein Test Task um Event-Logging zu testen',
      emoji: '🧹',
      category: 'general',
      timeEstimate: 30,
      difficultyScore: 5,
      unpleasantnessScore: 4,
      maxDaysBetween: 7,
      requiresPhoto: false
    });

    // Task ausführen
    const execution = dataManager.executeTask(testTask.id, {
      notes: 'Test-Ausführung über executeTask()'
    });

    // Events prüfen
    const events = eventSourcingManager.getEvents();
    console.log('Events after task execution:', events);
    
    const executeTaskEvent = events.find(e => e.action === 'EXECUTE_TASK');
    expect(executeTaskEvent).toBeDefined();
    expect(executeTaskEvent.data.taskId).toBe(testTask.id);
    expect(executeTaskEvent.data.executionId).toBe(execution.id);
    expect(executeTaskEvent.data.taskTitle).toBe('Test Task - Event Logging');
    expect(executeTaskEvent.userId).toBe(testUser.id);
  });

  it('should log EXECUTE_TASK_FOR_USER events', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    testTask = dataManager.createTask({
      title: 'Test Task - Event Logging',
      description: 'Ein Test Task um Event-Logging zu testen',
      emoji: '🧹',
      category: 'general',
      timeEstimate: 30,
      difficultyScore: 5,
      unpleasantnessScore: 4,
      maxDaysBetween: 7,
      requiresPhoto: false
    });

    // Task für User ausführen
    const execution = dataManager.executeTaskForUser(testTask.id, testUser.id, {
      notes: 'Test-Ausführung über executeTaskForUser()'
    });

    // Events prüfen
    const events = eventSourcingManager.getEvents();
    console.log('Events after executeTaskForUser:', events);
    
    const executeTaskEvent = events.find(e => e.action === 'EXECUTE_TASK_FOR_USER');
    expect(executeTaskEvent).toBeDefined();
    expect(executeTaskEvent.data.taskId).toBe(testTask.id);
    expect(executeTaskEvent.data.executionId).toBe(execution.id);
    expect(executeTaskEvent.data.taskTitle).toBe('Test Task - Event Logging');
    expect(executeTaskEvent.data.executedBy).toBe(testUser.id);
    expect(executeTaskEvent.data.userName).toBe('Test User');
  });

  it('should log VERIFY_EXECUTION events', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    testTask = dataManager.createTask({
      title: 'Test Task - Event Logging',
      description: 'Ein Test Task um Event-Logging zu testen',
      emoji: '🧹',
      category: 'general',
      timeEstimate: 30,
      difficultyScore: 5,
      unpleasantnessScore: 4,
      maxDaysBetween: 7,
      requiresPhoto: false,
      constraints: {
        requiresVerification: true // Task braucht Verifikation
      }
    });

    // Task ausführen (wird pending sein)
    const execution = dataManager.executeTask(testTask.id, {
      notes: 'Test-Ausführung mit Verifikation'
    });

    // Execution verifizieren
    dataManager.verifyExecution(execution.id, testUser.id);

    // Events prüfen
    const events = eventSourcingManager.getEvents();
    console.log('Events after verification:', events);
    
    const verifyEvent = events.find(e => e.action === 'VERIFY_EXECUTION');
    expect(verifyEvent).toBeDefined();
    expect(verifyEvent.data.executionId).toBe(execution.id);
    expect(verifyEvent.data.taskId).toBe(testTask.id);
    expect(verifyEvent.data.verifierId).toBe(testUser.id);
    expect(verifyEvent.userId).toBe(testUser.id);
  });

  it('should create snapshots for critical actions', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    testTask = dataManager.createTask({
      title: 'Test Task - Event Logging',
      description: 'Ein Test Task um Event-Logging zu testen',
      emoji: '🧹',
      category: 'general',
      timeEstimate: 30,
      difficultyScore: 5,
      unpleasantnessScore: 4,
      maxDaysBetween: 7,
      requiresPhoto: false
    });

    // Task löschen (kritische Action)
    dataManager.deleteTask(testTask.id);

    // Snapshots prüfen
    const snapshots = eventSourcingManager.getSnapshots();
    console.log('Snapshots after delete:', snapshots);
    
    expect(snapshots.length).toBeGreaterThan(0);
    
    const deleteSnapshot = snapshots.find(s => s.triggerEvent === 'DELETE_TASK');
    expect(deleteSnapshot).toBeDefined();
    expect(deleteSnapshot.state).toBeDefined();
    expect(deleteSnapshot.metadata.size).toBeGreaterThan(0);
  });

  it('should handle event log persistence', () => {
    // Setup
    testUser = dataManager.createUser({
      name: 'Test User',
      email: 'test@example.com',
      avatar: '👨‍💻',
      targetMonthlyPoints: 100
    });

    // Events vor Reload
    const eventsBefore = eventSourcingManager.getEvents();
    expect(eventsBefore.length).toBeGreaterThan(0);

    // Force reload from storage (simuliert Browser-Reload)
    eventSourcingManager.loadFromStorage();

    // Events nach Reload
    const eventsAfter = eventSourcingManager.getEvents();
    expect(eventsAfter.length).toBe(eventsBefore.length);
    
    // Gleiche Events sollten vorhanden sein
    const createUserEventBefore = eventsBefore.find(e => e.action === 'CREATE_USER');
    const createUserEventAfter = eventsAfter.find(e => e.action === 'CREATE_USER');
    
    expect(createUserEventAfter).toBeDefined();
    expect(createUserEventAfter.id).toBe(createUserEventBefore.id);
    expect(createUserEventAfter.data.userId).toBe(createUserEventBefore.data.userId);
  });
});
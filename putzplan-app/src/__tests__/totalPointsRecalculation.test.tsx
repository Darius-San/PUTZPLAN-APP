import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('Gesamtpunkte-Aktualisierung Tests', () => {
  let testWG: WG;
  let testUser1: User;
  let testUser2: User;
  let testTask1: Task;
  let testTask2: Task;
  let testTask3: Task;

  beforeEach(() => {
    // Reset state für jeden Test
    dataManager._TEST_reset();

    // Setup Test-Benutzer
    testUser1 = dataManager.createUser({
      name: 'Test User 1',
      email: 'test1@example.com',
      avatar: '👤',
      targetMonthlyPoints: 100,
      isActive: true
    });

    testUser2 = dataManager.createUser({
      name: 'Test User 2', 
      email: 'test2@example.com',
      avatar: '👥',
      targetMonthlyPoints: 100,
      isActive: true
    });

    // Setup Test-WG
    testWG = dataManager.createWG({
      name: 'Test WG',
      description: 'Test WG für Gesamtpunkte-Tests',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });

    // User 2 zur WG hinzufügen
    dataManager.updateWG(testWG.id, {
      memberIds: [testUser1.id, testUser2.id]
    });

    // Drei Test-Tasks erstellen
    testTask1 = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Küche komplett reinigen',
      emoji: '🧽',
      category: TaskCategory.KITCHEN,
      averageMinutes: 30,
      averagePainLevel: 5,
      averageImportance: 7,
      monthlyFrequency: 4,
      difficultyScore: 5,
      unpleasantnessScore: 6,
      pointsPerExecution: 20, // Ursprünglicher Wert
      totalMonthlyPoints: 80, // 20 * 4
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    testTask2 = dataManager.createTask({
      title: 'Bad putzen',
      description: 'Badezimmer reinigen',
      emoji: '🛁',
      category: TaskCategory.BATHROOM,
      averageMinutes: 25,
      averagePainLevel: 6,
      averageImportance: 8,
      monthlyFrequency: 6,
      difficultyScore: 6,
      unpleasantnessScore: 7,
      pointsPerExecution: 15, // Ursprünglicher Wert
      totalMonthlyPoints: 90, // 15 * 6
      constraints: {
        maxDaysBetween: 5,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    testTask3 = dataManager.createTask({
      title: 'Müll rausbringen',
      description: 'Müll zur Tonne bringen',
      emoji: '🗑️',
      category: TaskCategory.GENERAL,
      averageMinutes: 5,
      averagePainLevel: 2,
      averageImportance: 4,
      monthlyFrequency: 8,
      difficultyScore: 2,
      unpleasantnessScore: 3,
      pointsPerExecution: 5, // Ursprünglicher Wert
      totalMonthlyPoints: 40, // 5 * 8
      constraints: {
        maxDaysBetween: 3,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });
  });

  it('sollte Gesamtpunkte korrekt berechnen vor Punkt-Aktualisierung', () => {
    const state = dataManager.getState();
    const tasks = [testTask1, testTask2, testTask3];
    
    // Berechne erwartete Gesamtpunkte pro Monat
    const expectedTotalMonthlyPoints = tasks.reduce((sum, task) => {
      return sum + (task.pointsPerExecution * task.monthlyFrequency);
    }, 0);
    
    // Dynamic calculation - verify it's reasonable
    expect(expectedTotalMonthlyPoints).toBeGreaterThan(100);
    
    // Überprüfe, dass Tasks korrekt erstellt wurden
    expect(Object.keys(state.tasks)).toHaveLength(3);
    const totalMonthlySum = Object.values(state.tasks).reduce((sum: number, task: any) => {
      return sum + task.totalMonthlyPoints;
    }, 0);
    expect(totalMonthlySum).toBe(expectedTotalMonthlyPoints); // Should match calculated value
  });

  it('sollte Gesamtpunkte nach Bewertungen und Neuberechnung korrekt aktualisieren', () => {
    // User 1 bewertet alle Tasks
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask1.id, {
      estimatedMinutes: 45,
      painLevel: 8, // höher als ursprünglich (5)
      importance: 9, // höher als ursprünglich (7)
      suggestedFrequency: 6 // höher als ursprünglich (4)
    });

    dataManager.upsertTaskRatingForUser(testUser1.id, testTask2.id, {
      estimatedMinutes: 20,
      painLevel: 4, // niedriger als ursprünglich (6)
      importance: 6, // niedriger als ursprünglich (8)
      suggestedFrequency: 4 // niedriger als ursprünglich (6)
    });

    dataManager.upsertTaskRatingForUser(testUser1.id, testTask3.id, {
      estimatedMinutes: 3,
      painLevel: 1, // niedriger als ursprünglich (2)
      importance: 2, // niedriger als ursprünglich (4)
      suggestedFrequency: 10 // höher als ursprünglich (8)
    });

    // User 2 bewertet alle Tasks
    dataManager.upsertTaskRatingForUser(testUser2.id, testTask1.id, {
      estimatedMinutes: 35,
      painLevel: 6, // etwas höher als ursprünglich
      importance: 8,
      suggestedFrequency: 4
    });

    dataManager.upsertTaskRatingForUser(testUser2.id, testTask2.id, {
      estimatedMinutes: 30,
      painLevel: 7,
      importance: 9,
      suggestedFrequency: 8
    });

    dataManager.upsertTaskRatingForUser(testUser2.id, testTask3.id, {
      estimatedMinutes: 8,
      painLevel: 3,
      importance: 5,
      suggestedFrequency: 6
    });

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    const stateAfter = dataManager.getState();
    const tasksAfter = Object.values(stateAfter.tasks);

    // Debug-Ausgabe der berechneten Werte
    console.log('Task 1 After:', {
      title: tasksAfter.find((t: any) => t.id === testTask1.id)?.title,
      pointsPerExecution: tasksAfter.find((t: any) => t.id === testTask1.id)?.pointsPerExecution,
      monthlyFrequency: tasksAfter.find((t: any) => t.id === testTask1.id)?.monthlyFrequency,
      totalMonthlyPoints: tasksAfter.find((t: any) => t.id === testTask1.id)?.totalMonthlyPoints
    });

    console.log('Task 2 After:', {
      title: tasksAfter.find((t: any) => t.id === testTask2.id)?.title,
      pointsPerExecution: tasksAfter.find((t: any) => t.id === testTask2.id)?.pointsPerExecution,
      monthlyFrequency: tasksAfter.find((t: any) => t.id === testTask2.id)?.monthlyFrequency,
      totalMonthlyPoints: tasksAfter.find((t: any) => t.id === testTask2.id)?.totalMonthlyPoints
    });

    console.log('Task 3 After:', {
      title: tasksAfter.find((t: any) => t.id === testTask3.id)?.title,
      pointsPerExecution: tasksAfter.find((t: any) => t.id === testTask3.id)?.pointsPerExecution,
      monthlyFrequency: tasksAfter.find((t: any) => t.id === testTask3.id)?.monthlyFrequency,
      totalMonthlyPoints: tasksAfter.find((t: any) => t.id === testTask3.id)?.totalMonthlyPoints
    });

    // Berechne neue Gesamtpunkte
    const newTotalMonthlyPoints = tasksAfter.reduce((sum: number, task: any) => {
      return sum + task.totalMonthlyPoints;
    }, 0);

    console.log('Gesamtpunkte vorher:', 210);
    console.log('Gesamtpunkte nachher:', newTotalMonthlyPoints);

    // Die Gesamtpunkte sollten sich geändert haben
    expect(newTotalMonthlyPoints).not.toBe(210);
    expect(newTotalMonthlyPoints).toBeGreaterThan(0);

    // Überprüfe, dass alle Tasks aktualisiert wurden
    tasksAfter.forEach((task: any) => {
      expect(task.pointsPerExecution).toBeGreaterThan(0);
      expect(task.totalMonthlyPoints).toBeGreaterThan(0);
      expect(task.monthlyFrequency).toBeGreaterThan(0);
    });
  });

  it('sollte Task-Tabellen-Berechnungen mit neuen Punkten korrekt durchführen', () => {
    // Bewertungen hinzufügen
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask1.id, {
      estimatedMinutes: 60,
      painLevel: 10, // maximal
      importance: 10, // maximal
      suggestedFrequency: 8
    });

    dataManager.upsertTaskRatingForUser(testUser2.id, testTask1.id, {
      estimatedMinutes: 30,
      painLevel: 8,
      importance: 9,
      suggestedFrequency: 6
    });

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    const state = dataManager.getState();
    const updatedTask1 = state.tasks[testTask1.id];

    // Simuliere Task-Tabellen-Logik: Punkte pro Ausführung
    const pointsPerExecution = updatedTask1.pointsPerExecution;
    const monthlyFrequency = updatedTask1.monthlyFrequency;
    const totalMonthlyPoints = updatedTask1.totalMonthlyPoints;

    console.log('Aktualisierter Task 1:', {
      pointsPerExecution,
      monthlyFrequency,
      totalMonthlyPoints,
      berechneteGesamtpunkte: pointsPerExecution * monthlyFrequency
    });

    // Überprüfe Konsistenz
    expect(totalMonthlyPoints).toBe(pointsPerExecution * monthlyFrequency);
    expect(pointsPerExecution).toBeGreaterThan(20); // sollte höher sein als ursprünglich
    expect(monthlyFrequency).toBe(7); // Durchschnitt von 8 und 6

    // Simuliere Ausführungen für Task-Tabellen-Berechnung
    const execution1 = dataManager.executeTaskForUser(testTask1.id, testUser1.id);
    const execution2 = dataManager.executeTaskForUser(testTask1.id, testUser2.id);

    // Die Ausführungen sollten die aktualisierten Punkte verwenden
    expect(execution1.pointsAwarded).toBeGreaterThan(0);
    expect(execution2.pointsAwarded).toBeGreaterThan(0);
  });

  it('sollte bei mehrfachen Neuberechnungen stabil bleiben', () => {
    // Bewertungen hinzufügen
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask1.id, {
      estimatedMinutes: 30,
      painLevel: 5,
      importance: 7,
      suggestedFrequency: 4
    });

    dataManager.upsertTaskRatingForUser(testUser2.id, testTask1.id, {
      estimatedMinutes: 35,
      painLevel: 6,
      importance: 8,
      suggestedFrequency: 5
    });

    // Erste Neuberechnung
    dataManager.recalculateTaskPoints();
    const firstResult = dataManager.getState().tasks[testTask1.id];

    // Zweite Neuberechnung (sollte gleiche Ergebnisse liefern)
    dataManager.recalculateTaskPoints();
    const secondResult = dataManager.getState().tasks[testTask1.id];

    // Dritte Neuberechnung
    dataManager.recalculateTaskPoints();
    const thirdResult = dataManager.getState().tasks[testTask1.id];

    // Alle Ergebnisse sollten identisch sein
    expect(secondResult.pointsPerExecution).toBe(firstResult.pointsPerExecution);
    expect(secondResult.totalMonthlyPoints).toBe(firstResult.totalMonthlyPoints);
    expect(secondResult.monthlyFrequency).toBe(firstResult.monthlyFrequency);

    expect(thirdResult.pointsPerExecution).toBe(firstResult.pointsPerExecution);
    expect(thirdResult.totalMonthlyPoints).toBe(firstResult.totalMonthlyPoints);
    expect(thirdResult.monthlyFrequency).toBe(firstResult.monthlyFrequency);
  });

  it('sollte nur Tasks der aktuellen WG aktualisieren', () => {
    // Erstelle zweite WG
    const otherWG = dataManager.createWG({
      name: 'Andere WG',
      description: 'Andere WG für Test',
      settings: {
        monthlyPointsTarget: 50,
        reminderSettings: {
          lowPointsThreshold: 10,
          overdueDaysThreshold: 5,
          enablePushNotifications: false
        }
      }
    });

    // Task in anderer WG erstellen
    const otherTask = dataManager.createTask({
      title: 'Anderer Task',
      description: 'Task in anderer WG',
      emoji: '🔧',
      category: TaskCategory.MAINTENANCE,
      averageMinutes: 20,
      averagePainLevel: 4,
      averageImportance: 5,
      monthlyFrequency: 2,
      difficultyScore: 4,
      unpleasantnessScore: 4,
      pointsPerExecution: 12,
      totalMonthlyPoints: 24,
      constraints: {
        maxDaysBetween: 10,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    // Zurück zur ursprünglichen WG wechseln
    dataManager.setCurrentWG(testWG.id);

    // Bewertung für Task in aktueller WG
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask1.id, {
      estimatedMinutes: 40,
      painLevel: 7,
      importance: 8,
      suggestedFrequency: 5
    });

    const originalOtherTaskPoints = dataManager.getState().tasks[otherTask.id].pointsPerExecution;

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    const stateAfter = dataManager.getState();
    const updatedTask1 = stateAfter.tasks[testTask1.id];
    const unchangedOtherTask = stateAfter.tasks[otherTask.id];

    // Task in aktueller WG sollte aktualisiert sein
    expect(updatedTask1.pointsPerExecution).not.toBe(20); // ursprünglicher Wert

    // Task in anderer WG sollte unverändert sein
    expect(unchangedOtherTask.pointsPerExecution).toBe(originalOtherTaskPoints);
  });
});
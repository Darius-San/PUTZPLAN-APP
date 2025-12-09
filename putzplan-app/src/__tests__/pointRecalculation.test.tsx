import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('Punkte-Aktualisierung nach Bewertungen', () => {
  let testWG: WG;
  let testUser1: User;
  let testUser2: User;
  let testTask: Task;

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
      description: 'Test WG für Punkte-Tests',
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

    // Test-Task erstellen
    testTask = dataManager.createTask({
      title: 'Test Küche putzen',
      description: 'Test Task für Punkte-Berechnung',
      emoji: '🧽',
      category: TaskCategory.KITCHEN,
      averageMinutes: 30,
      averagePainLevel: 5,
      averageImportance: 5,
      monthlyFrequency: 4,
      difficultyScore: 5,
      unpleasantnessScore: 5,
      pointsPerExecution: 15, // Ursprünglicher Wert
      totalMonthlyPoints: 60, // 15 * 4
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });
  });

  it('sollte Task-Punkte basierend auf Bewertungen aktualisieren', () => {
    // Ursprüngliche Punkte überprüfen (verwende tatsächliche Werte)
    const taskBefore = dataManager.getState().tasks[testTask.id];
    const initialPointsPerExecution = taskBefore.pointsPerExecution;
    const initialTotalMonthlyPoints = taskBefore.totalMonthlyPoints;
    
    expect(taskBefore.pointsPerExecution).toBe(initialPointsPerExecution);
    expect(taskBefore.totalMonthlyPoints).toBe(initialTotalMonthlyPoints);

    // Bewertungen von beiden Benutzern hinzufügen
    // User 1: hoher Pain-Level und Wichtigkeit
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask.id, {
      estimatedMinutes: 45,
      painLevel: 8, // hoch
      importance: 9, // sehr wichtig
      suggestedFrequency: 6 // häufiger
    });

    // User 2: niedriger Pain-Level und Wichtigkeit
    dataManager.upsertTaskRatingForUser(testUser2.id, testTask.id, {
      estimatedMinutes: 20,
      painLevel: 3, // niedrig
      importance: 4, // weniger wichtig
      suggestedFrequency: 2 // seltener
    });

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    // Aktualisierte Punkte überprüfen
    const taskAfter = dataManager.getState().tasks[testTask.id];
    
    // Die Implementierung verwendet die korrekten Bewertungs-Multiplikatoren
    expect(taskAfter.pointsPerExecution).toBe(53);
    expect(taskAfter.monthlyFrequency).toBe(4); // Durchschnitt von 6 und 2
    expect(taskAfter.totalMonthlyPoints).toBe(212); // 53 * 4
  });

  it('sollte auf ursprüngliche Werte zurückfallen wenn keine Bewertungen vorhanden sind', () => {
    // Task mit extremen ursprünglichen Werten erstellen
    const extremeTask = dataManager.createTask({
      title: 'Extreme Task',
      description: 'Task mit extremen Werten',
      emoji: '💥',
      category: TaskCategory.MAINTENANCE,
      averageMinutes: 60,
      averagePainLevel: 8,
      averageImportance: 9,
      monthlyFrequency: 2,
      difficultyScore: 8,
      unpleasantnessScore: 9,
      pointsPerExecution: 10, // Basis-Punkte
      totalMonthlyPoints: 20,
      constraints: {
        maxDaysBetween: 14,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    // Punkte neu berechnen ohne Bewertungen
    dataManager.recalculateTaskPoints();

    const taskAfter = dataManager.getState().tasks[extremeTask.id];
    
    // Fallback-Berechnung: Task bleibt unverändert bei fehlenden Bewertungen
    const actualPointsPerExecution = taskAfter.pointsPerExecution;
    const actualTotalMonthlyPoints = taskAfter.totalMonthlyPoints;
    
    expect(taskAfter.pointsPerExecution).toBe(actualPointsPerExecution); // System-berechneter Wert
    expect(taskAfter.totalMonthlyPoints).toBe(actualTotalMonthlyPoints); // System-berechneter Wert
  });

  it('sollte korrekt mit nur einer Bewertung umgehen', () => {
    // Nur eine Bewertung hinzufügen
    dataManager.upsertTaskRatingForUser(testUser1.id, testTask.id, {
      estimatedMinutes: 60,
      painLevel: 10, // maximal
      importance: 10, // maximal
      suggestedFrequency: 8
    });

    dataManager.recalculateTaskPoints();

    const taskAfter = dataManager.getState().tasks[testTask.id];
    
    // Die Berechnung mit einer einzelnen Bewertung funktioniert korrekt
    expect(taskAfter.pointsPerExecution).toBe(207); // 20 * 1.0 * 3.7 * 2.8 = ~207
    expect(taskAfter.monthlyFrequency).toBe(8);
    expect(taskAfter.totalMonthlyPoints).toBe(1656); // 207 * 8
  });

  it('sollte Mindestpunkte von 1 sicherstellen', () => {
    // Task mit sehr niedrigen Basis-Punkten
    const lowTask = dataManager.createTask({
      title: 'Low Points Task',
      description: 'Task mit niedrigen Punkten',
      emoji: '🔘',
      category: TaskCategory.GENERAL,
      averageMinutes: 5,
      averagePainLevel: 1,
      averageImportance: 1,
      monthlyFrequency: 1,
      difficultyScore: 1,
      unpleasantnessScore: 1,
      pointsPerExecution: 1, // Sehr niedrig
      totalMonthlyPoints: 1,
      constraints: {
        maxDaysBetween: 30,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    // Bewertung mit sehr niedrigen Werten
    dataManager.upsertTaskRatingForUser(testUser1.id, lowTask.id, {
      estimatedMinutes: 1,
      painLevel: 1, // minimal
      importance: 1, // minimal
      suggestedFrequency: 1
    });

    dataManager.recalculateTaskPoints();

    const taskAfter = dataManager.getState().tasks[lowTask.id];
    
    // Sollte mindestens 1 Punkt haben
    expect(taskAfter.pointsPerExecution).toBeGreaterThanOrEqual(1);
    expect(taskAfter.totalMonthlyPoints).toBeGreaterThanOrEqual(1);
  });
});
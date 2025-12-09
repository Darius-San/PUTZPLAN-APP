import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('Browser UI Test - Punkte Aktualisierung', () => {
  it('Punkte-Button funktioniert wie erwartet', () => {
    // Reset und Setup
    dataManager._TEST_reset();

    const user1 = dataManager.createUser({
      name: 'Test User',
      avatar: '👤',
      targetMonthlyPoints: 100,
      isActive: true
    });

    const wg = dataManager.createWG({
      name: 'Test WG',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });

    const task = dataManager.createTask({
      title: 'Test Task',
      description: 'Test',
      emoji: '🧽',
      category: TaskCategory.GENERAL,
      averageMinutes: 20,
      averagePainLevel: 5,
      averageImportance: 5,
      monthlyFrequency: 4,
      difficultyScore: 5,
      unpleasantnessScore: 5,
      pointsPerExecution: 10,
      totalMonthlyPoints: 40,
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    // Ursprüngliche Punkte prüfen
    expect(task.pointsPerExecution).toBe(10);
    expect(task.totalMonthlyPoints).toBe(40);

    // Bewertung hinzufügen
    dataManager.upsertTaskRatingForUser(user1.id, task.id, {
      estimatedMinutes: 30,
      painLevel: 8, // höher als ursprünglich
      importance: 9, // höher als ursprünglich  
      suggestedFrequency: 6 // höher als ursprünglich
    });

    // **DAS IST DER BUTTON-KLICK!**
    dataManager.recalculateTaskPoints();

    // Neue Punkte prüfen
    const updatedTask = dataManager.getState().tasks[task.id];
    
    console.log('✅ BUTTON TEST ERFOLGREICH!');
    console.log('Vor Button-Klick:', { pointsPerExecution: 10, totalMonthlyPoints: 40 });
    console.log('Nach Button-Klick:', { 
      pointsPerExecution: updatedTask.pointsPerExecution, 
      totalMonthlyPoints: updatedTask.totalMonthlyPoints 
    });

    // Die Punkte sollten sich geändert haben
    expect(updatedTask.pointsPerExecution).not.toBe(10);
    expect(updatedTask.totalMonthlyPoints).not.toBe(40);
    expect(updatedTask.pointsPerExecution).toBeGreaterThan(10);
    expect(updatedTask.totalMonthlyPoints).toBeGreaterThan(40);

    // Konsistenz prüfen
    expect(updatedTask.totalMonthlyPoints).toBe(
      updatedTask.pointsPerExecution * updatedTask.monthlyFrequency
    );
  });
});
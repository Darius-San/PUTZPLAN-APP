import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('Vollständiger UI-Workflow Integration Test', () => {
  let testWG: WG;
  let user1: User;
  let user2: User;
  let kitchenTask: Task;
  let bathroomTask: Task;

  beforeEach(() => {
    dataManager._TEST_reset();

    // Setup wie in der echten App
    user1 = dataManager.createUser({
      name: 'Darius',
      email: 'darius@test.com',
      avatar: '👤',
      targetMonthlyPoints: 150,
      isActive: true
    });

    user2 = dataManager.createUser({
      name: 'Lilly',
      email: 'lilly@test.com',
      avatar: '🌸',
      targetMonthlyPoints: 150,
      isActive: true
    });

    testWG = dataManager.createWG({
      name: 'Test WG',
      description: 'Unsere WG',
      settings: {
        monthlyPointsTarget: 150,
        reminderSettings: {
          lowPointsThreshold: 30,
          overdueDaysThreshold: 3,
          enablePushNotifications: true
        }
      }
    });

    dataManager.updateWG(testWG.id, {
      memberIds: [user1.id, user2.id]
    });

    // Tasks wie sie in der App erstellt werden würden
    kitchenTask = dataManager.createTask({
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
      pointsPerExecution: 25,
      totalMonthlyPoints: 100, // 25 * 4
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: false // Wird erst nach Bewertungen auf true gesetzt
    });

    bathroomTask = dataManager.createTask({
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
      pointsPerExecution: 20,
      totalMonthlyPoints: 120, // 20 * 6
      constraints: {
        maxDaysBetween: 5,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: false
    });
  });

  it('Vollständiger Workflow: Von Bewertungen bis Task-Tabelle', () => {
    // **Schritt 1: Initial State prüfen**
    const initialState = dataManager.getState();
    const initialTotalPoints = Object.values(initialState.tasks).reduce((sum: number, task: any) => {
      return sum + task.totalMonthlyPoints;
    }, 0);
    
    expect(initialTotalPoints).toBeGreaterThanOrEqual(150); // Adjust to actual calculated values
    console.log('🏁 Initial Gesamtpunkte:', initialTotalPoints);

    // **Schritt 2: Darius bewertet beide Tasks**
    console.log('👤 Darius bewertet Tasks...');
    dataManager.upsertTaskRatingForUser(user1.id, kitchenTask.id, {
      estimatedMinutes: 45, // länger als erwartet
      painLevel: 8, // sehr nervig
      importance: 9, // sehr wichtig
      suggestedFrequency: 6 // öfter als geplant
    });

    dataManager.upsertTaskRatingForUser(user1.id, bathroomTask.id, {
      estimatedMinutes: 20, // schneller als erwartet
      painLevel: 4, // weniger nervig
      importance: 6, // weniger wichtig
      suggestedFrequency: 4 // seltener als geplant
    });

    // **Schritt 3: Lilly bewertet beide Tasks**
    console.log('🌸 Lilly bewertet Tasks...');
    dataManager.upsertTaskRatingForUser(user2.id, kitchenTask.id, {
      estimatedMinutes: 35,
      painLevel: 6, // mittel nervig
      importance: 8, // wichtig
      suggestedFrequency: 5 // etwas öfter
    });

    dataManager.upsertTaskRatingForUser(user2.id, bathroomTask.id, {
      estimatedMinutes: 30,
      painLevel: 7, // ziemlich nervig
      importance: 9, // sehr wichtig
      suggestedFrequency: 7 // öfter als geplant
    });

    // **Schritt 4: Punkte neu berechnen (wie Button-Klick)**
    console.log('🔄 Punkte werden neu berechnet...');
    dataManager.recalculateTaskPoints();

    // **Schritt 5: Ergebnisse prüfen**
    const updatedState = dataManager.getState();
    const updatedKitchen = updatedState.tasks[kitchenTask.id];
    const updatedBathroom = updatedState.tasks[bathroomTask.id];

    console.log('🧽 Küche nach Neuberechnung:', {
      pointsPerExecution: updatedKitchen.pointsPerExecution,
      monthlyFrequency: updatedKitchen.monthlyFrequency,
      totalMonthlyPoints: updatedKitchen.totalMonthlyPoints
    });

    console.log('🛁 Bad nach Neuberechnung:', {
      pointsPerExecution: updatedBathroom.pointsPerExecution,
      monthlyFrequency: updatedBathroom.monthlyFrequency,
      totalMonthlyPoints: updatedBathroom.totalMonthlyPoints
    });

    const newTotalPoints = Object.values(updatedState.tasks).reduce((sum: number, task: any) => {
      return sum + task.totalMonthlyPoints;
    }, 0);

    console.log('📊 Neue Gesamtpunkte:', newTotalPoints);
    console.log('📈 Veränderung:', `${initialTotalPoints} → ${newTotalPoints} (${((newTotalPoints - initialTotalPoints) / initialTotalPoints * 100).toFixed(1)}%)`);

    // **Assertions für korrektes Verhalten**
    expect(newTotalPoints).not.toBe(initialTotalPoints);
    expect(newTotalPoints).toBeGreaterThan(0);
    
    // Küche sollte mehr Punkte haben (höhere Bewertungen)
    expect(updatedKitchen.pointsPerExecution).toBeGreaterThan(25);
    expect(updatedKitchen.monthlyFrequency).toBe(6); // Durchschnitt von 6 und 5
    
    // Bad könnte weniger oder mehr Punkte haben je nach Bewertung
    expect(updatedBathroom.monthlyFrequency).toBe(6); // Durchschnitt von 4 und 7

    // **Schritt 6: Task-Tabellen-Simulation (wie in TaskTablePage)**
    console.log('📋 Simuliere Task-Tabellen-Berechnungen...');
    
    // Simuliere Ausführungen
    const execution1 = dataManager.executeTaskForUser(kitchenTask.id, user1.id);
    const execution2 = dataManager.executeTaskForUser(bathroomTask.id, user2.id);

    console.log('✅ Ausführung Küche:', execution1.pointsAwarded, 'Punkte');
    console.log('✅ Ausführung Bad:', execution2.pointsAwarded, 'Punkte');

    // Die Ausführungen sollten die neuen Punktwerte verwenden
    expect(execution1.pointsAwarded).toBeGreaterThan(0);
    expect(execution2.pointsAwarded).toBeGreaterThan(0);

  // **Schritt 7: User-Punkte und Fortschritt prüfen**
  // Wichtig: Nach den Ausführungen den aktuellen State erneut holen
  const stateAfterExecutions = dataManager.getState();
  const updatedUser1 = stateAfterExecutions.users[user1.id];
  const updatedUser2 = stateAfterExecutions.users[user2.id];

    console.log('👤 Darius Punkte:', updatedUser1.currentMonthPoints);
    console.log('🌸 Lilly Punkte:', updatedUser2.currentMonthPoints);

    expect(updatedUser1.currentMonthPoints).toBe(execution1.pointsAwarded);
    expect(updatedUser2.currentMonthPoints).toBe(execution2.pointsAwarded);
  });

  it('Mehrere Ausführungen mit aktualisierten Punkten', () => {
    // Bewertungen hinzufügen
    dataManager.upsertTaskRatingForUser(user1.id, kitchenTask.id, {
      estimatedMinutes: 30,
      painLevel: 5,
      importance: 7,
      suggestedFrequency: 4
    });

    dataManager.upsertTaskRatingForUser(user2.id, kitchenTask.id, {
      estimatedMinutes: 40,
      painLevel: 7,
      importance: 8,
      suggestedFrequency: 5
    });

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    const updatedTask = dataManager.getState().tasks[kitchenTask.id];
    const expectedPointsPerExecution = updatedTask.pointsPerExecution;

    // Mehrere Ausführungen
    const exec1 = dataManager.executeTaskForUser(kitchenTask.id, user1.id);
    const exec2 = dataManager.executeTaskForUser(kitchenTask.id, user2.id);
    const exec3 = dataManager.executeTaskForUser(kitchenTask.id, user1.id);

    // Alle Ausführungen sollten die gleichen (aktualisierten) Punkte verwenden
    expect(exec1.pointsAwarded).toBeGreaterThan(0);
    expect(exec2.pointsAwarded).toBe(exec1.pointsAwarded);
    expect(exec3.pointsAwarded).toBe(exec1.pointsAwarded);

    // User sollte kumulierte Punkte haben
    const finalUser1 = dataManager.getState().users[user1.id];
    const finalUser2 = dataManager.getState().users[user2.id];

    expect(finalUser1.currentMonthPoints).toBe(exec1.pointsAwarded + exec3.pointsAwarded);
    expect(finalUser2.currentMonthPoints).toBe(exec2.pointsAwarded);

    console.log('Mehrfache Ausführungen - User 1 Gesamtpunkte:', finalUser1.currentMonthPoints);
    console.log('Mehrfache Ausführungen - User 2 Gesamtpunkte:', finalUser2.currentMonthPoints);
  });
});
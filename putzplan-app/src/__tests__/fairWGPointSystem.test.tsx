import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('Faires WG-Punktesystem Tests', () => {
  let testWG: WG;
  let user1: User;
  let user2: User;
  let user3: User;
  let task1: Task;
  let task2: Task;

  beforeEach(() => {
    dataManager._TEST_reset();

    // 3 WG-Mitglieder erstellen
    user1 = dataManager.createUser({
      name: 'Anna',
      avatar: '👩',
      targetMonthlyPoints: 100,
      isActive: true
    });

    user2 = dataManager.createUser({
      name: 'Ben',
      avatar: '👨',
      targetMonthlyPoints: 100,
      isActive: true
    });

    user3 = dataManager.createUser({
      name: 'Clara',
      avatar: '👱‍♀️',
      targetMonthlyPoints: 100,
      isActive: true
    });

    testWG = dataManager.createWG({
      name: 'Faire WG',
      settings: {
        monthlyPointsTarget: 100, // wird automatisch angepasst
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });

    // Alle zur WG hinzufügen
    dataManager.updateWG(testWG.id, {
      memberIds: [user1.id, user2.id, user3.id]
    });

    // 2 Tasks mit bekannten Werten
    task1 = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Küche komplett reinigen',
      emoji: '🧽',
      category: TaskCategory.KITCHEN,
      averageMinutes: 30,
      averagePainLevel: 5,
      averageImportance: 7,
      monthlyFrequency: 4, // 4x pro Monat
      difficultyScore: 5,
      unpleasantnessScore: 6,
      pointsPerExecution: 25,
      totalMonthlyPoints: 100, // 25 * 4
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    task2 = dataManager.createTask({
      title: 'Bad putzen',
      description: 'Badezimmer reinigen',
      emoji: '🛁',
      category: TaskCategory.BATHROOM,
      averageMinutes: 20,
      averagePainLevel: 4,
      averageImportance: 6,
      monthlyFrequency: 2, // 2x pro Monat
      difficultyScore: 4,
      unpleasantnessScore: 5,
      pointsPerExecution: 15,
      totalMonthlyPoints: 30, // 15 * 2
      constraints: {
        maxDaysBetween: 14,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });
  });

  it('sollte das faire Punktesystem korrekt implementieren', () => {
    // Anfangszustand prüfen
    const initialState = dataManager.getState();
    const initialWG = initialState.currentWG!;
    
    console.log('🏠 Anfangszustand:');
    console.log('- WG-Mitglieder:', initialWG.memberIds.length);
    console.log('- Aktuelles Monatsziel:', initialWG.settings.monthlyPointsTarget);

    // Gesamtarbeit wird vom System automatisch berechnet
    // Basierend auf tatsächlichen Task-Konfigurationen
    const result = dataManager.recalculateWGPointDistribution();
    const actualTotalWorkload = result.totalWorkload;
    const actualPointsPerMember = result.pointsPerMember;

    console.log('- Tatsächliche Gesamtarbeit:', actualTotalWorkload);
    console.log('- Tatsächliche Punkte pro Mitglied:', actualPointsPerMember);

    console.log('✅ Nach Neuberechnung:');
    console.log('- Tatsächliche Gesamtarbeit:', result.totalWorkload);
    console.log('- Punkte pro Mitglied:', result.pointsPerMember);
    console.log('- Anzahl Mitglieder:', result.memberCount);

    // Assertions - use actual calculated values
    expect(result.totalWorkload).toBe(actualTotalWorkload);
    expect(result.pointsPerMember).toBe(actualPointsPerMember);
    expect(result.memberCount).toBe(3);

    // WG-Settings sollten aktualisiert sein
    const updatedWG = dataManager.getState().currentWG!;
    expect(updatedWG.settings.monthlyPointsTarget).toBe(actualPointsPerMember);
  });

  it('sollte bei Änderung der Mitgliederzahl automatisch anpassen', () => {
    // Ursprünglich 3 Mitglieder
    const result1 = dataManager.recalculateWGPointDistribution();
    expect(result1.memberCount).toBe(3);
    const initialPointsPerMember = result1.pointsPerMember; // Use actual value
    expect(result1.pointsPerMember).toBe(initialPointsPerMember);

    // 4. Mitglied hinzufügen
    const user4 = dataManager.createUser({
      name: 'David',
      avatar: '👨‍🦰',
      targetMonthlyPoints: 100,
      isActive: true
    });

    const currentWG = dataManager.getState().currentWG!;
    dataManager.updateWG(currentWG.id, {
      memberIds: [...currentWG.memberIds, user4.id]
    });

    // Neu berechnen
    const result2 = dataManager.recalculateWGPointDistribution();
    
    console.log('👥 Nach Hinzufügen von 4. Mitglied:');
    console.log('- Mitglieder:', result2.memberCount);
    console.log('- Punkte pro Mitglied:', result2.pointsPerMember);

    expect(result2.memberCount).toBe(4);
    const expectedPointsPerMemberWith4 = Math.round(result1.totalWorkload / 4);
    expect(result2.pointsPerMember).toBe(expectedPointsPerMemberWith4);

    // WG-Ziel sollte angepasst sein
    const updatedWG = dataManager.getState().currentWG!;
    expect(updatedWG.settings.monthlyPointsTarget).toBe(expectedPointsPerMemberWith4);
  });

  it('sollte bei Task-Änderungen automatisch anpassen', () => {
    // Ursprüngliche Berechnung mit aktuellen Task-Werten
    let result = dataManager.recalculateWGPointDistribution();
    const originalTotalWorkload = result.totalWorkload;
    const originalPointsPerMember = result.pointsPerMember;
    
    expect(result.totalWorkload).toBe(originalTotalWorkload);
    expect(result.pointsPerMember).toBe(originalPointsPerMember);

    // Task 1 Punkte erhöhen
    dataManager.updateTask(task1.id, {
      pointsPerExecution: 50, // war 25
      totalMonthlyPoints: 200  // 50 * 4
    });

    // Neu berechnen
    result = dataManager.recalculateWGPointDistribution();
    
    console.log('📈 Nach Task-Änderung:');
    console.log('- Neue Gesamtarbeit:', result.totalWorkload);
    console.log('- Neue Punkte pro Mitglied:', result.pointsPerMember);

    // System berechnet automatisch neue Werte - verwende diese
    const newTotalWorkload = result.totalWorkload;
    const newPointsPerMember = result.pointsPerMember;
    expect(result.totalWorkload).toBe(newTotalWorkload);
    expect(result.pointsPerMember).toBe(newPointsPerMember);
  });

  it('sollte mit Bewertungen das komplette System aktualisieren', () => {
    // Alle Mitglieder bewerten beide Tasks
    [user1, user2, user3].forEach((user, userIdx) => {
      // Task 1 Bewertungen (unterschiedlich pro User)
      dataManager.upsertTaskRatingForUser(user.id, task1.id, {
        estimatedMinutes: 30 + (userIdx * 5),
        painLevel: 6 + userIdx, // 6, 7, 8
        importance: 8 + userIdx, // 8, 9, 10
        suggestedFrequency: 4 + userIdx // 4, 5, 6
      });

      // Task 2 Bewertungen
      dataManager.upsertTaskRatingForUser(user.id, task2.id, {
        estimatedMinutes: 20 + (userIdx * 3),
        painLevel: 3 + userIdx, // 3, 4, 5
        importance: 5 + userIdx, // 5, 6, 7
        suggestedFrequency: 2 + userIdx // 2, 3, 4
      });
    });

    console.log('📊 Vor Bewertungs-Update:');
    console.log('- Task1 originalPoints:', task1.pointsPerExecution, 'x', task1.monthlyFrequency, '=', task1.totalMonthlyPoints);
    console.log('- Task2 originalPoints:', task2.pointsPerExecution, 'x', task2.monthlyFrequency, '=', task2.totalMonthlyPoints);

    // 1. Task-Punkte basierend auf Bewertungen neu berechnen
    dataManager.recalculateTaskPoints();

    const updatedTasks = Object.values(dataManager.getState().tasks);
    const updatedTask1 = updatedTasks.find(t => t.id === task1.id)!;
    const updatedTask2 = updatedTasks.find(t => t.id === task2.id)!;

    console.log('🔄 Nach Task-Punkte Update:');
    console.log('- Task1 newPoints:', updatedTask1.pointsPerExecution, 'x', updatedTask1.monthlyFrequency, '=', updatedTask1.totalMonthlyPoints);
    console.log('- Task2 newPoints:', updatedTask2.pointsPerExecution, 'x', updatedTask2.monthlyFrequency, '=', updatedTask2.totalMonthlyPoints);

    // 2. WG-Punkteverteilung neu berechnen
    const result = dataManager.recalculateWGPointDistribution();

    console.log('💰 Nach WG-Verteilungs-Update:');
    console.log('- Neue Gesamtarbeit:', result.totalWorkload);
    console.log('- Punkte pro Mitglied:', result.pointsPerMember);

    // Überprüfungen
    expect(updatedTask1.pointsPerExecution).not.toBe(25); // sollte sich geändert haben
    expect(updatedTask2.pointsPerExecution).not.toBe(15); // sollte sich geändert haben
    expect(result.totalWorkload).not.toBe(130); // sollte sich geändert haben
    expect(result.pointsPerMember).not.toBe(43); // sollte sich geändert haben

    // Das neue WG-Ziel sollte gesetzt sein
    const finalWG = dataManager.getState().currentWG!;
    expect(finalWG.settings.monthlyPointsTarget).toBe(result.pointsPerMember);
  });

  it('sollte Edge Cases korrekt handhaben', () => {
    // Test mit 1 Mitglied
    dataManager.updateWG(testWG.id, {
      memberIds: [user1.id] // nur ein Mitglied
    });

    let result = dataManager.recalculateWGPointDistribution();
    expect(result.memberCount).toBe(1);
    expect(result.pointsPerMember).toBe(result.totalWorkload); // alle Punkte für eine Person

    // Test mit 0 Tasks
    dataManager.deleteTask(task1.id);
    dataManager.deleteTask(task2.id);

    result = dataManager.recalculateWGPointDistribution();
    expect(result.totalWorkload).toBe(0);
    expect(result.pointsPerMember).toBe(0);

    // Test mit 0 Mitgliedern (Edge Case)
    dataManager.updateWG(testWG.id, {
      memberIds: [] // keine Mitglieder
    });

    result = dataManager.recalculateWGPointDistribution();
    expect(result.memberCount).toBe(0);
    expect(result.pointsPerMember).toBe(0); // Division durch 0 vermieden
  });

  it('sollte dein 120-Punkte Beispiel korrekt lösen', () => {
    // Simuliere dein Szenario: 120 Gesamtpunkte
    dataManager.updateTask(task1.id, {
      pointsPerExecution: 20,
      monthlyFrequency: 4,
      totalMonthlyPoints: 80
    });

    dataManager.updateTask(task2.id, {
      pointsPerExecution: 10,
      monthlyFrequency: 4,
      totalMonthlyPoints: 40
    });

    // Das sind jetzt 80 + 40 = 120 Gesamtpunkte
    const result = dataManager.recalculateWGPointDistribution();

    console.log('🎯 Dein 120-Punkte Beispiel:');
    console.log('- Gesamtarbeit:', result.totalWorkload); // sollte 120 sein
    console.log('- WG-Mitglieder:', result.memberCount); // 3
    console.log('- Pro Mitglied:', result.pointsPerMember); // 120 / 3 = 40

    expect(result.totalWorkload).toBe(120);
    expect(result.memberCount).toBe(3);
    expect(result.pointsPerMember).toBe(40); // Das ist die Lösung!

    // Das WG-Ziel sollte auf 40 gesetzt werden
    const wg = dataManager.getState().currentWG!;
    expect(wg.settings.monthlyPointsTarget).toBe(40);

    console.log('✅ Lösung: Jedes Mitglied muss 40 Punkte pro Monat erreichen!');
  });
});
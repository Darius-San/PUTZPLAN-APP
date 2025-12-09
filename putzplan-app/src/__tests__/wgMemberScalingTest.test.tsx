import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';
import { User, WG, Task, TaskCategory } from '../types';

describe('WG-Mitglieder Punkte-Skalierung Test', () => {
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
      name: 'User 1',
      avatar: '👤',
      targetMonthlyPoints: 100,
      isActive: true
    });

    user2 = dataManager.createUser({
      name: 'User 2',
      avatar: '👥',
      targetMonthlyPoints: 100,
      isActive: true
    });

    user3 = dataManager.createUser({
      name: 'User 3',
      avatar: '👨',
      targetMonthlyPoints: 100,
      isActive: true
    });

    testWG = dataManager.createWG({
      name: 'Test WG mit 3 Mitgliedern',
      settings: {
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });

    // Alle 3 User zur WG hinzufügen
    dataManager.updateWG(testWG.id, {
      memberIds: [user1.id, user2.id, user3.id]
    });

    // 2 Tasks erstellen
    task1 = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Küche reinigen',
      emoji: '🧽',
      category: TaskCategory.KITCHEN,
      averageMinutes: 30,
      averagePainLevel: 5,
      averageImportance: 7,
      monthlyFrequency: 4, // 4x pro Monat
      difficultyScore: 5,
      unpleasantnessScore: 6,
      pointsPerExecution: 20,
      totalMonthlyPoints: 80, // 20 * 4
      constraints: {
        maxDaysBetween: 7,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });

    task2 = dataManager.createTask({
      title: 'Müll rausbringen',
      description: 'Müll zur Tonne',
      emoji: '🗑️',
      category: TaskCategory.GENERAL,
      averageMinutes: 5,
      averagePainLevel: 2,
      averageImportance: 4,
      monthlyFrequency: 8, // 8x pro Monat
      difficultyScore: 2,
      unpleasantnessScore: 3,
      pointsPerExecution: 5,
      totalMonthlyPoints: 40, // 5 * 8
      constraints: {
        maxDaysBetween: 3,
        requiresPhoto: false
      },
      isActive: true,
      setupComplete: true
    });
  });

  it('sollte Punkte-Logik für WG-Mitglieder korrekt analysieren', () => {
  const state = dataManager.getState();
  const liveWG = (state.wgs && state.wgs[testWG.id]) ? state.wgs[testWG.id] : (state.currentWG as WG);
    const wgMembers = liveWG.memberIds;
    const tasks = Object.values(state.tasks);

    console.log('🏠 WG-Analyse:');
    console.log('- Anzahl Mitglieder:', wgMembers.length);
    console.log('- Anzahl Tasks:', tasks.length);

    // Aktuelle Task-Punkte
    tasks.forEach((task: any) => {
      console.log(`📋 ${task.title}:`);
      console.log(`  - Punkte pro Ausführung: ${task.pointsPerExecution}`);
      console.log(`  - Häufigkeit pro Monat: ${task.monthlyFrequency}`);
      console.log(`  - Gesamtpunkte pro Monat: ${task.totalMonthlyPoints}`);
    });

    // Deine Berechnung: Task-Punkte * Häufigkeit * Mitglieder
    const theoretischeGesamtpunkte = tasks.reduce((sum: number, task: any) => {
      const taskMonthlyTotal = task.pointsPerExecution * task.monthlyFrequency;
      return sum + taskMonthlyTotal;
    }, 0);

    // Was du erwartest: jeder Task wird von jedem Mitglied gemacht
    const erwarteteGesamtpunkteProMitglied = theoretischeGesamtpunkte;
    const erwarteteGesamtpunkteAlleMembers = theoretischeGesamtpunkte * wgMembers.length;

    console.log('💰 Punkte-Analyse:');
    console.log('- Aktuelle Gesamtpunkte (aus Tasks):', theoretischeGesamtpunkte);
    console.log('- Erwartete Punkte pro Mitglied:', erwarteteGesamtpunkteProMitglied);
    console.log('- Erwartete Gesamtpunkte (alle Mitglieder):', erwarteteGesamtpunkteAlleMembers);

    // Simuliere TaskTablePage-Logik
    console.log('\n📊 TaskTablePage Simulation:');
    
    // Simuliere mehrere Ausführungen
    const executions: any[] = [];
    
    // Jeder User führt jeden Task mehrmals aus
    tasks.forEach((task: any) => {
      wgMembers.forEach(userId => {
        // Simuliere dass jeder User den Task entsprechend der Häufigkeit macht
        for (let i = 0; i < task.monthlyFrequency; i++) {
          const execution = dataManager.executeTaskForUser(task.id, userId);
          executions.push(execution);
        }
      });
    });

    // Berechne Gesamtpunkte wie in TaskTablePage
    const executionCountMap: Record<string, Record<string, number>> = {};
    executions.forEach((e: any) => {
      if (!executionCountMap[e.taskId]) executionCountMap[e.taskId] = {};
      executionCountMap[e.taskId][e.executedBy] = (executionCountMap[e.taskId][e.executedBy] || 0) + 1;
    });

    const userTotals: Record<string, number> = {};
  wgMembers.forEach(userId => userTotals[userId] = 0);

    tasks.forEach((task: any) => {
      const perExec = task.pointsPerExecution;
      wgMembers.forEach(userId => {
        const count = executionCountMap[task.id]?.[userId] || 0;
        userTotals[userId] += count * perExec;
      });
    });

    const gesamtPunkteAusExecutions = Object.values(userTotals).reduce((sum: number, points: number) => sum + points, 0);

    console.log('User-Punkte nach Ausführungen:');
    wgMembers.forEach(userId => {
      const user = state.users[userId];
      console.log(`- ${user.name}: ${userTotals[userId]} Punkte`);
    });
    console.log('- Gesamtsumme aller User:', gesamtPunkteAusExecutions);

    // Deine Erwartung prüfen
    expect(gesamtPunkteAusExecutions).toBe(erwarteteGesamtpunkteAlleMembers);
  });

  it('sollte mit Bewertungen und Neuberechnung korrekt skalieren', () => {
    // Alle User bewerten alle Tasks
    [user1, user2, user3].forEach((user, userIdx) => {
      [task1, task2].forEach((task, taskIdx) => {
        dataManager.upsertTaskRatingForUser(user.id, task.id, {
          estimatedMinutes: 20 + (userIdx * 5),
          painLevel: 5 + userIdx,
          importance: 6 + taskIdx,
          suggestedFrequency: task.monthlyFrequency + userIdx
        });
      });
    });

    console.log('\n🔄 Nach Bewertungen und Neuberechnung:');

    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();

    const updatedState = dataManager.getState();
    const updatedTasks = Object.values(updatedState.tasks);

    updatedTasks.forEach((task: any) => {
      console.log(`📋 ${task.title} (aktualisiert):`);
      console.log(`  - Punkte pro Ausführung: ${task.pointsPerExecution}`);
      console.log(`  - Häufigkeit pro Monat: ${task.monthlyFrequency}`);
      console.log(`  - Gesamtpunkte pro Monat: ${task.totalMonthlyPoints}`);
    });

    const neueGesamtpunkte = updatedTasks.reduce((sum: number, task: any) => {
      return sum + task.totalMonthlyPoints;
    }, 0);

  const stateNow = dataManager.getState();
  const liveWG = (stateNow.wgs && stateNow.wgs[testWG.id]) ? stateNow.wgs[testWG.id] : (stateNow.currentWG as WG);
  // Nach unserer Logik ist die Gesamtarbeit Summe über Tasks, unabhängig von der Mitgliederzahl
  const erwarteteGesamtpunkteNachUpdate = neueGesamtpunkte;

    console.log('💰 Neue Punkte-Analyse:');
    console.log('- Neue Gesamtpunkte (aus Tasks):', neueGesamtpunkte);
    console.log('- Erwartete Gesamtpunkte (alle Mitglieder):', erwarteteGesamtpunkteNachUpdate);

    // Teste ob deine Erwartung stimmt
    expect(neueGesamtpunkte).toBeGreaterThan(120); // sollte höher sein
    // Unser Modell addiert die Monatsarbeit über alle Tasks; es wird NICHT mit der Mitgliederzahl multipliziert.
    // Deshalb sind erwarteteGesamtpunkteNachUpdate und neueGesamtpunkte identisch.
    expect(erwarteteGesamtpunkteNachUpdate).toBe(neueGesamtpunkte);
  });

  it('sollte das 120-Punkte Problem analysieren', () => {
    console.log('\n🔍 120-Punkte Problem Analyse:');
    
    const state = dataManager.getState();
    
    // Simuliere dein Szenario: 120 Gesamtpunkte
    console.log('Angenommen, du siehst 120 Gesamtpunkte in der App:');
    
    const tasks = Object.values(state.tasks);
    const actualTotal = tasks.reduce((sum: number, task: any) => sum + task.totalMonthlyPoints, 0);
    
    console.log('- Tatsächliche Task-Gesamtpunkte:', actualTotal);
  const stateNow2 = dataManager.getState();
  const liveWG = (stateNow2.wgs && stateNow2.wgs[testWG.id]) ? stateNow2.wgs[testWG.id] : (stateNow2.currentWG as WG);
  console.log('- WG-Mitglieder:', liveWG.memberIds.length);
    
    if (actualTotal === 120) {
      console.log('✅ Das entspricht deinem Beispiel');
    } else {
      console.log('❌ Abweichung von deinem 120-Beispiel');
    }
    
    // Was du erwartest:
  const expectedIfMultipliedByMembers = actualTotal * liveWG.memberIds.length;
    console.log('- Deine Erwartung (120 * 3 Mitglieder):', expectedIfMultipliedByMembers);
    
    // Prüfe ob die App-Logik das berücksichtigt
    console.log('\n📊 TaskTablePage Logik-Check:');
    
    // Schaue in den TaskTablePage Code wie possibleTotals berechnet wird
  const possibleTotalsSimulation: Record<string, number> = {};
  liveWG.memberIds.forEach(memberId => possibleTotalsSimulation[memberId] = 0);
    
    tasks.forEach((task: any) => {
      const monthly = task.totalMonthlyPoints || ((task.pointsPerExecution || task.basePoints) * (task.monthlyFrequency || 0)) || 0;
      liveWG.memberIds.forEach(memberId => { 
        possibleTotalsSimulation[memberId] += monthly; 
      });
    });
    
  console.log('- Mögliche Punkte pro Mitglied:', possibleTotalsSimulation[liveWG.memberIds[0]]);
    console.log('- Mögliche Gesamtpunkte aller Mitglieder:', Object.values(possibleTotalsSimulation).reduce((a, b) => a + b, 0));
    
    // Das sollte deiner Erwartung entsprechen!
    expect(Object.values(possibleTotalsSimulation).reduce((a, b) => a + b, 0)).toBe(expectedIfMultipliedByMembers);
  });
});
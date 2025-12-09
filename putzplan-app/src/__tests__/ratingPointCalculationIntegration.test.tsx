import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Rating → Point Calculation Integration Tests', () => {
  beforeEach(() => {
    // Fresh state für jeden Test
    dataManager._TEST_reset();
    
    // Setup: WG mit 2 Mitgliedern
    const wg = dataManager.createWG({ 
      name: 'Test WG', 
      description: 'Test',
      settings: { 
        monthlyPointsTarget: 120,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });
    
    const user1 = dataManager.createUser({ 
      name: 'Alice', 
      avatar: '👩', 
      targetMonthlyPoints: 120,
      isActive: true 
    });
    const user2 = dataManager.createUser({ 
      name: 'Bob', 
      avatar: '👨', 
      targetMonthlyPoints: 120,
      isActive: true 
    });
    
    dataManager.updateWG(wg.id, { memberIds: [user1.id, user2.id] });
    dataManager.setCurrentWG(wg.id);
    
    // Task erstellen
    const task1 = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Test Task',
      basePoints: 20,
      pointsPerExecution: 20,
      monthlyFrequency: 2,
      totalMonthlyPoints: 40,
      difficultyScore: 5,
      unpleasantnessScore: 6,
      isActive: true
    });
    
    console.log(`🏗️ Setup abgeschlossen:
- WG: ${wg.name}
- Users: ${user1.name}, ${user2.name}
- Task: ${task1.title} (${task1.pointsPerExecution}P × ${task1.monthlyFrequency} = ${task1.totalMonthlyPoints}P/Monat)
- WG-Ziel: ${wg.settings.monthlyPointsTarget}P pro Mitglied`);
  });

  it('sollte Bewertungsänderungen in Punktberechnung übernehmen (User-Workflow-Test)', () => {
    console.log('\n🧪 Test: User ändert Bewertung → Punkte werden korrekt aktualisiert');
    
    const state = dataManager.getState();
    const user1 = Object.values(state.users)[0] as any;
    const task1 = Object.values(state.tasks)[0] as any;
    
    console.log(`👤 User: ${user1.name}`);
    console.log(`📋 Task: ${task1.title}`);
    console.log(`💰 Task-Punkte VOR Bewertung: ${task1.pointsPerExecution}P`);
    
    // Schritt 1: User bewertet Task (normale Bewertung)
    console.log('\n🔄 Schritt 1: Normale Bewertung');
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, {
      estimatedMinutes: 30,
      painLevel: 5,
      importance: 5,
      suggestedFrequency: 2
    });
    
    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();
    
    const stateAfterNormal = dataManager.getState();
    const taskAfterNormal = stateAfterNormal.tasks[task1.id];
    console.log(`💰 Task-Punkte NACH normaler Bewertung: ${taskAfterNormal.pointsPerExecution}P`);
    
    // Schritt 2: User ändert Bewertung drastisch (wie in deinem Beispiel)
    console.log('\n🔄 Schritt 2: Drastische Bewertungsänderung (12000 Minuten!)');
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, {
      estimatedMinutes: 12000, // Wie in deinem Screenshot
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    });
    
    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();
    
    const stateAfterDrastic = dataManager.getState();
    const taskAfterDrastic = stateAfterDrastic.tasks[task1.id];
    console.log(`💰 Task-Punkte NACH drastischer Bewertung: ${taskAfterDrastic.pointsPerExecution}P`);
    
    // Schritt 3: WG-Punkteverteilung neu berechnen
    console.log('\n🔄 Schritt 3: WG-Punkteverteilung neu berechnen');
    const result = dataManager.recalculateWGPointDistribution();
    
    console.log(`📊 WG-Verteilungsresultat:
- Gesamtarbeit: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P
- Mitglieder: ${result.memberCount}`);
    
    // Assertions
    expect(taskAfterDrastic.pointsPerExecution).not.toBe(taskAfterNormal.pointsPerExecution);
    expect(taskAfterDrastic.pointsPerExecution).toBeGreaterThan(0);
    expect(result.totalWorkload).toBeGreaterThan(0);
    
    console.log('✅ Test bestanden: Bewertungsänderungen führen zu Punktänderungen');
  });

  it('sollte das UX-Problem "Bewertung geändert aber nicht gespeichert" erkennen', () => {
    console.log('\n🐛 Test: UX-Problem - Bewertung geändert aber nicht gespeichert');
    
    const state = dataManager.getState();
    const user1 = Object.values(state.users)[0] as any;
    const task1 = Object.values(state.tasks)[0] as any;
    
    // Simuliere: User hat Bewertung in der UI geändert, aber nicht gespeichert
    console.log('📝 Simuliere: User ändert Werte in UI...');
    const unsavedRating = {
      estimatedMinutes: 12000,
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    };
    console.log(`Unsaved Rating: ${JSON.stringify(unsavedRating)}`);
    
    // KEINE Speicherung → upsertTaskRatingForUser wird NICHT aufgerufen
    console.log('❌ User vergisst auf "Speichern" zu klicken');
    
    // User klickt auf "Punkte aktualisieren"
    console.log('\n🔄 User klickt "Punkte aktualisieren"');
    
    const taskPointsBefore = task1.pointsPerExecution;
    dataManager.recalculateTaskPoints();
    const result = dataManager.recalculateWGPointDistribution();
    
    const stateAfter = dataManager.getState();
    const taskAfter = stateAfter.tasks[task1.id];
    
    console.log(`💰 Task-Punkte:
- Vor Berechnung: ${taskPointsBefore}P
- Nach Berechnung: ${taskAfter.pointsPerExecution}P
- Änderung: ${taskAfter.pointsPerExecution !== taskPointsBefore ? 'JA' : 'NEIN'}`);
    
    console.log(`📊 WG-Ergebnis:
- Gesamtarbeit: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Problem: Ohne Bewertungen bleiben die Punkte unverändert
    expect(taskAfter.pointsPerExecution).toBe(taskPointsBefore);
    console.log('🚨 Problem erkannt: Ohne gespeicherte Bewertungen passiert nichts!');
    
    // Lösung: Bewertung speichern und nochmal versuchen
    console.log('\n✅ Lösung: Bewertung speichern');
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, unsavedRating);
    dataManager.recalculateTaskPoints();
    const resultFixed = dataManager.recalculateWGPointDistribution();
    
    const stateFixed = dataManager.getState();
    const taskFixed = stateFixed.tasks[task1.id];
    
    console.log(`💰 Task-Punkte NACH Speicherung: ${taskFixed.pointsPerExecution}P`);
    console.log(`📊 WG-Ergebnis NACH Speicherung: ${resultFixed.pointsPerMember}P pro Mitglied`);
    
    expect(taskFixed.pointsPerExecution).not.toBe(taskPointsBefore);
    console.log('✅ Nach Speicherung funktioniert es!');
  });

  it('sollte extreme Bewertungswerte korrekt verarbeiten', () => {
    console.log('\n🧪 Test: Extreme Bewertungswerte (wie 12000 Minuten)');
    
    const state = dataManager.getState();
    const user1 = Object.values(state.users)[0] as any;
    const task1 = Object.values(state.tasks)[0] as any;
    
    // Extreme Bewertung (wie in deinem Screenshot)
    const extremeRating = {
      estimatedMinutes: 12000, // 200 Stunden!
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    };
    
    console.log(`🔥 Extreme Bewertung: ${JSON.stringify(extremeRating)}`);
    
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, extremeRating);
    
    // Prüfe, ob die Bewertung korrekt gespeichert wurde
    const savedRatings = Object.values(dataManager.getState().ratings);
    const taskRating = savedRatings.find((r: any) => r.taskId === task1.id && r.userId === user1.id) as any;
    
    console.log(`💾 Gespeicherte Bewertung:
- Minuten: ${taskRating?.estimatedMinutes}
- Pain: ${taskRating?.painLevel}
- Wichtigkeit: ${taskRating?.importance}
- Frequenz: ${taskRating?.suggestedFrequency}`);
    
    expect(taskRating).toBeDefined();
    expect(taskRating.estimatedMinutes).toBe(12000);
    
    // Punkte neu berechnen
    dataManager.recalculateTaskPoints();
    const result = dataManager.recalculateWGPointDistribution();
    
    const taskAfter = dataManager.getState().tasks[task1.id];
    
    console.log(`📊 Ergebnis mit extremen Werten:
- Task-Punkte: ${taskAfter.pointsPerExecution}P
- WG Gesamt: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Extreme Werte sollten zu entsprechend hohen Punkten führen
    expect(taskAfter.pointsPerExecution).toBeGreaterThan(20); // Mehr als die ursprünglichen 20P
    expect(result.totalWorkload).toBeGreaterThan(0);
    expect(result.pointsPerMember).toBeGreaterThan(0);
    
    console.log('✅ Extreme Werte werden korrekt verarbeitet');
  });

  it('sollte Multi-User-Bewertungen korrekt aggregieren', () => {
    console.log('\n🧪 Test: Multi-User-Bewertungen aggregieren');
    
    const state = dataManager.getState();
    const users = Object.values(state.users) as any[];
    const task1 = Object.values(state.tasks)[0] as any;
    
    console.log(`👥 ${users.length} Users bewerten den gleichen Task`);
    
    // User 1: Normale Bewertung
    dataManager.upsertTaskRatingForUser(users[0].id, task1.id, {
      estimatedMinutes: 30,
      painLevel: 3,
      importance: 7,
      suggestedFrequency: 2
    });
    
    // User 2: Extreme Bewertung
    dataManager.upsertTaskRatingForUser(users[1].id, task1.id, {
      estimatedMinutes: 12000,
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    });
    
    console.log(`📝 Bewertungen gespeichert:
- ${users[0].name}: 30min, Pain:3, Wichtigkeit:7, Freq:2
- ${users[1].name}: 12000min, Pain:4, Wichtigkeit:5, Freq:4`);
    
    // Punkte berechnen
    dataManager.recalculateTaskPoints();
    const result = dataManager.recalculateWGPointDistribution();
    
    const taskAfter = dataManager.getState().tasks[task1.id];
    
    console.log(`📊 Aggregiertes Ergebnis:
- Task durchschnittliche Pain: ${taskAfter.averagePainLevel || 'N/A'}
- Task durchschnittliche Wichtigkeit: ${taskAfter.averageImportance || 'N/A'}
- Task neue Punkte: ${taskAfter.pointsPerExecution}P
- Task neue Frequenz: ${taskAfter.monthlyFrequency}x
- WG Gesamt: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Der Durchschnitt sollte zwischen den beiden Extremen liegen
    expect(taskAfter.averagePainLevel).toBeGreaterThan(3);
    expect(taskAfter.averagePainLevel).toBeLessThan(4);
    expect(taskAfter.averageImportance).toBeGreaterThan(5);
    expect(taskAfter.averageImportance).toBeLessThan(7);
    
    console.log('✅ Multi-User-Bewertungen werden korrekt aggregiert');
  });

  it('sollte das komplette User-Journey-Szenario testen', () => {
    console.log('\n🎯 Test: Komplette User Journey (End-to-End)');
    
    const state = dataManager.getState();
    const user1 = Object.values(state.users)[0] as any;
    const task1 = Object.values(state.tasks)[0] as any;
    const wg = state.currentWG;
    
    console.log(`🚀 Start-Zustand:
- WG: ${wg?.name} (Ziel: ${wg?.settings.monthlyPointsTarget}P)
- User: ${user1.name} (Ziel: ${user1.targetMonthlyPoints}P)
- Task: ${task1.title} (${task1.pointsPerExecution}P)`);
    
    // 1. User bewertet Task
    console.log('\n📝 1. User bewertet Task');
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, {
      estimatedMinutes: 12000,
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    });
    
    // 2. Task-Punkte neu berechnen
    console.log('\n🔄 2. Task-Punkte neu berechnen');
    dataManager.recalculateTaskPoints();
    const taskAfterRating = dataManager.getState().tasks[task1.id];
    console.log(`Task-Punkte: ${task1.pointsPerExecution}P → ${taskAfterRating.pointsPerExecution}P`);
    
    // 3. WG-Verteilung neu berechnen
    console.log('\n💰 3. WG-Verteilung neu berechnen');
    const result = dataManager.recalculateWGPointDistribution();
    
    const finalState = dataManager.getState();
    const finalWG = finalState.currentWG;
    const finalUser = finalState.users[user1.id];
    
    console.log(`📊 End-Zustand:
- WG-Ziel: ${wg?.settings.monthlyPointsTarget}P → ${finalWG?.settings.monthlyPointsTarget}P
- User-Ziel: ${user1.targetMonthlyPoints}P → ${finalUser.targetMonthlyPoints}P
- Task-Punkte: ${task1.pointsPerExecution}P → ${taskAfterRating.pointsPerExecution}P
- Gesamtarbeit: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Assertions
    expect(taskAfterRating.pointsPerExecution).not.toBe(task1.pointsPerExecution);
    expect(finalWG?.settings.monthlyPointsTarget).toBe(result.pointsPerMember);
    expect(result.totalWorkload).toBeGreaterThan(0);
    
    console.log('✅ Komplette User Journey funktioniert!');
  });
});
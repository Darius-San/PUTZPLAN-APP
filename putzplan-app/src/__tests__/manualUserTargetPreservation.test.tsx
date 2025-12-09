import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Manuelle User-Ziel Erhaltung Tests', () => {
  beforeEach(() => {
    // Reset und Setup
    dataManager._TEST_reset();
    
    // Setup: WG mit Mitgliedern
    const wg = dataManager.createWG({ 
      name: 'Test WG', 
      description: 'Test',
      settings: { 
        monthlyPointsTarget: 100,
        reminderSettings: {
          lowPointsThreshold: 20,
          overdueDaysThreshold: 3,
          enablePushNotifications: false
        }
      }
    });
    
    const user1 = dataManager.createUser({ name: 'Alice', avatar: '👩', targetMonthlyPoints: 100 });
    const user2 = dataManager.createUser({ name: 'Bob', avatar: '👨', targetMonthlyPoints: 100 });
    
    dataManager.updateWG(wg.id, { memberIds: [user1.id, user2.id] });
    dataManager.setCurrentWG(wg.id);
    
    // Tasks erstellen
    const task1 = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Test Task',
      wgId: wg.id,
      basePoints: 20,
      pointsPerExecution: 20,
      monthlyFrequency: 2,
      totalMonthlyPoints: 40,
      difficultyScore: 5,
      unpleasantnessScore: 6,
      isActive: true
    });
    
    // Bewertungen hinzufügen, damit Neuberechnung funktioniert
    dataManager.upsertTaskRatingForUser(user1.id, task1.id, {
      estimatedMinutes: 30,
      painLevel: 7,
      importance: 8,
      suggestedFrequency: 3
    });
  });

  it('sollte manuelle User-Ziele NICHT überschreiben bei Punktneuberechnung', () => {
    console.log('🧪 Test: Manuelle User-Ziele sollten erhalten bleiben');
    
    const stateBefore = dataManager.getState();
    const user1Before = Object.values(stateBefore.users)[0] as any;
    const user2Before = Object.values(stateBefore.users)[1] as any;
    
    console.log(`👥 Vor manueller Änderung:
- ${user1Before.name}: ${user1Before.targetMonthlyPoints}P
- ${user2Before.name}: ${user2Before.targetMonthlyPoints}P
- WG-Ziel: ${stateBefore.currentWG?.settings.monthlyPointsTarget}P`);
    
    // Simuliere manuelle Änderung: User2 bekommt individuelles Ziel
    const updatedUser2 = { ...user2Before, targetMonthlyPoints: 150 };
    dataManager.updateState({ 
      users: { 
        ...stateBefore.users, 
        [user2Before.id]: updatedUser2 
      } 
    });
    
    const stateAfterManual = dataManager.getState();
    const user1AfterManual = stateAfterManual.users[user1Before.id];
    const user2AfterManual = stateAfterManual.users[user2Before.id];
    
    console.log(`✏️ Nach manueller Änderung:
- ${user1AfterManual.name}: ${user1AfterManual.targetMonthlyPoints}P (unverändert)
- ${user2AfterManual.name}: ${user2AfterManual.targetMonthlyPoints}P (manuell geändert)
- WG-Ziel: ${stateAfterManual.currentWG?.settings.monthlyPointsTarget}P`);
    
    // Jetzt Punktneuberechnung ausführen
    console.log('🔄 Führe Punktneuberechnung aus...');
    dataManager.recalculateTaskPoints();
    const result = dataManager.recalculateWGPointDistribution();
    
    const stateAfterRecalc = dataManager.getState();
    const user1AfterRecalc = stateAfterRecalc.users[user1Before.id];
    const user2AfterRecalc = stateAfterRecalc.users[user2Before.id];
    
    console.log(`📊 Nach Punktneuberechnung:
- ${user1AfterRecalc.name}: ${user1AfterRecalc.targetMonthlyPoints}P (${user1AfterRecalc.targetMonthlyPoints === result.pointsPerMember ? 'automatisch aktualisiert' : 'unverändert'})
- ${user2AfterRecalc.name}: ${user2AfterRecalc.targetMonthlyPoints}P (${user2AfterRecalc.targetMonthlyPoints === 150 ? 'manuell erhalten' : 'überschrieben!'})
- WG-Ziel: ${stateAfterRecalc.currentWG?.settings.monthlyPointsTarget}P
- Berechnetes Ziel pro Mitglied: ${result.pointsPerMember}P`);
    
    // Assertions
    expect(user1AfterRecalc.targetMonthlyPoints).toBe(result.pointsPerMember); // User1 sollte automatisch aktualisiert werden
    expect(user2AfterRecalc.targetMonthlyPoints).toBe(150); // User2 sollte manuellen Wert behalten
    expect(stateAfterRecalc.currentWG?.settings.monthlyPointsTarget).toBe(result.pointsPerMember); // WG-Ziel sollte aktualisiert werden
    
    console.log('✅ Test erfolgreich: Manuelle User-Ziele bleiben erhalten!');
  });

  it('sollte das vorherige Problem reproduzieren (alle User überschrieben)', () => {
    console.log('🐛 Test: Reproduktion des ursprünglichen Problems');
    
    // Simuliere das alte Verhalten durch direktes Überschreiben
    const stateBefore = dataManager.getState();
    const user2 = Object.values(stateBefore.users)[1] as any;
    
    // Manuelle Änderung
    const updatedUser2 = { ...user2, targetMonthlyPoints: 150 };
    dataManager.updateState({ 
      users: { 
        ...stateBefore.users, 
        [user2.id]: updatedUser2 
      } 
    });
    
    console.log(`👤 User2 manuell auf 150P gesetzt`);
    
    // Alte Logik simulieren: ALLE User überschreiben
    const mockResult = { totalWorkload: 160, pointsPerMember: 80, memberCount: 2 };
    const updatedUsers = { ...stateBefore.users };
    
    // Das war das Problem: ALLE User werden überschrieben
    Object.keys(updatedUsers).forEach(userId => {
      updatedUsers[userId] = {
        ...updatedUsers[userId],
        targetMonthlyPoints: mockResult.pointsPerMember // 80P für alle
      };
    });
    
    console.log('🚨 Alte Logik: Alle User auf 80P überschrieben (Problem!)');
    
    // Das zeigt das Problem
    expect(updatedUsers[user2.id].targetMonthlyPoints).toBe(80); // Manueller Wert (150P) ist verloren!
    
    console.log('❌ Alte Logik zeigt das Problem: Manueller Wert verloren');
  });
});
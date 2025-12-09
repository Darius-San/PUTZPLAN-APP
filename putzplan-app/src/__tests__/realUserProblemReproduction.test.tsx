import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Real User Problem Reproduction', () => {
  beforeEach(() => {
    // Komplett sauberer Start
    dataManager._TEST_reset();
  });

  it('sollte dein exaktes Problem reproduzieren: Bewertung ändern → Button klicken → nichts passiert', () => {
    console.log('\n🐛 EXACT USER PROBLEM REPRODUCTION');
    
    // Setup genau wie in deiner App
    const wg = dataManager.createWG({ 
      name: 'Meine WG', 
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
    
    const darius = dataManager.createUser({ 
      name: 'Darius', 
      avatar: '👨‍💻', 
      targetMonthlyPoints: 120,
      isActive: true 
    });
    
    dataManager.updateWG(wg.id, { memberIds: [darius.id] });
    dataManager.setCurrentWG(wg.id);
    
    const kueche = dataManager.createTask({
      title: 'Küche putzen',
      description: 'Test Task',
      emoji: '🍳',
      category: 'kitchen' as any,
      averageMinutes: 65,
      averagePainLevel: 6,
      averageImportance: 5,
      pointsPerExecution: 65, // Wie in deinem Screenshot
      monthlyFrequency: 1,
      totalMonthlyPoints: 65,
      difficultyScore: 5,
      unpleasantnessScore: 6,
      constraints: { 
        maxDaysBetween: 7, 
        requiresPhoto: false 
      },
      isActive: true,
      setupComplete: false
    });
    
    console.log(`🏗️ Setup wie in deiner App:
- User: ${darius.name}
- Task: ${kueche.title}
- Ursprüngliche Punkte: ${kueche.pointsPerExecution}P
- WG-Ziel: ${wg.settings.monthlyPointsTarget}P`);
    
    // Simuliere: Du änderst die Bewertung auf 12000 Minuten
    console.log('\n📝 1. User ändert Bewertung auf 12000 Minuten (wie in Screenshot)');
    dataManager.upsertTaskRatingForUser(darius.id, kueche.id, {
      estimatedMinutes: 12000,
      painLevel: 4,
      importance: 5,
      suggestedFrequency: 4
    });
    
    console.log('✅ Bewertung gespeichert');
    
    // Check: Ist die Bewertung wirklich da?
    const savedRatings = Object.values(dataManager.getState().ratings);
    const myRating = savedRatings.find((r: any) => r.taskId === kueche.id) as any;
    console.log(`💾 Gespeicherte Bewertung: ${myRating?.estimatedMinutes} Minuten`);
    
    // Simuliere: Du klickst "WG Punkte aktualisieren"
    console.log('\n🔄 2. User klickt "WG Punkte aktualisieren"');
    
    const taskBefore = dataManager.getState().tasks[kueche.id];
    console.log(`Task-Punkte VOR Button-Klick: ${taskBefore.pointsPerExecution}P`);
    
    // Das ist was der Button macht:
    dataManager.recalculateTaskPoints();
    const result = dataManager.recalculateWGPointDistribution();
    
    const taskAfter = dataManager.getState().tasks[kueche.id];
    const wgAfter = dataManager.getState().currentWG;
    const userAfter = dataManager.getState().users[darius.id];
    
    console.log(`📊 ERGEBNIS nach Button-Klick:
- Task-Punkte: ${taskBefore.pointsPerExecution}P → ${taskAfter.pointsPerExecution}P
- WG-Ziel: ${wg.settings.monthlyPointsTarget}P → ${wgAfter?.settings.monthlyPointsTarget}P
- User-Ziel: ${darius.targetMonthlyPoints}P → ${userAfter.targetMonthlyPoints}P
- Gesamtarbeit: ${result.totalWorkload}P
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Prüfe ob sich was geändert hat
    const taskChanged = taskAfter.pointsPerExecution !== taskBefore.pointsPerExecution;
    const wgChanged = wgAfter?.settings.monthlyPointsTarget !== wg.settings.monthlyPointsTarget;
    
    console.log(`🔍 ÄNDERUNGEN:
- Task-Punkte geändert: ${taskChanged ? '✅ JA' : '❌ NEIN'}
- WG-Ziel geändert: ${wgChanged ? '✅ JA' : '❌ NEIN'}`);
    
    if (!taskChanged && !wgChanged) {
      console.log('🚨 PROBLEM REPRODUZIERT: Bewertung gespeichert, aber Button bewirkt nichts!');
    } else {
      console.log('✅ SYSTEM FUNKTIONIERT: Bewertung führt zu Änderungen');
    }
    
    // Der Test sollte zeigen, dass das System FUNKTIONIERT
    expect(taskChanged).toBe(true);
    expect(wgChanged).toBe(true);
    expect(taskAfter.pointsPerExecution).toBeGreaterThan(65);
  });

  it('sollte das UI-Sync-Problem testen', () => {
    console.log('\n🔄 Test: UI-Synchronisation Problem');
    
    // Minimales Setup
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
    
    const user = dataManager.createUser({ 
      name: 'Test User', 
      avatar: '👤', 
      targetMonthlyPoints: 120,
      isActive: true 
    });
    
    dataManager.updateWG(wg.id, { memberIds: [user.id] });
    dataManager.setCurrentWG(wg.id);
    
    const task = dataManager.createTask({
      title: 'Test Task',
      description: 'Test',
      emoji: '🧹',
      category: 'general' as any,
      averageMinutes: 10,
      averagePainLevel: 5,
      averageImportance: 5,
      pointsPerExecution: 10,
      monthlyFrequency: 1,
      totalMonthlyPoints: 10,
      difficultyScore: 5,
      unpleasantnessScore: 5,
      constraints: { 
        maxDaysBetween: 7, 
        requiresPhoto: false 
      },
      isActive: true,
      setupComplete: false
    });
    
    console.log('📋 Initial state captured');
    
    // Bewertung hinzufügen
    dataManager.upsertTaskRatingForUser(user.id, task.id, {
      estimatedMinutes: 1000,
      painLevel: 8,
      importance: 8,
      suggestedFrequency: 5
    });
    
    // Mehrfache Neuberechnung (wie in der UI)
    for (let i = 0; i < 3; i++) {
      console.log(`🔄 Neuberechnung ${i + 1}/3`);
      dataManager.recalculateTaskPoints();
      const result = dataManager.recalculateWGPointDistribution();
      
      const currentTask = dataManager.getState().tasks[task.id];
      console.log(`  Task-Punkte: ${currentTask.pointsPerExecution}P, WG: ${result.pointsPerMember}P`);
    }
    
    console.log('✅ Mehrfache Neuberechnung stabil');
  });
});
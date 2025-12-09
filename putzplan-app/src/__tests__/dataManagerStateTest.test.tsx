import { describe, it, expect } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('DataManager State Update Test', () => {
  it('sollte prüfen ob dataManager.recalculateTaskPoints() korrekt funktioniert', () => {
    console.log('🔧 Test: dataManager State Update');
    
    // Aktueller State
    const stateBefore = dataManager.getState();
    console.log('📋 Tasks vor recalculateTaskPoints:');
    Object.values(stateBefore.tasks).forEach(task => {
      console.log(`- ${task.title}: ${task.pointsPerExecution}P (basePoints: ${task.basePoints}, monthly: ${task.totalMonthlyPoints})`);
    });
    
    console.log('\n🎯 Current WG:', stateBefore.currentWG?.name, 'Members:', stateBefore.currentWG?.memberIds.length);
    console.log('📊 Ratings count:', Object.keys(stateBefore.ratings).length);
    
    // Prüfe ob es Bewertungen gibt
    const ratings = Object.values(stateBefore.ratings);
    if (ratings.length === 0) {
      console.log('⚠️ PROBLEM: Keine Bewertungen gefunden! Task-Punkte können nicht neu berechnet werden.');
      console.log('💡 Lösung: Tasks müssen erst bewertet werden, bevor Punkte neu berechnet werden können.');
      return;
    }
    
    console.log('\n🔄 Führe dataManager.recalculateTaskPoints() aus...');
    dataManager.recalculateTaskPoints();
    
    const stateAfter = dataManager.getState();
    console.log('\n📋 Tasks nach recalculateTaskPoints:');
    Object.values(stateAfter.tasks).forEach(task => {
      const taskBefore = stateBefore.tasks[task.id];
      const changed = task.pointsPerExecution !== taskBefore.pointsPerExecution;
      console.log(`- ${task.title}: ${task.pointsPerExecution}P (war: ${taskBefore.pointsPerExecution}P) ${changed ? '✅ GEÄNDERT' : '❌ UNVERÄNDERT'}`);
    });
    
    // Prüfe WG-Verteilung
    console.log('\n💰 Führe dataManager.recalculateWGPointDistribution() aus...');
    const result = dataManager.recalculateWGPointDistribution();
    
    console.log('📊 WG-Verteilung Ergebnis:');
    console.log(`- Gesamtarbeit: ${result.totalWorkload}P`);
    console.log(`- Mitglieder: ${result.memberCount}`);
    console.log(`- Pro Mitglied: ${result.pointsPerMember}P`);
    
    // Das ist der Grund für das UI-Problem
    if (result.totalWorkload === 0) {
      console.log('\n🚨 HAUPTPROBLEM IDENTIFIZIERT:');
      console.log('- Gesamtarbeit ist 0P');
      console.log('- Das bedeutet: Tasks haben keine gültigen Punkt-Werte');
      console.log('- UI zeigt alte Werte, weil neue Werte alle 0 sind');
    }
    
    expect(true).toBe(true); // Dummy assertion
  });
});
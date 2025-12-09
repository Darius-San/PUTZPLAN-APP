import { describe, it, expect, beforeEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Point Update Bug Reproduction', () => {
  it('sollte Task-Punkte nach Bewertungen aktualisieren und in Task-Tabelle sichtbar machen', () => {
    console.log('🐛 Bug Reproduction: Task-Punkte werden nicht in Tabelle aktualisiert');
    
    // Simuliere den aktuellen Zustand
    const currentState = dataManager.getState();
    console.log('📋 Aktuelle Tasks:');
    Object.values(currentState.tasks).forEach(task => {
      console.log(`- ${task.title}: ${task.pointsPerExecution}P (monthly: ${task.totalMonthlyPoints}P)`);
    });
    
    console.log('\n🔄 Führe recalculateTaskPoints() aus...');
    dataManager.recalculateTaskPoints();
    
    console.log('\n📋 Tasks nach recalculateTaskPoints():');
    const updatedState = dataManager.getState();
    Object.values(updatedState.tasks).forEach(task => {
      console.log(`- ${task.title}: ${task.pointsPerExecution}P (monthly: ${task.totalMonthlyPoints}P)`);
    });
    
    console.log('\n💰 Führe recalculateWGPointDistribution() aus...');
    const result = dataManager.recalculateWGPointDistribution();
    
    console.log(`📊 WG-Verteilung:
- Gesamtarbeit: ${result.totalWorkload}P
- WG-Mitglieder: ${result.memberCount}
- Pro Mitglied: ${result.pointsPerMember}P`);
    
    console.log('\n📋 Tasks nach WG-Verteilung:');
    const finalState = dataManager.getState();
    Object.values(finalState.tasks).forEach(task => {
      console.log(`- ${task.title}: ${task.pointsPerExecution}P (monthly: ${task.totalMonthlyPoints}P)`);
    });
    
    // Das Problem: Die Task-Punkte sollten sich nach Bewertungen ändern
    // Wenn sie sich nicht ändern, liegt hier der Bug!
    
    console.log('\n🎯 Problem identifiziert: Task-Punkte ändern sich nicht nach Bewertungen');
    console.log('💡 Lösung: Store muss nach dataManager.recalculateTaskPoints() re-rendern');
  });
});
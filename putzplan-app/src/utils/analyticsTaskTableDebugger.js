// Analytics vs TaskTable Debugging Tool
// Vergleicht Punkteberechnungen zwischen Analytics und TaskTable zur Problemidentifikation

window.debugAnalyticsTaskTableConsistency = function() {
  console.log('🔍 ===================================');
  console.log('📊 ANALYTICS vs TASKTABLE DEBUGGER');
  console.log('🔍 ===================================');
  
  // Hole globale Daten
  const dataManager = window.dataManager;
  if (!dataManager) {
    console.error('❌ DataManager nicht verfügbar - sind Sie in der App?');
    return;
  }
  
  const state = dataManager.getState();
  const currentWG = dataManager.getCurrentWG();
  
  if (!currentWG) {
    console.error('❌ Keine WG ausgewählt');
    return;
  }
  
  console.log(`🏠 WG: ${currentWG.name}`);
  console.log(`👥 Mitglieder: ${currentWG.memberIds.length}`);
  
  // 1. DATENSAMMLUNG
  const members = currentWG.memberIds.map(id => state.users[id]).filter(Boolean);
  const tasks = Object.values(state.tasks).filter(t => t.wgId === currentWG.id && t.isActive);
  const executions = Object.values(state.executions).filter(e => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === currentWG.id;
  });
  
  console.log('\n📋 DATENÜBERSICHT:');
  console.log(`Tasks: ${tasks.length}`);
  console.log(`Executions: ${executions.length}`);
  console.log(`Members: ${members.map(m => m.name).join(', ')}`);
  
  // 2. TASKTABLE-SIMULATION
  console.log('\n🏗️ TASKTABLE BERECHNUNG:');
  const taskTableTotals = {};
  members.forEach(m => taskTableTotals[m.id] = 0);
  
  executions.forEach(e => {
    if (typeof taskTableTotals[e.executedBy] !== 'undefined') {
      const points = e.pointsAwarded || 0;
      taskTableTotals[e.executedBy] += points;
      console.log(`  ✅ ${members.find(m => m.id === e.executedBy)?.name}: +${points}P (Task: ${state.tasks[e.taskId]?.title})`);
    }
  });
  
  console.log('\n📊 TaskTable Totals:');
  members.forEach(m => {
    console.log(`  ${m.emoji} ${m.name}: ${taskTableTotals[m.id]}P`);
  });
  
  // 3. ANALYTICS-SIMULATION
  console.log('\n🧮 ANALYTICS BERECHNUNG:');
  
  // Import Analytics Service
  if (window.AnalyticsService) {
    const analytics = window.AnalyticsService.calculateOverallAnalytics(executions, tasks, members);
    
    console.log('\n📈 Analytics Results:');
    analytics.leaderboard.forEach((userAnalytic, index) => {
      console.log(`  ${userAnalytic.user.emoji} ${userAnalytic.user.name}: ${userAnalytic.totalPoints}P`);
    });
    
    // 4. VERGLEICH
    console.log('\n🔍 VERGLEICHSANALYSE:');
    let hasDiscrepancy = false;
    
    members.forEach(m => {
      const taskTablePoints = taskTableTotals[m.id] || 0;
      const analyticsUser = analytics.leaderboard.find(ua => ua.user.id === m.id);
      const analyticsPoints = analyticsUser?.totalPoints || 0;
      
      if (taskTablePoints !== analyticsPoints) {
        console.error(`❌ DISKREPANZ bei ${m.name}: TaskTable=${taskTablePoints}P vs Analytics=${analyticsPoints}P`);
        hasDiscrepancy = true;
      } else {
        console.log(`✅ ${m.name}: Konsistent ${taskTablePoints}P`);
      }
    });
    
    if (!hasDiscrepancy) {
      console.log('\n🎉 KEINE DISKREPANZEN GEFUNDEN! TaskTable und Analytics sind konsistent.');
    } else {
      console.log('\n⚠️ DISKREPANZEN GEFUNDEN! Mögliche Ursachen:');
      console.log('  - Unterschiedliche Execution-Filter');
      console.log('  - Periode-basierte Filterung in Analytics');
      console.log('  - Verschiedene Datefeld-Behandlung');
    }
    
  } else {
    console.error('❌ AnalyticsService nicht verfügbar');
  }
  
  // 5. ZUSÄTZLICHE DIAGNOSE
  console.log('\n🔧 ERWEITERTE DIAGNOSE:');
  
  // Prüfe Execution-Felder
  const executionFields = new Set();
  executions.forEach(e => {
    Object.keys(e).forEach(key => executionFields.add(key));
  });
  console.log(`Execution Felder: ${Array.from(executionFields).join(', ')}`);
  
  // Prüfe Datums-Inkonsistenzen
  const dateInconsistencies = executions.filter(e => !e.date && !e.executedAt);
  if (dateInconsistencies.length > 0) {
    console.warn(`⚠️ ${dateInconsistencies.length} Executions ohne Datum!`);
  }
  
  // Prüfe Punkte-Inkonsistenzen
  const pointsInconsistencies = executions.filter(e => 
    typeof e.pointsAwarded !== 'number' || isNaN(e.pointsAwarded)
  );
  if (pointsInconsistencies.length > 0) {
    console.warn(`⚠️ ${pointsInconsistencies.length} Executions mit ungültigen Punkten!`);
  }
  
  console.log('\n✅ DEBUGGING ABGESCHLOSSEN');
  
  return {
    taskTableTotals,
    analytics: window.AnalyticsService ? 
      window.AnalyticsService.calculateOverallAnalytics(executions, tasks, members) : null,
    executions,
    tasks,
    members
  };
};

// Kompakter Test für schnelle Checks
window.quickAnalyticsCheck = function() {
  const result = window.debugAnalyticsTaskTableConsistency();
  if (!result) return;
  
  console.log('\n⚡ QUICK CHECK ZUSAMMENFASSUNG:');
  Object.keys(result.taskTableTotals).forEach(userId => {
    const user = result.members.find(m => m.id === userId);
    const taskTablePoints = result.taskTableTotals[userId];
    const analyticsUser = result.analytics?.leaderboard.find(ua => ua.user.id === userId);
    const analyticsPoints = analyticsUser?.totalPoints || 0;
    
    const status = taskTablePoints === analyticsPoints ? '✅' : '❌';
    console.log(`${status} ${user?.name}: ${taskTablePoints}P (TaskTable) / ${analyticsPoints}P (Analytics)`);
  });
};

// Auto-Export für Browser Console
if (typeof window !== 'undefined') {
  console.log('🛠️ Analytics Debugger geladen! Verfügbare Befehle:');
  console.log('  - window.debugAnalyticsTaskTableConsistency()');
  console.log('  - window.quickAnalyticsCheck()');
}
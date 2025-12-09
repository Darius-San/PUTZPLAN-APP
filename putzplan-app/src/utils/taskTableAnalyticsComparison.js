// TaskTable vs Analytics Comparison Tool
// Dieses Tool vergleicht die Punkteberechnungen zwischen TaskTable und Analytics

window.compareTaskTableAnalytics = function() {
  console.log('🔍 ================================');
  console.log('📊 TASK TABLE vs ANALYTICS COMPARISON');
  console.log('🔍 ================================');
  
  const dataManager = window.dataManager;
  if (!dataManager) {
    console.log('❌ DataManager nicht verfügbar');
    return;
  }
  
  const state = dataManager.getState();
  const currentWG = dataManager.getCurrentWG();
  const currentUser = dataManager.getCurrentUser();
  
  if (!currentWG || !currentUser) {
    console.log('❌ Keine WG oder User ausgewählt');
    return;
  }
  
  // Sammle Daten wie TaskTable
  const members = currentWG.memberIds.map(id => state.users[id]).filter(Boolean);
  const tasks = Object.values(state.tasks).filter(t => t.wgId === currentWG.id && t.isActive);
  const executions = Object.values(state.executions).filter(e => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === currentWG.id;
  });
  
  console.log('📋 DATEN:');
  console.log(`👥 Members: ${members.length}`);
  console.log(`📝 Tasks: ${tasks.length}`);
  console.log(`✅ Executions: ${executions.length}`);
  
  // TaskTable-Berechnung (wie TaskTablePage.tsx)
  console.log('\n📊 TASK TABLE BERECHNUNG:');
  const taskTableTotals = {};
  members.forEach(m => taskTableTotals[m.id] = 0);
  
  executions.forEach(e => {
    if (typeof taskTableTotals[e.executedBy] !== 'undefined') {
      const pts = typeof e.pointsAwarded === 'number' ? e.pointsAwarded : 0;
      taskTableTotals[e.executedBy] = (taskTableTotals[e.executedBy] || 0) + pts;
    }
  });
  
  members.forEach(m => {
    console.log(`  ${m.emoji} ${m.name}: ${taskTableTotals[m.id]}P`);
  });
  
  // Analytics-Berechnung
  console.log('\n📈 ANALYTICS BERECHNUNG:');
  
  // Import Analytics Service dynamically
  import('/src/services/analyticsService.ts').then(({ AnalyticsService }) => {
    
    const overallAnalytics = AnalyticsService.calculateOverallAnalytics(executions, tasks, members);
    
    overallAnalytics.leaderboard.forEach((userStats, index) => {
      console.log(`  ${userStats.user.emoji} ${userStats.user.name}: ${userStats.totalPoints}P`);
    });
    
    console.log('\n🔍 VERGLEICH:');
    let totalMismatch = false;
    
    members.forEach(m => {
      const taskTablePoints = taskTableTotals[m.id];
      const analyticsUser = overallAnalytics.leaderboard.find(u => u.user.id === m.id);
      const analyticsPoints = analyticsUser ? analyticsUser.totalPoints : 0;
      
      if (taskTablePoints !== analyticsPoints) {
        console.log(`❌ ${m.name}: TaskTable ${taskTablePoints}P ≠ Analytics ${analyticsPoints}P`);
        totalMismatch = true;
      } else {
        console.log(`✅ ${m.name}: Beide ${taskTablePoints}P`);
      }
    });
    
    // Gesamtsumme vergleichen
    const taskTableSum = Object.values(taskTableTotals).reduce((sum, pts) => sum + pts, 0);
    const analyticsSum = overallAnalytics.totalPoints;
    
    console.log('\n💰 GESAMTSUMMEN:');
    console.log(`📊 TaskTable: ${taskTableSum}P`);
    console.log(`📈 Analytics: ${analyticsSum}P`);
    
    if (taskTableSum !== analyticsSum) {
      console.log(`❌ GESAMTSUMME MISMATCH! TaskTable ${taskTableSum}P ≠ Analytics ${analyticsSum}P`);
      totalMismatch = true;
    } else {
      console.log(`✅ Gesamtsummen stimmen überein!`);
    }
    
    if (totalMismatch) {
      console.log('\n🚨 PROBLEME GEFUNDEN!');
      console.log('🔍 Mögliche Ursachen:');
      console.log('- Verschiedene Datenquellen (executions vs state)');
      console.log('- Unterschiedliche Filterung');
      console.log('- Date-Field Probleme (date vs executedAt)');
      console.log('- pointsAwarded vs pointsPerExecution Verwirrung');
    } else {
      console.log('\n🎉 ALLES STIMMT ÜBEREIN!');
    }
    
    console.log('\n🔍 ================================');
    
  }).catch(error => {
    console.error('❌ Analytics Import Error:', error);
  });
};

console.log('🔧 TaskTable vs Analytics Comparison Tool geladen!');
console.log('📝 Führe window.compareTaskTableAnalytics() aus zum Vergleichen');
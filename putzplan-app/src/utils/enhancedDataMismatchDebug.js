/**
 * Enhanced TaskTable vs Analytics Debug Tool
 * Detaillierte Analyse der Datenabweichungen
 */

window.debugDataMismatch = function() {
  console.log('🚨 ==============================');
  console.log('🔍 CRITICAL DATA MISMATCH ANALYSIS');
  console.log('🚨 ==============================');
  
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
  
  console.log('📊 DATENGRUNDLAGE:');
  console.log(`🏠 WG: ${currentWG.name} (${currentWG.id})`);
  console.log(`👤 Current User: ${currentUser.name} (${currentUser.id})`);
  
  // Sammle alle relevanten Daten
  const members = currentWG.memberIds.map(id => state.users[id]).filter(Boolean);
  const tasks = Object.values(state.tasks).filter(t => t.wgId === currentWG.id && t.isActive);
  const allExecutions = Object.values(state.executions).filter(e => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === currentWG.id;
  });
  
  console.log(`\n📋 ROHDATEN:`);
  console.log(`👥 Members: ${members.length}`);
  console.log(`📝 Tasks: ${tasks.length}`);
  console.log(`✅ Total Executions: ${allExecutions.length}`);
  console.log(`💰 Total Points in Executions: ${allExecutions.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0)}P`);
  
  // Zeige alle Executions im Detail
  console.log(`\n🔍 EXECUTIONS DETAIL:`);
  allExecutions.forEach((e, index) => {
    const task = state.tasks[e.taskId];
    const user = state.users[e.executedBy];
    const date = new Date(e.date || e.executedAt);
    console.log(`${index + 1}. ${user?.name} | ${task?.title} | ${e.pointsAwarded}P | ${date.toLocaleDateString()}`);
  });
  
  // TaskTable Berechnung (ALLE Executions)
  console.log(`\n📊 TASK TABLE BERECHNUNG (ALLE EXECUTIONS):`);
  const taskTableTotals = {};
  members.forEach(m => taskTableTotals[m.id] = 0);
  
  allExecutions.forEach(e => {
    if (typeof taskTableTotals[e.executedBy] !== 'undefined') {
      const pts = typeof e.pointsAwarded === 'number' ? e.pointsAwarded : 0;
      taskTableTotals[e.executedBy] = (taskTableTotals[e.executedBy] || 0) + pts;
      console.log(`  Adding ${pts}P to ${state.users[e.executedBy]?.name} (total: ${taskTableTotals[e.executedBy]}P)`);
    }
  });
  
  console.log(`📊 TaskTable Final Totals:`);
  members.forEach(m => {
    console.log(`  ${m.emoji || '👤'} ${m.name}: ${taskTableTotals[m.id]}P`);
  });
  
  // Analytics Berechnung mit Periode-Filter
  console.log(`\n📈 ANALYTICS BERECHNUNG:`);
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Filter für aktuellen Monat
  const monthlyExecutions = allExecutions.filter((e) => {
    const execDate = new Date(e.date || e.executedAt);
    const inCurrentMonth = execDate.getMonth() === currentMonth && execDate.getFullYear() === currentYear;
    if (!inCurrentMonth) {
      console.log(`  📅 Filtered OUT: ${state.users[e.executedBy]?.name} | ${state.tasks[e.taskId]?.title} | ${execDate.toLocaleDateString()} (not in ${currentMonth + 1}/${currentYear})`);
    }
    return inCurrentMonth;
  });
  
  console.log(`📅 Current Month (${currentMonth + 1}/${currentYear}) Executions: ${monthlyExecutions.length}/${allExecutions.length}`);
  console.log(`💰 Monthly Points: ${monthlyExecutions.reduce((sum, e) => sum + (e.pointsAwarded || 0), 0)}P`);
  
  // Analytics Berechnung für Monthly
  const monthlyAnalyticsTotals = {};
  members.forEach(m => monthlyAnalyticsTotals[m.id] = 0);
  
  monthlyExecutions.forEach(e => {
    if (typeof monthlyAnalyticsTotals[e.executedBy] !== 'undefined') {
      const pts = typeof e.pointsAwarded === 'number' ? e.pointsAwarded : 0;
      monthlyAnalyticsTotals[e.executedBy] = (monthlyAnalyticsTotals[e.executedBy] || 0) + pts;
    }
  });
  
  console.log(`📈 Analytics Monthly Totals:`);
  members.forEach(m => {
    console.log(`  ${m.emoji || '👤'} ${m.name}: ${monthlyAnalyticsTotals[m.id]}P`);
  });
  
  // VERGLEICH UND PROBLEM IDENTIFIKATION
  console.log(`\n🚨 PROBLEM ANALYSE:`);
  console.log(`\n1. TaskTable zeigt ALLE Executions (${allExecutions.length})`);
  console.log(`2. Analytics zeigt nur AKTUELLEN MONAT (${monthlyExecutions.length})`);
  console.log(`\n💡 LÖSUNG: TaskTable und Analytics müssen den gleichen Filter verwenden!`);
  
  // Zeige Differenzen
  console.log(`\n⚠️ DIFFERENZEN:`);
  let hasDifferences = false;
  
  members.forEach(m => {
    const taskTablePoints = taskTableTotals[m.id];
    const analyticsPoints = monthlyAnalyticsTotals[m.id];
    
    if (taskTablePoints !== analyticsPoints) {
      console.log(`❌ ${m.name}: TaskTable ${taskTablePoints}P (ALL) ≠ Analytics ${analyticsPoints}P (MONTH)`);
      hasDifferences = true;
    } else {
      console.log(`✅ ${m.name}: Beide ${taskTablePoints}P`);
    }
  });
  
  if (!hasDifferences && allExecutions.length === monthlyExecutions.length) {
    console.log(`✅ Keine Differenzen - alle Executions sind im aktuellen Monat`);
  } else {
    console.log(`🚨 ROOT CAUSE: TaskTable und Analytics verwenden verschiedene Periode-Filter!`);
    console.log(`📝 FIX NEEDED: Beide müssen den gleichen Zeitraum zeigen`);
  }
  
  return {
    taskTableTotals,
    analyticsMonthlyTotals: monthlyAnalyticsTotals,
    allExecutionsCount: allExecutions.length,
    monthlyExecutionsCount: monthlyExecutions.length,
    hasDifferences
  };
};

// Weitere Hilfsfunktion für Live-Monitoring
window.monitorDataConsistency = function() {
  console.log('🔄 Starting live data consistency monitoring...');
  
  setInterval(() => {
    const result = window.debugDataMismatch();
    if (result && result.hasDifferences) {
      console.warn('⚠️ DATA MISMATCH DETECTED!');
    }
  }, 5000);
};

console.log('🛠️ Enhanced Data Mismatch Debug Tool loaded!');
console.log('🔍 Run: window.debugDataMismatch() to analyze differences');
console.log('📊 Run: window.monitorDataConsistency() for live monitoring');
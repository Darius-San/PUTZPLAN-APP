// Analytics Testing & Debugging Tool
// Dieses Tool testet die Analytics-Berechnungen und vergleicht sie mit den tatsächlichen Daten

class AnalyticsDebugger {
  
  static debugAnalytics() {
    console.log('🔍 =================================');
    console.log('📊 ANALYTICS DEBUG SESSION STARTED');
    console.log('🔍 =================================');
    
    try {
      // Importiere Services
      const { dataManager } = window.dataManager ? { dataManager: window.dataManager } : require('../services/dataManager');
      const { calculateUserAnalytics, calculateOverallAnalytics } = require('../services/analyticsService');
      
      const state = dataManager.getState();
      const currentWG = dataManager.getCurrentWG();
      const currentUser = dataManager.getCurrentUser();
      
      console.log('📋 Current WG:', currentWG?.name);
      console.log('👤 Current User:', currentUser?.name);
      
      if (!currentWG || !currentUser) {
        console.log('❌ No WG or User selected');
        return;
      }
      
      // Sammle Daten
      const users = Object.values(state.users).filter(u => currentWG.memberIds.includes(u.id));
      const tasks = Object.values(state.tasks).filter(t => t.wgId === currentWG.id && t.isActive);
      const executions = Object.values(state.executions).filter(e => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
      
      console.log('📊 DATA OVERVIEW:');
      console.log(`👥 Users: ${users.length} (${users.map(u => u.name).join(', ')})`);
      console.log(`📋 Tasks: ${tasks.length}`);
      console.log(`✅ Executions: ${executions.length}`);
      console.log('');
      
      // Test User Analytics
      console.log('👤 USER ANALYTICS TEST:');
      users.forEach(user => {
        console.log(`\n📋 ${user.emoji} ${user.name}:`);
        
        // Manuelle Berechnung
        const userExecutions = executions.filter(e => e.executedBy === user.id);
        const manualPoints = userExecutions.reduce((sum, e) => sum + e.pointsAwarded, 0);
        const manualTasks = userExecutions.length;
        
        // Analytics Service Berechnung
        const analytics = calculateUserAnalytics(user.id, user, executions, tasks);
        
        console.log(`  Manual Count: ${manualTasks} tasks, ${manualPoints} points`);
        console.log(`  Analytics:    ${analytics.totalTasks} tasks, ${analytics.totalPoints} points`);
        
        // Vergleich
        if (manualPoints !== analytics.totalPoints) {
          console.log(`  ❌ POINTS MISMATCH! Manual: ${manualPoints}, Analytics: ${analytics.totalPoints}`);
        } else {
          console.log(`  ✅ Points match!`);
        }
        
        if (manualTasks !== analytics.totalTasks) {
          console.log(`  ❌ TASKS MISMATCH! Manual: ${manualTasks}, Analytics: ${analytics.totalTasks}`);
        } else {
          console.log(`  ✅ Tasks match!`);
        }
        
        // Executions Details
        console.log(`  📋 Executions: ${userExecutions.map(e => {
          const task = state.tasks[e.taskId];
          return `${task?.title}(${e.pointsAwarded}P)`;
        }).join(', ')}`);
      });
      
      // Test Overall Analytics
      console.log('\n🌍 OVERALL ANALYTICS TEST:');
      const overallAnalytics = calculateOverallAnalytics(executions, tasks, users);
      
      // Manuelle Gesamtberechnung
      const manualTotalPoints = executions.reduce((sum, e) => sum + e.pointsAwarded, 0);
      const manualTotalTasks = executions.length;
      
      console.log(`Manual Total: ${manualTotalTasks} tasks, ${manualTotalPoints} points`);
      console.log(`Analytics:    ${overallAnalytics.totalTasks} tasks, ${overallAnalytics.totalPoints} points`);
      
      if (manualTotalPoints !== overallAnalytics.totalPoints) {
        console.log(`❌ TOTAL POINTS MISMATCH! Manual: ${manualTotalPoints}, Analytics: ${overallAnalytics.totalPoints}`);
      } else {
        console.log(`✅ Total points match!`);
      }
      
      // Leaderboard Check
      console.log('\n🏆 LEADERBOARD TEST:');
      const leaderboardSum = overallAnalytics.leaderboard.reduce((sum, user) => sum + user.totalPoints, 0);
      console.log(`Leaderboard Sum: ${leaderboardSum} points`);
      console.log(`Should equal: ${manualTotalPoints} points`);
      
      if (leaderboardSum !== manualTotalPoints) {
        console.log(`❌ LEADERBOARD SUM MISMATCH!`);
      } else {
        console.log(`✅ Leaderboard sum matches!`);
      }
      
      // Detaillierte Leaderboard-Analyse
      overallAnalytics.leaderboard.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.user.emoji} ${user.user.name}: ${user.totalPoints}P (${user.totalTasks} tasks)`);
      });
      
      // Hot Tasks Test
      console.log('\n🔥 HOT TASKS TEST:');
      const hotExecutions = executions.filter(e => {
        const task = tasks.find(t => t.id === e.taskId);
        return task?.isAlarmed || e.pointsAwarded > (task?.pointsPerExecution || 0);
      });
      console.log(`Hot Executions Found: ${hotExecutions.length}`);
      console.log(`Analytics Hot Tasks: ${overallAnalytics.totalHotTasks}`);
      
      if (hotExecutions.length !== overallAnalytics.totalHotTasks) {
        console.log(`❌ HOT TASKS MISMATCH!`);
      } else {
        console.log(`✅ Hot tasks match!`);
      }
      
      console.log('\n🔍 =================================');
      console.log('📊 ANALYTICS DEBUG SESSION ENDED');
      console.log('🔍 =================================');
      
    } catch (error) {
      console.error('❌ Analytics Debug Error:', error);
    }
  }
  
  static quickAnalyticsTest() {
    console.log('🚀 Quick Analytics Test...');
    
    if (window.dataManager) {
      this.debugAnalytics();
    } else {
      console.log('⏳ Waiting for dataManager...');
      setTimeout(() => this.debugAnalytics(), 1000);
    }
  }
}

// Expose to window for manual testing
window.AnalyticsDebugger = AnalyticsDebugger;
window.debugAnalytics = () => AnalyticsDebugger.debugAnalytics();

console.log('🔧 Analytics Debugger loaded!');
console.log('📝 Run window.debugAnalytics() to test analytics calculations');

export default AnalyticsDebugger;
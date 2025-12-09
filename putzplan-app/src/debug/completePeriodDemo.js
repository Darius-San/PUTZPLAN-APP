// Complete Demo: Periode Management & Persistence Features
// Run this in the browser console after loading the app

function runCompleteDemo() {
  console.log('🎭 [DEMO] Starting Complete Period Management & Persistence Demo');
  console.log('=====================================================\n');

  const dm = window.dataManager;
  if (!dm) {
    console.error('❌ DataManager not available');
    return;
  }

  // Clear for fresh start
  dm.clearAllData();
  console.log('🧹 [DEMO] Cleared all data for fresh demo\n');

  // =====================================
  // SETUP: Create Users & WG
  // =====================================
  console.log('👥 [DEMO] Setting up users and WG...');
  
  const darius = dm.createUser({ name: 'Darius', avatar: '👨‍💻' });
  const lilly = dm.createUser({ name: 'Lilly', avatar: '👩‍🎨' });
  
  const wg = dm.createWG({ 
    name: 'Demo WG', 
    description: 'Demo for period management',
    settings: { monthlyPointsTarget: 100 }
  });
  
  dm.updateWG(wg.id, { memberIds: [darius.id, lilly.id] });
  dm.setCurrentUser(darius.id);
  
  const tasks = [
    dm.createTask({ title: 'Küche', emoji: '🍴', pointsPerExecution: 15, wgId: wg.id }),
    dm.createTask({ title: 'Bad', emoji: '🛁', pointsPerExecution: 20, wgId: wg.id }),
    dm.createTask({ title: 'Staubsaugen', emoji: '🧹', pointsPerExecution: 10, wgId: wg.id })
  ];

  console.log('✅ [DEMO] Setup complete: 2 users, 1 WG, 3 tasks\n');

  // =====================================
  // PERIODE 1: Januar 2025
  // =====================================
  console.log('📅 [DEMO] Creating Period 1: Januar 2025...');
  
  const period1 = dm.setCustomPeriod(
    new Date('2025-01-01'),
    new Date('2025-01-31'),
    false
  );
  
  // Simulate work in January
  dm.executeTaskForUser(tasks[0].id, darius.id, {}); // Küche - Darius
  dm.executeTaskForUser(tasks[1].id, lilly.id, {});  // Bad - Lilly  
  dm.executeTaskForUser(tasks[2].id, darius.id, {}); // Staubsaugen - Darius
  dm.executeTaskForUser(tasks[0].id, lilly.id, {});  // Küche - Lilly

  const jan_stats = dm.getState();
  console.log(`✅ [DEMO] January work completed:`);
  console.log(`   - Darius: ${jan_stats.users[darius.id].totalPoints}P`);
  console.log(`   - Lilly: ${jan_stats.users[lilly.id].totalPoints}P`);
  console.log(`   - Total executions: ${Object.keys(jan_stats.executions).length}\n`);

  // =====================================
  // PERIODE 2: Februar 2025 (ohne Reset)
  // =====================================
  console.log('📅 [DEMO] Creating Period 2: Februar 2025 (ohne Reset)...');
  
  const period2 = dm.setCustomPeriod(
    new Date('2025-02-01'),
    new Date('2025-02-28'),
    false // KEIN Reset!
  );
  
  // More work in February
  dm.executeTaskForUser(tasks[1].id, darius.id, {}); // Bad - Darius
  dm.executeTaskForUser(tasks[2].id, lilly.id, {});  // Staubsaugen - Lilly

  const feb_stats = dm.getState();
  console.log(`✅ [DEMO] February work completed (cumulative):`);
  console.log(`   - Darius: ${feb_stats.users[darius.id].totalPoints}P`);
  console.log(`   - Lilly: ${feb_stats.users[lilly.id].totalPoints}P`);
  console.log(`   - Total executions: ${Object.keys(feb_stats.executions).length}\n`);

  // =====================================
  // PERIODE 3: März 2025 (MIT Reset)
  // =====================================
  console.log('📅 [DEMO] Creating Period 3: März 2025 (MIT Reset)...');
  
  const period3 = dm.setCustomPeriod(
    new Date('2025-03-01'),
    new Date('2025-03-31'),
    true // MIT Reset!
  );
  
  // Work after reset
  dm.executeTaskForUser(tasks[0].id, darius.id, {}); // Küche - Darius

  const mar_stats = dm.getState();
  console.log(`✅ [DEMO] March work completed (after reset):`);
  console.log(`   - Darius: ${mar_stats.users[darius.id].totalPoints}P`);
  console.log(`   - Lilly: ${mar_stats.users[lilly.id].totalPoints}P`);
  console.log(`   - Total executions: ${Object.keys(mar_stats.executions).length}\n`);

  // =====================================
  // HISTORICAL PERIODS OVERVIEW
  // =====================================
  console.log('📊 [DEMO] Historical Periods Overview...');
  
  const historicalPeriods = dm.getHistoricalPeriods();
  console.log(`✅ [DEMO] Total periods in history: ${historicalPeriods.length}`);
  
  historicalPeriods.forEach((period, index) => {
    const status = period.__LIVE_PERIOD__ 
      ? (period.isActive ? '🟢 AKTIV' : '📊 LIVE')
      : '📁 ARCHIV';
    console.log(`   ${index + 1}. ${period.name} - ${status}`);
  });
  console.log('');

  // =====================================
  // PERIOD DISPLAY FILTERING DEMO
  // =====================================
  console.log('🔍 [DEMO] Period Display Filtering...');
  
  // Show January data
  dm.setDisplayPeriod(period1.id);
  const jan_executions = dm.getDisplayPeriodExecutions();
  console.log(`✅ [DEMO] January executions: ${Object.keys(jan_executions).length}`);
  
  // Show February data (includes January + February)
  dm.setDisplayPeriod(period2.id);
  const feb_executions = dm.getDisplayPeriodExecutions();
  console.log(`✅ [DEMO] February executions: ${Object.keys(feb_executions).length}`);
  
  // Show current (March - post reset)
  dm.setDisplayPeriod(null);
  const current_executions = dm.getDisplayPeriodExecutions();
  console.log(`✅ [DEMO] Current executions: ${Object.keys(current_executions).length}\n`);

  // =====================================
  // PERSISTENCE VERIFICATION
  // =====================================
  console.log('💾 [DEMO] Persistence Verification...');
  
  const stored = localStorage.getItem('putzplan-data');
  if (stored) {
    const parsed = JSON.parse(stored);
    console.log(`✅ [DEMO] Current period persisted: ${parsed.state.currentPeriod?.id}`);
    console.log(`✅ [DEMO] Data size: ${(stored.length / 1024).toFixed(2)}KB`);
    
    // Verify WG periods
    const wgData = parsed.state.wgs?.[wg.id];
    if (wgData?.periods) {
      console.log(`✅ [DEMO] Analytics periods persisted: ${wgData.periods.length}`);
    }
  } else {
    console.log('❌ [DEMO] No persistence data found');
  }
  console.log('');

  // =====================================
  // APP RESTART SIMULATION
  // =====================================
  console.log('🔄 [DEMO] Simulating App Restart...');
  
  // Create new DataManager instance to simulate restart
  const testManager = new dm.constructor();
  testManager._TEST_setLocalStorage(window.localStorage);
  
  const restoredState = testManager.getState();
  console.log(`✅ [DEMO] After restart - current period: ${restoredState.currentPeriod?.id}`);
  console.log(`✅ [DEMO] After restart - users: ${Object.keys(restoredState.users).length}`);
  console.log(`✅ [DEMO] After restart - executions: ${Object.keys(restoredState.executions).length}`);
  console.log(`✅ [DEMO] After restart - tasks: ${Object.keys(restoredState.tasks).length}\n`);

  // =====================================
  // FEATURE SUMMARY
  // =====================================
  console.log('🎯 [DEMO] FEATURE SUMMARY');
  console.log('========================');
  console.log('✅ Period Persistence: Zeiträume überleben App-Neustart');
  console.log('✅ Analytics Integration: Neue Zeiträume sofort in Analytics sichtbar');
  console.log('✅ Historical Navigation: Alte Zeiträume auswählbar und Task-Tabellen laden deren Daten');
  console.log('✅ Overlap Detection: Warnung bei überlappenden Zeiträumen mit Wechsel-Option');
  console.log('✅ Data Reset: Optionales Zurücksetzen der Daten bei neuem Zeitraum');
  console.log('✅ Hot Task Reset: Hot Tasks werden bei Reset automatisch gecleart');
  console.log('✅ Cross-Browser Sync: Daten zwischen Simple Browser ↔ Chrome synchron\n');

  console.log('🎉 [DEMO] Complete Period Management Demo finished successfully!');
  console.log('💡 [DEMO] Try switching periods in PeriodSettings to see historical data in TaskTable');
  
  return {
    periods: { period1, period2, period3 },
    users: { darius, lilly },
    wg,
    tasks,
    historicalPeriods
  };
}

// Auto-run demo if in browser
if (typeof window !== 'undefined') {
  console.log('🚀 [DEMO] Period Management Demo loaded');
  console.log('📋 [DEMO] Run `runCompleteDemo()` to start the demonstration');
  window.runCompleteDemo = runCompleteDemo;
} else {
  // For module export
  module.exports = { runCompleteDemo };
}

export { runCompleteDemo };
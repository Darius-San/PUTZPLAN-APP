// Debug Script: Test Period Reset Functionality
// Run in browser console to test the new period reset feature

function testPeriodReset() {
  console.log('🧪 [Period Reset Test] Starting period reset functionality test...');

  // Check if dataManager is available
  if (!window.dataManager) {
    console.error('❌ [Test] DataManager not available on window object');
    return;
  }

  const dm = window.dataManager;
  
  console.log('📊 [Test] Current state before reset:');
  console.log('- Executions:', Object.keys(dm.state.executions).length);
  console.log('- Users with points:', Object.values(dm.state.users).filter(u => u.totalPoints > 0).length);
  console.log('- Current WG:', dm.getCurrentWG()?.name || 'None');
  console.log('- Current Period:', dm.state.currentPeriod?.id || 'None');

  // Test 1: setCustomPeriod with reset=false (normal save)
  console.log('\n🔄 [Test 1] Setting new period WITHOUT reset...');
  try {
    const newPeriod = dm.setCustomPeriod(new Date('2025-12-01'), new Date('2025-12-31'), false);
    console.log('✅ [Test 1] Success - Period set without reset:', newPeriod.id);
  } catch (error) {
    console.error('❌ [Test 1] Failed:', error.message);
  }

  // Test 2: resetForNewPeriod method
  console.log('\n🗑️ [Test 2] Testing resetForNewPeriod method...');
  try {
    const beforeExecutions = Object.keys(dm.state.executions).length;
    const beforeUsersWithPoints = Object.values(dm.state.users).filter(u => u.totalPoints > 0).length;
    
    dm.resetForNewPeriod();
    
    const afterExecutions = Object.keys(dm.state.executions).length;
    const afterUsersWithPoints = Object.values(dm.state.users).filter(u => u.totalPoints > 0).length;
    
    console.log(`✅ [Test 2] Reset complete:`);
    console.log(`- Executions: ${beforeExecutions} → ${afterExecutions}`);
    console.log(`- Users with points: ${beforeUsersWithPoints} → ${afterUsersWithPoints}`);
    
    if (afterExecutions < beforeExecutions) {
      console.log('🎉 [Test 2] Executions successfully deleted!');
    }
    if (afterUsersWithPoints < beforeUsersWithPoints) {
      console.log('🎉 [Test 2] User points successfully reset!');
    }
    
  } catch (error) {
    console.error('❌ [Test 2] Failed:', error.message);
  }

  // Test 3: setCustomPeriod with reset=true (full reset)
  console.log('\n🔄 [Test 3] Setting new period WITH reset...');
  try {
    // First add some test data
    addTestDataForReset();
    
    const beforeState = {
      executions: Object.keys(dm.state.executions).length,
      usersWithPoints: Object.values(dm.state.users).filter(u => u.totalPoints > 0).length
    };
    
    const newPeriod = dm.setCustomPeriod(new Date('2026-01-01'), new Date('2026-01-31'), true);
    
    const afterState = {
      executions: Object.keys(dm.state.executions).length,
      usersWithPoints: Object.values(dm.state.users).filter(u => u.totalPoints > 0).length
    };
    
    console.log('✅ [Test 3] Success - Period set with reset:', newPeriod.id);
    console.log(`- Executions: ${beforeState.executions} → ${afterState.executions}`);
    console.log(`- Users with points: ${beforeState.usersWithPoints} → ${afterState.usersWithPoints}`);
    
  } catch (error) {
    console.error('❌ [Test 3] Failed:', error.message);
  }

  console.log('\n🏁 [Period Reset Test] Test completed!');
  console.log('💡 You can now test the UI by:');
  console.log('1. Going to Period Settings');
  console.log('2. Checking the "Reset data" checkbox');
  console.log('3. Setting a new period and saving');
}

function addTestDataForReset() {
  console.log('📝 [Helper] Adding test data for reset demonstration...');
  
  const dm = window.dataManager;
  const currentWG = dm.getCurrentWG();
  
  if (!currentWG) {
    console.warn('⚠️ [Helper] No current WG found');
    return;
  }

  // Add test executions
  const testExecutions = [
    {
      id: `test_exec_${Date.now()}_1`,
      taskId: Object.keys(dm.state.tasks)[0], // Use first available task
      userId: currentWG.memberIds[0], // Use first member
      pointsAwarded: 25,
      date: new Date().toISOString()
    },
    {
      id: `test_exec_${Date.now()}_2`,
      taskId: Object.keys(dm.state.tasks)[0],
      userId: currentWG.memberIds[1] || currentWG.memberIds[0],
      pointsAwarded: 30,
      date: new Date().toISOString()
    }
  ];

  // Add executions to state
  const updatedExecutions = { ...dm.state.executions };
  testExecutions.forEach(exec => {
    updatedExecutions[exec.id] = exec;
  });

  // Update users with points
  const updatedUsers = { ...dm.state.users };
  testExecutions.forEach(exec => {
    if (updatedUsers[exec.userId]) {
      updatedUsers[exec.userId] = {
        ...updatedUsers[exec.userId],
        totalPoints: (updatedUsers[exec.userId].totalPoints || 0) + exec.pointsAwarded,
        completedTasks: (updatedUsers[exec.userId].completedTasks || 0) + 1
      };
    }
  });

  dm.updateState({ 
    executions: updatedExecutions,
    users: updatedUsers 
  });

  console.log(`✅ [Helper] Added ${testExecutions.length} test executions`);
}

// Auto-load debug functions
console.log('🧪 Period Reset Debug Tools Loaded');
console.log('📋 Available functions:');
console.log('- testPeriodReset() - Comprehensive reset functionality test');
console.log('- addTestDataForReset() - Add test data for reset demonstration');

// Export for console use
window.testPeriodReset = testPeriodReset;
window.addTestDataForReset = addTestDataForReset;
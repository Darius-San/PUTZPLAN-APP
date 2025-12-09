// COMPLETE AUTOMATED PERSISTENCE TEST
// ===================================
// This tests the exact user scenario: create period → app restart → check if period exists

console.clear();
console.log('🧪 COMPLETE PERSISTENCE TEST');
console.log('============================');
console.log('Testing: CrossBrowserSync deactivation fix');
console.log('Date:', new Date().toLocaleString());

if (!window.dataManager) {
    console.log('❌ ERROR: dataManager not available');
    console.log('   Make sure you are on http://localhost:5173/ and app is loaded');
    throw new Error('dataManager not available');
}

console.log('✅ dataManager available');
console.log('🎯 Testing the exact bug scenario...');

// === TEST CONFIGURATION ===
const TEST_ID = 'PERSISTENCE_BUG_TEST_' + Date.now();
const testStart = new Date();
testStart.setHours(0, 0, 0, 0);
const testEnd = new Date(testStart.getTime() + 14 * 24 * 60 * 60 * 1000);

console.log('\n📊 TEST SETUP:');
console.log('   Test ID:', TEST_ID);  
console.log('   Period start:', testStart.toISOString());
console.log('   Period end:', testEnd.toISOString());
console.log('   CrossBrowserSync status: DISABLED');

// === STEP 1: CLEAN START ===
console.log('\n🧹 STEP 1: CLEAN START');
console.log('   Clearing all storage...');

localStorage.removeItem('putzplan-data');
localStorage.removeItem('putzplan-sync');

// Also reset dataManager if possible
if (window.dataManager._TEST_reset) {
    window.dataManager._TEST_reset();
    console.log('   ✅ DataManager reset');
} else {
    console.log('   ⚠️ Cannot reset DataManager (_TEST_reset not available)');
}

console.log('   ✅ Storage cleared');

// Verify clean start
const cleanCheck = localStorage.getItem('putzplan-data');
if (cleanCheck === null) {
    console.log('   ✅ Confirmed: No storage data');
} else {
    console.log('   ❌ Warning: Storage not fully cleared');
}

// === STEP 2: CREATE PERIOD (THE CRITICAL OPERATION) ===
console.log('\n📅 STEP 2: CREATE PERIOD');
console.log('   Creating test period...');

let createdPeriod;
try {
    createdPeriod = window.dataManager.setCustomPeriod(testStart, testEnd, false);
    console.log('   ✅ Period created successfully');
    console.log('      ID:', createdPeriod.id);
    console.log('      Start:', createdPeriod.start);
    console.log('      End:', createdPeriod.end);
    console.log('      Days:', createdPeriod.days);
} catch (error) {
    console.log('   ❌ FAILED to create period:', error.message);
    throw error;
}

// === STEP 3: IMMEDIATE PERSISTENCE CHECK ===
console.log('\n💾 STEP 3: IMMEDIATE PERSISTENCE CHECK');

// Check in-memory state first
const memoryState = window.dataManager.getState();
const memoryPeriod = memoryState.currentPeriod;

if (memoryPeriod?.id === createdPeriod.id) {
    console.log('   ✅ Period in memory:', memoryPeriod.id);
} else {
    console.log('   ❌ Period NOT in memory!');
    console.log('      Expected:', createdPeriod.id);
    console.log('      Found:', memoryPeriod?.id);
    throw new Error('Period not in memory');
}

// Wait for any async saves (the old debounced save was 100ms)
setTimeout(() => {
    console.log('\n   Checking localStorage after 300ms...');
    
    const storedData = localStorage.getItem('putzplan-data');
    if (!storedData) {
        console.log('   ❌ CRITICAL: No data in localStorage!');
        console.log('   🚨 Period was not persisted at all!');
        return;
    }
    
    let parsedData;
    try {
        parsedData = JSON.parse(storedData);
    } catch (error) {
        console.log('   ❌ CRITICAL: Invalid JSON in localStorage');
        return;
    }
    
    const storedPeriod = parsedData.state?.currentPeriod;
    
    if (storedPeriod?.id === createdPeriod.id) {
        console.log('   ✅ Period correctly persisted to localStorage!');
        console.log('      Stored ID:', storedPeriod.id);
        console.log('      Storage version:', parsedData.version);
        console.log('      Saved at:', parsedData.savedAt);
        console.log('      Data size:', storedData.length, 'characters');
        
        // === STEP 4: THE ULTIMATE TEST - RESTART SIMULATION ===
        console.log('\n🔄 STEP 4: RESTART SIMULATION TEST');
        
        if (window.dataManager._TEST_reset) {
            console.log('   Testing with _TEST_reset (simulates app restart)...');
            
            // This simulates exactly what happens when the app restarts:
            // 1. DataManager constructor is called
            // 2. loadFromStorage() is executed
            // 3. State is restored from localStorage
            
            window.dataManager._TEST_reset();
            
            setTimeout(() => {
                const afterRestartState = window.dataManager.getState();
                const afterRestartPeriod = afterRestartState.currentPeriod;
                
                console.log('   Post-restart state loaded');
                console.log('   Post-restart period:', afterRestartPeriod?.id || 'null');
                
                if (afterRestartPeriod?.id === createdPeriod.id) {
                    console.log('\n🎉 🎉 🎉 TEST PASSED! 🎉 🎉 🎉');
                    console.log('✅ Period survived restart simulation!');
                    console.log('✅ CrossBrowserSync deactivation WORKS!');
                    console.log('✅ PERSISTENCE BUG IS FIXED!');
                    
                    console.log('\n📋 FINAL VERIFICATION NEEDED:');
                    console.log('   1. Note this period ID:', createdPeriod.id);
                    console.log('   2. Press F5 to refresh this page');
                    console.log('   3. Wait for app to load');
                    console.log('   4. Run in console: dataManager.getState().currentPeriod');
                    console.log('   5. Verify the period ID matches');
                    
                    // Store for manual verification
                    sessionStorage.setItem('testPeriodId', createdPeriod.id);
                    sessionStorage.setItem('testCompletedAt', new Date().toISOString());
                    
                } else {
                    console.log('\n💥 💥 💥 TEST FAILED! 💥 💥 💥');
                    console.log('❌ Period LOST after restart simulation!');
                    console.log('   Expected:', createdPeriod.id);
                    console.log('   Found:', afterRestartPeriod?.id);
                    console.log('🚨 BUG STILL EXISTS despite CrossBrowserSync fix!');
                    
                    // Debug info
                    console.log('\n🔬 DEBUG INFO:');
                    const debugStorage = localStorage.getItem('putzplan-data');
                    if (debugStorage) {
                        const debugData = JSON.parse(debugStorage);
                        console.log('   Storage period after restart:', debugData.state?.currentPeriod?.id);
                        console.log('   Storage saved at:', debugData.savedAt);
                        
                        if (debugData.state?.currentPeriod?.id === createdPeriod.id) {
                            console.log('   ➡️ Data in storage but not loaded by DataManager');
                            console.log('   ➡️ Issue in loadFromStorage() logic');
                        } else {
                            console.log('   ➡️ Data was overwritten in storage');
                            console.log('   ➡️ Issue in saveToStorage() or state management');
                        }
                    }
                }
            }, 500);
            
        } else {
            console.log('   _TEST_reset not available - manual test required');
            console.log('\n📋 MANUAL RESTART TEST:');
            console.log('   1. Note period ID:', createdPeriod.id);
            console.log('   2. Press F5 to refresh');
            console.log('   3. Check: dataManager.getState().currentPeriod.id');
            console.log('   4. Should equal:', createdPeriod.id);
            
            sessionStorage.setItem('testPeriodId', createdPeriod.id);
        }
        
    } else {
        console.log('   ❌ CRITICAL: Period NOT in localStorage!');
        console.log('      Expected:', createdPeriod.id);
        console.log('      Found:', storedPeriod?.id);
        console.log('      Full stored period:', storedPeriod);
        console.log('   🚨 PERSISTENCE FAILED immediately after creation!');
    }
    
}, 300);

// Manual restart check function
window.checkAfterManualRestart = function() {
    const expectedId = sessionStorage.getItem('testPeriodId');
    const testTime = sessionStorage.getItem('testCompletedAt');
    
    console.log('\n🔍 MANUAL RESTART VERIFICATION');
    console.log('================================');
    console.log('Test was run at:', testTime);
    console.log('Expected period ID:', expectedId);
    
    if (!expectedId) {
        console.log('❌ No test period ID found - run the test first');
        return;
    }
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available after restart');
        return;
    }
    
    const currentState = window.dataManager.getState();
    const currentPeriod = currentState.currentPeriod;
    const currentId = currentPeriod?.id;
    
    console.log('Current period ID:', currentId || 'null');
    
    if (currentId === expectedId) {
        console.log('\n🎉 MANUAL TEST PASSED!');
        console.log('✅ Period survived REAL app restart!');
        console.log('✅ CrossBrowserSync fix is CONFIRMED working!');
        console.log('✅ Persistence bug is DEFINITELY FIXED!');
        
        // Cleanup
        sessionStorage.removeItem('testPeriodId');
        sessionStorage.removeItem('testCompletedAt');
        
    } else {
        console.log('\n❌ MANUAL TEST FAILED!');
        console.log('🚨 Period lost after REAL restart');
        console.log('🚨 Bug persists despite fix attempt');
        
        // Debug
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('Storage period:', data.state?.currentPeriod?.id);
            console.log('Storage version:', data.version);
        }
    }
};

console.log('\n🚀 TEST IS RUNNING...');
console.log('⏳ Please wait for results...');
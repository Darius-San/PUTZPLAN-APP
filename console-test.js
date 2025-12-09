// ========================================
// QUICK PERSISTENCE TEST FOR BROWSER CONSOLE
// ========================================
// Copy this entire code block and paste into the browser console at http://localhost:5173/

(function() {
    console.clear();
    console.log('🧪 QUICK PERSISTENCE TEST');
    console.log('=========================');
    console.log('Testing CrossBrowserSync fix...');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available - wait for app to load');
        return;
    }
    
    console.log('✅ dataManager available');
    
    // Test configuration
    const testStart = new Date();
    testStart.setHours(0, 0, 0, 0);
    const testEnd = new Date(testStart.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
    
    console.log('\n📋 TEST CONFIGURATION:');
    console.log('  Start:', testStart.toISOString());
    console.log('  End:', testEnd.toISOString());
    console.log('  CrossBrowserSync:', 'DISABLED (should fix bug)');
    
    // Step 1: Clear storage
    console.log('\n🧹 STEP 1: Clearing storage...');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    console.log('  ✅ Storage cleared');
    
    // Step 2: Create period
    console.log('\n📅 STEP 2: Creating period...');
    let period;
    try {
        period = window.dataManager.setCustomPeriod(testStart, testEnd, false);
        console.log('  ✅ Period created:', period.id);
    } catch (error) {
        console.log('  ❌ Failed:', error.message);
        return;
    }
    
    // Step 3: Check immediate persistence
    setTimeout(() => {
        console.log('\n💾 STEP 3: Checking persistence...');
        
        const stored = localStorage.getItem('putzplan-data');
        if (stored) {
            const data = JSON.parse(stored);
            const storedPeriod = data.state?.currentPeriod;
            
            if (storedPeriod?.id === period.id) {
                console.log('  ✅ Persisted to localStorage:', storedPeriod.id);
                console.log('  ✅ Saved at:', data.savedAt);
                
                // Step 4: Test restart simulation
                if (window.dataManager._TEST_reset) {
                    console.log('\n🔄 STEP 4: Testing restart simulation...');
                    
                    window.dataManager._TEST_reset();
                    
                    setTimeout(() => {
                        const afterRestart = window.dataManager.getState();
                        const afterPeriod = afterRestart.currentPeriod;
                        
                        if (afterPeriod?.id === period.id) {
                            console.log('  🎉 SUCCESS! Period survived restart!');
                            console.log('  ✅ CROSSBROWSERSYNC FIX WORKS!');
                            console.log('\n🏆 PERSISTENCE BUG IS FIXED!');
                            
                            // Final instructions
                            console.log('\n📋 MANUAL VERIFICATION:');
                            console.log('  1. Note period ID:', period.id);
                            console.log('  2. Press F5 to refresh');
                            console.log('  3. In console: dataManager.getState().currentPeriod');
                            console.log('  4. Should show the same period ID');
                            
                        } else {
                            console.log('  ❌ Period LOST after restart simulation');
                            console.log('  🚨 BUG STILL EXISTS');
                        }
                    }, 300);
                } else {
                    console.log('\n📋 STEP 4: Manual restart test needed');
                    console.log('  1. Note period ID:', period.id);
                    console.log('  2. Press F5 to refresh');
                    console.log('  3. Check: dataManager.getState().currentPeriod.id');
                    console.log('  4. Should be:', period.id);
                }
                
            } else {
                console.log('  ❌ NOT persisted to localStorage');
                console.log('    Expected:', period.id);
                console.log('    Found:', storedPeriod?.id);
            }
        } else {
            console.log('  ❌ No localStorage data found');
        }
    }, 300);
    
})();

// Additional helper function for manual restart test
window.checkPersistenceAfterRestart = function(expectedId) {
    console.log('🔍 CHECKING PERSISTENCE AFTER RESTART');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available');
        return;
    }
    
    const current = window.dataManager.getState().currentPeriod;
    const currentId = current?.id;
    
    console.log('Expected ID:', expectedId);
    console.log('Current ID:', currentId);
    
    if (currentId === expectedId) {
        console.log('🎉 SUCCESS! Period survived restart!');
        console.log('✅ CrossBrowserSync fix successful!');
        console.log('✅ Persistence bug is FIXED!');
    } else {
        console.log('❌ FAILURE! Period lost after restart');
        console.log('🚨 Persistence bug still exists');
        
        // Check storage
        const stored = localStorage.getItem('putzplan-data');
        if (stored) {
            const data = JSON.parse(stored);
            console.log('Storage period:', data.state?.currentPeriod?.id);
        }
    }
};

console.log('🚀 PERSISTENCE TEST LOADED');
console.log('The test will run automatically when you paste this code.');
console.log('For manual restart test, use: checkPersistenceAfterRestart("PERIOD_ID")');
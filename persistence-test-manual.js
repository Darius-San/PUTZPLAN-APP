// MANUAL BROWSER TEST SIMULATION
// Load this script in the browser console to test persistence

function runFullPersistenceTest() {
    console.clear();
    console.log('🧪 FULL PERSISTENCE TEST');
    console.log('========================');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available');
        return;
    }
    
    // Configuration
    const testPeriodId = 'TEST_' + Date.now();
    
    console.log('🔧 Test Setup:');
    console.log('  - Test ID:', testPeriodId);
    console.log('  - CrossBrowserSync disabled:', 'YES (to fix the bug)');
    console.log('  - Testing persistence without sync layer');
    
    // Step 1: Clear everything for clean test
    console.log('\n1️⃣ CLEARING STORAGE');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    console.log('  ✅ Storage cleared');
    
    // Step 2: Force app to initial state
    console.log('\n2️⃣ RESET TO INITIAL STATE');
    if (window.dataManager._TEST_reset) {
        window.dataManager._TEST_reset();
        console.log('  ✅ DataManager reset to initial state');
    }
    
    // Wait a moment
    setTimeout(() => {
        console.log('\n3️⃣ CREATE NEW PERIOD');
        
        const start = new Date();
        start.setHours(0, 0, 0, 0); // Normalize to start of day
        const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
        
        console.log('  - Start:', start.toISOString());
        console.log('  - End:', end.toISOString());
        
        let newPeriod;
        try {
            newPeriod = window.dataManager.setCustomPeriod(start, end, false);
            console.log('  ✅ Period created:', newPeriod.id);
        } catch (error) {
            console.log('  ❌ Failed to create period:', error);
            return;
        }
        
        // Step 4: Immediate verification
        setTimeout(() => {
            console.log('\n4️⃣ IMMEDIATE VERIFICATION');
            
            // Check memory
            const memoryState = window.dataManager.getState();
            const memoryPeriod = memoryState.currentPeriod;
            
            if (memoryPeriod?.id === newPeriod.id) {
                console.log('  ✅ Period in memory:', memoryPeriod.id);
            } else {
                console.log('  ❌ Period NOT in memory');
                console.log('    Expected:', newPeriod.id);
                console.log('    Found:', memoryPeriod?.id);
                return;
            }
            
            // Check localStorage
            const storage = localStorage.getItem('putzplan-data');
            if (storage) {
                const data = JSON.parse(storage);
                const storagePeriod = data.state?.currentPeriod;
                
                if (storagePeriod?.id === newPeriod.id) {
                    console.log('  ✅ Period in localStorage:', storagePeriod.id);
                    console.log('    - Version:', data.version);
                    console.log('    - Saved at:', data.savedAt);
                } else {
                    console.log('  ❌ Period NOT in localStorage');
                    console.log('    Expected:', newPeriod.id);
                    console.log('    Found:', storagePeriod?.id);
                    return;
                }
            } else {
                console.log('  ❌ No localStorage data');
                return;
            }
            
            // Step 5: Test restart simulation
            setTimeout(() => {
                console.log('\n5️⃣ RESTART SIMULATION');
                console.log('  📝 Instructions:');
                console.log('    1. Note this period ID:', newPeriod.id);
                console.log('    2. Press F5 to refresh the page');
                console.log('    3. Open console and run: checkPersistence("' + newPeriod.id + '")');
                console.log('');
                console.log('  🔧 Or test programmatically with _TEST_reset (if available)');
                
                if (window.dataManager._TEST_reset) {
                    console.log('\n  🤖 AUTOMATIC RESTART SIMULATION');
                    
                    // Reset the manager to simulate restart
                    window.dataManager._TEST_reset();
                    
                    setTimeout(() => {
                        const afterRestart = window.dataManager.getState();
                        const afterRestartPeriod = afterRestart.currentPeriod;
                        
                        if (afterRestartPeriod?.id === newPeriod.id) {
                            console.log('  🎉 PERSISTENCE TEST PASSED!');
                            console.log('    ✅ Period survived restart:', afterRestartPeriod.id);
                            console.log('    ✅ CrossBrowserSync fix worked!');
                            
                            // Final validation
                            console.log('\n6️⃣ FINAL VALIDATION');
                            const finalStorage = localStorage.getItem('putzplan-data');
                            if (finalStorage) {
                                const finalData = JSON.parse(finalStorage);
                                const finalPeriod = finalData.state?.currentPeriod;
                                
                                if (finalPeriod?.id === newPeriod.id) {
                                    console.log('  ✅ Storage consistency maintained');
                                } else {
                                    console.log('  ⚠️ Storage consistency issues');
                                }
                            }
                            
                        } else {
                            console.log('  ❌ PERSISTENCE TEST FAILED!');
                            console.log('    Expected:', newPeriod.id);
                            console.log('    Found:', afterRestartPeriod?.id);
                            console.log('    🚨 Bug still exists despite CrossBrowserSync fix');
                        }
                    }, 300);
                }
                
            }, 200);
            
        }, 200);
        
    }, 100);
}

function checkPersistence(expectedPeriodId) {
    console.log('🔍 CHECKING PERSISTENCE AFTER MANUAL RESTART');
    console.log('=============================================');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available - wait for app to load');
        return;
    }
    
    const currentState = window.dataManager.getState();
    const currentPeriod = currentState.currentPeriod;
    
    console.log('Expected period ID:', expectedPeriodId);
    console.log('Found period ID:', currentPeriod?.id || 'null');
    
    if (currentPeriod?.id === expectedPeriodId) {
        console.log('🎉 SUCCESS! Period survived manual restart!');
        console.log('✅ Persistence bug is FIXED!');
        
        // Also check storage
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('Storage verification:');
            console.log('  - Version:', data.version);
            console.log('  - Saved at:', data.savedAt);
            console.log('  - Period ID:', data.state?.currentPeriod?.id);
        }
        
    } else {
        console.log('❌ FAILURE! Period was lost on restart!');
        console.log('🚨 Persistence bug still exists');
        
        // Debug info
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('Debug storage:');
            console.log('  - Has state:', !!data.state);
            console.log('  - currentPeriod:', data.state?.currentPeriod);
        } else {
            console.log('Debug: No localStorage data found');
        }
    }
}

console.log('🚀 PERSISTENCE TEST LOADED');
console.log('Run: runFullPersistenceTest()');
// DIRECT IN-APP PERSISTENCE TEST
// Führe diesen Code direkt in der Browser Console der App aus

async function testPersistenceDirectly() {
    console.clear();
    console.log('🧪 DIRECT PERSISTENCE TEST');
    console.log('==========================');
    console.log('CrossBrowserSync Status: DISABLED (should fix the bug)');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available');
        return false;
    }
    
    // Test Configuration
    const testId = 'DIRECT_TEST_' + Date.now();
    console.log('🆔 Test ID:', testId);
    
    // Step 1: Check initial state
    console.log('\n📊 INITIAL STATE');
    const initialState = window.dataManager.getState();
    console.log('  Current period:', initialState.currentPeriod?.id || 'none');
    console.log('  Current WG:', initialState.currentWG?.name || 'none');
    
    // Step 2: Clear storage for clean test
    console.log('\n🧹 CLEARING STORAGE');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    console.log('  ✅ Storage cleared');
    
    // Reset dataManager if possible
    if (window.dataManager._TEST_reset) {
        window.dataManager._TEST_reset();
        console.log('  ✅ DataManager reset');
    }
    
    // Wait for reset
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Step 3: Create test period
    console.log('\n📅 CREATING TEST PERIOD');
    
    const start = new Date();
    start.setHours(0, 0, 0, 0); // Start of day
    const end = new Date(start);
    end.setDate(end.getDate() + 14); // 2 weeks later
    end.setHours(23, 59, 59, 999); // End of day
    
    console.log('  Start:', start.toISOString());
    console.log('  End:', end.toISOString());
    
    let createdPeriod;
    try {
        createdPeriod = window.dataManager.setCustomPeriod(start, end, false);
        console.log('  ✅ Period created:', createdPeriod.id);
        console.log('    - Days:', createdPeriod.days);
    } catch (error) {
        console.log('  ❌ Failed to create period:', error.message);
        return false;
    }
    
    // Step 4: Immediate verification
    console.log('\n🔍 IMMEDIATE VERIFICATION');
    
    // Check in-memory state
    const afterCreate = window.dataManager.getState();
    const memoryPeriod = afterCreate.currentPeriod;
    
    if (memoryPeriod?.id === createdPeriod.id) {
        console.log('  ✅ Period in memory:', memoryPeriod.id);
    } else {
        console.log('  ❌ Period NOT in memory');
        console.log('    Expected:', createdPeriod.id);
        console.log('    Found:', memoryPeriod?.id);
        return false;
    }
    
    // Wait for any async saves
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Check localStorage
    const stored = localStorage.getItem('putzplan-data');
    if (!stored) {
        console.log('  ❌ No data in localStorage after period creation');
        return false;
    }
    
    const data = JSON.parse(stored);
    const storedPeriod = data.state?.currentPeriod;
    
    if (storedPeriod?.id === createdPeriod.id) {
        console.log('  ✅ Period in localStorage:', storedPeriod.id);
        console.log('    - Version:', data.version);
        console.log('    - Saved at:', data.savedAt);
        console.log('    - Data size:', stored.length, 'chars');
    } else {
        console.log('  ❌ Period NOT in localStorage');
        console.log('    Expected:', createdPeriod.id);
        console.log('    Found:', storedPeriod?.id);
        return false;
    }
    
    // Step 5: Simulate restart
    console.log('\n🔄 SIMULATING RESTART');
    
    if (window.dataManager._TEST_reset) {
        console.log('  Using _TEST_reset for automatic simulation...');
        
        // Reset to simulate restart
        window.dataManager._TEST_reset();
        
        // Wait for reload
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const afterRestart = window.dataManager.getState();
        const afterRestartPeriod = afterRestart.currentPeriod;
        
        if (afterRestartPeriod?.id === createdPeriod.id) {
            console.log('  🎉 SUCCESS! Period survived restart simulation');
            console.log('    - Period ID:', afterRestartPeriod.id);
            console.log('    - Start:', new Date(afterRestartPeriod.start).toISOString());
            console.log('    - End:', new Date(afterRestartPeriod.end).toISOString());
            console.log('    - Days:', afterRestartPeriod.days);
            
            console.log('\n✅ CROSSBROWSERSYNC FIX WORKS!');
            console.log('✅ PERSISTENCE BUG IS FIXED!');
            return true;
            
        } else {
            console.log('  ❌ Period LOST after restart simulation');
            console.log('    Expected:', createdPeriod.id);
            console.log('    Found:', afterRestartPeriod?.id);
            
            // Debug the loss
            const debugStorage = localStorage.getItem('putzplan-data');
            if (debugStorage) {
                const debugData = JSON.parse(debugStorage);
                console.log('\n🔬 DEBUG: Storage after restart');
                console.log('    - Storage period:', debugData.state?.currentPeriod?.id);
                console.log('    - Storage saved at:', debugData.savedAt);
                
                if (debugData.state?.currentPeriod?.id === createdPeriod.id) {
                    console.log('    ➡️ Data in storage but not loaded properly');
                } else {
                    console.log('    ➡️ Data was overwritten during restart simulation');
                }
            } else {
                console.log('    ➡️ Storage completely cleared during restart');
            }
            
            console.log('\n❌ BUG STILL EXISTS DESPITE CROSSBROWSERSYNC FIX');
            return false;
        }
    } else {
        console.log('  _TEST_reset not available');
        console.log('\n📋 MANUAL RESTART REQUIRED:');
        console.log('    1. Note this period ID:', createdPeriod.id);
        console.log('    2. Press F5 to refresh the page');
        console.log('    3. Run: checkAfterManualRestart("' + createdPeriod.id + '")');
        
        // Store period ID for later verification
        sessionStorage.setItem('testPeriodId', createdPeriod.id);
        
        return 'manual-test-required';
    }
}

function checkAfterManualRestart(expectedId) {
    console.log('🔍 CHECKING AFTER MANUAL RESTART');
    console.log('================================');
    
    if (!expectedId) {
        expectedId = sessionStorage.getItem('testPeriodId');
        if (!expectedId) {
            console.log('❌ No expected period ID provided or stored');
            return;
        }
    }
    
    console.log('Expected period ID:', expectedId);
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available after restart');
        return false;
    }
    
    const currentState = window.dataManager.getState();
    const currentPeriod = currentState.currentPeriod;
    
    console.log('Found period ID:', currentPeriod?.id || 'null');
    
    if (currentPeriod?.id === expectedId) {
        console.log('🎉 SUCCESS! Period survived manual restart!');
        console.log('  ✅ Persistence bug is FIXED!');
        console.log('  ✅ CrossBrowserSync deactivation worked!');
        
        // Clean up
        sessionStorage.removeItem('testPeriodId');
        
        // Additional validation
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('\nStorage validation:');
            console.log('  - Version:', data.version);
            console.log('  - Period ID:', data.state?.currentPeriod?.id);
            console.log('  - Saved at:', data.savedAt);
        }
        
        return true;
        
    } else {
        console.log('❌ FAILURE! Period lost after manual restart');
        console.log('  🚨 Persistence bug STILL EXISTS');
        
        // Debug info
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('\nDebug storage:');
            console.log('  - Period in storage:', data.state?.currentPeriod?.id);
            console.log('  - Storage version:', data.version);
            console.log('  - Storage saved at:', data.savedAt);
            
            if (data.state?.currentPeriod?.id === expectedId) {
                console.log('  ➡️ Data in storage but DataManager not loading it');
            } else {
                console.log('  ➡️ Data lost from storage entirely');
            }
        } else {
            console.log('  ➡️ No storage data found');
        }
        
        return false;
    }
}

// Quick test functions
function quickStorageCheck() {
    const stored = localStorage.getItem('putzplan-data');
    if (stored) {
        const data = JSON.parse(stored);
        console.log('Storage check:');
        console.log('  - Version:', data.version);
        console.log('  - Current period:', data.state?.currentPeriod?.id || 'none');
        console.log('  - Saved at:', data.savedAt);
        console.log('  - Size:', stored.length, 'chars');
    } else {
        console.log('No storage data found');
    }
}

function quickMemoryCheck() {
    if (window.dataManager) {
        const state = window.dataManager.getState();
        console.log('Memory check:');
        console.log('  - Current period:', state.currentPeriod?.id || 'none');
        console.log('  - Current WG:', state.currentWG?.name || 'none');
        console.log('  - Users count:', Object.keys(state.users || {}).length);
    } else {
        console.log('dataManager not available');
    }
}

console.log('🚀 DIRECT PERSISTENCE TEST LOADED');
console.log('Main commands:');
console.log('  - testPersistenceDirectly()');
console.log('  - checkAfterManualRestart(periodId)');
console.log('Quick commands:');
console.log('  - quickStorageCheck()');
console.log('  - quickMemoryCheck()');
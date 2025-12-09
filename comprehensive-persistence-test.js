// COMPREHENSIVE PERSISTENCE TEST
// Tests period creation, persistence, and survival through app restart

function runComprehensivePersistenceTest() {
    console.clear();
    console.log('🧪 COMPREHENSIVE PERSISTENCE TEST');
    console.log('=================================');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available - reload page and try again');
        return;
    }
    
    // Test Configuration
    const testName = 'PERSISTENCE_TEST_' + Date.now();
    const testStart = new Date();
    const testEnd = new Date(testStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('📋 Test Configuration:');
    console.log('  - Test Name:', testName);
    console.log('  - Start:', testStart.toISOString());
    console.log('  - End:', testEnd.toISOString());
    console.log('  - Storage Key:', 'putzplan-data');
    
    // Step 1: Initial State Check
    console.log('\n1️⃣ INITIAL STATE CHECK');
    const initialState = window.dataManager.getState();
    console.log('  - Initial period:', initialState.currentPeriod?.id || 'none');
    console.log('  - Initial WG:', initialState.currentWG?.name || 'none');
    console.log('  - Users count:', Object.keys(initialState.users || {}).length);
    
    // Check initial localStorage
    const initialStorage = localStorage.getItem('putzplan-data');
    if (initialStorage) {
        const parsed = JSON.parse(initialStorage);
        console.log('  - Storage version:', parsed.version);
        console.log('  - Storage period:', parsed.state?.currentPeriod?.id || 'none');
        console.log('  - Storage size:', initialStorage.length, 'bytes');
    } else {
        console.log('  - No initial storage data');
    }
    
    // Step 2: Period Creation
    console.log('\n2️⃣ PERIOD CREATION');
    let createdPeriod;
    
    try {
        console.log('  - Creating new period...');
        createdPeriod = window.dataManager.setCustomPeriod(testStart, testEnd, false);
        console.log('  ✅ Period created:', createdPeriod.id);
        console.log('    - Start:', createdPeriod.start);
        console.log('    - End:', createdPeriod.end);
        console.log('    - Days:', createdPeriod.days);
    } catch (error) {
        console.log('  ❌ Failed to create period:', error);
        return;
    }
    
    // Step 3: Immediate Verification
    console.log('\n3️⃣ IMMEDIATE VERIFICATION');
    
    // Check in-memory state
    const afterCreateState = window.dataManager.getState();
    const memoryPeriod = afterCreateState.currentPeriod;
    
    if (memoryPeriod && memoryPeriod.id === createdPeriod.id) {
        console.log('  ✅ Period correctly set in memory:', memoryPeriod.id);
    } else {
        console.log('  ❌ Period NOT in memory!');
        console.log('    - Expected:', createdPeriod.id);
        console.log('    - Found:', memoryPeriod?.id);
        return;
    }
    
    // Check localStorage immediately
    const immediateStorage = localStorage.getItem('putzplan-data');
    if (immediateStorage) {
        const parsed = JSON.parse(immediateStorage);
        const storagePeriod = parsed.state?.currentPeriod;
        
        if (storagePeriod && storagePeriod.id === createdPeriod.id) {
            console.log('  ✅ Period correctly saved to localStorage:', storagePeriod.id);
            console.log('    - Saved at:', parsed.savedAt);
            console.log('    - Version:', parsed.version);
        } else {
            console.log('  ❌ Period NOT in localStorage!');
            console.log('    - Expected:', createdPeriod.id);
            console.log('    - Found:', storagePeriod?.id);
            console.log('    - Full storage period:', storagePeriod);
            return;
        }
    } else {
        console.log('  ❌ No localStorage data after period creation!');
        return;
    }
    
    // Step 4: Wait and re-check (simulate delays)
    console.log('\n4️⃣ DELAY SIMULATION (500ms)');
    
    setTimeout(() => {
        const delayedStorage = localStorage.getItem('putzplan-data');
        if (delayedStorage) {
            const parsed = JSON.parse(delayedStorage);
            const storagePeriod = parsed.state?.currentPeriod;
            
            if (storagePeriod && storagePeriod.id === createdPeriod.id) {
                console.log('  ✅ Period still in localStorage after delay');
            } else {
                console.log('  ❌ Period LOST from localStorage after delay!');
                console.log('    - Expected:', createdPeriod.id);
                console.log('    - Found:', storagePeriod?.id);
                return;
            }
        }
        
        // Step 5: Simulated App Restart
        console.log('\n5️⃣ SIMULATED APP RESTART');
        
        // This simulates what happens when the app restarts:
        // 1. localStorage is read
        // 2. Data is parsed
        // 3. DataManager loads the state
        
        try {
            const restartStorage = localStorage.getItem('putzplan-data');
            if (!restartStorage) {
                console.log('  ❌ No storage data for restart simulation');
                return;
            }
            
            const restartData = JSON.parse(restartStorage);
            console.log('  - Restart storage version:', restartData.version);
            console.log('  - Restart storage savedAt:', restartData.savedAt);
            
            if (restartData.version !== '1.0') {
                console.log('  ❌ Invalid storage version for restart');
                return;
            }
            
            const restartState = restartData.state;
            const restartPeriod = restartState?.currentPeriod;
            
            if (restartPeriod && restartPeriod.id === createdPeriod.id) {
                console.log('  ✅ Period would survive app restart!');
                console.log('    - Period ID:', restartPeriod.id);
                console.log('    - Period start:', new Date(restartPeriod.start));
                console.log('    - Period end:', new Date(restartPeriod.end));
                console.log('    - Period days:', restartPeriod.days);
                
                // Final validation: compare all properties
                const originalProps = {
                    id: createdPeriod.id,
                    days: createdPeriod.days,
                    start: createdPeriod.start.toISOString(),
                    end: createdPeriod.end.toISOString()
                };
                
                const restoredProps = {
                    id: restartPeriod.id,
                    days: restartPeriod.days,
                    start: new Date(restartPeriod.start).toISOString(),
                    end: new Date(restartPeriod.end).toISOString()
                };
                
                const propsMatch = JSON.stringify(originalProps) === JSON.stringify(restoredProps);
                
                if (propsMatch) {
                    console.log('  🎉 ALL PROPERTIES MATCH - PERSISTENCE WORKS PERFECTLY!');
                } else {
                    console.log('  ⚠️ Properties mismatch:');
                    console.log('    Original:', originalProps);
                    console.log('    Restored:', restoredProps);
                }
                
            } else {
                console.log('  ❌ Period would be LOST on app restart!');
                console.log('    - Expected:', createdPeriod.id);
                console.log('    - Found in restart data:', restartPeriod?.id);
                console.log('    - Full restart state keys:', Object.keys(restartState || {}));
                console.log('    - currentPeriod value:', restartState?.currentPeriod);
                
                // Deep dive
                console.log('\n🔬 DEEP DIVE - WHY WAS PERIOD LOST?');
                console.log('  - restartData keys:', Object.keys(restartData));
                console.log('  - restartData.state exists:', !!restartData.state);
                if (restartData.state) {
                    console.log('  - restartData.state keys:', Object.keys(restartData.state));
                    console.log('  - currentPeriod type:', typeof restartData.state.currentPeriod);
                    console.log('  - currentPeriod value:', restartData.state.currentPeriod);
                }
            }
            
        } catch (error) {
            console.log('  ❌ Error during restart simulation:', error);
        }
        
    }, 500);
}

function testMultiplePeriods() {
    console.log('\n🔄 TESTING MULTIPLE PERIODS');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available');
        return;
    }
    
    // Create 3 periods in sequence
    const periods = [];
    
    for (let i = 1; i <= 3; i++) {
        const start = new Date();
        start.setDate(start.getDate() + i * 7); // Each period starts 7 days later
        const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
        
        console.log(`Creating period ${i}...`);
        const period = window.dataManager.setCustomPeriod(start, end, false);
        periods.push(period);
        console.log(`  ✅ Period ${i}: ${period.id}`);
        
        // Check storage after each creation
        setTimeout(() => {
            const storage = localStorage.getItem('putzplan-data');
            if (storage) {
                const parsed = JSON.parse(storage);
                const storedPeriod = parsed.state?.currentPeriod;
                if (storedPeriod?.id === period.id) {
                    console.log(`  ✅ Period ${i} persisted correctly`);
                } else {
                    console.log(`  ❌ Period ${i} persistence failed`);
                }
            }
        }, 100 * i);
    }
}

function cleanupAndRunTest() {
    console.log('🧹 CLEANUP AND FRESH TEST');
    
    // Clear all storage
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    
    // Wait a bit then run comprehensive test
    setTimeout(() => {
        runComprehensivePersistenceTest();
    }, 200);
}

console.log('🚀 COMPREHENSIVE PERSISTENCE TEST LOADED');
console.log('Commands:');
console.log('  - runComprehensivePersistenceTest()');
console.log('  - testMultiplePeriods()');  
console.log('  - cleanupAndRunTest()');
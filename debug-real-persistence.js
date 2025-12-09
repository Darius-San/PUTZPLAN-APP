// REAL PERSISTENCE PROBLEM DEBUGGER
// Führe das im Browser Console aus um das echte Problem zu finden

function debugRealPersistenceProblem() {
    console.log('🔍 DEBUGGING REAL PERSISTENCE PROBLEM');
    console.log('=====================================');
    
    // Check if we're in the right context
    if (!window.dataManager) {
        console.log('❌ dataManager not available - try after app loads');
        return;
    }
    
    console.log('📊 Current State:');
    const currentState = window.dataManager.getState();
    console.log('  - Current Period:', currentState.currentPeriod);
    console.log('  - Current WG:', currentState.currentWG?.name);
    console.log('  - Users count:', Object.keys(currentState.users || {}).length);
    
    console.log('\n📦 Storage Analysis:');
    
    // Direct localStorage check
    const rawStorage = localStorage.getItem('putzplan-data');
    if (rawStorage) {
        const parsed = JSON.parse(rawStorage);
        console.log('  - Storage version:', parsed.version);
        console.log('  - Storage savedAt:', parsed.savedAt);
        console.log('  - Storage currentPeriod:', parsed.state?.currentPeriod?.id);
        console.log('  - Storage has currentWG:', !!parsed.state?.currentWG);
        
        // Compare with current state
        const statePeriodId = currentState.currentPeriod?.id;
        const storagePeriodId = parsed.state?.currentPeriod?.id;
        
        if (statePeriodId !== storagePeriodId) {
            console.log('⚠️ MISMATCH DETECTED:');
            console.log('  - State period:', statePeriodId);
            console.log('  - Storage period:', storagePeriodId);
        } else {
            console.log('✅ State and storage periods match');
        }
    } else {
        console.log('❌ No localStorage data found!');
    }
    
    // Test period creation and persistence
    console.log('\n🧪 TESTING PERIOD CREATION:');
    
    // Save current state
    const originalPeriod = currentState.currentPeriod;
    
    try {
        // Create test period
        const testStart = new Date();
        const testEnd = new Date(testStart.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days later
        
        console.log('Creating test period:', testStart, 'to', testEnd);
        
        const newPeriod = window.dataManager.setCustomPeriod(testStart, testEnd, false);
        console.log('✅ Period created:', newPeriod.id);
        
        // Check immediately if it's in localStorage
        setTimeout(() => {
            const immediateCheck = localStorage.getItem('putzplan-data');
            if (immediateCheck) {
                const parsed = JSON.parse(immediateCheck);
                const storedPeriod = parsed.state?.currentPeriod?.id;
                
                if (storedPeriod === newPeriod.id) {
                    console.log('✅ Period immediately persisted:', storedPeriod);
                } else {
                    console.log('❌ Period NOT persisted immediately!');
                    console.log('  - Expected:', newPeriod.id);
                    console.log('  - Found:', storedPeriod);
                }
            } else {
                console.log('❌ No storage data after period creation!');
            }
            
            // Simulate app restart by reloading DataManager state
            console.log('\n🔄 SIMULATING APP RESTART:');
            
            // Force reload from localStorage (this simulates what happens on app restart)
            const reloadedState = window.dataManager.loadFromStorage ? 
                window.dataManager.loadFromStorage() : 
                'loadFromStorage not accessible';
                
            if (reloadedState && reloadedState.currentPeriod) {
                console.log('✅ Period survived restart simulation:', reloadedState.currentPeriod.id);
            } else {
                console.log('❌ Period LOST after restart simulation!');
                console.log('  - Reloaded state:', reloadedState);
                
                // Deep dive into what went wrong
                console.log('\n🔬 DEEP DIVE:');
                const storage = localStorage.getItem('putzplan-data');
                if (storage) {
                    const storageData = JSON.parse(storage);
                    console.log('  - Storage exists but no currentPeriod');
                    console.log('  - Storage state keys:', Object.keys(storageData.state || {}));
                    console.log('  - Full storage state.currentPeriod:', storageData.state?.currentPeriod);
                } else {
                    console.log('  - No storage data at all!');
                }
            }
        }, 200); // Wait for any async saves
        
    } catch (error) {
        console.log('❌ Error during test:', error);
    }
}

function testManualPersistence() {
    console.log('\n🔧 MANUAL PERSISTENCE TEST');
    console.log('==========================');
    
    // Create period manually
    const testPeriod = {
        id: 'test_' + Date.now(),
        start: new Date(),
        end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        days: 7
    };
    
    // Try to save manually to localStorage
    const manualData = {
        version: '1.0',
        state: {
            currentPeriod: testPeriod,
            // ... other minimal state
        },
        savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('putzplan-data', JSON.stringify(manualData));
    console.log('✅ Manual save completed');
    
    // Verify
    const verification = localStorage.getItem('putzplan-data');
    if (verification) {
        const parsed = JSON.parse(verification);
        console.log('✅ Manual verification:', parsed.state?.currentPeriod?.id);
        
        // Test if it survives a page reload (simulate)
        setTimeout(() => {
            const afterReload = localStorage.getItem('putzplan-data');
            const reloadParsed = JSON.parse(afterReload);
            if (reloadParsed.state?.currentPeriod?.id === testPeriod.id) {
                console.log('✅ Manual period survives reload simulation');
            } else {
                console.log('❌ Even manual period gets lost!');
                console.log('  - Expected:', testPeriod.id);
                console.log('  - Found:', reloadParsed.state?.currentPeriod?.id);
            }
        }, 100);
    }
}

// Auto-run when script loads
setTimeout(() => {
    debugRealPersistenceProblem();
    testManualPersistence();
}, 1000);

console.log('🚀 Debug scripts loaded. Will auto-run in 1 second or run manually:');
console.log('  debugRealPersistenceProblem()');
console.log('  testManualPersistence()');
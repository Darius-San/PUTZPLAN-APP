// PERSISTENCE BUG TEST - Führe das im Browser Console aus
// Tests the exact scenario: create period → app restart → period lost

function testPersistenceBug() {
    console.log('🐛 TESTING PERSISTENCE BUG');
    console.log('==========================');
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available - wait for app to load');
        return;
    }
    
    console.log('Step 1: Check current state');
    const initialState = window.dataManager.getState();
    console.log('  - Current period before test:', initialState.currentPeriod?.id);
    
    console.log('\nStep 2: Create new period');
    const testDate = new Date();
    const testStart = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
    const testEnd = new Date(testStart.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    console.log('  - Creating period from', testStart, 'to', testEnd);
    
    const newPeriod = window.dataManager.setCustomPeriod(testStart, testEnd, false);
    console.log('  - New period created:', newPeriod.id);
    
    console.log('\nStep 3: Verify immediate persistence');
    const afterCreate = window.dataManager.getState();
    console.log('  - Period in memory:', afterCreate.currentPeriod?.id);
    
    // Check localStorage directly
    const stored = localStorage.getItem('putzplan-data');
    if (stored) {
        const parsed = JSON.parse(stored);
        console.log('  - Period in localStorage:', parsed.state?.currentPeriod?.id);
        
        if (parsed.state?.currentPeriod?.id === newPeriod.id) {
            console.log('  ✅ Period correctly saved to localStorage');
        } else {
            console.log('  ❌ Period NOT saved to localStorage!');
            console.log('    Expected:', newPeriod.id);
            console.log('    Found:', parsed.state?.currentPeriod?.id);
            return;
        }
    } else {
        console.log('  ❌ No data in localStorage!');
        return;
    }
    
    console.log('\nStep 4: Simulate app restart (reload DataManager)');
    
    // Create a new DataManager instance to simulate restart
    // This should load from localStorage and show the same period
    setTimeout(() => {
        // Force a reload by clearing the current state and reloading
        console.log('  - Simulating app restart...');
        
        // Check what's currently in localStorage before "restart"
        const preRestartStorage = localStorage.getItem('putzplan-data');
        if (preRestartStorage) {
            const parsed = JSON.parse(preRestartStorage);
            console.log('  - Period in localStorage before restart:', parsed.state?.currentPeriod?.id);
        }
        
        // Now check if we can load it again (simulate constructor call)
        try {
            const storage = localStorage.getItem('putzplan-data');
            if (storage) {
                const data = JSON.parse(storage);
                
                if (data.version === '1.0' && data.state) {
                    const loadedPeriod = data.state.currentPeriod;
                    
                    if (loadedPeriod && loadedPeriod.id === newPeriod.id) {
                        console.log('  ✅ Period would survive app restart:', loadedPeriod.id);
                        console.log('  🎉 PERSISTENCE BUG NOT REPRODUCED - period survives!');
                    } else {
                        console.log('  ❌ Period would be LOST on app restart!');
                        console.log('    Expected:', newPeriod.id);
                        console.log('    Found:', loadedPeriod?.id);
                        
                        // Check for corruption
                        console.log('\n🔬 DEBUGGING DATA CORRUPTION:');
                        console.log('  - Full data.state keys:', Object.keys(data.state));
                        console.log('  - currentPeriod value:', data.state.currentPeriod);
                        console.log('  - Raw data length:', storage.length);
                    }
                } else {
                    console.log('  ❌ Invalid data format in localStorage');
                    console.log('    Version:', data.version);
                    console.log('    Has state:', !!data.state);
                }
            } else {
                console.log('  ❌ No data in localStorage after restart simulation');
            }
        } catch (error) {
            console.log('  ❌ Error loading from localStorage:', error);
        }
        
    }, 500); // Give time for any pending saves
}

function clearStorageAndTest() {
    console.log('🧹 CLEARING STORAGE FOR CLEAN TEST');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync'); // Also remove sync data
    
    // Wait a bit then run test
    setTimeout(() => {
        console.log('Storage cleared, running test...');
        testPersistenceBug();
    }, 100);
}

console.log('🚀 Persistence Bug Test loaded');
console.log('Run: testPersistenceBug() or clearStorageAndTest()');
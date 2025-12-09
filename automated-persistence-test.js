// AUTOMATED PERSISTENCE BUG TEST
// This will automatically test the exact issue: period creation → restart → lost

async function automatedPersistenceTest() {
    console.clear();
    console.log('🤖 AUTOMATED PERSISTENCE BUG TEST');
    console.log('==================================');
    
    // Wait for app to load
    let attempts = 0;
    while (!window.dataManager && attempts < 10) {
        console.log(`Waiting for dataManager... (${attempts + 1}/10)`);
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
    }
    
    if (!window.dataManager) {
        console.log('❌ dataManager not available after 10 seconds');
        return false;
    }
    
    console.log('✅ dataManager available');
    
    // Clean start
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    console.log('🧹 Cleared storage for clean test');
    
    // Step 1: Create period
    console.log('\n📅 STEP 1: Creating period');
    const testDate = new Date();
    const start = new Date(testDate.getFullYear(), testDate.getMonth(), testDate.getDate());
    const end = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    
    console.log(`  - Start: ${start.toISOString()}`);
    console.log(`  - End: ${end.toISOString()}`);
    
    let createdPeriod;
    try {
        createdPeriod = window.dataManager.setCustomPeriod(start, end, false);
        console.log(`  ✅ Period created: ${createdPeriod.id}`);
    } catch (error) {
        console.log(`  ❌ Failed to create period: ${error.message}`);
        return false;
    }
    
    // Step 2: Verify immediate persistence
    console.log('\n💾 STEP 2: Checking immediate persistence');
    
    await new Promise(resolve => setTimeout(resolve, 200)); // Wait for save
    
    const immediateCheck = localStorage.getItem('putzplan-data');
    if (!immediateCheck) {
        console.log('  ❌ No data in localStorage immediately after creation');
        return false;
    }
    
    const immediateData = JSON.parse(immediateCheck);
    const immediatePeriod = immediateData.state?.currentPeriod;
    
    if (immediatePeriod?.id === createdPeriod.id) {
        console.log(`  ✅ Period immediately saved: ${immediatePeriod.id}`);
    } else {
        console.log(`  ❌ Period not saved immediately`);
        console.log(`    Expected: ${createdPeriod.id}`);
        console.log(`    Found: ${immediatePeriod?.id}`);
        return false;
    }
    
    // Step 3: Simulate app restart by clearing memory and reloading
    console.log('\n🔄 STEP 3: Simulating app restart');
    
    // Clear dataManager state (simulate page reload)
    if (window.dataManager._TEST_reset) {
        window.dataManager._TEST_reset();
        console.log('  - DataManager state reset (simulating restart)');
        
        await new Promise(resolve => setTimeout(resolve, 200)); // Wait for reload
        
        const afterRestartState = window.dataManager.getState();
        const afterRestartPeriod = afterRestartState.currentPeriod;
        
        if (afterRestartPeriod?.id === createdPeriod.id) {
            console.log(`  ✅ Period survived restart: ${afterRestartPeriod.id}`);
            console.log(`  🎉 BUG NOT REPRODUCED - Persistence works!`);
            return true;
        } else {
            console.log(`  ❌ Period LOST after restart!`);
            console.log(`    Expected: ${createdPeriod.id}`);
            console.log(`    Found: ${afterRestartPeriod?.id}`);
            
            // Deep debugging
            console.log('\n🔬 DEBUGGING THE LOSS:');
            
            // Check what's in storage now
            const debugStorage = localStorage.getItem('putzplan-data');
            if (debugStorage) {
                const debugData = JSON.parse(debugStorage);
                console.log(`    - Storage still has data, version: ${debugData.version}`);
                console.log(`    - Storage period: ${debugData.state?.currentPeriod?.id}`);
                console.log(`    - Storage savedAt: ${debugData.savedAt}`);
                
                if (debugData.state?.currentPeriod?.id === createdPeriod.id) {
                    console.log(`    ➡️ Data is in storage but not loaded correctly!`);
                    console.log(`    ➡️ Issue is in loadFromStorage() logic`);
                } else {
                    console.log(`    ➡️ Data was overwritten in storage`);
                    console.log(`    ➡️ Issue is in saveToStorage() logic`);
                }
            } else {
                console.log(`    - No storage data at all`);
                console.log(`    ➡️ Storage was cleared somehow`);
            }
            
            return false;
        }
    } else {
        console.log('  ⚠️ Cannot simulate restart - _TEST_reset not available');
        console.log('  ➡️ Manual restart test needed');
        
        // Just check if data survives in storage
        const storageCheck = localStorage.getItem('putzplan-data');
        if (storageCheck) {
            const data = JSON.parse(storageCheck);
            if (data.state?.currentPeriod?.id === createdPeriod.id) {
                console.log('  ✅ Data still in storage (manual restart needed to verify)');
                return true;
            }
        }
        return false;
    }
}

function manualRestartInstructions() {
    console.log('📋 MANUAL RESTART TEST INSTRUCTIONS');
    console.log('===================================');
    console.log('1. Run: automatedPersistenceTest()');
    console.log('2. Note the period ID that gets created');
    console.log('3. Press F5 to refresh the page');
    console.log('4. Open console and check:');
    console.log('   window.dataManager.getState().currentPeriod');
    console.log('5. If the period ID matches, persistence works!');
    console.log('6. If null/undefined, the bug exists');
}

// Auto-run when loaded
setTimeout(async () => {
    console.log('Starting automated test in 2 seconds...');
    await automatedPersistenceTest();
    console.log('\n📋 For complete verification, also test manual restart:');
    manualRestartInstructions();
}, 2000);
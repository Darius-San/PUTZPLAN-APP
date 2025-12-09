// STEP BY STEP MANUAL TEST GUIDE
// ================================
// Follow these exact steps to test the persistence fix

console.log('📋 MANUAL PERSISTENCE TEST GUIDE');
console.log('================================');

console.log('\n🎯 GOAL: Test if CrossBrowserSync deactivation fixes persistence bug');

console.log('\n📝 PREREQUISITES:');
console.log('  ✅ App running on http://localhost:5173/');
console.log('  ✅ Browser console open');
console.log('  ✅ dataManager available');

console.log('\n🔧 STEP-BY-STEP TEST:');

console.log('\n1️⃣ INITIAL CHECK');
console.log('   Run: dataManager.getState().currentPeriod');
console.log('   Note: Current period (if any)');

console.log('\n2️⃣ CLEAR STORAGE');
console.log('   Run: localStorage.removeItem("putzplan-data")');
console.log('   Run: localStorage.removeItem("putzplan-sync")');
console.log('   Verify: localStorage.getItem("putzplan-data") should return null');

console.log('\n3️⃣ CREATE TEST PERIOD');
console.log('   Run: const start = new Date(); start.setHours(0,0,0,0);');
console.log('   Run: const end = new Date(start.getTime() + 14*24*60*60*1000);');
console.log('   Run: const testPeriod = dataManager.setCustomPeriod(start, end, false);');
console.log('   Note: testPeriod.id');

console.log('\n4️⃣ VERIFY IMMEDIATE PERSISTENCE');
console.log('   Wait: 2 seconds');
console.log('   Run: const stored = localStorage.getItem("putzplan-data");');
console.log('   Run: const data = JSON.parse(stored);');
console.log('   Run: console.log("Storage period:", data.state?.currentPeriod?.id);');
console.log('   Verify: Should match testPeriod.id');

console.log('\n5️⃣ CRITICAL TEST - APP RESTART');
console.log('   Action: Press F5 to refresh the page');
console.log('   Wait: For app to load completely');
console.log('   Run: dataManager.getState().currentPeriod');
console.log('   Verify: Should still show the same period ID');

console.log('\n🎯 SUCCESS CRITERIA:');
console.log('   ✅ Period created successfully');
console.log('   ✅ Period saved to localStorage immediately');
console.log('   ✅ Period survives app restart (F5)');
console.log('   ✅ Same period ID after restart');

console.log('\n🚨 FAILURE INDICATORS:');
console.log('   ❌ Period not saved to localStorage');
console.log('   ❌ Period lost after refresh');
console.log('   ❌ Different period ID after restart');
console.log('   ❌ currentPeriod is null after restart');

console.log('\n📊 AUTOMATED TEST FUNCTION:');

window.runFullPersistenceTest = function() {
    console.log('\n🤖 RUNNING AUTOMATED TEST...');
    
    // Step 1
    console.log('1️⃣ Initial state check');
    const initial = dataManager.getState().currentPeriod;
    console.log('   Current period:', initial?.id || 'none');
    
    // Step 2  
    console.log('2️⃣ Clearing storage');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    const cleared = localStorage.getItem('putzplan-data');
    console.log('   Storage cleared:', cleared === null ? '✅' : '❌');
    
    // Step 3
    console.log('3️⃣ Creating test period');
    const start = new Date(); 
    start.setHours(0,0,0,0);
    const end = new Date(start.getTime() + 14*24*60*60*1000);
    
    let testPeriod;
    try {
        testPeriod = dataManager.setCustomPeriod(start, end, false);
        console.log('   ✅ Period created:', testPeriod.id);
    } catch (error) {
        console.log('   ❌ Failed to create period:', error.message);
        return;
    }
    
    // Step 4
    setTimeout(() => {
        console.log('4️⃣ Checking persistence (after 1 second)');
        const stored = localStorage.getItem('putzplan-data');
        
        if (stored) {
            const data = JSON.parse(stored);
            const storedPeriod = data.state?.currentPeriod;
            
            if (storedPeriod?.id === testPeriod.id) {
                console.log('   ✅ Period persisted:', storedPeriod.id);
                console.log('   ✅ Saved at:', data.savedAt);
                
                // Step 5 instruction
                console.log('\n5️⃣ NOW THE CRITICAL TEST:');
                console.log('   🔄 Press F5 to refresh the page');
                console.log('   ⏳ Wait for app to load');
                console.log('   ▶️ Run: checkAfterRestart("' + testPeriod.id + '")');
                
                // Store for later check
                sessionStorage.setItem('expectedPeriodId', testPeriod.id);
                
            } else {
                console.log('   ❌ Period NOT persisted');
                console.log('      Expected:', testPeriod.id);
                console.log('      Found:', storedPeriod?.id);
            }
        } else {
            console.log('   ❌ No storage data found');
        }
    }, 1000);
};

window.checkAfterRestart = function(expectedId) {
    if (!expectedId) {
        expectedId = sessionStorage.getItem('expectedPeriodId');
    }
    
    console.log('\n🔍 POST-RESTART CHECK');
    console.log('Expected period ID:', expectedId);
    
    const current = dataManager.getState().currentPeriod;
    const currentId = current?.id;
    
    console.log('Current period ID:', currentId || 'null');
    
    if (currentId === expectedId) {
        console.log('\n🎉 TEST PASSED!');
        console.log('✅ Period survived app restart');
        console.log('✅ CrossBrowserSync fix works');
        console.log('✅ Persistence bug is FIXED!');
        
        sessionStorage.removeItem('expectedPeriodId');
    } else {
        console.log('\n❌ TEST FAILED!');
        console.log('🚨 Period lost after restart');
        console.log('🚨 Persistence bug still exists');
        
        // Debug
        const stored = localStorage.getItem('putzplan-data');
        if (stored) {
            const data = JSON.parse(stored);
            console.log('Debug - Storage period:', data.state?.currentPeriod?.id);
        } else {
            console.log('Debug - No storage data');
        }
    }
};

console.log('\n🚀 READY TO TEST!');
console.log('📞 Commands available:');
console.log('   - runFullPersistenceTest()');
console.log('   - checkAfterRestart(periodId)');
console.log('\n🎯 Start with: runFullPersistenceTest()');
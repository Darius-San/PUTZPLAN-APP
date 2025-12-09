const puppeteer = require('puppeteer');

async function testPersistenceBug() {
    console.log('🧪 PERSISTENCE BUG TEST WITH PUPPETEER');
    console.log('======================================');
    
    const browser = await puppeteer.launch({ headless: false, devtools: true });
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        if (msg.type() === 'log') {
            console.log(`[Browser] ${msg.text()}`);
        } else if (msg.type() === 'error') {
            console.error(`[Browser Error] ${msg.text()}`);
        }
    });
    
    try {
        console.log('📱 Loading app...');
        await page.goto('http://localhost:5175/', { waitUntil: 'networkidle2' });
        
        // Wait for app to initialize
        await page.waitForFunction('window.dataManager', { timeout: 10000 });
        console.log('✅ App loaded, dataManager available');
        
        // Step 1: Clear storage for clean test
        console.log('\n🧹 Clearing storage...');
        await page.evaluate(() => {
            localStorage.removeItem('putzplan-data');
            localStorage.removeItem('putzplan-sync');
        });
        
        // Step 2: Create period
        console.log('\n📅 Creating test period...');
        const createdPeriod = await page.evaluate(() => {
            const start = new Date();
            const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
            
            console.log('Creating period from', start, 'to', end);
            const period = window.dataManager.setCustomPeriod(start, end, false);
            console.log('Period created:', period.id);
            
            return period;
        });
        
        console.log(`✅ Period created: ${createdPeriod.id}`);
        
        // Step 3: Wait for persistence
        await page.waitForTimeout(500);
        
        // Step 4: Check if period is in localStorage
        console.log('\n💾 Checking localStorage persistence...');
        const storageCheck = await page.evaluate(() => {
            const stored = localStorage.getItem('putzplan-data');
            if (stored) {
                const data = JSON.parse(stored);
                return {
                    exists: true,
                    version: data.version,
                    periodId: data.state?.currentPeriod?.id,
                    savedAt: data.savedAt
                };
            }
            return { exists: false };
        });
        
        if (storageCheck.exists && storageCheck.periodId === createdPeriod.id) {
            console.log(`✅ Period persisted to localStorage: ${storageCheck.periodId}`);
            console.log(`   Saved at: ${storageCheck.savedAt}`);
        } else {
            console.log(`❌ Period NOT persisted to localStorage`);
            console.log(`   Expected: ${createdPeriod.id}`);
            console.log(`   Found: ${storageCheck.periodId}`);
            await browser.close();
            return false;
        }
        
        // Step 5: Refresh page (simulate app restart)
        console.log('\n🔄 Refreshing page (simulating restart)...');
        await page.reload({ waitUntil: 'networkidle2' });
        
        // Wait for app to reinitialize
        await page.waitForFunction('window.dataManager', { timeout: 10000 });
        
        // Step 6: Check if period survived restart
        console.log('\n🔍 Checking if period survived restart...');
        const afterRestartState = await page.evaluate(() => {
            return window.dataManager.getState().currentPeriod;
        });
        
        if (afterRestartState && afterRestartState.id === createdPeriod.id) {
            console.log(`🎉 SUCCESS! Period survived restart: ${afterRestartState.id}`);
            console.log(`   ✅ Persistence bug is FIXED!`);
            await browser.close();
            return true;
        } else {
            console.log(`❌ FAILURE! Period lost after restart`);
            console.log(`   Expected: ${createdPeriod.id}`);
            console.log(`   Found: ${afterRestartState?.id || 'null'}`);
            
            // Debug why it was lost
            const debugInfo = await page.evaluate(() => {
                const storage = localStorage.getItem('putzplan-data');
                if (storage) {
                    const data = JSON.parse(storage);
                    return {
                        storageExists: true,
                        storageVersion: data.version,
                        storagePeriodId: data.state?.currentPeriod?.id,
                        storageSavedAt: data.savedAt,
                        currentStateKeys: Object.keys(window.dataManager.getState())
                    };
                }
                return { storageExists: false };
            });
            
            console.log('\n🔬 DEBUG INFO:');
            console.log(`   Storage exists: ${debugInfo.storageExists}`);
            if (debugInfo.storageExists) {
                console.log(`   Storage period: ${debugInfo.storagePeriodId}`);
                console.log(`   Storage saved: ${debugInfo.storageSavedAt}`);
                console.log(`   Current state keys: ${debugInfo.currentStateKeys.join(', ')}`);
                
                if (debugInfo.storagePeriodId === createdPeriod.id) {
                    console.log(`   ➡️ Issue: Data in storage but not loaded!`);
                } else {
                    console.log(`   ➡️ Issue: Data was overwritten in storage!`);
                }
            } else {
                console.log(`   ➡️ Issue: Storage was completely cleared!`);
            }
            
            await browser.close();
            return false;
        }
        
    } catch (error) {
        console.error('❌ Test failed with error:', error.message);
        await browser.close();
        return false;
    }
}

// Run the test
testPersistenceBug().then(success => {
    if (success) {
        console.log('\n🏆 PERSISTENCE TEST PASSED');
        process.exit(0);
    } else {
        console.log('\n💥 PERSISTENCE TEST FAILED');
        process.exit(1);
    }
}).catch(error => {
    console.error('💥 Test crashed:', error);
    process.exit(1);
});
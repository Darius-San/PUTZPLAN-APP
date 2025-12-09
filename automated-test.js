// Simple Node.js test without external dependencies
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 AUTOMATED PERSISTENCE TEST');
console.log('=============================');

// Check if app is running
console.log('📱 Checking if app is running...');
try {
    const response = execSync('curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/', { encoding: 'utf8', timeout: 5000 });
    if (response.trim() !== '200') {
        console.log('❌ App not running on localhost:5173');
        console.log('   Start with: npm run dev');
        process.exit(1);
    }
    console.log('✅ App running on localhost:5173');
} catch (error) {
    console.log('❌ Could not reach app. Make sure it runs on localhost:5173');
    process.exit(1);
}

// Create a comprehensive test page that tests everything
const testPageContent = `<!DOCTYPE html>
<html>
<head>
    <title>Automated Persistence Test</title>
    <style>
        body { font-family: Arial; margin: 20px; background: #f5f5f5; }
        .result { padding: 10px; margin: 5px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
    </style>
</head>
<body>
    <h1>Automated Persistence Test</h1>
    <div id="results"></div>
    
    <script>
        const results = document.getElementById('results');
        
        function log(message, type = 'info') {
            const div = document.createElement('div');
            div.className = 'result ' + type;
            div.textContent = new Date().toLocaleTimeString() + ': ' + message;
            results.appendChild(div);
            console.log(message);
        }
        
        async function runTest() {
            log('🧪 Starting automated test...', 'info');
            
            const iframe = document.createElement('iframe');
            iframe.src = 'http://localhost:5173/';
            iframe.style.width = '100%';
            iframe.style.height = '400px';
            iframe.style.border = '1px solid #ccc';
            document.body.appendChild(iframe);
            
            // Wait for iframe to load
            await new Promise(resolve => {
                iframe.onload = () => {
                    setTimeout(resolve, 2000); // Give app time to initialize
                };
            });
            
            try {
                // Access app in iframe
                const appWindow = iframe.contentWindow;
                
                // Wait for dataManager
                let attempts = 0;
                while (!appWindow.dataManager && attempts < 10) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    attempts++;
                }
                
                if (!appWindow.dataManager) {
                    log('❌ dataManager not available in iframe', 'error');
                    return false;
                }
                
                log('✅ dataManager available', 'success');
                
                // Clear storage
                appWindow.localStorage.removeItem('putzplan-data');
                appWindow.localStorage.removeItem('putzplan-sync');
                log('🧹 Storage cleared', 'info');
                
                // Create period
                const start = new Date();
                const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
                
                const period = appWindow.dataManager.setCustomPeriod(start, end, false);
                log('📅 Period created: ' + period.id, 'success');
                
                // Wait for save
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Check localStorage
                const stored = appWindow.localStorage.getItem('putzplan-data');
                if (stored) {
                    const data = JSON.parse(stored);
                    if (data.state?.currentPeriod?.id === period.id) {
                        log('✅ Period saved to localStorage: ' + data.state.currentPeriod.id, 'success');
                    } else {
                        log('❌ Period NOT in localStorage', 'error');
                        return false;
                    }
                } else {
                    log('❌ No localStorage data', 'error');
                    return false;
                }
                
                // Test restart simulation if available
                if (appWindow.dataManager._TEST_reset) {
                    log('🔄 Testing restart simulation...', 'info');
                    
                    appWindow.dataManager._TEST_reset();
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    const afterRestart = appWindow.dataManager.getState();
                    if (afterRestart.currentPeriod?.id === period.id) {
                        log('🎉 SUCCESS! Period survived restart simulation!', 'success');
                        log('✅ CrossBrowserSync fix works!', 'success');
                        return true;
                    } else {
                        log('❌ Period lost after restart simulation', 'error');
                        return false;
                    }
                } else {
                    log('⚠️ _TEST_reset not available, manual test needed', 'info');
                    log('🎯 MANUAL TEST: Refresh localhost:5173 and check if period ' + period.id + ' is still there', 'info');
                    return 'manual-needed';
                }
                
            } catch (error) {
                log('❌ Test error: ' + error.message, 'error');
                return false;
            }
        }
        
        // Run test automatically
        runTest().then(result => {
            if (result === true) {
                log('🏆 ALL TESTS PASSED - PERSISTENCE BUG FIXED!', 'success');
            } else if (result === 'manual-needed') {
                log('📋 Manual verification required', 'info');
            } else {
                log('💥 TEST FAILED - Bug still exists', 'error');
            }
        });
    </script>
</body>
</html>`;

// Write test page
const testPagePath = path.join(__dirname, 'automated-test.html');
fs.writeFileSync(testPagePath, testPageContent);

console.log('📄 Test page created: automated-test.html');
console.log('🚀 Opening test page...');

// Open test page in browser
try {
    execSync('start automated-test.html', { cwd: __dirname });
    console.log('✅ Test page opened in browser');
    console.log('📊 Check the browser for test results');
    console.log('');
    console.log('The test will:');
    console.log('1. Load the app in an iframe');
    console.log('2. Clear storage');
    console.log('3. Create a test period');
    console.log('4. Verify localStorage persistence');
    console.log('5. Test restart simulation (if available)');
    console.log('');
    console.log('🎯 If manual verification is needed:');
    console.log('   1. Note the period ID from the test');
    console.log('   2. Refresh localhost:5173');
    console.log('   3. Check if the period is still there');
} catch (error) {
    console.log('❌ Could not open test page');
    console.log('   Manually open: automated-test.html');
}

console.log('');
console.log('⏳ Test is running in the browser...');
console.log('   Check the opened HTML page for results');
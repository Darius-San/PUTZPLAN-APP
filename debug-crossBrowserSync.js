// Debug Script für crossBrowserSync Problem
// Führe das im Browser Console aus

function debugCrossBrowserSync() {
    console.log('🔍 DEBUG: CrossBrowserSync Storage Analysis');
    
    const STORAGE_KEY = 'putzplan-data';
    const SYNC_KEY = 'putzplan-sync';
    
    // Check main storage
    const mainData = localStorage.getItem(STORAGE_KEY);
    console.log('📦 Main Storage (putzplan-data):');
    if (mainData) {
        const parsed = JSON.parse(mainData);
        console.log('  - Version:', parsed.version);
        console.log('  - SavedAt:', parsed.savedAt);
        console.log('  - CurrentPeriod:', parsed.state?.currentPeriod?.id);
        console.log('  - Data length:', mainData.length);
    } else {
        console.log('  - NO DATA FOUND');
    }
    
    // Check sync storage
    const syncData = localStorage.getItem(SYNC_KEY);
    console.log('🔄 Sync Storage (putzplan-sync):');
    if (syncData) {
        const parsed = JSON.parse(syncData);
        console.log('  - Version:', parsed.version);
        console.log('  - Timestamp:', new Date(parsed.timestamp));
        console.log('  - BrowserContext:', parsed.browserContext);
        console.log('  - CurrentPeriod:', parsed.data?.state?.currentPeriod?.id);
        console.log('  - Data length:', syncData.length);
    } else {
        console.log('  - NO SYNC DATA FOUND');
    }
    
    // Browser context
    console.log('🌐 Current Browser Context:');
    const userAgent = window.navigator.userAgent;
    if (userAgent.includes('VSCode')) {
        console.log('  - VS Code Simple Browser detected');
    } else if (userAgent.includes('Chrome')) {
        console.log('  - Chrome browser detected');
    } else {
        console.log('  - Unknown browser:', userAgent);
    }
    
    // Check for conflicts
    if (mainData && syncData) {
        const mainParsed = JSON.parse(mainData);
        const syncParsed = JSON.parse(syncData);
        
        const mainPeriod = mainParsed.state?.currentPeriod?.id;
        const syncPeriod = syncParsed.data?.state?.currentPeriod?.id;
        
        if (mainPeriod !== syncPeriod) {
            console.log('⚠️ CONFLICT DETECTED:');
            console.log('  - Main period:', mainPeriod);
            console.log('  - Sync period:', syncPeriod);
            console.log('  - Sync timestamp:', new Date(syncParsed.timestamp));
            
            // Check which is newer
            const mainSavedAt = mainParsed.savedAt ? new Date(mainParsed.savedAt) : null;
            const syncTimestamp = new Date(syncParsed.timestamp);
            
            if (mainSavedAt && syncTimestamp) {
                if (mainSavedAt > syncTimestamp) {
                    console.log('  ✅ Main data is newer');
                } else {
                    console.log('  ❌ Sync data is newer - this could cause period loss!');
                }
            }
        } else {
            console.log('✅ No conflicts - periods match');
        }
    }
    
    return {
        mainData: mainData ? JSON.parse(mainData) : null,
        syncData: syncData ? JSON.parse(syncData) : null,
        conflict: mainData && syncData ? 
            JSON.parse(mainData).state?.currentPeriod?.id !== JSON.parse(syncData).data?.state?.currentPeriod?.id
            : false
    };
}

function fixCrossBrowserSync() {
    console.log('🔧 Fixing CrossBrowserSync conflicts...');
    
    const STORAGE_KEY = 'putzplan-data';
    const SYNC_KEY = 'putzplan-sync';
    
    const mainData = localStorage.getItem(STORAGE_KEY);
    const syncData = localStorage.getItem(SYNC_KEY);
    
    if (mainData && syncData) {
        const mainParsed = JSON.parse(mainData);
        const syncParsed = JSON.parse(syncData);
        
        // Use the newer data
        const mainSavedAt = mainParsed.savedAt ? new Date(mainParsed.savedAt).getTime() : 0;
        const syncTimestamp = syncParsed.timestamp || 0;
        
        if (mainSavedAt > syncTimestamp) {
            console.log('Using main data (newer)');
            // Update sync to match main
            const newSyncData = {
                version: '1.0',
                timestamp: Date.now(),
                data: mainParsed,
                browserContext: window.navigator.userAgent.includes('VSCode') ? 'vscode-simple-browser' : 'chrome'
            };
            localStorage.setItem(SYNC_KEY, JSON.stringify(newSyncData));
        } else {
            console.log('Using sync data (newer)');
            // Update main to match sync
            localStorage.setItem(STORAGE_KEY, JSON.stringify(syncParsed.data));
        }
    }
    
    console.log('✅ CrossBrowserSync fixed');
}

// Auto-run debug
const result = debugCrossBrowserSync();
console.log('🎯 Run fixCrossBrowserSync() if conflicts detected');
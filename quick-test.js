// QUICK TEST SCRIPT - Kopiere diesen Code in die Browser Console
// Teste direkt ob die CrossBrowserSync-Deaktivierung funktioniert

// === QUICK PERSISTENCE TEST ===
if (!window.dataManager) {
    console.log('❌ dataManager not available - App nicht geladen oder Fehler');
} else {
    console.log('✅ dataManager verfügbar - starte Test...');
    
    // Konfiguration
    const testStart = new Date();
    testStart.setHours(0, 0, 0, 0);
    const testEnd = new Date(testStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    
    console.log('🧹 Lösche Storage...');
    localStorage.removeItem('putzplan-data');
    localStorage.removeItem('putzplan-sync');
    
    console.log('📅 Erstelle Zeitraum...');
    try {
        const period = window.dataManager.setCustomPeriod(testStart, testEnd, false);
        console.log('✅ Zeitraum erstellt:', period.id);
        
        // Warte kurz und prüfe persistence
        setTimeout(() => {
            const storage = localStorage.getItem('putzplan-data');
            if (storage) {
                const data = JSON.parse(storage);
                const savedPeriod = data.state?.currentPeriod;
                
                if (savedPeriod?.id === period.id) {
                    console.log('✅ Zeitraum in localStorage gespeichert!');
                    console.log('🎯 NÄCHSTER SCHRITT: Drücke F5 zum Testen der Persistierung');
                    console.log('   Nach dem Reload führe aus: checkPeriod("' + period.id + '")');
                    
                    // Speichere für manual test
                    sessionStorage.setItem('testPeriodId', period.id);
                    
                } else {
                    console.log('❌ Zeitraum NICHT in localStorage gespeichert');
                    console.log('   Erwartet:', period.id);
                    console.log('   Gefunden:', savedPeriod?.id);
                }
            } else {
                console.log('❌ Kein localStorage data gefunden');
            }
        }, 300);
        
    } catch (error) {
        console.log('❌ Fehler beim Erstellen des Zeitraums:', error.message);
    }
}

// Helper function für nach dem Reload
window.checkPeriod = function(expectedId) {
    if (!expectedId) {
        expectedId = sessionStorage.getItem('testPeriodId');
    }
    
    if (!expectedId) {
        console.log('❌ Keine Period ID zum Testen verfügbar');
        return;
    }
    
    console.log('🔍 Prüfe Persistierung nach Reload...');
    console.log('Erwartete Period ID:', expectedId);
    
    if (!window.dataManager) {
        console.log('❌ dataManager nicht verfügbar');
        return;
    }
    
    const currentPeriod = window.dataManager.getState().currentPeriod;
    const currentId = currentPeriod?.id;
    
    console.log('Gefundene Period ID:', currentId || 'null');
    
    if (currentId === expectedId) {
        console.log('🎉 TEST ERFOLGREICH!');
        console.log('✅ Zeitraum hat App-Neustart überlebt');
        console.log('✅ CrossBrowserSync-Fix funktioniert');
        console.log('✅ Persistence Bug ist behoben!');
        
        sessionStorage.removeItem('testPeriodId');
    } else {
        console.log('❌ TEST FEHLGESCHLAGEN!');
        console.log('🚨 Zeitraum wurde nach Reload verloren');
        console.log('🚨 Bug existiert noch immer');
        
        // Debug-Info
        const storage = localStorage.getItem('putzplan-data');
        if (storage) {
            const data = JSON.parse(storage);
            console.log('Storage Period:', data.state?.currentPeriod?.id);
        }
    }
};

console.log('🚀 QUICK TEST BEREIT');
console.log('Nach F5 Reload: checkPeriod()');
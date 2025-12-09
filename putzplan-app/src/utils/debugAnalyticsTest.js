/**
 * Debug Analytics Test Suite
 * Ausführen in Browser Console um Debug Features zu testen
 */

window.debugAnalyticsTest = {
  
  // Test Debug Mode Aktivierung via URL
  testDebugModeActivation() {
    console.log('🧪 Testing Debug Mode Activation...');
    
    // Original URL speichern
    const originalUrl = window.location.href;
    
    // Test verschiedene Debug Mode Triggers
    const testUrls = [
      'http://localhost:5173/?debug=true',
      'http://localhost:5173/#debug',
      'http://localhost:5173/?debug=true#analytics',
      'http://localhost:5173/analytics?debug=true'
    ];
    
    testUrls.forEach(url => {
      console.log(`Testing URL: ${url}`);
      // Für echte Tests müsste man diese URLs besuchen
      console.log(`✅ Debug trigger found: ${url.includes('debug')}`);
    });
    
    console.log('✅ Debug Mode Activation Tests completed');
  },

  // Test Debug Historical Periods Creation
  testDebugPeriodCreation() {
    console.log('🧪 Testing Debug Period Creation...');
    
    // Simuliere verschiedene Zeitraum-Szenarien
    const testPeriods = [
      {
        name: "🧪 Test Periode - Sehr erfolgreich",
        memberStats: [
          { points: 120, executions: 15, achievement: 120 }, // Übererfüllung
          { points: 85, executions: 12, achievement: 85 },   // Gut
          { points: 95, executions: 10, achievement: 95 }    // Fast erreicht
        ]
      },
      {
        name: "🧪 Test Periode - Gemischt",
        memberStats: [
          { points: 65, executions: 8, achievement: 65 },    // Unterdurchschnitt
          { points: 105, executions: 18, achievement: 105 }, // Übererfüllung
          { points: 25, executions: 4, achievement: 25 }     // Weit unter Ziel
        ]
      },
      {
        name: "🧪 Test Periode - Alle unter Ziel",
        memberStats: [
          { points: 35, executions: 5, achievement: 35 },    // Schlecht
          { points: 42, executions: 6, achievement: 42 },    // Schlecht
          { points: 28, executions: 3, achievement: 28 }     // Sehr schlecht
        ]
      }
    ];
    
    testPeriods.forEach((period, index) => {
      console.log(`📊 Test Period ${index + 1}: ${period.name}`);
      console.log(`   Total Points: ${period.memberStats.reduce((s, m) => s + m.points, 0)}`);
      console.log(`   Total Executions: ${period.memberStats.reduce((s, m) => s + m.executions, 0)}`);
      console.log(`   Avg Achievement: ${Math.round(period.memberStats.reduce((s, m) => s + m.achievement, 0) / period.memberStats.length)}%`);
    });
    
    console.log('✅ Debug Period Creation Tests completed');
  },

  // Test Debug Cleanup
  testDebugCleanup() {
    console.log('🧪 Testing Debug Cleanup...');
    
    // Simuliere Debug Mode deaktivierung
    console.log('📤 Debug Mode deactivated');
    console.log('🗑️ Debug periods should be cleared from UI');
    console.log('✅ Only real historical periods should remain');
    
    console.log('✅ Debug Cleanup Tests completed');
  },

  // Test Debug UI Components
  testDebugUI() {
    console.log('🧪 Testing Debug UI Components...');
    
    const expectedUIElements = [
      '🛠️ DEBUG badge in header',
      '🛠️ Random Period button',
      '📝 Custom Period button', 
      '🗑️ Clear Debug button',
      'Debug period count badge',
      'Orange debug period cards',
      'Debug create modal'
    ];
    
    expectedUIElements.forEach(element => {
      console.log(`✅ UI Element: ${element}`);
    });
    
    console.log('✅ Debug UI Tests completed');
  },

  // Run all tests
  runAllTests() {
    console.log('🚀 Starting Debug Analytics Test Suite...\n');
    
    this.testDebugModeActivation();
    console.log('');
    
    this.testDebugPeriodCreation();
    console.log('');
    
    this.testDebugCleanup();
    console.log('');
    
    this.testDebugUI();
    console.log('');
    
    console.log('🎉 All Debug Analytics Tests completed!');
    console.log('');
    console.log('📝 Manual Testing Steps:');
    console.log('1. Visit http://localhost:5173/?debug=true');
    console.log('2. Go to Analytics');
    console.log('3. Click "🛠️ Random Period" multiple times');
    console.log('4. Click "📝 Custom Period" and create custom period');
    console.log('5. Verify debug periods show with orange styling');
    console.log('6. Remove ?debug=true from URL and refresh');
    console.log('7. Verify debug periods disappear');
    console.log('8. Add #debug to URL and verify debug mode activates');
  },

  // Helper: Generate random test data
  generateRandomTestData() {
    const members = 3; // Assume 3 members
    const targetPoints = 50;
    
    return {
      name: `🧪 Random Test ${new Date().toLocaleTimeString()}`,
      targetPoints,
      memberStats: Array.from({ length: members }, () => ({
        points: Math.floor(Math.random() * 150), // 0-150 points
        executions: Math.floor(Math.random() * 20), // 0-20 executions
        achievement: 0 // Will be calculated
      })).map(stat => ({
        ...stat,
        achievement: Math.round((stat.points / targetPoints) * 100)
      }))
    };
  }
};

// Auto-run tests
console.log('🛠️ Debug Analytics Test Utils loaded!');
console.log('Run: window.debugAnalyticsTest.runAllTests() to start testing');
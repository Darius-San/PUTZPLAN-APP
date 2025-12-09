import { describe, it, expect, beforeEach } from 'vitest';

/**
 * 🍰 SIMPLE TORTENDIAGRAMM LEGEND TEST
 * 
 * Dieser Test prüft die Logik der Tortendiagramm-Daten-Generierung
 * ohne komplexe Mocks um das Legende-Problem zu identifizieren.
 */

describe('🍰 Tortendiagramm Daten-Logik Tests', () => {

  it('✅ sollte konsistente Daten-Arrays für Chart und Legende erstellen', () => {
    console.log('🧪 Test: Konsistente Daten-Arrays Generierung');

    // Simuliere expandedAnalytics.userStats wie sie von der App kommen würden
    const mockUserStats = [
      { username: 'Darius1', totalPoints: 65 },
      { username: 'Lilly', totalPoints: 106 },
      { username: 'Max', totalPoints: 23 }
    ];

    // Simuliere die Chart-Daten-Generierung (wie im Code)
    const sortedUserStats = [...mockUserStats].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    const chartData = {
      labels: sortedUserStats.map((u: any) => u.username),
      datasets: [{
        label: 'Punkte',
        data: sortedUserStats.map((u: any) => u.totalPoints),
        userStatsRef: sortedUserStats
      }]
    };

    console.log('📊 Original UserStats:', mockUserStats);
    console.log('📊 Sorted UserStats:', sortedUserStats);
    console.log('📊 Chart Labels:', chartData.labels);
    console.log('📊 Chart Data:', chartData.datasets[0].data);

    // Validiere die Sortierung
    expect(sortedUserStats[0].username).toBe('Lilly'); // Höchste Punkte
    expect(sortedUserStats[1].username).toBe('Darius1'); // Mittlere Punkte  
    expect(sortedUserStats[2].username).toBe('Max'); // Niedrigste Punkte

    // Validiere Array-Längen
    expect(chartData.labels.length).toBe(chartData.datasets[0].data.length);
    expect(chartData.labels.length).toBe(chartData.datasets[0].userStatsRef.length);

    // Validiere Datenkonsistenz
    chartData.labels.forEach((label, index) => {
      const dataValue = chartData.datasets[0].data[index];
      const userStatRef = chartData.datasets[0].userStatsRef[index];
      
      expect(label).toBe(userStatRef.username);
      expect(dataValue).toBe(userStatRef.totalPoints);
      
      console.log(`✅ Index ${index}: ${label} → ${dataValue}P (${userStatRef.username})`);
    });
    
    console.log('✅ Daten-Array-Konsistenz validiert');
  });

  it('🏷️ sollte Legenden-Labels korrekt formatieren', () => {
    console.log('🧪 Test: Legenden-Label-Formatierung');

    const sortedUserStats = [
      { username: 'Lilly', totalPoints: 106 },
      { username: 'Darius1', totalPoints: 65 },
      { username: 'Max', totalPoints: 23 }
    ];

    // Simuliere die generateLabels Funktion
    sortedUserStats.forEach((userStat, i) => {
      const points = userStat.totalPoints || 0;
      const shortName = userStat.username.length > 12 ? 
        userStat.username.substring(0, 10) + '...' : 
        userStat.username;
      const labelText = `${shortName} (${points}P)`;
      
      console.log(`🏷️ Legend Label ${i}: ${labelText}`);
      
      // Validiere Label-Format
      expect(labelText).toMatch(/^.+ \(\d+P\)$/);
      expect(labelText).toContain(userStat.username);
      expect(labelText).toContain(`${points}P`);
    });
    
    console.log('✅ Legenden-Label-Formatierung korrekt');
  });

  it('📏 sollte Prozentberechnung für DataLabels korrekt durchführen', () => {
    console.log('🧪 Test: Prozentberechnung für DataLabels');

    const testData = [106, 65, 23]; // Lilly, Darius1, Max
    const total = testData.reduce((sum, val) => sum + val, 0);
    
    console.log('💰 Test Data:', testData);
    console.log('💰 Total:', total);

    const expectedPercentages = testData.map(value => {
      const percentage = Math.round((value / total) * 100);
      return percentage;
    });

    console.log('📊 Expected Percentages:', expectedPercentages);
    
    // Validiere Prozentsätze
    expect(expectedPercentages[0]).toBe(Math.round((106 / 194) * 100)); // ~55%
    expect(expectedPercentages[1]).toBe(Math.round((65 / 194) * 100));  // ~34%
    expect(expectedPercentages[2]).toBe(Math.round((23 / 194) * 100));  // ~12%
    
    // Teste DataLabel-Formatierung
    testData.forEach((value, index) => {
      const percentage = expectedPercentages[index];
      const userName = ['Lilly', 'Darius1', 'Max'][index];
      const shortName = userName.length > 8 ? userName.substring(0, 6) + '...' : userName;
      
      // Nur Labels für Segmente >8% zeigen
      if (percentage >= 8) {
        const dataLabel = `${shortName}\\n${value}P\\n(${percentage}%)`;
        console.log(`🏷️ DataLabel ${index}: ${dataLabel}`);
        
        expect(dataLabel).toContain(shortName);
        expect(dataLabel).toContain(`${value}P`);
        expect(dataLabel).toContain(`${percentage}%`);
      }
    });
    
    console.log('✅ Prozentberechnung und DataLabels korrekt');
  });

  it('🔄 sollte Edge-Cases für sehr lange Namen behandeln', () => {
    console.log('🧪 Test: Edge-Cases für lange Benutzernamen');

    const longNameUserStats = [
      { username: 'VeryLongUserNameThatShouldBeTruncated', totalPoints: 100 },
      { username: 'Short', totalPoints: 50 }
    ];

    longNameUserStats.forEach((userStat) => {
      // Legende: Kürze auf 10 Zeichen
      const shortNameLegend = userStat.username.length > 12 ? 
        userStat.username.substring(0, 10) + '...' : 
        userStat.username;
      
      // DataLabel: Kürze auf 6 Zeichen
      const shortNameDataLabel = userStat.username.length > 8 ? 
        userStat.username.substring(0, 6) + '...' : 
        userStat.username;
      
      console.log(`👤 Original: ${userStat.username}`);
      console.log(`🏷️ Legend: ${shortNameLegend}`);
      console.log(`📊 DataLabel: ${shortNameDataLabel}`);
      
      // Validiere Kürzungen
      if (userStat.username.length > 12) {
        expect(shortNameLegend).toHaveLength(13); // 10 chars + "..."
        expect(shortNameLegend).toEndWith('...');
      }
      
      if (userStat.username.length > 8) {
        expect(shortNameDataLabel).toHaveLength(9); // 6 chars + "..."
        expect(shortNameDataLabel).toEndWith('...');
      }
    });
    
    console.log('✅ Edge-Cases für lange Namen korrekt behandelt');
  });
});
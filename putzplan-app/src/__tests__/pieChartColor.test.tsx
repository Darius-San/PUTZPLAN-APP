import { describe, it, expect } from 'vitest';

/**
 * 🎨 FARB-KONSISTENZ TEST für Tortendiagramm
 * 
 * Testet die Konsistenz zwischen Chart-Daten, Farben und Legende
 */

describe('🎨 Tortendiagramm Farb-Konsistenz Tests', () => {

  // Simuliere die generateColors Funktion wie im echten Code
  const generateColors = (count: number) => {
    const colors = [
      '#E53E3E', '#3182CE', '#38A169', '#D69E2E', 
      '#9F7AEA', '#ED8936', '#00B5D8', '#EF4444'
    ];
    return Array.from({ length: count }, (_, i) => colors[i % colors.length]);
  };

  it('🎯 KRITISCH: sollte Farb-Index mit Daten-Index synchronisieren', () => {
    console.log('🧪 Test: Farb-Index-Synchronisation');

    // Test-Daten aus dem Bild: Darius1 65P, Lilly 106P
    const originalUserStats = [
      { username: 'Darius1', totalPoints: 65 },
      { username: 'Lilly', totalPoints: 106 }
    ];

    // Sortierung wie im echten Code
    const sortedUserStats = [...originalUserStats].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
    
    // Chart-Daten-Generierung
    const labels = sortedUserStats.map(u => u.username);
    const data = sortedUserStats.map(u => u.totalPoints);
    const colors = generateColors(sortedUserStats.length);
    
    console.log('👥 Original order:', originalUserStats.map(u => `${u.username}: ${u.totalPoints}P`));
    console.log('📊 Sorted order:', sortedUserStats.map(u => `${u.username}: ${u.totalPoints}P`));
    console.log('🏷️ Labels:', labels);
    console.log('💰 Data:', data);
    console.log('🎨 Colors:', colors);
    
    // Erwartung: Lilly sollte Index 0 haben (höchste Punkte)
    expect(labels[0]).toBe('Lilly');
    expect(data[0]).toBe(106);
    expect(colors[0]).toBe('#E53E3E'); // Erste Farbe = Rot
    
    // Erwartung: Darius1 sollte Index 1 haben
    expect(labels[1]).toBe('Darius1');
    expect(data[1]).toBe(65);
    expect(colors[1]).toBe('#3182CE'); // Zweite Farbe = Blau
    
    // Mapping-Validierung
    sortedUserStats.forEach((user, index) => {
      console.log(`📍 Index ${index}: ${user.username} → ${user.totalPoints}P → ${colors[index]}`);
      
      expect(labels[index]).toBe(user.username);
      expect(data[index]).toBe(user.totalPoints);
    });
    
    console.log('✅ Farb-Index-Synchronisation validiert');
  });

  it('🔄 sollte bei verschiedenen Daten-Szenarien konsistent bleiben', () => {
    console.log('🧪 Test: Konsistenz bei verschiedenen Szenarien');

    const scenarios = [
      {
        name: 'Nur 2 Benutzer (wie im Bild)',
        users: [
          { username: 'Darius1', totalPoints: 65 },
          { username: 'Lilly', totalPoints: 106 }
        ]
      },
      {
        name: '3 Benutzer mit unterschiedlichen Punkten',
        users: [
          { username: 'Darius1', totalPoints: 65 },
          { username: 'Lilly', totalPoints: 106 },
          { username: 'Max', totalPoints: 89 }
        ]
      },
      {
        name: 'Gleiche Punkte (Edge Case)',
        users: [
          { username: 'Anna', totalPoints: 50 },
          { username: 'Ben', totalPoints: 50 }
        ]
      }
    ];

    scenarios.forEach((scenario, scenarioIndex) => {
      console.log(`\\n🎬 Szenario ${scenarioIndex + 1}: ${scenario.name}`);
      
      const sortedUsers = [...scenario.users].sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));
      const labels = sortedUsers.map(u => u.username);
      const data = sortedUsers.map(u => u.totalPoints);
      const colors = generateColors(sortedUsers.length);
      
      console.log('📊 Sorted users:', sortedUsers.map(u => `${u.username}: ${u.totalPoints}P`));
      
      // Validiere dass jeder Index korrekt ist
      sortedUsers.forEach((user, index) => {
        const expectedLabel = user.username;
        const expectedData = user.totalPoints;
        const expectedColor = colors[index];
        
        expect(labels[index]).toBe(expectedLabel);
        expect(data[index]).toBe(expectedData);
        
        console.log(`  📍 ${index}: ${expectedLabel} → ${expectedData}P → ${expectedColor}`);
      });
    });
    
    console.log('✅ Alle Szenarien konsistent');
  });

  it('🏷️ sollte Legend-Labels mit korrekten Farben verknüpfen', () => {
    console.log('🧪 Test: Legend-Labels mit Farben verknüpfen');

    // Simuliere wie Legend-Generation funktionieren sollte
    const testUserStats = [
      { username: 'Lilly', totalPoints: 106 },
      { username: 'Darius1', totalPoints: 65 }
    ];
    
    const colors = generateColors(testUserStats.length);
    
    // Simuliere die generateLabels Funktion
    const legendLabels = testUserStats.map((userStat, i) => {
      const points = userStat.totalPoints || 0;
      const shortName = userStat.username.length > 12 ? 
        userStat.username.substring(0, 10) + '...' : 
        userStat.username;
      
      return {
        text: `${shortName} (${points}P)`,
        fillStyle: colors[i],
        index: i,
        username: userStat.username
      };
    });
    
    console.log('🏷️ Legend Labels with colors:');
    legendLabels.forEach((label, index) => {
      console.log(`  ${index}: ${label.text} → ${label.fillStyle}`);
      
      // Validiere Label-Format
      expect(label.text).toMatch(/^.+ \\(\\d+P\\)$/);
      expect(label.fillStyle).toBe(colors[index]);
    });
    
    // WICHTIGER CHECK: Lilly sollte rote Farbe haben (Index 0)
    const lillyLabel = legendLabels.find(l => l.username === 'Lilly');
    const dariusLabel = legendLabels.find(l => l.username === 'Darius1');
    
    expect(lillyLabel?.fillStyle).toBe('#E53E3E'); // Rot
    expect(dariusLabel?.fillStyle).toBe('#3182CE'); // Blau
    
    console.log('📍 Lilly (106P) → Rot (#E53E3E)');
    console.log('📍 Darius1 (65P) → Blau (#3182CE)');
    console.log('✅ Legend-Farben-Zuordnung korrekt');
  });

  it('🔍 DEBUG: Analysiere das konkrete Problem aus dem Bild', () => {
    console.log('🧪 Test: Analyse des konkreten Problems');

    // Das Bild zeigt:
    // - Torte: Lilly (rot, große Fläche), Darius1 (blau, kleine Fläche)  
    // - Legende: "● Lilly (106P)" 
    // - Problem: Die Zuordnung stimmt nicht
    
    console.log('\\n🖼️ PROBLEM-ANALYSE aus dem Bild:');
    console.log('Torte zeigt: Lilly (rot, 62%) + Darius1 (blau, 38%)');
    console.log('Legende zeigt: "● Lilly (106P)"');
    console.log('Erwartung: Lilly sollte rot UND in der Legende rot sein\\n');

    const imageDataAnalysis = {
      pieSlices: [
        { color: 'rot', percentage: 62, shouldBeUser: 'Lilly' },
        { color: 'blau', percentage: 38, shouldBeUser: 'Darius1' }
      ],
      legendEntries: [
        { text: 'Lilly (106P)', color: 'sollte rot sein' }
      ],
      actualData: [
        { username: 'Lilly', totalPoints: 106 },
        { username: 'Darius1', totalPoints: 65 }
      ]
    };
    
    // Berechne erwartete Prozentsätze
    const total = 106 + 65; // 171
    const expectedPercentages = {
      Lilly: Math.round((106 / total) * 100), // ~62%
      Darius1: Math.round((65 / total) * 100)  // ~38%
    };
    
    console.log('🧮 Erwartete Prozentsätze:', expectedPercentages);
    
    // VALIDIERUNG: Die Prozentsätze stimmen!
    expect(expectedPercentages.Lilly).toBe(62);
    expect(expectedPercentages.Darius1).toBe(38);
    
    console.log('✅ Prozentsätze sind mathematisch korrekt');
    console.log('❌ PROBLEM: Die Farb-Zuordnung in der Legende stimmt nicht mit der Torte überein');
    
    // LÖSUNG IDENTIFIZIERT:
    console.log('\\n💡 LÖSUNG: Chart.js verwendet möglicherweise eine andere Reihenfolge als unsere userStatsRef');
    console.log('🔧 FIX NEEDED: generateLabels muss die ECHTE Chart-Daten-Reihenfolge verwenden');
  });
});
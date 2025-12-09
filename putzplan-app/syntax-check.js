// Einfacher Syntax-Test
import fs from 'fs';

try {
  const content = fs.readFileSync('src/services/dataManager.ts', 'utf8');
  
  // Zähle geschweifte Klammern
  const openBraces = (content.match(/{/g) || []).length;
  const closeBraces = (content.match(/}/g) || []).length;
  
  console.log('Offene Klammern:', openBraces);
  console.log('Geschlossene Klammern:', closeBraces);
  console.log('Differenz:', openBraces - closeBraces);
  
  // Finde letzte Vorkommen von schließenden Klammern
  const lines = content.split('\n');
  const lastBraces = [];
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line.trim().includes('}')) {
      lastBraces.push(`Line ${i + 1}: ${line.trim()}`);
      if (lastBraces.length > 10) break;
    }
  }
  
  console.log('\nLetzte schließende Klammern:');
  lastBraces.forEach(line => console.log(line));
  
} catch (error) {
  console.error('Error:', error.message);
}
const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'putzplan-app', 'data', 'putzplan-data.json');
if (!fs.existsSync(dataPath)) {
  console.error('Data file not found:', dataPath);
  process.exit(2);
}

const raw = fs.readFileSync(dataPath, 'utf8');
const json = JSON.parse(raw);
const state = json.state || {};

const backupPath = dataPath + '.bak.' + Date.now();
fs.copyFileSync(dataPath, backupPath);
console.log('Backup written to', backupPath);

function normalizeDateField(p) {
  const startRaw = p.startDate || p.start || p.start_at || p.startISO || p.startTimestamp || null;
  const endRaw = p.endDate || p.end || p.end_at || p.endISO || p.endTimestamp || null;
  const s = startRaw ? new Date(startRaw) : null;
  const e = endRaw ? new Date(endRaw) : null;
  return {
    startISO: s && !isNaN(s.getTime()) ? s.toISOString() : null,
    endISO: e && !isNaN(e.getTime()) ? e.toISOString() : null
  };
}

let totalRemoved = 0;
const report = {};

if (state.wgs) {
  Object.keys(state.wgs).forEach(wgId => {
    const wg = state.wgs[wgId];
    report[wgId] = { periodsBefore: 0, periodsAfter: 0, historicalBefore: 0, historicalAfter: 0, removed: [] };

    // Dedupe helper
    function dedupeArray(arr, arrName) {
      if (!Array.isArray(arr)) return arr;
      report[wgId][arrName + 'Before'] = arr.length;
      const map = new Map();
      const kept = [];

      for (const item of arr) {
        const { startISO, endISO } = normalizeDateField(item);
        const key = (startISO && endISO) ? `${startISO}::${endISO}` : (item.id || JSON.stringify(item));

        if (!map.has(key)) {
          map.set(key, item);
          kept.push(item);
        } else {
          // decide which to keep: prefer item with summary or archivedAt or createdAt newer
          const existing = map.get(key);
          const existingScore = (existing.summary ? 2 : 0) + (existing.archivedAt ? 1 : 0) + (existing.createdAt ? 0.5 : 0);
          const candidateScore = (item.summary ? 2 : 0) + (item.archivedAt ? 1 : 0) + (item.createdAt ? 0.5 : 0);
          if (candidateScore > existingScore) {
            // replace
            map.set(key, item);
            // replace in kept
            const idx = kept.indexOf(existing);
            if (idx !== -1) kept[idx] = item;
            report[wgId].removed.push(existing.id || JSON.stringify(existing));
            totalRemoved++;
          } else {
            report[wgId].removed.push(item.id || JSON.stringify(item));
            totalRemoved++;
          }
        }
      }

      report[wgId][arrName + 'After'] = kept.length;
      return kept;
    }

    try {
      wg.periods = dedupeArray(wg.periods || [], 'periods');
      wg.historicalPeriods = dedupeArray(wg.historicalPeriods || [], 'historicalPeriods');
    } catch (err) {
      console.error('Error deduping WG', wgId, err);
    }
  });
}

// Write back
json.state = state;
fs.writeFileSync(dataPath, JSON.stringify(json, null, 2), 'utf8');

console.log('Duplicate cleanup finished. Total removed:', totalRemoved);
Object.keys(report).forEach(wgId => {
  const r = report[wgId];
  console.log(`WG ${wgId}: periods ${r.periodsBefore} -> ${r.periodsAfter}, historical ${r.historicalBefore} -> ${r.historicalAfter}, removed: ${r.removed.length}`);
});
console.log('Backup file:', backupPath);

const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '..', 'putzplan-app', 'data', 'putzplan-data.json');
if (!fs.existsSync(dataFile)) {
  console.error('Data file not found:', dataFile);
  process.exit(2);
}

const raw = fs.readFileSync(dataFile, 'utf8');
const json = JSON.parse(raw);
const state = json.state || {};

const currentWG = state.currentWG || null;
if (!currentWG) {
  console.log('No current WG in state');
  process.exit(0);
}

const wg = (state.wgs && state.wgs[currentWG.id]) || null;
if (!wg) {
  console.log('Current WG not found in wgs map');
  process.exit(0);
}

const activePeriods = (wg.periods || []).filter(p => p.isActive !== false);
const historicalPeriods = wg.historicalPeriods || [];

function norm(p) {
  const startDate = p.startDate || p.start || p.start_at || null;
  const endDate = p.endDate || p.end || p.end_at || null;
  const s = startDate ? new Date(startDate) : null;
  const e = endDate ? new Date(endDate) : null;
  return {
    id: p.id,
    raw: p,
    startDate: startDate,
    endDate: endDate,
    startValid: s && !isNaN(s.getTime()),
    endValid: e && !isNaN(e.getTime()),
    startISO: s && !isNaN(s.getTime()) ? s.toISOString() : null,
    endISO: e && !isNaN(e.getTime()) ? e.toISOString() : null,
    isActive: !!p.isActive,
    createdAt: p.createdAt || p.archivedAt || null
  };
}

const all = [...activePeriods.map(norm), ...historicalPeriods.map(norm)];

// Count executions per period
const executions = state.executions ? Object.values(state.executions) : [];
all.forEach(period => {
  if (!period.startISO || !period.endISO) {
    period.execCount = null;
    return;
  }
  const s = new Date(period.startISO);
  const e = new Date(period.endISO);
  const count = executions.filter(ex => {
    const d = new Date(ex.executedAt || ex.date);
    if (isNaN(d.getTime())) return false;
    // Try to find task and ensure wgId matches
    const task = state.tasks && state.tasks[ex.taskId];
    if (!task) return false;
    if (task.wgId !== currentWG.id) return false;
    return d >= s && d <= e;
  }).length;
  period.execCount = count;
});

console.log(JSON.stringify({ currentWG: currentWG.id, normalizedPeriods: all }, null, 2));

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

const out = {
  currentPeriod: state.currentPeriod || null,
  currentWG: state.currentWG ? { id: state.currentWG.id, name: state.currentWG.name } : null,
  wgs: {},
  derivedMonthsFromExecutions: []
};

// Summarize WGs
if (state.wgs) {
  Object.entries(state.wgs).forEach(([id, wg]) => {
    const w = wg || {};
    out.wgs[id] = {
      id: id,
      name: w.name || null,
      periodsCount: Array.isArray(w.periods) ? w.periods.length : 0,
      historicalPeriodsCount: Array.isArray(w.historicalPeriods) ? w.historicalPeriods.length : 0,
      periods: Array.isArray(w.periods) ? w.periods : undefined,
      historicalPeriods: Array.isArray(w.historicalPeriods) ? w.historicalPeriods : undefined
    };
  });
}

// Derive months from executions for current WG
const executions = state.executions ? Object.values(state.executions) : [];
const tasks = state.tasks || {};
const currentWGId = state.currentWG ? state.currentWG.id : null;

const monthsMap = new Map();
executions.forEach(e => {
  const task = tasks[e.taskId];
  if (!task) return;
  if (!currentWGId || task.wgId !== currentWGId) return;
  const d = new Date(e.executedAt || e.date);
  if (isNaN(d.getTime())) return;
  const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
  if (!monthsMap.has(key)) monthsMap.set(key, { key, start: new Date(d.getFullYear(), d.getMonth(), 1).toISOString(), end: new Date(d.getFullYear(), d.getMonth()+1, 0).toISOString(), totalExecutions: 0 });
  const m = monthsMap.get(key);
  m.totalExecutions += 1;
});

out.derivedMonthsFromExecutions = Array.from(monthsMap.values()).sort((a,b) => b.key.localeCompare(a.key));

console.log(JSON.stringify(out, null, 2));

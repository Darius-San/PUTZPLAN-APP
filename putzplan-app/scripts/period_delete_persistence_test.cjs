const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'putzplan-data.json');
const outPath = path.join(__dirname, '..', 'data', 'putzplan-data.period-delete-test-output.json');

function load() {
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
}

function save(obj, out) {
  fs.writeFileSync(out, JSON.stringify(obj, null, 2), 'utf8');
}

function findSuitableWG(state) {
  const wgs = state.wgs || {};
  for (const id of Object.keys(wgs)) {
    const wg = wgs[id];
    const periods = (wg.periods || []).concat(wg.historicalPeriods || []);
    const hasPeriods = periods.length > 0;
    const hasTasks = Object.values(state.tasks || {}).some(t => t.wgId === wg.id);
    if (hasPeriods && hasTasks) return { wg, id };
  }
  return null;
}

function ensureSavedStateForPeriod(wg, state, periodId) {
  const periods = (wg.periods || []).concat(wg.historicalPeriods || []);
  const p = periods.find(x => x.id === periodId);
  if (!p) throw new Error('Period not found');
  if (p.savedState) return p.savedState;

  // synthesize savedState from current state's tasks+executions
  const tasks = Object.values(state.tasks || {}).filter(t => t.wgId === wg.id).map(t => ({...t}));
  const executions = Object.values(state.executions || {}).filter(e => {
    const task = state.tasks[e.taskId];
    return task && task.wgId === wg.id;
  }).map(e => ({...e}));

  p.savedState = { savedAt: new Date().toISOString(), tasks, executions };
  return p.savedState;
}

function run() {
  const obj = load();
  const state = obj.state || obj;
  const found = findSuitableWG(state);
  if (!found) {
    console.error('No suitable WG with periods and tasks found.');
    process.exit(2);
  }
  const wg = found.wg;
  const wgId = found.id;
  const periods = (wg.periods || []).concat(wg.historicalPeriods || []);
  const period = periods[0];
  if (!period) { console.error('No period found'); process.exit(2); }

  console.log('Using WG:', wgId, 'Period:', period.id, 'Period name:', period.name || period.id);

  // Ensure savedState exists
  const saved = ensureSavedStateForPeriod(wg, state, period.id);
  console.log('SavedState tasks before:', (saved.tasks || []).length);

  if (!saved.tasks || saved.tasks.length === 0) {
    console.error('No tasks in saved state to delete');
    process.exit(2);
  }

  const task = saved.tasks[0];
  console.log('Deleting task from period savedState:', task.id, task.title || task.name || '');

  // Delete task from savedState (period-scoped delete)
  saved.tasks = saved.tasks.filter(t => t.id !== task.id);
  const beforeExec = saved.executions ? saved.executions.length : 0;
  saved.executions = (saved.executions || []).filter(e => e.taskId !== task.id);
  const afterExec = saved.executions.length;

  // Persist to output file (do not modify original)
  const outObj = JSON.parse(JSON.stringify(obj));

  // Find WG in outObj
  const outState = outObj.state || outObj;
  const outWg = (outState.wgs || {})[wgId] || null;
  if (!outWg) {
    console.error('WG not found in output state copy');
    process.exit(2);
  }
  // Attach modified savedState to the corresponding period in outWg
  const outPeriods = (outWg.periods || []).concat(outWg.historicalPeriods || []);
  const outP = outPeriods.find(p => p.id === period.id);
  if (!outP) {
    console.error('Period not found in output WG copy');
    process.exit(2);
  }
  outP.savedState = saved;

  save(outObj, outPath);

  console.log(`Wrote test output to ${outPath}`);
  console.log('Before exec count:', beforeExec, 'After exec count:', afterExec, 'Before tasks:', (saved.tasks||[]).length + 1, 'After tasks:', (saved.tasks||[]).length);

  // Now simulate switching to another period and back: reload file and confirm savedState still missing task
  const reloaded = JSON.parse(fs.readFileSync(outPath, 'utf8'));
  const reSt = reloaded.state || reloaded;
  const reWg = (reSt.wgs || {})[wgId];
  const rePeriods = (reWg.periods || []).concat(reWg.historicalPeriods || []);
  const reP = rePeriods.find(p => p.id === period.id);
  const reSaved = reP && reP.savedState;
  if (!reSaved) {
    console.error('Reloaded savedState missing!');
    process.exit(2);
  }
  const exists = (reSaved.tasks || []).some(t => t.id === task.id);
  console.log('Task exists after reload in savedState?', exists);
  if (!exists) {
    console.log('✅ Deletion persisted in period savedState after reload.');
    process.exit(0);
  } else {
    console.error('❌ Task still present after reload!');
    process.exit(3);
  }
}

run();

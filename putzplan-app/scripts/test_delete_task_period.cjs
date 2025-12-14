const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'data', 'putzplan-data.json');
const OUT_PATH = path.join(__dirname, '..', 'data', 'putzplan-data.test-output.json');

function readJson(p) {
  const raw = fs.readFileSync(p, 'utf8');
  return JSON.parse(raw);
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function findFirstWG(state) {
  if (state.currentWG) return state.currentWG;
  const keys = Object.keys(state.wgs || {});
  if (keys.length === 0) return null;
  return state.wgs[keys[0]];
}

function main() {
  if (!fs.existsSync(DATA_PATH)) {
    console.error('Data file not found:', DATA_PATH);
    process.exit(1);
  }

  const file = readJson(DATA_PATH);
  const state = file.state || {};

  const wg = findFirstWG(state);
  if (!wg) {
    console.error('No WG found in persisted snapshot');
    process.exit(1);
  }

  // Some persisted snapshots store periods on state.wgs[...] instead of the top-level currentWG
  let periods = (wg.periods || []).concat(wg.historicalPeriods || []);
  if ((!periods || periods.length === 0) && state.wgs && wg.id && state.wgs[wg.id]) {
    const alt = state.wgs[wg.id];
    periods = (alt.periods || []).concat(alt.historicalPeriods || []);
  }
  if (periods.length === 0) {
    console.error('No periods found for WG', wg.id);
    process.exit(1);
  }

  // Choose the first period for testing
  const period = periods[0];
  console.log('Selected period:', period.id, 'has savedState?', !!period.savedState);

  // Build savedState if missing (simulate saveStateForPeriod)
  let savedState = period.savedState;
  if (!savedState) {
    const wgTasks = Object.values(state.tasks || {}).filter(t => t.wgId === wg.id);
    const wgTaskIds = new Set(wgTasks.map(t => t.id));
    const wgExecs = Object.values(state.executions || {}).filter(e => wgTaskIds.has(e.taskId));
    savedState = {
      savedAt: new Date().toISOString(),
      tasks: wgTasks.map(t => ({ ...t })),
      executions: wgExecs.map(e => ({ ...e }))
    };
    console.log(`Created synthetic savedState: tasks=${savedState.tasks.length}, executions=${savedState.executions.length}`);
  }

  if ((savedState.tasks || []).length === 0) {
    console.log('No tasks in savedState to delete. Exiting.');
    process.exit(0);
  }

  // Pick a task to delete (first)
  const taskToDelete = savedState.tasks[0];
  console.log('Will delete task from period savedState:', taskToDelete.id, taskToDelete.title || taskToDelete.name || 'NO_TITLE');

  const beforeTasks = (savedState.tasks || []).length;
  const beforeExec = (savedState.executions || []).length;

  savedState.tasks = (savedState.tasks || []).filter(t => t.id !== taskToDelete.id);
  savedState.executions = (savedState.executions || []).filter(e => e.taskId !== taskToDelete.id);

  const afterTasks = (savedState.tasks || []).length;
  const afterExec = (savedState.executions || []).length;

  console.log(`Before: tasks=${beforeTasks}, execs=${beforeExec}`);
  console.log(`After:  tasks=${afterTasks}, execs=${afterExec}`);

  // Attach into a shallow copy of the persisted JSON and write out to test output file
  const out = JSON.parse(JSON.stringify(file));
  // find and update the corresponding period in out.state.wgs
  const outWg = out.state.currentWG && out.state.currentWG.id === wg.id ? out.state.currentWG : (out.state.wgs || {})[wg.id];
  if (!outWg) {
    console.error('Failed to locate WG in output object');
    process.exit(1);
  }

  const updateList = list => list.map(p => p.id === period.id ? { ...p, savedState } : p);
  outWg.periods = updateList(outWg.periods || []);
  outWg.historicalPeriods = updateList(outWg.historicalPeriods || []);
  // Put back into out.state
  if (out.state.currentWG && out.state.currentWG.id === wg.id) out.state.currentWG = outWg;
  out.state.wgs = { ...(out.state.wgs || {}), [wg.id]: outWg };

  writeJson(OUT_PATH, out);
  console.log('Wrote test output to', OUT_PATH);
  console.log('NOTE: original persisted file not modified. Inspect the test output file to review changes.');
}

main();

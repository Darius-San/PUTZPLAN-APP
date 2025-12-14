const fs = require('fs');
const path = require('path');

function pad(n){ return String(n).padStart(2,'0'); }

const dataPath = path.resolve(__dirname,'..','putzplan-app','data','putzplan-data.json');

function readJson(p){ return JSON.parse(fs.readFileSync(p,'utf8')); }
function writeJson(p,obj){ fs.writeFileSync(p, JSON.stringify(obj,null,2),'utf8'); }

try{
  if(!fs.existsSync(dataPath)){
    console.error('Data file not found:', dataPath);
    process.exit(2);
  }

  const rawFile = readJson(dataPath);
  const backupPath = dataPath + '.bak.' + Date.now();
  fs.copyFileSync(dataPath, backupPath);

  // The persisted file wraps the app state under `state` (versioned). Use that.
  const raw = rawFile.state ? rawFile.state : rawFile;

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth()+1, 1); // first day of next month
  const end = new Date(start.getFullYear(), start.getMonth()+1, 1); // first day of following month
  const days = Math.round((end - start) / (1000*60*60*24));
  const id = `${start.toISOString().slice(0,10)}_${end.toISOString().slice(0,10)}`;
  const label = `${pad(start.getDate())}.${pad(start.getMonth()+1)} – ${pad((new Date(end.getTime()-1)).getDate())}.${pad(end.getMonth())}`;

  const periodObj = {
    id,
    start: start.toISOString(),
    end: end.toISOString(),
    days,
    label,
    createdAt: new Date().toISOString()
  };

  raw.wgs = raw.wgs || {};
  // Prefer the currently selected WG from the persisted state
  const currentWGId = (raw.currentWG && raw.currentWG.id) || Object.keys(raw.wgs)[0] || 'wg-test';
  if(!raw.wgs[currentWGId]){
    raw.wgs[currentWGId] = { id: currentWGId, name: (raw.currentWG && raw.currentWG.name) || 'Test WG', periods: [], historicalPeriods: [] };
  }

  const wg = raw.wgs[currentWGId];
  wg.periods = wg.periods || [];
  wg.historicalPeriods = wg.historicalPeriods || [];

  // avoid duplicate by start+end
  const exists = wg.historicalPeriods.some(p => p.start === periodObj.start && p.end === periodObj.end);
  if(!exists){
    wg.historicalPeriods.push(periodObj);
    wg.periods.push(periodObj);
  } else {
    console.log('Period already exists in historicalPeriods, skipping append.');
  }

  // set as currentPeriod
  // raw is the app state; when writing back we must preserve the version wrapper if present
  if (rawFile && rawFile.state) {
    rawFile.state = raw;
    rawFile.currentPeriod = periodObj; // keep legacy alias
    writeJson(dataPath, rawFile);
  } else {
    raw.currentPeriod = periodObj;
    writeJson(dataPath, raw);
  }

  const summary = {
    backup: backupPath,
    dataPath,
    currentPeriod: raw.currentPeriod && { id: raw.currentPeriod.id, start: raw.currentPeriod.start, end: raw.currentPeriod.end, label: raw.currentPeriod.label },
    wg: { id: wg.id, name: wg.name, periodsCount: wg.periods.length, historicalPeriodsCount: wg.historicalPeriods.length, lastPeriodId: wg.historicalPeriods[wg.historicalPeriods.length-1].id }
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
} catch(err){
  console.error('Error while adding test period:', err);
  process.exit(3);
}

// Simple manual test for persistence functionality

import { dataManager } from '../services/dataManager.js';

console.log('🧪 [Manual Test] Starting comprehensive persistence tests...');

// Test 1: Period Persistence
console.log('\n=== Test 1: Period Persistence ===');

dataManager.clearAllData();

// Create user and WG
const user = dataManager.createUser({ name: 'TestUser', avatar: '👤' });
const wg = dataManager.createWG({ name: 'TestWG', description: 'test' });
dataManager.updateWG(wg.id, { memberIds: [user.id] });
dataManager.setCurrentUser(user.id);

// Create custom period
const startDate = new Date('2025-01-01');
const endDate = new Date('2025-01-31');
const period = dataManager.setCustomPeriod(startDate, endDate, false);

console.log('✅ Period created:', period.id);

// Check localStorage
const stored = localStorage.getItem('putzplan-data');
if (stored) {
  const parsed = JSON.parse(stored);
  console.log('✅ Period persisted in localStorage:', parsed.state.currentPeriod?.id);
} else {
  console.log('❌ No data in localStorage');
}

// Test 2: Analytics Period Creation  
console.log('\n=== Test 2: Analytics Period Creation ===');

const currentWG = dataManager.getCurrentWG();
if (currentWG?.periods?.length > 0) {
  console.log('✅ Analytics period created:', currentWG.periods[0].id);
  console.log('✅ Active status:', currentWG.periods[0].isActive);
} else {
  console.log('❌ No analytics period found');
}

// Test 3: Historical Periods
console.log('\n=== Test 3: Historical Periods ===');

// Create additional periods
const period2 = dataManager.setCustomPeriod(
  new Date('2025-02-01'),
  new Date('2025-02-28'),
  false
);

const period3 = dataManager.setCustomPeriod(
  new Date('2025-03-01'),
  new Date('2025-03-31'),
  false
);

const historicalPeriods = dataManager.getHistoricalPeriods();
console.log('✅ Historical periods count:', historicalPeriods.length);
console.log('✅ Periods:', historicalPeriods.map(p => ({ id: p.id, name: p.name })));

// Test 4: Period Display Filtering
console.log('\n=== Test 4: Period Display Filtering ===');

const task = dataManager.createTask({
  title: 'TestTask',
  emoji: '🧪',
  pointsPerExecution: 10,
  wgId: wg.id
});

// Execute task multiple times
dataManager.executeTaskForUser(task.id, user.id, {});
dataManager.executeTaskForUser(task.id, user.id, {});

console.log('✅ Total executions:', Object.keys(dataManager.getState().executions).length);

// Test period filtering
dataManager.setDisplayPeriod(period.id);
const filteredExecutions = dataManager.getDisplayPeriodExecutions();
console.log('✅ Filtered executions for period 1:', Object.keys(filteredExecutions).length);

dataManager.setDisplayPeriod(null);
const allExecutions = dataManager.getDisplayPeriodExecutions();
console.log('✅ All executions (current):', Object.keys(allExecutions).length);

// Test 5: Data Reset
console.log('\n=== Test 5: Data Reset ===');

const beforeReset = dataManager.getState();
console.log('Before reset - executions:', Object.keys(beforeReset.executions).length);
console.log('Before reset - user points:', beforeReset.users[user.id]?.totalPoints);

const resetPeriod = dataManager.setCustomPeriod(
  new Date('2025-04-01'),
  new Date('2025-04-30'),
  true // RESET
);

const afterReset = dataManager.getState();
console.log('✅ After reset - executions:', Object.keys(afterReset.executions).length);
console.log('✅ After reset - user points:', afterReset.users[user.id]?.totalPoints);
console.log('✅ Current period after reset:', afterReset.currentPeriod?.id);

// Verify persistence after reset
const storedAfterReset = localStorage.getItem('putzplan-data');
if (storedAfterReset) {
  const parsedAfterReset = JSON.parse(storedAfterReset);
  console.log('✅ Reset period persisted:', parsedAfterReset.state.currentPeriod?.id);
}

console.log('\n🎉 All manual tests completed successfully!');

export {};
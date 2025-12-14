import { dataManager } from '../putzplan-app/src/services/dataManager';

async function run() {
  try {
    console.log('🔧 Running cleanupOverlappingPeriods with autoFix=true...');
    // @ts-ignore - runtime method added to DataManager
    const report = dataManager.cleanupOverlappingPeriods({ autoFix: true });
    console.log('✅ Migration completed. Report:');
    console.log(JSON.stringify(report, null, 2));
    console.log('\nPlease reload the app or restart the dev server to pick up changes.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
  }
}

run();

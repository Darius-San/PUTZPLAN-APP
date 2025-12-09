/**
 * @jest-environment jsdom
 */
import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Real Analytics Data Integration Test', () => {
  beforeEach(() => {
    dataManager.clearAllData();
  });

  afterEach(() => {
    dataManager.clearAllData();
  });

  test('should verify period created like in screenshot appears in analytics data structures', () => {
    // 1. Setup WG like in real app
    const wg = dataManager.createWG('Real Integration Test WG');
    dataManager.setCurrentWG(wg.id);
    console.log('✅ Created WG:', wg.id);

    // 2. Create the EXACT period from the screenshot: "19. Nov. 2025 - 16. Dez. 2025"
    console.log('🧪 Creating period: 19 Nov 2025 - 16 Dec 2025...');
    const periodCreated = dataManager.setCustomPeriod(
      new Date('2025-11-19'), // Wed Nov 19 2025
      new Date('2025-12-16'), // Tue Dec 16 2025  
      false
    );
    expect(periodCreated).toBeTruthy();
    console.log('✅ Period created successfully');

    // 3. Verify current period state
    const state = dataManager.getState();
    console.log('📊 Current period ID:', state.currentPeriod?.id);
    console.log('📊 Current period start:', state.currentPeriod?.start);
    console.log('📊 Current period end:', state.currentPeriod?.end);
    
    expect(state.currentPeriod).toBeDefined();
    expect(state.currentPeriod.start).toBeDefined();
    expect(state.currentPeriod.end).toBeDefined();

    // 4. Check if period appears in WG.periods (for Analytics)
    const currentWG = dataManager.getCurrentWG();
    console.log('📊 WG periods count:', currentWG?.periods?.length || 0);
    
    if (currentWG?.periods?.length > 0) {
      currentWG.periods.forEach((period, index) => {
        console.log(`📊 WG Period ${index}:`, {
          id: period.id,
          name: period.name,
          startDate: period.startDate,
          endDate: period.endDate,
          isActive: period.isActive
        });
      });
    }

    expect(currentWG).toBeDefined();
    expect(currentWG.periods).toBeDefined();
    expect(currentWG.periods.length).toBeGreaterThan(0);

    // 5. Check getHistoricalPeriods() used by Analytics
    const historicalPeriods = dataManager.getHistoricalPeriods();
    console.log('📊 getHistoricalPeriods() count:', historicalPeriods.length);
    
    historicalPeriods.forEach((period, index) => {
      console.log(`📊 Historical Period ${index}:`, {
        id: period.id,
        name: period.name,
        startDate: period.startDate,
        endDate: period.endDate,
        isActive: period.isActive,
        __LIVE_PERIOD__: period.__LIVE_PERIOD__
      });
    });

    expect(historicalPeriods.length).toBeGreaterThan(0);

    // 6. Verify the period contains the expected dates
    const targetPeriod = historicalPeriods.find(p => p.__LIVE_PERIOD__);
    expect(targetPeriod).toBeDefined();
    
    const startDate = new Date(targetPeriod.startDate);
    const endDate = new Date(targetPeriod.endDate);
    
    console.log('🗓️ Found period start:', startDate.toLocaleDateString('de-DE'));
    console.log('🗓️ Found period end:', endDate.toLocaleDateString('de-DE'));
    
    expect(startDate.getDate()).toBe(19);
    expect(startDate.getMonth()).toBe(10); // November = month 10
    expect(startDate.getFullYear()).toBe(2025);
    
    expect(endDate.getDate()).toBe(16);
    expect(endDate.getMonth()).toBe(11); // December = month 11
    expect(endDate.getFullYear()).toBe(2025);

    console.log('✅ Period data correctly stored and accessible for Analytics!');
  });

  test('should verify period persistence after app restart simulation', () => {
    // Create period
    const wg = dataManager.createWG('Persistence Test WG');
    dataManager.setCurrentWG(wg.id);
    
    dataManager.setCustomPeriod(new Date('2025-11-19'), new Date('2025-12-16'), false);
    
    // Get data before restart
    const periodsBeforeRestart = dataManager.getHistoricalPeriods();
    console.log('📊 Periods before restart:', periodsBeforeRestart.length);
    
    // Simulate restart
    dataManager.clearAllData();
    
    // Check data after restart
    const periodsAfterRestart = dataManager.getHistoricalPeriods();
    console.log('📊 Periods after restart:', periodsAfterRestart.length);
    
    expect(periodsAfterRestart.length).toBe(periodsBeforeRestart.length);
    
    if (periodsAfterRestart.length > 0) {
      const restoredPeriod = periodsAfterRestart[0];
      console.log('📊 Restored period:', {
        id: restoredPeriod.id,
        startDate: restoredPeriod.startDate,
        endDate: restoredPeriod.endDate
      });
    }
    
    console.log('✅ Period persistence verified!');
  });

  test('should check why period might not show in Analytics UI', () => {
    // Simulate exactly what happens in the UI flow
    console.log('🔍 DEBUGGING: Simulating real UI flow...');
    
    // 1. User creates WG (or loads existing)
    const wg = dataManager.createWG('Debug WG');
    dataManager.setCurrentWG(wg.id);
    console.log('1️⃣ WG created and set as current');
    
    // 2. User goes to Period Settings and creates period
    const created = dataManager.setCustomPeriod(new Date('2025-11-19'), new Date('2025-12-16'), false);
    console.log('2️⃣ Period creation result:', created);
    
    // 3. User navigates to Analytics page - what does usePutzplanStore return?
    const state = dataManager.getState();
    const currentWG = dataManager.getCurrentWG();
    const historicalPeriods = dataManager.getHistoricalPeriods();
    
    console.log('3️⃣ Analytics page data:');
    console.log('   - state.currentPeriod:', !!state.currentPeriod);
    console.log('   - currentWG exists:', !!currentWG);
    console.log('   - currentWG.periods count:', currentWG?.periods?.length || 0);
    console.log('   - getHistoricalPeriods count:', historicalPeriods.length);
    console.log('   - currentWG.memberIds:', currentWG?.memberIds?.length || 0);
    
    // 4. Check if Analytics component would find any periods
    const allPeriods = [
      ...(state.currentPeriod ? [state.currentPeriod] : []),
      ...historicalPeriods
    ];
    
    console.log('4️⃣ Total periods Analytics would see:', allPeriods.length);
    
    // 5. Check specific Analytics filtering logic
    if (currentWG) {
      const executions = Object.values(state.executions || {}).filter((e: any) => {
        const task = state.tasks[e.taskId];
        return task && task.wgId === currentWG.id;
      });
      console.log('5️⃣ Executions for this WG:', executions.length);
      
      const users = currentWG.memberIds?.map((id: string) => state.users[id]).filter(Boolean) || [];
      console.log('5️⃣ WG users:', users.length);
    }
    
    expect(allPeriods.length).toBeGreaterThan(0);
    
    console.log('🔍 DEBUGGING COMPLETE - Check logs above for issues');
  });
});
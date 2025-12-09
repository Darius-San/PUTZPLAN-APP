import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Data Persistence Fix', () => {
  let originalLocalStorage: Storage;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    // Reset mock storage
    mockStorage = {};
    
    // Mock localStorage
    originalLocalStorage = global.localStorage;
    
    const mockStorageImpl = {
      getItem: vi.fn((key: string) => {
        console.log(`[MOCK] localStorage.getItem('${key}') called, value:`, mockStorage[key] || 'null');
        return mockStorage[key] || null;
      }),
      setItem: vi.fn((key: string, value: string) => { 
        console.log(`[MOCK] localStorage.setItem('${key}', ${value.length} chars) called`);
        mockStorage[key] = value; 
      }),
      removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
      clear: vi.fn(() => { mockStorage = {}; }),
      key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
      get length() { return Object.keys(mockStorage).length; }
    } as Storage;
    
    global.localStorage = mockStorageImpl;
    
    // Reset dataManager and override its localStorage
    dataManager._TEST_reset();
    (dataManager as any)._TEST_setLocalStorage(mockStorageImpl);
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  it('CRITICAL: Immediate persistence to localStorage works', () => {
    console.log('🧪 [FIX TEST] Testing immediate data persistence...');
    
    // Create test data
    const user = dataManager.createUser({
      name: 'Persistence Test User',
      avatar: '💾',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    // Check if data was immediately saved to localStorage
    const storedData = mockStorage['putzplan-data'];
    console.log('📦 [FIX TEST] localStorage content exists:', !!storedData);
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      console.log('📦 [FIX TEST] Parsed data has user:', !!parsed.state?.users?.[user.id]);
      expect(parsed.state.users[user.id]).toBeTruthy();
      expect(parsed.state.users[user.id].name).toBe('Persistence Test User');
    } else {
      console.error('❌ [FIX TEST] No data found in localStorage!');
      expect(storedData).toBeTruthy();
    }
  });

  it('CRITICAL: Manual save forces localStorage update', () => {
    console.log('🧪 [FIX TEST] Testing manual save to localStorage...');
    
    const user = dataManager.createUser({
      name: 'Manual Save Test',
      avatar: '🔧',
      targetMonthlyPoints: 100,
      isActive: true
    });
    
    // Force manual save
    (dataManager as any).saveToStorage();
    
    const storedData = mockStorage['putzplan-data'];
    expect(storedData).toBeTruthy();
    
    if (storedData) {
      const parsed = JSON.parse(storedData);
      expect(parsed.state.users[user.id]).toBeTruthy();
      console.log('✅ [FIX TEST] Manual save works correctly');
    }
  });

  it('CRITICAL: Load from localStorage works on constructor', () => {
    console.log('🧪 [FIX TEST] Testing load from localStorage...');
    
    // Manually put test data in localStorage
    const testState = {
      users: {
        'test-user-id': {
          id: 'test-user-id',
          name: 'Pre-loaded User',
          avatar: '🔄',
          joinedAt: new Date().toISOString(),
          isActive: true,
          currentMonthPoints: 0,
          targetMonthlyPoints: 100,
          totalCompletedTasks: 0
        }
      },
      wgs: {},
      tasks: {},
      executions: {},
      ratings: {},
      notifications: {},
      monthlyStats: {},
      taskSuggestions: [],
      isLoading: false,
      currentUser: null,
      currentWG: null,
      absences: {},
      temporaryResidents: {},
      postExecutionRatings: {},
      debugMode: false
    };
    
    const testData = {
      version: '1.0',
      state: testState,
      savedAt: new Date().toISOString()
    };
    
    mockStorage['putzplan-data'] = JSON.stringify(testData);
    
    // Create new DataManager instance (simulates app restart)
    const newDataManager = new (dataManager.constructor as any)();
    const loadedState = newDataManager.getState();
    
    console.log('📦 [FIX TEST] Loaded users:', Object.keys(loadedState.users));
    expect(loadedState.users['test-user-id']).toBeTruthy();
    expect(loadedState.users['test-user-id'].name).toBe('Pre-loaded User');
    console.log('✅ [FIX TEST] Load from localStorage works correctly');
  });
});
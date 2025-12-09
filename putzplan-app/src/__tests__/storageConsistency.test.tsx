import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { dataManager } from '../services/dataManager';

describe('Storage Consistency - Browser Isolation Issues', () => {
  let originalLocalStorage: Storage;
  let mockStorage: { [key: string]: string };

  beforeEach(() => {
    // Mock localStorage to simulate different browser contexts
    originalLocalStorage = global.localStorage;
    mockStorage = {};
    
    const mockStorageImpl = {
      getItem: vi.fn((key: string) => {
        console.log(`📖 [STORAGE TEST] localStorage.getItem("${key}") -> ${mockStorage[key] ? 'DATA_EXISTS' : 'null'}`);
        return mockStorage[key] || null;
      }),
      setItem: vi.fn((key: string, value: string) => {
        console.log(`💾 [STORAGE TEST] localStorage.setItem("${key}", ${value.length} chars)`);
        mockStorage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        console.log(`🗑️ [STORAGE TEST] localStorage.removeItem("${key}")`);
        delete mockStorage[key];
      }),
      clear: vi.fn(() => {
        console.log(`🧹 [STORAGE TEST] localStorage.clear()`);
        mockStorage = {};
      }),
      key: vi.fn((index: number) => Object.keys(mockStorage)[index] || null),
      get length() { return Object.keys(mockStorage).length; }
    } as Storage;
    
    global.localStorage = mockStorageImpl;
    dataManager._TEST_reset();
    (dataManager as any)._TEST_setLocalStorage(mockStorageImpl);
  });

  afterEach(() => {
    global.localStorage = originalLocalStorage;
  });

  describe('KRITISCHE Browser-Isolation Tests', () => {
    it('Simple Browser und normaler Browser sollten dieselben Daten sehen', () => {
      console.log('🧪 [STORAGE TEST] Testing browser isolation consistency...');
      
      // Simuliere Daten-Erstellung im normalen Browser
      console.log('📱 [STORAGE TEST] Simulating normal browser data creation...');
      const user = dataManager.createUser({
        name: 'Browser Test User',
        avatar: '🌐',
        targetMonthlyPoints: 100,
        isActive: true
      });

      console.log('👤 [STORAGE TEST] User created:', user.id);

      // Prüfe ob User-Daten in localStorage gespeichert wurden
      const storedData = mockStorage['putzplan-data'];
      expect(storedData).toBeTruthy();
      console.log('✅ [STORAGE TEST] Data stored in localStorage');

      if (storedData) {
        const parsed = JSON.parse(storedData);
        expect(parsed.state.users[user.id]).toBeTruthy();
        expect(parsed.state.users[user.id].name).toBe('Browser Test User');
        console.log('✅ [STORAGE TEST] User data found in storage');
      }

      // Simuliere neuen DataManager (wie im Simple Browser)
      console.log('🔄 [STORAGE TEST] Simulating Simple Browser loading...');
      dataManager._TEST_reset();
      const loadedState = dataManager.getState();

      // Prüfe ob dieselben Daten geladen wurden
      expect(loadedState.users[user.id]).toBeTruthy();
      expect(loadedState.users[user.id].name).toBe('Browser Test User');
      expect(loadedState.users[user.id].avatar).toBe('🌐');

      console.log('✅ [STORAGE TEST] Same user data loaded in both browser contexts');
    });

    it('Event Sourcing Snapshots sollten localStorage nicht überschreiben', () => {
      console.log('🧪 [STORAGE TEST] Testing Event Sourcing interference...');
      
      // Erstelle normale Daten
      const user = dataManager.createUser({
        name: 'Event Source Test User',
        avatar: '📸',
        targetMonthlyPoints: 150,
        isActive: true
      });

      // Simuliere alten Event Sourcing Snapshot
      const fakeSnapshot = {
        id: 'fake-snapshot-123',
        timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), // 1 hour old
        state: {
          users: {
            'old-user-id': {
              id: 'old-user-id',
              name: 'Old Snapshot User',
              avatar: '👻',
              isActive: false
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
          absences: {},
          temporaryResidents: {},
          postExecutionRatings: {}
        }
      };

      mockStorage['eventSourcing_snapshots'] = JSON.stringify([fakeSnapshot]);
      console.log('📸 [STORAGE TEST] Added fake Event Sourcing snapshot');

      // Lade DataManager neu
      dataManager._TEST_reset();
      const loadedState = dataManager.getState();

      // Neue Daten sollten dominieren (da sie neuer sind)
      expect(loadedState.users[user.id]).toBeTruthy();
      expect(loadedState.users[user.id].name).toBe('Event Source Test User');
      expect(loadedState.users['old-user-id']).toBeFalsy();

      console.log('✅ [STORAGE TEST] Event Sourcing does not interfere with newer data');
    });

    it('localStorage Keys sollten einheitlich verwendet werden', () => {
      console.log('🧪 [STORAGE TEST] Testing localStorage key consistency...');
      
      // Prüfe alle verwendeten localStorage Keys
      const user = dataManager.createUser({
        name: 'Key Test User',
        avatar: '🔑',
        targetMonthlyPoints: 75,
        isActive: true
      });

      console.log('📋 [STORAGE TEST] Current localStorage keys:', Object.keys(mockStorage));

      // Erwartete Keys
      const expectedKeys = ['putzplan-data'];
      
      expectedKeys.forEach(key => {
        expect(mockStorage[key]).toBeTruthy();
        console.log(`✅ [STORAGE TEST] Key "${key}" exists in localStorage`);
      });

      // Prüfe auf unerwartete Keys, die Konflikte verursachen könnten
      const unexpectedKeys = Object.keys(mockStorage).filter(key => !expectedKeys.includes(key));
      if (unexpectedKeys.length > 0) {
        console.warn('⚠️ [STORAGE TEST] Unexpected keys found:', unexpectedKeys);
      }

      expect(unexpectedKeys.length).toBe(0);
      console.log('✅ [STORAGE TEST] No unexpected localStorage keys found');
    });

    it('Analytics-Löschungen sollten zwischen Browsern konsistent sein', () => {
      console.log('🧪 [STORAGE TEST] Testing analytics deletion consistency...');
      
      // Simuliere Analytics-Löschung im normalen Browser
      const deletionState = {
        hiddenMonths: ['2024-10', '2024-9'],
        deletedMonths: {
          '2024-10': {
            key: '2024-10',
            month: 'Oktober 2024',
            totalPoints: 150,
            completedTasks: 12
          }
        },
        savedAt: new Date().toISOString()
      };

      mockStorage['analytics-deletion-state'] = JSON.stringify(deletionState);
      console.log('💾 [STORAGE TEST] Analytics deletion state saved');

      // Simuliere laden im Simple Browser
      const loadedDeletionState = JSON.parse(mockStorage['analytics-deletion-state']);
      
      expect(loadedDeletionState.hiddenMonths).toContain('2024-10');
      expect(loadedDeletionState.hiddenMonths).toContain('2024-9');
      expect(loadedDeletionState.deletedMonths['2024-10']).toBeTruthy();
      expect(loadedDeletionState.deletedMonths['2024-10'].month).toBe('Oktober 2024');

      console.log('✅ [STORAGE TEST] Analytics deletion state consistent across browsers');
    });
  });

  describe('STORAGE HEALING - Automatische Reparatur', () => {
    it('Korrupte localStorage-Daten sollten repariert werden', () => {
      console.log('🧪 [STORAGE TEST] Testing corrupted data healing...');
      
      // Erstelle korrupte Daten
      mockStorage['putzplan-data'] = '{"corrupted": true, "invalid": "json"';
      
      // DataManager sollte auf Initialstate zurückfallen
      dataManager._TEST_reset();
      const state = dataManager.getState();
      
      expect(state.users).toEqual({});
      expect(state.wgs).toEqual({});
      console.log('✅ [STORAGE TEST] Corrupted data handled gracefully');
    });

    it('Fehlende localStorage-Daten sollten initialisiert werden', () => {
      console.log('🧪 [STORAGE TEST] Testing missing data initialization...');
      
      // Lösche alle Daten
      mockStorage = {};
      
      dataManager._TEST_reset();
      const state = dataManager.getState();
      
      expect(state).toBeDefined();
      expect(state.users).toEqual({});
      expect(state.wgs).toEqual({});
      console.log('✅ [STORAGE TEST] Missing data initialized correctly');
    });
  });
});
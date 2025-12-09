import React from 'react';
import '@testing-library/jest-dom';
import { beforeEach, vi } from 'vitest';

// Force localStorage mode for tests by mocking appConfig early
vi.mock('./src/config/appConfig', () => ({
  APP_CONFIG: {
    STORAGE_MODE: 'localStorage',
    API_BASE_URL: '',
    DEBUG: false,
    APP_VERSION: '1.0.0-test',
    APP_NAME: 'Putzplan App Test'
  }
}));

// Mock server-related modules for tests
vi.mock('./src/services/serverDataManager', () => ({
  default: {
    getState: () => ({}),
    setDebugMode: vi.fn(),
    getDebugMode: () => false
  }
}));

vi.mock('./src/services/serverSettingsManager', () => ({
  default: {
    getSettings: () => ({}),
    updateSettings: vi.fn()
  }
}));

// Provide a minimal localStorage polyfill if jsdom not yet attached or environment fallback occurs
if (typeof (globalThis as any).localStorage === 'undefined') {
  let store: Record<string,string> = {};
  (globalThis as any).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
    clear: () => { store = {}; },
    key: (i: number) => Object.keys(store)[i] || null,
    get length() { return Object.keys(store).length; }
  } as Storage;
}

// Helper to clear localStorage between tests for deterministic seed
beforeEach(() => {
  (globalThis as any).localStorage.clear();
  // Provide a default stub for window.confirm (jsdom not implemented)
  if (typeof window !== 'undefined') {
    window.confirm = () => true;
    // Stub window.alert (jsdom not implemented) to avoid noisy test errors
    window.alert = () => {};
  }
});

// Global mock for framer-motion to avoid React warnings about motion props
vi.mock('framer-motion', () => ({
  AnimatePresence: (props: any) => React.createElement('div', null, props?.children),
  motion: {
    div: (props: any) => {
      const { whileHover, whileTap, children, ...rest } = props || {};
      return React.createElement('div', rest, children as any);
    },
    button: (props: any) => {
      const { whileHover, whileTap, children, ...rest } = props || {};
      return React.createElement('button', rest, children as any);
    }
  }
}));

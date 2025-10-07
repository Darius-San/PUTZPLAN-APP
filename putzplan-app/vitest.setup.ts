import '@testing-library/jest-dom';
import { beforeEach } from 'vitest';

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
});

import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';

const testLocalStorage = (() => {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear() {
      store = {};
    },
    getItem(key: string) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    removeItem(key: string) {
      delete store[key];
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
    },
  } satisfies Storage;
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: testLocalStorage,
  configurable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: testLocalStorage,
  configurable: true,
});

afterEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
});

import { vi } from 'vitest';

const noop = () => {};

Object.defineProperty(window, 'scrollTo', { value: noop, writable: true });

const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn()
}));

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // Deprecated
    removeListener: vi.fn(), // Deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

const setup = () => {
  process.env.TZ = 'Pacific/Auckland';

  class LocalStorageMock {
    private store: Record<string, string> = {};

    clear() {
      this.store = {};
    }

    getItem(key: string) {
      return this.store[key] || null;
    }

    setItem(key: string, value: string) {
      this.store[key] = String(value);
    }

    removeItem(key: string) {
      delete this.store[key];
    }

    get length() {
      return Object.keys(this.store).length;
    }

    key(index: number) {
      const keys = Object.keys(this.store);
      return keys[index] || null;
    }
  }

  Object.defineProperty(window, 'localStorage', {
    value: new LocalStorageMock(),
    writable: true,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: new LocalStorageMock(),
    writable: true,
  });
};

setup();

// @ts-check
/**
 * Lightweight browser DOM & environment emulation for Node.js 24 test runner.
 * Provides simulated DOM nodes, localStorage, Canvas, FileReader, URL, and Network spying.
 */

export class MockStorage {
  constructor(shouldThrowQuota = false, disabled = false) {
    this._data = new Map();
    this.shouldThrowQuota = shouldThrowQuota;
    this.disabled = disabled;
  }

  getItem(key) {
    if (this.disabled) throw new Error('SecurityError: The operation is insecure.');
    return this._data.has(key) ? this._data.get(key) : null;
  }

  setItem(key, value) {
    if (this.disabled) throw new Error('SecurityError: The operation is insecure.');
    if (this.shouldThrowQuota) {
      const err = new Error('QuotaExceededError: Dom storage quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this._data.set(String(key), String(value));
  }

  removeItem(key) {
    if (this.disabled) throw new Error('SecurityError: The operation is insecure.');
    this._data.delete(key);
  }

  clear() {
    if (this.disabled) throw new Error('SecurityError: The operation is insecure.');
    this._data.clear();
  }

  get length() {
    return this._data.size;
  }

  key(idx) {
    return Array.from(this._data.keys())[idx] || null;
  }
}

export class MockCanvasRenderingContext2D {
  constructor(canvas) {
    this.canvas = canvas;
    this.fillStyle = '#000000';
    this.strokeStyle = '#000000';
    this.lineWidth = 1;
    this.font = '10px sans-serif';
    this._operations = [];
  }

  drawImage(img, ...args) {
    this._operations.push({ op: 'drawImage', img, args });
  }

  fillRect(x, y, w, h) {
    this._operations.push({ op: 'fillRect', x, y, w, h });
  }

  strokeRect(x, y, w, h) {
    this._operations.push({ op: 'strokeRect', x, y, w, h });
  }

  clearRect(x, y, w, h) {
    this._operations.push({ op: 'clearRect', x, y, w, h });
  }

  fillText(text, x, y) {
    this._operations.push({ op: 'fillText', text, x, y });
  }

  measureText(text) {
    return { width: text.length * 8, actualBoundingBoxAscent: 10, actualBoundingBoxDescent: 2 };
  }

  getImageData(sx, sy, sw, sh) {
    const data = new Uint8ClampedArray(sw * sh * 4);
    // Fill with simulated pixel data
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 120;     // R
      data[i + 1] = 150; // G
      data[i + 2] = 200; // B
      data[i + 3] = 255; // A
    }
    return { data, width: sw, height: sh };
  }

  putImageData(imageData, dx, dy) {
    this._operations.push({ op: 'putImageData', imageData, dx, dy });
  }

  save() { this._operations.push({ op: 'save' }); }
  restore() { this._operations.push({ op: 'restore' }); }
  scale(x, y) { this._operations.push({ op: 'scale', x, y }); }
  rotate(angle) { this._operations.push({ op: 'rotate', angle }); }
  translate(x, y) { this._operations.push({ op: 'translate', x, y }); }
}

export class MockCanvas {
  constructor(width = 300, height = 150) {
    this.width = width;
    this.height = height;
    this._ctx = new MockCanvasRenderingContext2D(this);
  }

  getContext(type) {
    if (type === '2d') return this._ctx;
    return null;
  }

  toBlob(callback, type = 'image/png') {
    // Generate synthetic image blob with specified MIME type
    const syntheticBuffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const blob = new Blob([syntheticBuffer], { type });
    setTimeout(() => callback(blob), 10);
  }

  toDataURL(type = 'image/png') {
    return `data:${type};base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==`;
  }
}

export class MockFileReader {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = null;
  }

  readAsDataURL(blob) {
    setTimeout(() => {
      this.result = `data:${blob.type || 'application/octet-stream'};base64,VEVTVERBVEE=`;
      if (this.onload) this.onload({ target: this });
    }, 5);
  }

  readAsArrayBuffer(blob) {
    setTimeout(async () => {
      this.result = await blob.arrayBuffer();
      if (this.onload) this.onload({ target: this });
    }, 5);
  }

  readAsText(blob) {
    setTimeout(async () => {
      this.result = await blob.text();
      if (this.onload) this.onload({ target: this });
    }, 5);
  }
}

export class NetworkSpy {
  constructor() {
    this.calls = [];
  }

  record(type, url, options) {
    this.calls.push({ type, url, options, timestamp: Date.now() });
  }

  reset() {
    this.calls = [];
  }

  get egressCount() {
    return this.calls.length;
  }
}

/**
 * Initializes a mock browser environment in the current Node process.
 */
export function setupMockBrowserEnvironment(options = {}) {
  const {
    quotaExceeded = false,
    storageDisabled = false,
    initialPathname = '/',
  } = options;

  const storage = new MockStorage(quotaExceeded, storageDisabled);
  const networkSpy = new NetworkSpy();
  const createdUrls = new Set();
  const revokedUrls = new Set();

  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const originalLocalStorage = globalThis.localStorage;

  // Setup DOM globals
  const mockWindow = {
    location: {
      pathname: initialPathname,
      search: '',
      href: `http://localhost:3000${initialPathname}`,
      assign: (url) => { mockWindow.location.href = url; },
      replace: (url) => { mockWindow.location.href = url; },
    },
    localStorage: storage,
    matchMedia: (query) => ({
      matches: query.includes('dark') ? false : false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
    requestAnimationFrame: (cb) => setTimeout(cb, 16),
    cancelAnimationFrame: (id) => clearTimeout(id),
  };

  const mockDocument = {
    documentElement: {
      setAttribute: () => {},
      getAttribute: () => null,
      classList: {
        add: () => {},
        remove: () => {},
        contains: () => false,
        toggle: () => {},
      },
      style: {},
    },
    body: {
      appendChild: (el) => el,
      removeChild: (el) => el,
      style: {},
    },
    createElement: (tag) => {
      if (tag === 'canvas') return new MockCanvas();
      const el = {
        tagName: tag.toUpperCase(),
        style: {},
        classList: {
          classes: new Set(),
          add(c) { this.classes.add(c); },
          remove(c) { this.classes.delete(c); },
          contains(c) { return this.classes.has(c); },
        },
        setAttribute: (k, v) => { el[k] = v; },
        getAttribute: (k) => el[k] || null,
        appendChild: (child) => child,
        removeChild: (child) => child,
        addEventListener: () => {},
        removeEventListener: () => {},
        click: () => {},
      };
      return el;
    },
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  // URL.createObjectURL mock
  const originalCreateObjectURL = globalThis.URL.createObjectURL;
  const originalRevokeObjectURL = globalThis.URL.revokeObjectURL;

  let urlCounter = 0;
  globalThis.URL.createObjectURL = () => {
    urlCounter++;
    const url = `blob:http://localhost:3000/${urlCounter}-${Date.now()}`;
    createdUrls.add(url);
    return url;
  };

  globalThis.URL.revokeObjectURL = (url) => {
    revokedUrls.add(url);
  };

  // Network spies
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    networkSpy.record('fetch', String(url), opts);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };

  // Assign global window and document
  globalThis.window = mockWindow;
  globalThis.document = mockDocument;
  globalThis.localStorage = storage;
  globalThis.FileReader = MockFileReader;
  globalThis.HTMLCanvasElement = MockCanvas;
  globalThis.OffscreenCanvas = MockCanvas;

  return {
    window: mockWindow,
    document: mockDocument,
    localStorage: storage,
    networkSpy,
    createdUrls,
    revokedUrls,
    cleanup: () => {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
      globalThis.localStorage = originalLocalStorage;
      globalThis.URL.createObjectURL = originalCreateObjectURL;
      globalThis.URL.revokeObjectURL = originalRevokeObjectURL;
      globalThis.fetch = originalFetch;
    },
  };
}

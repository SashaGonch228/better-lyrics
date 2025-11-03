import chrome from 'sinon-chrome';
import type { Lyric, LyricPart, LyricSourceResult, ProviderParameters, SourceMapType } from '@/modules/lyrics/providers/shared';

/**
 * Mock factory for creating test ProviderParameters
 */
export function createMockProviderParameters(overrides?: Partial<ProviderParameters>): ProviderParameters {
  return {
    song: 'Test Song',
    artist: 'Test Artist',
    duration: 180,
    videoId: 'test-video-id',
    audioTrackData: {
      captionTracks: []
    } as any,
    album: 'Test Album',
    sourceMap: {} as SourceMapType,
    alwaysFetchMetadata: false,
    signal: new AbortController().signal,
    ...overrides
  };
}

/**
 * Mock factory for creating test Lyric objects
 */
export function createMockLyric(overrides?: Partial<Lyric>): Lyric {
  return {
    startTimeMs: 0,
    words: 'Test lyric line',
    durationMs: 5000,
    ...overrides
  };
}

/**
 * Mock factory for creating test LyricPart objects (for rich sync)
 */
export function createMockLyricPart(overrides?: Partial<LyricPart>): LyricPart {
  return {
    startTimeMs: 0,
    words: 'Test',
    durationMs: 1000,
    isBackground: false,
    ...overrides
  };
}

/**
 * Mock factory for creating test LyricSourceResult
 */
export function createMockLyricSourceResult(overrides?: Partial<LyricSourceResult>): LyricSourceResult {
  return {
    lyrics: [createMockLyric()],
    language: 'en',
    source: 'Test Source',
    sourceHref: 'https://example.com',
    cacheAllowed: true,
    ...overrides
  };
}

/**
 * Setup chrome.storage mocks with test data
 */
export function mockChromeStorage(data: Record<string, any> = {}) {
  const storageData = { ...data };

  chrome.storage.sync.get.callsFake((keys: any, callback?: (items: any) => void) => {
    const result: Record<string, any> = {};

    if (keys === null || keys === undefined) {
      Object.assign(result, storageData);
    } else if (typeof keys === 'string') {
      result[keys] = storageData[keys];
    } else if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = storageData[key];
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = storageData[key] !== undefined ? storageData[key] : keys[key];
      });
    }

    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  });

  chrome.storage.sync.set.callsFake((items: any, callback?: () => void) => {
    Object.assign(storageData, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.local.get.callsFake((keys: any, callback?: (items: any) => void) => {
    const result: Record<string, any> = {};

    if (keys === null || keys === undefined) {
      Object.assign(result, storageData);
    } else if (typeof keys === 'string') {
      result[keys] = storageData[keys];
    } else if (Array.isArray(keys)) {
      keys.forEach(key => {
        result[key] = storageData[key];
      });
    } else if (typeof keys === 'object') {
      Object.keys(keys).forEach(key => {
        result[key] = storageData[key] !== undefined ? storageData[key] : keys[key];
      });
    }

    if (callback) {
      callback(result);
    }
    return Promise.resolve(result);
  });

  chrome.storage.local.set.callsFake((items: any, callback?: () => void) => {
    Object.assign(storageData, items);
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  chrome.storage.local.remove.callsFake((keys: string | string[], callback?: () => void) => {
    const keysArray = Array.isArray(keys) ? keys : [keys];
    keysArray.forEach(key => {
      delete storageData[key];
    });
    if (callback) {
      callback();
    }
    return Promise.resolve();
  });

  return storageData;
}

/**
 * Create a mock DOM element with given properties
 */
export function createMockElement(tag: string, attributes: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag);
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
  return element;
}

/**
 * Wait for async operations to complete
 */
export function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

/**
 * Create a mock fetch response
 */
export function createMockFetchResponse(data: any, options: Partial<Response> = {}): Response {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => data,
    text: async () => JSON.stringify(data),
    ...options
  } as Response;
}

/**
 * Mock fetch globally
 */
export function mockFetch(responses: Map<string, any> = new Map()) {
  const originalFetch = global.fetch;

  global.fetch = jest.fn((url: string | URL | Request) => {
    const urlString = typeof url === 'string' ? url : url.toString();

    for (const [pattern, response] of responses.entries()) {
      if (urlString.includes(pattern)) {
        return Promise.resolve(createMockFetchResponse(response));
      }
    }

    return Promise.reject(new Error(`No mock response for ${urlString}`));
  }) as any;

  return () => {
    global.fetch = originalFetch;
  };
}

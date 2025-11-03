import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import lyricLib from '@/modules/lyrics/providers/lrclib';
import { createMockProviderParameters, mockFetch } from '@tests/test-utils';
import type { SourceMapType } from '@/modules/lyrics/providers/shared';

describe('LRCLib Provider', () => {
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = undefined;
    }
  });

  const createSourceMap = () => {
    const map: any = {
      'lrclib-synced': {
        filled: false,
        lyricSourceResult: null,
        lyricSourceFiller: lyricLib
      },
      'lrclib-plain': {
        filled: false,
        lyricSourceResult: null,
        lyricSourceFiller: lyricLib
      }
    };
    return map as SourceMapType;
  };

  it('should fetch and parse synced lyrics from LRCLib', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]First line\n[00:15.00]Second line',
      plainLyrics: 'First line\nSecond line',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].filled).toBe(true);
    expect(sourceMap['lrclib-synced'].lyricSourceResult).not.toBeNull();
    expect(sourceMap['lrclib-synced'].lyricSourceResult?.lyrics).toHaveLength(2);
    expect(sourceMap['lrclib-synced'].lyricSourceResult?.source).toBe('LRCLib');
    expect(sourceMap['lrclib-synced'].lyricSourceResult?.sourceHref).toBe('https://lrclib.net');
  });

  it('should fetch and parse plain lyrics from LRCLib', async () => {
    const mockResponse = {
      plainLyrics: 'First line\nSecond line\nThird line',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-plain'].filled).toBe(true);
    expect(sourceMap['lrclib-plain'].lyricSourceResult).not.toBeNull();
    expect(sourceMap['lrclib-plain'].lyricSourceResult?.lyrics).toHaveLength(3);
    expect(sourceMap['lrclib-plain'].lyricSourceResult?.cacheAllowed).toBe(false);
  });

  it('should fetch both synced and plain lyrics', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Synced line',
      plainLyrics: 'Plain line',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].lyricSourceResult).not.toBeNull();
    expect(sourceMap['lrclib-plain'].lyricSourceResult).not.toBeNull();
  });

  it('should include album in request when provided', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      album: 'Test Album',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchCall).toContain('album_name=Test+Album');
  });

  it('should handle missing synced lyrics gracefully', async () => {
    const mockResponse = {
      plainLyrics: 'Only plain lyrics',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].lyricSourceResult).toBeNull();
    expect(sourceMap['lrclib-plain'].lyricSourceResult).not.toBeNull();
  });

  it('should handle missing plain lyrics gracefully', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Only synced lyrics',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].lyricSourceResult).not.toBeNull();
    expect(sourceMap['lrclib-plain'].lyricSourceResult).toBeNull();
  });

  it('should handle HTTP errors', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        json: () => Promise.resolve({})
      } as Response)
    ) as any;

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].filled).toBe(true);
    expect(sourceMap['lrclib-plain'].filled).toBe(true);
    expect(sourceMap['lrclib-synced'].lyricSourceResult).toBeNull();
    expect(sourceMap['lrclib-plain'].lyricSourceResult).toBeNull();
  });

  it('should mark sources as filled after processing', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    expect(sourceMap['lrclib-synced'].filled).toBe(false);
    expect(sourceMap['lrclib-plain'].filled).toBe(false);

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].filled).toBe(true);
    expect(sourceMap['lrclib-plain'].filled).toBe(true);
  });

  it('should include LRCLib client header in request', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0];
    const options = fetchCall[1] as RequestInit | undefined;
    const headers = options?.headers as Record<string, string> | undefined;
    expect(headers).toBeDefined();
    expect(headers?.['Lrclib-Client']).toBeDefined();
  });

  it('should include request parameters in URL', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchCall).toContain('track_name=Test+Song');
    expect(fetchCall).toContain('artist_name=Test+Artist');
    expect(fetchCall).toContain('duration=180');
  });

  it('should set musicVideoSynced to false', async () => {
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(sourceMap['lrclib-synced'].lyricSourceResult?.musicVideoSynced).toBe(false);
  });

  it('should pass abort signal to fetch', async () => {
    const abortController = new AbortController();
    const mockResponse = {
      syncedLyrics: '[00:10.00]Test',
      duration: 180
    };

    const responses = new Map([['lrclib.net', mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      song: 'Test Song',
      artist: 'Test Artist',
      duration: 180,
      signal: abortController.signal,
      sourceMap: sourceMap as SourceMapType
    });

    await lyricLib(params);

    expect(global.fetch).toHaveBeenCalled();
  });
});

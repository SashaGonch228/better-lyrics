import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import ytLyrics from '@/modules/lyrics/providers/yt';
import * as RequestSniffing from '@modules/lyrics/requestSniffer';
import { createMockProviderParameters } from '@tests/test-utils';
import type { SourceMapType } from '@/modules/lyrics/providers/shared';

jest.mock('@modules/lyrics/requestSniffer', () => ({
  getLyrics: jest.fn(),
  getMatchingSong: jest.fn(),
  getSongAlbum: jest.fn(),
  setupRequestSniffer: jest.fn()
}));

describe('YT Lyrics Provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createSourceMap = () => {
    const map: any = {
      'yt-lyrics': {
        filled: false,
        lyricSourceResult: null,
        lyricSourceFiller: ytLyrics
      }
    };
    return map as SourceMapType;
  };

  it('should fetch and parse YouTube lyrics', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'First line\nSecond line\nThird line',
      sourceText: 'Source: YouTube Music'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].filled).toBe(true);
    expect(sourceMap['yt-lyrics'].lyricSourceResult).not.toBeNull();
    expect(sourceMap['yt-lyrics'].lyricSourceResult?.lyrics).toHaveLength(3);
  });

  it('should format source text correctly', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test lyrics',
      sourceText: 'Source: Test Source'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].lyricSourceResult?.source).toBe('Test Source (via YT)');
  });

  it('should set cacheAllowed to false', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test lyrics',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].lyricSourceResult?.cacheAllowed).toBe(false);
  });

  it('should set musicVideoSynced to false', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test lyrics',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].lyricSourceResult?.musicVideoSynced).toBe(false);
  });

  it('should handle video without lyrics', async () => {
    const mockLyricsObj = {
      hasLyrics: false,
      lyrics: '',
      sourceText: ''
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'no-lyrics-video',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].filled).toBe(true);
    expect(sourceMap['yt-lyrics'].lyricSourceResult).toBeNull();
  });

  it('should mark source as filled after processing', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    expect(sourceMap['yt-lyrics'].filled).toBe(false);

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].filled).toBe(true);
  });

  it('should pass video ID to request sniffer', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'specific-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(RequestSniffing.getLyrics).toHaveBeenCalledWith('specific-video-id');
  });

  it('should preserve original lyrics text', async () => {
    const originalLyrics = 'Line 1\nLine 2\nLine 3';
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: originalLyrics,
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    const result = sourceMap['yt-lyrics'].lyricSourceResult as any;
    expect(result.text).toBe(originalLyrics);
  });

  it('should set empty sourceHref', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'Test',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].lyricSourceResult?.sourceHref).toBe('');
  });

  it('should handle multiline lyrics correctly', async () => {
    const mockLyricsObj = {
      hasLyrics: true,
      lyrics: 'First line\nSecond line\n\nFourth line with blank before',
      sourceText: 'Source: Test'
    };

    (RequestSniffing.getLyrics as jest.MockedFunction<typeof RequestSniffing.getLyrics>).mockResolvedValue(mockLyricsObj as any);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      videoId: 'test-video-id',
      sourceMap: sourceMap as SourceMapType
    });

    await ytLyrics(params);

    expect(sourceMap['yt-lyrics'].lyricSourceResult?.lyrics).toHaveLength(4);
    expect(sourceMap['yt-lyrics'].lyricSourceResult?.lyrics?.[2].words).toBe('');
  });
});

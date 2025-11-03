import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";
import { createMockProviderParameters, mockFetch } from "@tests/test-utils";
import type { SourceMapType } from "@/modules/lyrics/providers/shared";
import { ytCaptions } from "@/modules/lyrics/providers/ytCaptions";

describe("YT Captions Provider", () => {
  let restoreFetch: (() => void) | undefined;
  let consoleLogSpy: ReturnType<typeof jest.spyOn>;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = undefined;
    }
    consoleLogSpy.mockRestore();
  });

  const createSourceMap = () => {
    const map: any = {
      "yt-captions": {
        filled: false,
        lyricSourceResult: null,
        lyricSourceFiller: ytCaptions,
      } as any,
    };
    return map as SourceMapType;
  };

  const createMockCaptionResponse = () => ({
    events: [
      {
        tStartMs: 1000,
        dDurationMs: 2000,
        segs: [{ utf8: "First line" }],
      } as any,
      {
        tStartMs: 3000,
        dDurationMs: 2000,
        segs: [{ utf8: "Second line" }],
      } as any,
    ],
  });

  it("should fetch and parse YouTube captions", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].filled).toBe(true);
    expect(sourceMap["yt-captions"].lyricSourceResult).not.toBeNull();
    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics).toHaveLength(2);
  });

  it("should handle no caption tracks", async () => {
    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [],
      } as any as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult).toBeNull();
  });

  it("should use auto-generated track to determine language", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English (auto-generated)",
            url: "https://www.youtube.com/api/timedtext?auto=1",
          } as any as any,
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult).not.toBeNull();
  });

  it("should skip auto-generated captions when non-auto is available", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English (auto-generated)",
            url: "https://www.youtube.com/api/timedtext?auto=1",
          } as any as any,
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(global.fetch).toHaveBeenCalled();
    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchCall).not.toContain("auto=1");
  });

  it("should return null when only auto-generated captions exist", async () => {
    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English (auto-generated)",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].filled).toBe(true);
    expect(sourceMap["yt-captions"].lyricSourceResult).toBeNull();
  });

  it("should remove music notes from captions", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "♪ Test lyrics ♪" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].words).toBe("Test lyrics");
  });

  it("should replace newlines with spaces", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "First\nSecond" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].words).toBe("First Second");
  });

  it("should handle multiple segments per event", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "First " }, { utf8: "part " }, { utf8: "combined" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].words).toBe("First part combined");
  });

  it("should convert all caps to proper case", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "ALL CAPS LINE" }],
        } as any,
        {
          tStartMs: 3000,
          dDurationMs: 2000,
          segs: [{ utf8: "ANOTHER ALL CAPS" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].words).toBe("All caps line");
    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[1].words).toBe("Another all caps");
  });

  it("should not convert mixed case captions", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 1000,
          dDurationMs: 2000,
          segs: [{ utf8: "Mixed Case Line" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].words).toBe("Mixed Case Line");
  });

  it("should set musicVideoSynced to true", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.musicVideoSynced).toBe(true);
  });

  it("should include language code in result", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "es",
            displayName: "Spanish",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.language).toBe("es");
  });

  it("should preserve timing information", async () => {
    const mockResponse = {
      events: [
        {
          tStartMs: 5000,
          dDurationMs: 3500,
          segs: [{ utf8: "Test" }],
        } as any,
      ],
    };

    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].startTimeMs).toBe(5000);
    expect(sourceMap["yt-captions"].lyricSourceResult?.lyrics?.[0].durationMs).toBe(3500);
  });

  it("should add fmt=json3 parameter to URL", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    const fetchCall = (global.fetch as jest.Mock).mock.calls[0][0] as string;
    expect(fetchCall).toContain("fmt=json3");
  });

  it("should set source as Youtube Captions", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.source).toBe("Youtube Captions");
  });

  it("should set empty sourceHref", async () => {
    const mockResponse = createMockCaptionResponse();
    const responses = new Map([["youtube.com", mockResponse]]);
    restoreFetch = mockFetch(responses);

    const sourceMap = createSourceMap();
    const params = createMockProviderParameters({
      audioTrackData: {
        captionTracks: [
          {
            languageCode: "en",
            displayName: "English",
            url: "https://www.youtube.com/api/timedtext",
          } as any as any,
        ],
      } as any,
      sourceMap: sourceMap as SourceMapType,
    });

    await ytCaptions(params);

    expect(sourceMap["yt-captions"].lyricSourceResult?.sourceHref).toBe("");
  });
});

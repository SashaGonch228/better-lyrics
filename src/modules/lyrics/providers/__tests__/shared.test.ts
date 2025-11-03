import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { mockChromeStorage } from "@tests/test-utils";
import chrome from "sinon-chrome";
import type { ProviderParameters, SourceMapType } from "../shared";
import { getLyrics, initProviders, newSourceMap, providerPriority } from "../shared";

// Mock all provider modules
jest.mock("../blyrics/blyrics", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../cubey", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../lrclib", () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock("../ytCaptions", () => ({
  __esModule: true,
  ytCaptions: jest.fn(),
}));

jest.mock("../yt", () => ({
  __esModule: true,
  default: jest.fn(),
}));

describe("Shared Provider Functions", () => {
  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();
  });

  describe("newSourceMap", () => {
    it("should create a source map with all providers", () => {
      const sourceMap = newSourceMap();

      expect(sourceMap).toBeDefined();
      expect(sourceMap["bLyrics-richsynced"]).toBeDefined();
      expect(sourceMap["bLyrics-synced"]).toBeDefined();
      expect(sourceMap["musixmatch-richsync"]).toBeDefined();
      expect(sourceMap["musixmatch-synced"]).toBeDefined();
      expect(sourceMap["lrclib-synced"]).toBeDefined();
      expect(sourceMap["lrclib-plain"]).toBeDefined();
      expect(sourceMap["yt-captions"]).toBeDefined();
      expect(sourceMap["yt-lyrics"]).toBeDefined();
    });

    it("should initialize all sources as unfilled", () => {
      const sourceMap = newSourceMap();

      Object.values(sourceMap).forEach(source => {
        expect(source.filled).toBe(false);
        expect(source.lyricSourceResult).toBeNull();
        expect(source.lyricSourceFiller).toBeDefined();
      });
    });

    it("should have filler functions for each source", () => {
      const sourceMap = newSourceMap();

      Object.values(sourceMap).forEach(source => {
        expect(typeof source.lyricSourceFiller).toBe("function");
      });
    });
  });

  describe("getLyrics", () => {
    it("should call filler function if not yet filled", async () => {
      const sourceMap = newSourceMap();

      const mockFiller = jest.fn<(params: ProviderParameters) => Promise<void>>().mockResolvedValue(undefined);

      sourceMap["yt-lyrics"].lyricSourceFiller = mockFiller;
      sourceMap["yt-lyrics"].lyricSourceResult = {
        lyrics: [{ startTimeMs: 0, words: "test", durationMs: 1000 }],
        source: "Test",
        sourceHref: "",
      } as any;

      const params: ProviderParameters = {
        song: "Test Song",
        artist: "Test Artist",
        duration: 180,
        videoId: "test-id",
        audioTrackData: { captionTracks: [] } as any,
        album: null,
        sourceMap: sourceMap as SourceMapType,
        alwaysFetchMetadata: false,
        signal: new AbortController().signal,
      };

      await getLyrics(params, "yt-lyrics");

      expect(mockFiller).toHaveBeenCalledWith(params);
    });

    it("should not call filler function if already filled", async () => {
      const sourceMap = newSourceMap();
      const mockFiller = jest.fn();

      sourceMap["yt-lyrics"].lyricSourceFiller = mockFiller as any;
      sourceMap["yt-lyrics"].filled = true;
      sourceMap["yt-lyrics"].lyricSourceResult = {
        lyrics: [{ startTimeMs: 0, words: "cached", durationMs: 1000 }],
        source: "Test",
        sourceHref: "",
      } as any;

      const params: ProviderParameters = {
        song: "Test Song",
        artist: "Test Artist",
        duration: 180,
        videoId: "test-id",
        audioTrackData: { captionTracks: [] } as any,
        album: null,
        sourceMap: sourceMap as SourceMapType,
        alwaysFetchMetadata: false,
        signal: new AbortController().signal,
      };

      const result = await getLyrics(params, "yt-lyrics");

      expect(mockFiller).not.toHaveBeenCalled();
      expect(result?.lyrics?.[0].words).toBe("cached");
    });

    it("should return null if provider returns no lyrics", async () => {
      const sourceMap = newSourceMap();
      const mockFiller = jest.fn<() => Promise<void>>().mockResolvedValue(undefined);

      sourceMap["yt-lyrics"].lyricSourceFiller = mockFiller;
      sourceMap["yt-lyrics"].lyricSourceResult = null;

      const params: ProviderParameters = {
        song: "Test Song",
        artist: "Test Artist",
        duration: 180,
        videoId: "test-id",
        audioTrackData: { captionTracks: [] } as any,
        album: null,
        sourceMap: sourceMap as SourceMapType,
        alwaysFetchMetadata: false,
        signal: new AbortController().signal,
      };

      const result = await getLyrics(params, "yt-lyrics");

      expect(result).toBeNull();
    });
  });

  describe("initProviders", () => {
    it("should initialize with default provider list when none exists", done => {
      mockChromeStorage({});

      initProviders();

      setTimeout(() => {
        expect(chrome.storage.sync.get.called).toBe(true);
        expect(providerPriority.length).toBeGreaterThan(0);
        done();
      }, 10);
    });

    it("should use custom provider list from storage", done => {
      const customList = [
        "lrclib-synced",
        "lrclib-plain",
        "yt-captions",
        "yt-lyrics",
        "musixmatch-richsync",
        "musixmatch-synced",
        "bLyrics-richsynced",
        "bLyrics-synced",
      ];

      mockChromeStorage({ preferredProviderList: customList });

      initProviders();

      setTimeout(() => {
        expect(providerPriority).toEqual(customList);
        done();
      }, 10);
    });

    it("should reset to default if provider list is invalid", done => {
      const invalidList = ["invalid-provider"];

      mockChromeStorage({ preferredProviderList: invalidList });

      initProviders();

      setTimeout(() => {
        // Should fallback to default
        expect(providerPriority.length).toBeGreaterThan(0);
        expect(providerPriority).not.toContain("invalid-provider" as any);
        done();
      }, 10);
    });

    it("should handle disabled providers with d_ prefix", done => {
      const listWithDisabled = [
        "bLyrics-richsynced",
        "bLyrics-synced",
        "d_musixmatch-richsync",
        "d_musixmatch-synced",
        "lrclib-synced",
        "lrclib-plain",
        "yt-captions",
        "yt-lyrics",
      ];

      mockChromeStorage({ preferredProviderList: listWithDisabled });

      initProviders();

      setTimeout(() => {
        // Should filter out disabled providers (d_ prefix)
        expect(providerPriority).not.toContain("d_musixmatch-richsync" as any);
        expect(providerPriority).not.toContain("d_musixmatch-synced" as any);
        done();
      }, 10);
    });

    it("should listen to storage changes", done => {
      mockChromeStorage({});

      initProviders();

      expect(chrome.storage.onChanged.addListener.called).toBe(true);

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];

      const changes = {
        preferredProviderList: {
          newValue: [
            "yt-captions",
            "yt-lyrics",
            "lrclib-synced",
            "lrclib-plain",
            "musixmatch-richsync",
            "musixmatch-synced",
            "bLyrics-richsynced",
            "bLyrics-synced",
          ],
          oldValue: null,
        },
      };

      listener(changes, "sync");

      setTimeout(() => {
        expect(providerPriority[0]).toBe("yt-captions");
        done();
      }, 10);
    });

    it("should ignore changes from other storage areas", done => {
      mockChromeStorage({});

      initProviders();

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];
      const initialPriority = [...providerPriority];

      const changes = {
        preferredProviderList: {
          newValue: ["yt-captions"],
          oldValue: null,
        },
      };

      listener(changes, "local");

      setTimeout(() => {
        // Should not have changed
        expect(providerPriority).toEqual(initialPriority);
        done();
      }, 10);
    });

    it("should ignore changes to other keys", done => {
      mockChromeStorage({});

      initProviders();

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];
      const initialPriority = [...providerPriority];

      const changes = {
        otherKey: {
          newValue: "value",
          oldValue: null,
        },
      };

      listener(changes, "sync");

      setTimeout(() => {
        // Should not have changed
        expect(providerPriority).toEqual(initialPriority);
        done();
      }, 10);
    });
  });
});

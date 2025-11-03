import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import chrome from 'sinon-chrome';
import { injectLyrics } from '@/modules/lyrics/injectLyrics';
import type { LyricSourceResultWithMeta } from '@/modules/lyrics/lyrics';
import { mockChromeStorage } from '@tests/test-utils';
import * as Constants from '@constants';

const createMockLyricData = (overrides: Partial<LyricSourceResultWithMeta> = {}): LyricSourceResultWithMeta => ({
  lyrics: [],
  language: 'en',
  source: 'Test Source',
  sourceHref: 'https://test.com',
  song: 'Test Song',
  artist: 'Test Artist',
  album: 'Test Album',
  duration: 180,
  videoId: 'test-video-id',
  cacheAllowed: true,
  ...overrides
});

describe('InjectLyrics Module', () => {
  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();
    mockChromeStorage({});
    document.body.innerHTML = '';

    // Create main layout
    const mockLayout = document.createElement('div');
    mockLayout.id = 'layout';

    const mockSidePanel = document.createElement('div');
    mockSidePanel.id = 'side-panel';

    // Create tp-yt-paper-tabs element
    const mockPaperTabs = document.createElement('tp-yt-paper-tabs');
    mockSidePanel.appendChild(mockPaperTabs);

    const mockTabRenderer = document.createElement('div');
    mockTabRenderer.id = 'tab-renderer';

    const mockTabContent = document.createElement('div');
    mockTabContent.className = 'content';
    mockTabRenderer.appendChild(mockTabContent);

    mockSidePanel.appendChild(mockTabRenderer);
    mockLayout.appendChild(mockSidePanel);

    // Create song image element for album art
    const songImage = document.createElement('div');
    songImage.id = 'song-image';
    const thumbnail = document.createElement('div');
    thumbnail.id = 'thumbnail';
    const img = document.createElement('img');
    img.id = 'img';
    thumbnail.appendChild(img);
    songImage.appendChild(thumbnail);
    mockLayout.appendChild(songImage);

    // Create main panel
    const mainPanel = document.createElement('div');
    mainPanel.id = 'main-panel';
    mockLayout.appendChild(mainPanel);

    // Create player page
    const playerPage = document.createElement('div');
    playerPage.id = 'player-page';
    mockLayout.appendChild(playerPage);

    document.body.appendChild(mockLayout);
  });

  describe('injectLyrics', () => {
    it('should create lyrics wrapper with lines', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'First line',
            durationMs: 2000
          },
          {
            startTimeMs: 3000,
            words: 'Second line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        videoId: 'test-video-id',
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricsLines = document.querySelectorAll('.blyrics--line');
      expect(lyricsLines.length).toBeGreaterThan(0);
    });

    it('should handle lyrics with parts (rich sync)', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test lyrics',
            durationMs: 2000,
            parts: [
              { startTimeMs: 1000, words: 'Test', durationMs: 500 },
              { startTimeMs: 1500, words: ' ', durationMs: 100 },
              { startTimeMs: 1600, words: 'lyrics', durationMs: 400 }
            ]
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const wordElements = document.querySelectorAll(`.${Constants.WORD_CLASS}`);
      expect(wordElements.length).toBeGreaterThan(0);
    });

    it('should handle plain lyrics without timing', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 0,
            words: 'Plain line 1',
            durationMs: 0
          },
          {
            startTimeMs: 0,
            words: 'Plain line 2',
            durationMs: 0
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricsLines = document.querySelectorAll('.blyrics--line');
      expect(lyricsLines.length).toBeGreaterThan(0);

      const firstLine = lyricsLines[0] as HTMLElement;
      expect(firstLine.textContent).toContain('Plain line 1');
    });

    it('should add timing data attributes to lines', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 5000,
            words: 'Timed line',
            durationMs: 3000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricLine = document.querySelector('.blyrics--line') as HTMLElement;
      expect(lyricLine.dataset.time).toBe('5');
      expect(lyricLine.dataset.duration).toBe('3');
    });

    it('should create initial scroll anchor line', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricsContainer = document.querySelector(`.${Constants.LYRICS_CLASS}`);
      const firstChild = lyricsContainer?.firstChild as HTMLElement;

      expect(firstChild.dataset.time).toBe('-1');
    });

    it('should add footer with source attribution', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        album: 'Test Album',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const footer = document.querySelector('.blyrics-footer');
      expect(footer).toBeTruthy();
    });

    it('should handle no lyrics message', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 0,
            words: Constants.NO_LYRICS_TEXT,
            durationMs: 0
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const noLyricsButton = document.querySelector('.blyrics-add-lyrics-button');
      expect(noLyricsButton).toBeTruthy();
    });

    it('should handle background lyrics with class', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Background vocals',
            durationMs: 2000,
            parts: [
              {
                startTimeMs: 1000,
                words: 'Background',
                durationMs: 1000,
                isBackground: true
              },
              {
                startTimeMs: 2000,
                words: ' vocals',
                durationMs: 1000
              }
            ]
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const backgroundElements = document.querySelectorAll(`.${Constants.BACKGROUND_LYRIC_CLASS}`);
      expect(backgroundElements.length).toBeGreaterThan(0);
    });

    it('should handle RTL text correctly', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'مرحبا',
            durationMs: 2000,
            parts: [
              {
                startTimeMs: 1000,
                words: 'مرحبا',
                durationMs: 2000
              }
            ]
          }
        ],
        language: 'ar',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const rtlElements = document.querySelectorAll(`.${Constants.RTL_CLASS}`);
      expect(rtlElements.length).toBeGreaterThan(0);
    });

    it('should split lines into words when parts are missing', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Multiple word line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const wordElements = document.querySelectorAll(`.${Constants.WORD_CLASS}`);
      expect(wordElements.length).toBeGreaterThanOrEqual(3);
    });

    it('should add spacing element at the end', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const spacingElement = document.getElementById(Constants.LYRICS_SPACING_ELEMENT_ID);
      expect(spacingElement).toBeTruthy();
    });

    it('should add click handlers for seeking when timed', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 5000,
            words: 'Seekable line',
            durationMs: 2000
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricLine = document.querySelector('.blyrics--line') as HTMLElement;
      const onClickAttr = lyricLine.getAttribute('onClick');

      expect(onClickAttr).toBeTruthy();
      expect(onClickAttr).toContain('seekTo');
    });

    it('should not add click handlers for untimed lyrics', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 0,
            words: 'Non-seekable line',
            durationMs: 0
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricLine = document.querySelector('.blyrics--line') as HTMLElement;
      expect(lyricLine.style.cursor).toBe('unset');
    });

    it('should handle empty lyrics array', () => {
      const mockData = createMockLyricData({
        lyrics: [],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData, true);

      const lyricsContainer = document.querySelector(`.${Constants.LYRICS_CLASS}`);
      expect(lyricsContainer).toBeTruthy();
    });

    it('should set CSS duration variables on elements', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test',
            durationMs: 3000,
            parts: [
              {
                startTimeMs: 1000,
                words: 'Test',
                durationMs: 3000
              }
            ]
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const lyricLine = document.querySelector('.blyrics--line') as HTMLElement;
      const durationVar = lyricLine.style.getPropertyValue('--blyrics-duration');

      expect(durationVar).toBe('3000ms');
    });

    it('should add zero duration class for parts with no duration', () => {
      const mockData = createMockLyricData({
        lyrics: [
          {
            startTimeMs: 1000,
            words: 'Test',
            durationMs: 2000,
            parts: [
              {
                startTimeMs: 1000,
                words: 'Test',
                durationMs: 0
              }
            ]
          }
        ],
        language: 'en',
        source: 'Test Source',
        sourceHref: 'https://test.com',
        song: 'Test Song',
        artist: 'Test Artist',
        duration: 180,
        cacheAllowed: true
      });

      injectLyrics(mockData);

      const zeroDurationElements = document.querySelectorAll(`.${Constants.ZERO_DURATION_ANIMATION_CLASS}`);
      expect(zeroDurationElements.length).toBeGreaterThan(0);
    });
  });
});

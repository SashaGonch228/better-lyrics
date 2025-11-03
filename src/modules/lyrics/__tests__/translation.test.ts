import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import chrome from 'sinon-chrome';
import {
  translateText,
  translateTextIntoRomaji,
  onRomanizationEnabled,
  onTranslationEnabled,
  clearCache,
  getTranslationFromCache,
  getRomanizationFromCache,
  getCurrentTranslationLanguage
} from '@/modules/lyrics/translation';
import { mockChromeStorage, mockFetch } from '@tests/test-utils';

describe('Translation Module', () => {
  let restoreFetch: (() => void) | undefined;

  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();
    clearCache();
  });

  afterEach(() => {
    if (restoreFetch) {
      restoreFetch();
      restoreFetch = undefined;
    }
  });

  describe('translateText', () => {
    it('should translate text successfully', async () => {
      const mockResponse = [
        [['Hola', 'Hello']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateText('Hello', 'es');

      expect(result).not.toBeNull();
      expect(result?.translatedText).toBe('Hola');
      expect(result?.originalLanguage).toBe('en');
    });

    it('should cache translation results', async () => {
      const mockResponse = [
        [['Bonjour', 'Hello']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result1 = await translateText('Hello', 'fr');
      const result2 = await translateText('Hello', 'fr');

      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should return null for identical translation', async () => {
      const mockResponse = [
        [['Hello', 'Hello']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateText('Hello', 'en');

      expect(result).toBeNull();
    });

    it('should handle multiple translation parts', async () => {
      const mockResponse = [
        [['Hello ', 'Hola '], ['world', 'mundo']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateText('Hola mundo', 'en');

      expect(result?.translatedText).toBe('Hello world');
    });

    it('should return null on fetch error', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as any;

      const result = await translateText('Hello', 'es');

      expect(result).toBeNull();
    });

    it('should handle empty text', async () => {
      const mockResponse = [
        [['', '']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateText('', 'es');

      expect(result).toBeNull();
    });

    it('should retrieve from cache instead of fetching', async () => {
      const mockResponse = [
        [['Cached text', 'Original text']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      await translateText('Original text', 'es');

      const cachedResult = getTranslationFromCache('Original text', 'es');

      expect(cachedResult).not.toBeNull();
      expect(cachedResult?.translatedText).toBe('Cached text');
    });
  });

  describe('translateTextIntoRomaji', () => {
    it('should romanize text successfully', async () => {
      const mockResponse = [
        [null, ['', 'こんにちは', 'konnichiwa', 'konnichiwa']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateTextIntoRomaji('ja', 'こんにちは');

      expect(result).toBe('konnichiwa');
    });

    it('should cache romanization results', async () => {
      const mockResponse = [
        [null, ['', 'こんにちは', 'konnichiwa', 'konnichiwa']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result1 = await translateTextIntoRomaji('ja', 'こんにちは');
      const result2 = await translateTextIntoRomaji('ja', 'こんにちは');

      expect(result1).toEqual(result2);
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should fallback to alternative romanization path', async () => {
      const mockResponse = [
        [null, ['', 'さようなら', 'sayounara']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateTextIntoRomaji('ja', 'さようなら');

      expect(result).toBe('sayounara');
    });

    it('should return null for identical romanization', async () => {
      const mockResponse = [
        [null, ['', 'hello', 'hello', 'hello']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateTextIntoRomaji('ja', 'hello');

      expect(result).toBeNull();
    });

    it('should return null on fetch error', async () => {
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error'))) as any;

      const result = await translateTextIntoRomaji('ja', 'こんにちは');

      expect(result).toBeNull();
    });

    it('should handle empty text', async () => {
      const mockResponse = [
        [null, ['', '', '', '']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      const result = await translateTextIntoRomaji('ja', '');

      expect(result).toBeNull();
    });

    it('should retrieve from cache instead of fetching', async () => {
      const mockResponse = [
        [null, ['', 'ありがとう', 'arigatou', 'arigatou']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      await translateTextIntoRomaji('ja', 'ありがとう');

      const cachedResult = getRomanizationFromCache('ありがとう');

      expect(cachedResult).not.toBeNull();
      expect(cachedResult).toBe('arigatou');
    });
  });

  describe('onRomanizationEnabled', () => {
    it('should call callback when romanization is enabled', (done) => {
      mockChromeStorage({ isRomanizationEnabled: true });

      onRomanizationEnabled((items) => {
        expect(items.isRomanizationEnabled).toBe(true);
        done();
      });
    });

    it('should not call callback when romanization is disabled', (done) => {
      mockChromeStorage({ isRomanizationEnabled: false });

      let callbackCalled = false;
      onRomanizationEnabled(() => {
        callbackCalled = true;
      });

      setTimeout(() => {
        expect(callbackCalled).toBe(false);
        done();
      }, 100);
    });

    it('should use default value when setting not present', (done) => {
      mockChromeStorage({});

      let callbackCalled = false;
      onRomanizationEnabled(() => {
        callbackCalled = true;
      });

      setTimeout(() => {
        expect(callbackCalled).toBe(false);
        done();
      }, 100);
    });
  });

  describe('onTranslationEnabled', () => {
    it('should call callback when translation is enabled', (done) => {
      mockChromeStorage({ isTranslateEnabled: true, translationLanguage: 'es' });

      onTranslationEnabled((items) => {
        expect(items.isTranslateEnabled).toBe(true);
        expect(items.translationLanguage).toBe('es');
        done();
      });
    });

    it('should not call callback when translation is disabled', (done) => {
      mockChromeStorage({ isTranslateEnabled: false });

      let callbackCalled = false;
      onTranslationEnabled(() => {
        callbackCalled = true;
      });

      setTimeout(() => {
        expect(callbackCalled).toBe(false);
        done();
      }, 100);
    });

    it('should use default language when not specified', (done) => {
      mockChromeStorage({ isTranslateEnabled: true });

      onTranslationEnabled((items) => {
        expect(items.translationLanguage).toBe('en');
        done();
      });
    });

    it('should update current translation language', (done) => {
      mockChromeStorage({ isTranslateEnabled: true, translationLanguage: 'fr' });

      onTranslationEnabled(() => {
        expect(getCurrentTranslationLanguage()).toBe('fr');
        done();
      });
    });
  });

  describe('clearCache', () => {
    it('should clear both translation and romanization caches', async () => {
      const mockTranslateResponse = [
        [['Hola', 'Hello']],
        null,
        'en'
      ];

      const mockRomanizeResponse: any = [
        [null, ['', 'こんにちは', 'konnichiwa', 'konnichiwa']]
      ];

      const responses = new Map([
        ['translate.googleapis.com', mockTranslateResponse]
      ]);
      restoreFetch = mockFetch(responses);

      await translateText('Hello', 'es');

      responses.set('translate.googleapis.com', mockRomanizeResponse);
      await translateTextIntoRomaji('ja', 'こんにちは');

      expect(getTranslationFromCache('Hello', 'es')).not.toBeNull();
      expect(getRomanizationFromCache('こんにちは')).not.toBeNull();

      clearCache();

      expect(getTranslationFromCache('Hello', 'es')).toBeNull();
      expect(getRomanizationFromCache('こんにちは')).toBeNull();
    });
  });

  describe('getTranslationFromCache', () => {
    it('should return cached translation', async () => {
      const mockResponse = [
        [['Hola', 'Hello']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      await translateText('Hello', 'es');

      const cached = getTranslationFromCache('Hello', 'es');

      expect(cached).not.toBeNull();
      expect(cached?.translatedText).toBe('Hola');
    });

    it('should return null for non-existent cache entry', () => {
      const cached = getTranslationFromCache('Nonexistent', 'es');

      expect(cached).toBeNull();
    });

    it('should differentiate by target language', async () => {
      const mockResponseEs = [
        [['Hola', 'Hello']],
        null,
        'en'
      ];

      const mockResponseFr = [
        [['Bonjour', 'Hello']],
        null,
        'en'
      ];

      const responses = new Map([['translate.googleapis.com', mockResponseEs]]);
      restoreFetch = mockFetch(responses);

      await translateText('Hello', 'es');

      responses.set('translate.googleapis.com', mockResponseFr);
      await translateText('Hello', 'fr');

      const cachedEs = getTranslationFromCache('Hello', 'es');
      const cachedFr = getTranslationFromCache('Hello', 'fr');

      expect(cachedEs?.translatedText).toBe('Hola');
      expect(cachedFr?.translatedText).toBe('Bonjour');
    });
  });

  describe('getRomanizationFromCache', () => {
    it('should return cached romanization', async () => {
      const mockResponse = [
        [null, ['', 'こんにちは', 'konnichiwa', 'konnichiwa']]
      ];

      const responses = new Map([['translate.googleapis.com', mockResponse]]);
      restoreFetch = mockFetch(responses);

      await translateTextIntoRomaji('ja', 'こんにちは');

      const cached = getRomanizationFromCache('こんにちは');

      expect(cached).toBe('konnichiwa');
    });

    it('should return null for non-existent cache entry', () => {
      const cached = getRomanizationFromCache('Nonexistent');

      expect(cached).toBeNull();
    });
  });

  describe('getCurrentTranslationLanguage', () => {
    it('should return default language initially', () => {
      expect(getCurrentTranslationLanguage()).toBe('en');
    });

    it('should return updated language after onTranslationEnabled', (done) => {
      mockChromeStorage({ isTranslateEnabled: true, translationLanguage: 'ja' });

      onTranslationEnabled(() => {
        expect(getCurrentTranslationLanguage()).toBe('ja');
        done();
      });
    });
  });
});

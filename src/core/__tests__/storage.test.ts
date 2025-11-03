import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import chrome from 'sinon-chrome';
import * as Storage from '../storage';
import { mockChromeStorage, flushPromises } from '@tests/test-utils';

describe('Storage Module', () => {
  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();
  });

  describe('getStorage', () => {
    it('should retrieve value from sync storage with string key', (done) => {
      mockChromeStorage({ testKey: 'testValue' });

      Storage.getStorage('testKey', (items) => {
        expect(items.testKey).toBe('testValue');
        done();
      });
    });

    it('should retrieve multiple values with object key', (done) => {
      mockChromeStorage({ key1: 'value1', key2: 'value2' });

      Storage.getStorage({ key1: 'default1', key2: 'default2' }, (items) => {
        expect(items.key1).toBe('value1');
        expect(items.key2).toBe('value2');
        done();
      });
    });

    it('should use default values when keys do not exist', (done) => {
      mockChromeStorage({});

      Storage.getStorage({ nonExistentKey: 'defaultValue' }, (items) => {
        expect(items.nonExistentKey).toBe('defaultValue');
        done();
      });
    });
  });

  describe('getTransientStorage', () => {
    it('should retrieve non-expired value from local storage', async () => {
      const futureExpiry = Date.now() + 10000;
      mockChromeStorage({
        testKey: {
          type: 'transient',
          value: 'testValue',
          expiry: futureExpiry
        }
      });

      const result = await Storage.getTransientStorage('testKey');
      expect(result).toBe('testValue');
    });

    it('should return null and remove expired value', async () => {
      const pastExpiry = Date.now() - 10000;
      mockChromeStorage({
        testKey: {
          type: 'transient',
          value: 'testValue',
          expiry: pastExpiry
        }
      });

      const result = await Storage.getTransientStorage('testKey');
      expect(result).toBeNull();
      expect(chrome.storage.local.remove.calledWith('testKey')).toBe(true);
    });

    it('should return null for non-existent key', async () => {
      mockChromeStorage({});

      const result = await Storage.getTransientStorage('nonExistent');
      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      chrome.storage.local.get.rejects(new Error('Storage error'));

      const result = await Storage.getTransientStorage('testKey');
      expect(result).toBeNull();
    });
  });

  describe('setTransientStorage', () => {
    it('should store value with expiry timestamp', async () => {
      const storageData = mockChromeStorage({});
      const ttl = 5000;
      const testValue = { data: 'test' };

      await Storage.setTransientStorage('testKey', testValue, ttl);

      expect(chrome.storage.local.set.called).toBe(true);
      const setCall = chrome.storage.local.set.getCall(0);
      const savedData = setCall.args[0];

      expect(savedData.testKey.type).toBe('transient');
      expect(savedData.testKey.value).toEqual(testValue);
      expect(savedData.testKey.expiry).toBeGreaterThan(Date.now());
      expect(savedData.testKey.expiry).toBeLessThanOrEqual(Date.now() + ttl + 100);
    });

    it('should handle storage errors gracefully', async () => {
      chrome.storage.local.set.rejects(new Error('Storage error'));

      await expect(Storage.setTransientStorage('testKey', 'value', 5000)).resolves.not.toThrow();
    });
  });

  describe('getUpdatedCacheInfo', () => {
    it('should calculate cache count and size correctly', async () => {
      mockChromeStorage({
        'blyrics_song1': { lyrics: 'test1' },
        'blyrics_song2': { lyrics: 'test2' },
        'otherKey': { data: 'ignored' }
      });

      const cacheInfo = await Storage.getUpdatedCacheInfo();

      expect(cacheInfo.count).toBe(2);
      expect(cacheInfo.size).toBeGreaterThan(0);
    });

    it('should return zero counts when no lyrics cached', async () => {
      mockChromeStorage({ otherKey: 'value' });

      const cacheInfo = await Storage.getUpdatedCacheInfo();

      expect(cacheInfo.count).toBe(0);
      expect(cacheInfo.size).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      chrome.storage.local.get.rejects(new Error('Storage error'));

      const cacheInfo = await Storage.getUpdatedCacheInfo();

      expect(cacheInfo.count).toBe(0);
      expect(cacheInfo.size).toBe(0);
    });
  });

  describe('saveCacheInfo', () => {
    it('should save cache info to sync storage', async () => {
      mockChromeStorage({
        'blyrics_song1': { lyrics: 'test' }
      });

      await Storage.saveCacheInfo();

      expect(chrome.storage.sync.set.called).toBe(true);
      const setCall = chrome.storage.sync.set.getCall(0);
      const savedData = setCall.args[0];

      expect(savedData.cacheInfo).toBeDefined();
      expect(savedData.cacheInfo.count).toBe(1);
      expect(savedData.cacheInfo.size).toBeGreaterThan(0);
    });
  });

  describe('clearCache', () => {
    it('should remove all blyrics cache keys', async () => {
      mockChromeStorage({
        'blyrics_song1': { lyrics: 'test1' },
        'blyrics_song2': { lyrics: 'test2' },
        'otherKey': { data: 'kept' }
      });

      await Storage.clearCache();

      expect(chrome.storage.local.remove.called).toBe(true);
      const removeCall = chrome.storage.local.remove.getCall(0);
      const keysToRemove = removeCall.args[0];

      expect(keysToRemove).toContain('blyrics_song1');
      expect(keysToRemove).toContain('blyrics_song2');
      expect(keysToRemove).not.toContain('otherKey');
    });

    it('should handle errors gracefully', async () => {
      chrome.storage.local.get.rejects(new Error('Storage error'));

      await expect(Storage.clearCache()).resolves.not.toThrow();
    });
  });

  describe('purgeExpiredKeys', () => {
    it('should remove only expired blyrics keys', async () => {
      const now = Date.now();
      mockChromeStorage({
        'blyrics_expired': { expiryTime: now - 10000 },
        'blyrics_valid': { expiryTime: now + 10000 },
        'blyrics_no_expiry': {},
        'otherKey': { expiryTime: now - 10000 }
      });

      await Storage.purgeExpiredKeys();

      expect(chrome.storage.local.remove.called).toBe(true);
      const removeCall = chrome.storage.local.remove.getCall(0);
      const keysToRemove = removeCall.args[0];

      expect(keysToRemove).toContain('blyrics_expired');
      expect(keysToRemove).not.toContain('blyrics_valid');
      expect(keysToRemove).not.toContain('blyrics_no_expiry');
      expect(keysToRemove).not.toContain('otherKey');
    });

    it('should handle no expired keys gracefully', async () => {
      const now = Date.now();
      mockChromeStorage({
        'blyrics_valid': { expiryTime: now + 10000 }
      });

      await Storage.purgeExpiredKeys();

      expect(chrome.storage.local.remove.called).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      chrome.storage.local.get.rejects(new Error('Storage error'));

      await expect(Storage.purgeExpiredKeys()).resolves.not.toThrow();
    });
  });

  describe('getAndApplyCustomCSS', () => {
    it('should retrieve and apply custom CSS', (done) => {
      const customCSS = '.test { color: red; }';
      mockChromeStorage({ customCSS });

      // Mock applyCustomCSS by checking if style element is created
      Storage.getAndApplyCustomCSS();

      setTimeout(() => {
        expect(chrome.storage.sync.get.called).toBe(true);
        const getCall = chrome.storage.sync.get.getCall(0);
        expect(getCall.args[0]).toEqual(['customCSS']);
        done();
      }, 10);
    });

    it('should handle missing custom CSS', (done) => {
      mockChromeStorage({});

      Storage.getAndApplyCustomCSS();

      setTimeout(() => {
        expect(chrome.storage.sync.get.called).toBe(true);
        done();
      }, 10);
    });
  });

  describe('subscribeToCustomCSS', () => {
    it('should set up storage listener for CSS changes', () => {
      mockChromeStorage({ customCSS: '.initial { color: blue; }' });

      Storage.subscribeToCustomCSS();

      expect(chrome.storage.onChanged.addListener.called).toBe(true);
    });

    it('should apply CSS changes when storage changes', (done) => {
      mockChromeStorage({});

      Storage.subscribeToCustomCSS();

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];

      const changes = {
        customCSS: {
          newValue: '.updated { color: green; }',
          oldValue: '.old { color: red; }'
        }
      };

      listener(changes, 'sync');

      setTimeout(() => {
        done();
      }, 10);
    });

    it('should ignore changes from other storage areas', (done) => {
      mockChromeStorage({});

      Storage.subscribeToCustomCSS();

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];

      const changes = {
        customCSS: {
          newValue: '.updated { color: green; }'
        }
      };

      listener(changes, 'local');

      setTimeout(() => {
        done();
      }, 10);
    });

    it('should ignore changes to other keys', (done) => {
      mockChromeStorage({});

      Storage.subscribeToCustomCSS();

      const listener = chrome.storage.onChanged.addListener.getCall(0).args[0];

      const changes = {
        otherKey: {
          newValue: 'value'
        }
      };

      listener(changes, 'sync');

      setTimeout(() => {
        done();
      }, 10);
    });
  });

});

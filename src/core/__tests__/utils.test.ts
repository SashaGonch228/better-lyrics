import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import chrome from 'sinon-chrome';
import * as Utils from '../utils';
import { mockChromeStorage } from '@tests/test-utils';

describe('Utils Module', () => {
  beforeEach(() => {
    chrome.flush();
    jest.clearAllMocks();
    document.head.innerHTML = '';
  });

  describe('timeToInt', () => {
    it('should convert MM:SS format to seconds', () => {
      expect(Utils.timeToInt('1:30')).toBe(90);
      expect(Utils.timeToInt('0:45')).toBe(45);
      expect(Utils.timeToInt('2:15')).toBe(135);
    });

    it('should handle zero values', () => {
      expect(Utils.timeToInt('0:00')).toBe(0);
    });

    it('should handle decimal seconds', () => {
      expect(Utils.timeToInt('1:30.5')).toBe(90.5);
    });

    it('should handle single digit minutes and seconds', () => {
      expect(Utils.timeToInt('5:3')).toBe(303);
    });
  });

  describe('unEntity', () => {
    it('should decode HTML entities', () => {
      expect(Utils.unEntity('&amp;')).toBe('&');
      expect(Utils.unEntity('&lt;')).toBe('<');
      expect(Utils.unEntity('&gt;')).toBe('>');
    });

    it('should decode multiple entities in one string', () => {
      expect(Utils.unEntity('&lt;div&gt;&amp;&lt;/div&gt;')).toBe('<div>&</div>');
    });

    it('should handle strings without entities', () => {
      expect(Utils.unEntity('Hello World')).toBe('Hello World');
    });

    it('should handle empty strings', () => {
      expect(Utils.unEntity('')).toBe('');
    });
  });

  describe('applyCustomCSS', () => {
    it('should create and append style tag on first call', () => {
      const css = '.test { color: red; }';

      Utils.applyCustomCSS(css);

      const styleTag = document.getElementById('blyrics-custom-style');
      expect(styleTag).not.toBeNull();
      expect(styleTag?.textContent).toBe(css);
      expect(styleTag?.tagName).toBe('STYLE');
    });

    it('should update existing style tag on subsequent calls', () => {
      const css1 = '.test1 { color: red; }';
      const css2 = '.test2 { color: blue; }';

      Utils.applyCustomCSS(css1);
      Utils.applyCustomCSS(css2);

      const styleTag = document.getElementById('blyrics-custom-style');
      expect(styleTag?.textContent).toBe(css2);

      const styleTags = document.querySelectorAll('#blyrics-custom-style');
      expect(styleTags.length).toBe(1);
    });

    it('should handle empty CSS string', () => {
      Utils.applyCustomCSS('');

      const styleTag = document.getElementById('blyrics-custom-style');
      expect(styleTag?.textContent).toBe('');
    });

    it('should append style tag to document head', () => {
      Utils.applyCustomCSS('.test {}');

      const styleTag = document.getElementById('blyrics-custom-style');
      expect(styleTag?.parentElement).toBe(document.head);
    });
  });

  describe('log', () => {
    it('should log when isLogsEnabled is true', (done) => {
      mockChromeStorage({ isLogsEnabled: true });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      Utils.log('test message', 'arg2');

      setTimeout(() => {
        expect(consoleLogSpy).toHaveBeenCalled();
        consoleLogSpy.mockRestore();
        done();
      }, 100);
    });

    it('should not log when isLogsEnabled is false', (done) => {
      mockChromeStorage({ isLogsEnabled: false });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      Utils.log('test message');

      setTimeout(() => {
        expect(consoleLogSpy).not.toHaveBeenCalled();
        consoleLogSpy.mockRestore();
        done();
      }, 100);
    });
  });

  describe('setUpLog', () => {
    it('should configure log to use console.log when enabled', (done) => {
      mockChromeStorage({ isLogsEnabled: true });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      Utils.setUpLog();

      setTimeout(() => {
        Utils.log('test');
        expect(consoleLogSpy).toHaveBeenCalledWith('test');
        consoleLogSpy.mockRestore();
        done();
      }, 100);
    });

    it('should configure log to be no-op when disabled', (done) => {
      mockChromeStorage({ isLogsEnabled: false });
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

      Utils.setUpLog();

      setTimeout(() => {
        Utils.log('test');
        expect(consoleLogSpy).not.toHaveBeenCalled();
        consoleLogSpy.mockRestore();
        done();
      }, 100);
    });
  });
});

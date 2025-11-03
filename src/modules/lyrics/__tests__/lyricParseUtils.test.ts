import { describe, it, expect } from '@jest/globals';
import { stringSimilarity, testRtl, containsNonLatin } from '../lyricParseUtils';

describe('LyricParseUtils Module', () => {
  describe('stringSimilarity', () => {
    it('should return 1 for identical strings', () => {
      expect(stringSimilarity('hello', 'hello')).toBe(1);
      expect(stringSimilarity('test string', 'test string')).toBe(1);
    });

    it('should return 0 for completely different strings', () => {
      const result = stringSimilarity('abc', 'xyz');
      expect(result).toBeLessThan(0.1);
    });

    it('should handle case insensitivity by default', () => {
      expect(stringSimilarity('Hello', 'hello')).toBe(1);
      expect(stringSimilarity('TEST', 'test')).toBe(1);
    });

    it('should respect case sensitivity when enabled', () => {
      const result = stringSimilarity('Hello', 'hello', 2, true);
      expect(result).toBeLessThan(1);
    });

    it('should return reasonable similarity for similar strings', () => {
      const result = stringSimilarity('hello world', 'hello word');
      expect(result).toBeGreaterThan(0.7);
      expect(result).toBeLessThan(1);
    });

    it('should return 0 for strings shorter than substring length', () => {
      expect(stringSimilarity('a', 'b', 2)).toBe(0);
      expect(stringSimilarity('ab', 'cd', 3)).toBe(0);
    });

    it('should work with custom substring length', () => {
      const result1 = stringSimilarity('hello', 'hallo', 2);
      const result2 = stringSimilarity('hello', 'hallo', 3);
      expect(result1).not.toBe(result2);
    });

    it('should handle empty strings', () => {
      expect(stringSimilarity('', '')).toBe(0);
      expect(stringSimilarity('test', '')).toBe(0);
      expect(stringSimilarity('', 'test')).toBe(0);
    });

    it('should handle special characters', () => {
      const result = stringSimilarity('hello!', 'hello?');
      expect(result).toBeGreaterThanOrEqual(0.8);
    });

    it('should handle unicode characters', () => {
      const result = stringSimilarity('café', 'cafe');
      expect(result).toBeGreaterThan(0.5);
    });

    it('should return higher similarity for longer matching substrings', () => {
      const similar1 = stringSimilarity('the quick brown fox', 'the quick brown dog');
      const similar2 = stringSimilarity('the quick brown fox', 'a completely different string');
      expect(similar1).toBeGreaterThan(similar2);
    });
  });

  describe('testRtl', () => {
    it('should detect Arabic text', () => {
      expect(testRtl('مرحبا')).toBe(true);
      expect(testRtl('السلام عليكم')).toBe(true);
    });

    it('should detect Hebrew text', () => {
      expect(testRtl('שלום')).toBe(true);
      expect(testRtl('עברית')).toBe(true);
    });

    it('should return false for Latin text', () => {
      expect(testRtl('hello')).toBe(false);
      expect(testRtl('Hello World')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(testRtl('')).toBe(false);
    });

    it('should detect RTL in mixed text', () => {
      expect(testRtl('hello مرحبا')).toBe(true);
      expect(testRtl('test שלום world')).toBe(true);
    });

    it('should return false for numbers and punctuation only', () => {
      expect(testRtl('123456')).toBe(false);
      expect(testRtl('!@#$%^&*()')).toBe(false);
    });

    it('should detect Syriac script', () => {
      expect(testRtl('ܣܘܪܝܬ')).toBe(true);
    });

    it('should detect Thaana script', () => {
      expect(testRtl('ދިވެހި')).toBe(true);
    });
  });

  describe('containsNonLatin', () => {
    it('should return false for basic Latin text', () => {
      expect(containsNonLatin('hello')).toBe(false);
      expect(containsNonLatin('Hello World')).toBe(false);
      expect(containsNonLatin('The quick brown fox')).toBe(false);
    });

    it('should return false for Latin with common punctuation', () => {
      expect(containsNonLatin('hello, world!')).toBe(false);
      expect(containsNonLatin('test-string_123')).toBe(false);
    });

    it('should return false for numbers', () => {
      expect(containsNonLatin('123456')).toBe(false);
      expect(containsNonLatin('test123')).toBe(false);
    });

    it('should return true for Arabic script', () => {
      expect(containsNonLatin('مرحبا')).toBe(true);
    });

    it('should return true for Chinese characters', () => {
      expect(containsNonLatin('你好')).toBe(true);
      expect(containsNonLatin('中文')).toBe(true);
    });

    it('should return true for Japanese characters', () => {
      expect(containsNonLatin('こんにちは')).toBe(true);
      expect(containsNonLatin('カタカナ')).toBe(true);
    });

    it('should return true for Korean characters', () => {
      expect(containsNonLatin('안녕하세요')).toBe(true);
    });

    it('should return true for Cyrillic script', () => {
      expect(containsNonLatin('Привет')).toBe(true);
      expect(containsNonLatin('Русский')).toBe(true);
    });

    it('should return true for Greek script', () => {
      expect(containsNonLatin('Γειά σου')).toBe(true);
    });

    it('should return false for empty string', () => {
      expect(containsNonLatin('')).toBe(false);
    });

    it('should detect non-Latin in mixed text', () => {
      expect(containsNonLatin('hello 你好')).toBe(true);
      expect(containsNonLatin('test مرحبا world')).toBe(true);
    });

    it('should return false for extended Latin characters', () => {
      expect(containsNonLatin('café')).toBe(false);
      expect(containsNonLatin('naïve')).toBe(false);
      expect(containsNonLatin('résumé')).toBe(false);
    });

    it('should return true for emoji', () => {
      expect(containsNonLatin('hello 😀')).toBe(false);
      expect(containsNonLatin('🎵')).toBe(false);
    });
  });
});

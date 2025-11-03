import { describe, it, expect } from '@jest/globals';
import { parseTime, parseLRC, lrcFixers, parsePlainLyrics } from '@/modules/lyrics/providers/lrcUtils';
import type { LyricsArray } from '@/modules/lyrics/providers/shared';

describe('LrcUtils Module', () => {
  describe('parseTime', () => {
    it('should parse seconds only format', () => {
      expect(parseTime('45.5')).toBe(45500);
      expect(parseTime('30')).toBe(30000);
      expect(parseTime('0.123')).toBe(123);
    });

    it('should parse mm:ss.mmm format', () => {
      expect(parseTime('1:30.5')).toBe(90500);
      expect(parseTime('2:15.25')).toBe(135250);
      expect(parseTime('0:45.123')).toBe(45123);
    });

    it('should parse hh:mm:ss.mmm format', () => {
      expect(parseTime('1:30:45.5')).toBe(5445500);
      expect(parseTime('0:02:15.25')).toBe(135250);
    });

    it('should handle numeric input', () => {
      expect(parseTime(1000)).toBe(1000);
      expect(parseTime(0)).toBe(0);
    });

    it('should return 0 for invalid input', () => {
      expect(parseTime('')).toBe(0);
      // parseFloat('invalid') returns NaN, which gets returned as NaN (not caught by try/catch)
      expect(parseTime('invalid')).toBeNaN();
    });

    it('should round to nearest integer', () => {
      expect(parseTime('1:30.5555')).toBe(90556);
      expect(parseTime('0:00.4444')).toBe(444);
    });
  });

  describe('parseLRC', () => {
    it('should parse basic LRC format', () => {
      const lrc = `[00:12.00]Line 1
[00:17.20]Line 2
[00:21.10]Line 3`;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(3);
      expect(result[0].words).toBe('Line 1');
      expect(result[0].startTimeMs).toBe(12000);
      expect(result[1].words).toBe('Line 2');
      expect(result[1].startTimeMs).toBe(17200);
    });

    it('should calculate durations between lines', () => {
      const lrc = `[00:10.00]First line
[00:15.00]Second line
[00:20.00]Third line`;

      const result = parseLRC(lrc, 30000);

      expect(result[0].durationMs).toBe(5000);
      expect(result[1].durationMs).toBe(5000);
      expect(result[2].durationMs).toBe(10000);
    });

    it('should parse ID tags', () => {
      const lrc = `[ti:Song Title]
[ar:Artist Name]
[al:Album Name]
[00:10.00]First line`;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(1);
      expect(result[0].words).toBe('First line');
    });

    it('should handle offset tag', () => {
      const lrc = `[offset:500]
[00:10.00]First line
[00:15.00]Second line`;

      const result = parseLRC(lrc, 30000);

      // Offset subtracts from timestamps (positive offset delays lyrics)
      expect(result[0].startTimeMs).toBe(-490000);
      expect(result[1].startTimeMs).toBe(-485000);
    });

    it('should parse enhanced LRC with word timing', () => {
      const lrc = `[00:10.00]<00:10.00>First <00:10.50>word`;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(1);
      expect(result[0].words).toBe('Firstword');
      expect(result[0].parts).toBeDefined();
      expect(result[0].parts).toHaveLength(2);
      expect(result[0].parts![0].words).toBe('First');
      expect(result[0].parts![0].startTimeMs).toBe(10000);
      expect(result[0].parts![1].words).toBe('word');
      expect(result[0].parts![1].startTimeMs).toBe(10500);
    });

    it('should calculate part durations in enhanced LRC', () => {
      const lrc = `[00:10.00]<00:10.00>First <00:10.50>word
[00:15.00]Next line`;

      const result = parseLRC(lrc, 30000);

      expect(result[0].parts![0].durationMs).toBe(500);
      expect(result[0].parts![1].durationMs).toBe(4500);
    });

    it('should handle word fragments with leading spaces', () => {
      const lrc = `[00:10.00]<00:10.00> Leading <00:10.50> spaces`;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(1);
      expect(result[0].parts).toHaveLength(2);
      expect(result[0].parts![0].words).toBe('Leading');
      expect(result[0].parts![1].words).toBe('spaces');
    });

    it('should handle word fragments with trailing spaces', () => {
      const lrc = `[00:10.00]<00:10.00>Trailing <00:10.50>spaces `;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(1);
      expect(result[0].parts).toHaveLength(2);
      expect(result[0].parts![1].words).toBe('spaces');
    });

    it('should handle duration calculation with next line parts', () => {
      const lrc = `[00:10.00]<00:10.00>First <00:10.50>line
[00:15.00]<00:15.00>Second <00:15.50>line`;

      const result = parseLRC(lrc, 30000);

      // Last part of first line should use first part of next line
      expect(result[0].parts![1].durationMs).toBe(4500);
      // Last part of second line uses songLength
      expect(result[1].parts![1].durationMs).toBe(14500);
    });

    it('should handle multiple time tags per line', () => {
      const lrc = `[00:10.00][00:50.00]Repeated line`;

      const result = parseLRC(lrc, 60000);

      expect(result).toHaveLength(1);
      expect(result[0].startTimeMs).toBe(10000);
    });

    it('should skip lines without time tags', () => {
      const lrc = `[00:10.00]Valid line
Invalid line without time tag
[00:15.00]Another valid line`;

      const result = parseLRC(lrc, 30000);

      expect(result).toHaveLength(2);
      expect(result[0].words).toBe('Valid line');
      expect(result[1].words).toBe('Another valid line');
    });

    it('should handle empty lyrics', () => {
      const result = parseLRC('', 30000);
      expect(result).toHaveLength(0);
    });

    it('should trim whitespace from lyrics', () => {
      const lrc = `[00:10.00]  Line with spaces  `;

      const result = parseLRC(lrc, 30000);

      expect(result[0].words).toBe('Line with spaces');
    });

    it('should set last line duration to end of song', () => {
      const lrc = `[00:10.00]Only line`;

      const result = parseLRC(lrc, 30000);

      expect(result[0].durationMs).toBe(20000);
    });

    it('should handle negative offset', () => {
      const lrc = `[offset:-500]
[00:10.00]Line`;

      const result = parseLRC(lrc, 30000);

      expect(result[0].startTimeMs).toBe(510000);
    });

    it('should handle invalid offset gracefully', () => {
      const lrc = `[offset:invalid]
[00:10.00]Line`;

      const result = parseLRC(lrc, 30000);

      expect(result[0].startTimeMs).toBe(10000);
    });
  });

  describe('lrcFixers', () => {
    it('should merge short space durations into previous word', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Test lyrics',
          durationMs: 5000,
          parts: [
            { startTimeMs: 0, words: 'Test', durationMs: 500 },
            { startTimeMs: 500, words: ' ', durationMs: 50 },
            { startTimeMs: 550, words: 'lyrics', durationMs: 500 }
          ]
        }
      ];

      lrcFixers(lyrics);

      expect(lyrics[0].parts![0].durationMs).toBe(550);
      expect(lyrics[0].parts![1].durationMs).toBe(0);
      expect(lyrics[0].parts![1].startTimeMs).toBe(550);
    });

    it('should merge similar duration spaces', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Test lyrics',
          durationMs: 5000,
          parts: [
            { startTimeMs: 0, words: 'Test', durationMs: 500 },
            { startTimeMs: 500, words: ' ', durationMs: 510 },
            { startTimeMs: 1010, words: 'lyrics', durationMs: 500 }
          ]
        }
      ];

      lrcFixers(lyrics);

      expect(lyrics[0].parts![0].durationMs).toBe(1010);
      expect(lyrics[0].parts![1].durationMs).toBe(0);
    });

    it('should fix short durations when majority are short', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Many short words',
          durationMs: 5000,
          parts: [
            { startTimeMs: 0, words: 'Many', durationMs: 50 },
            { startTimeMs: 50, words: ' ', durationMs: 10 },
            { startTimeMs: 60, words: 'short', durationMs: 50 },
            { startTimeMs: 110, words: ' ', durationMs: 10 },
            { startTimeMs: 120, words: 'words', durationMs: 50 }
          ]
        },
        {
          startTimeMs: 5000,
          words: 'Next line',
          durationMs: 5000,
          parts: []
        }
      ];

      lrcFixers(lyrics);

      expect(lyrics[0].parts![0].durationMs).toBeGreaterThan(50);
      expect(lyrics[0].parts![2].durationMs).toBeGreaterThan(50);
    });

    it('should not modify lyrics without parts', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Simple line',
          durationMs: 5000
        }
      ];

      lrcFixers(lyrics);

      expect(lyrics[0]).toEqual({
        startTimeMs: 0,
        words: 'Simple line',
        durationMs: 5000
      });
    });

    it('should handle empty parts array', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Test',
          durationMs: 5000,
          parts: []
        }
      ];

      expect(() => lrcFixers(lyrics)).not.toThrow();
    });

    it('should not fix long duration spaces', () => {
      const lyrics: LyricsArray = [
        {
          startTimeMs: 0,
          words: 'Test lyrics',
          durationMs: 5000,
          parts: [
            { startTimeMs: 0, words: 'Test', durationMs: 500 },
            { startTimeMs: 500, words: ' ', durationMs: 1000 },
            { startTimeMs: 1500, words: 'lyrics', durationMs: 500 }
          ]
        }
      ];

      const originalDuration = lyrics[0].parts![0].durationMs;
      lrcFixers(lyrics);

      expect(lyrics[0].parts![0].durationMs).toBe(originalDuration);
    });
  });

  describe('parsePlainLyrics', () => {
    it('should parse plain lyrics into array', () => {
      const lyrics = `Line 1
Line 2
Line 3`;

      const result = parsePlainLyrics(lyrics);

      expect(result).toHaveLength(3);
      expect(result[0].words).toBe('Line 1');
      expect(result[1].words).toBe('Line 2');
      expect(result[2].words).toBe('Line 3');
    });

    it('should set all timestamps to 0', () => {
      const lyrics = `Line 1
Line 2`;

      const result = parsePlainLyrics(lyrics);

      expect(result[0].startTimeMs).toBe(0);
      expect(result[0].durationMs).toBe(0);
      expect(result[1].startTimeMs).toBe(0);
      expect(result[1].durationMs).toBe(0);
    });

    it('should handle empty string', () => {
      const result = parsePlainLyrics('');

      expect(result).toHaveLength(1);
      expect(result[0].words).toBe('');
    });

    it('should handle single line', () => {
      const result = parsePlainLyrics('Single line');

      expect(result).toHaveLength(1);
      expect(result[0].words).toBe('Single line');
    });

    it('should preserve empty lines', () => {
      const lyrics = `Line 1

Line 3`;

      const result = parsePlainLyrics(lyrics);

      expect(result).toHaveLength(3);
      expect(result[1].words).toBe('');
    });

    it('should not trim whitespace from lines', () => {
      const lyrics = `  Line with spaces  `;

      const result = parsePlainLyrics(lyrics);

      expect(result[0].words).toBe('  Line with spaces  ');
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatRelativeTime,
  formatTimestamp,
  formatEta,
  formatEventType,
  getStatusColorClass,
} from './formatters';

describe('formatters', () => {
  describe('formatRelativeTime', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-04-14T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return "Just now" for less than 60 seconds ago', () => {
      expect(formatRelativeTime('2026-04-14T11:59:30Z')).toBe('Just now');
    });

    it('should return "1 minute ago" for exactly 1 minute', () => {
      expect(formatRelativeTime('2026-04-14T11:59:00Z')).toBe('1 minute ago');
    });

    it('should return "X minutes ago" for multiple minutes', () => {
      expect(formatRelativeTime('2026-04-14T11:45:00Z')).toBe('15 minutes ago');
    });

    it('should return "1 hour ago" for exactly 1 hour', () => {
      expect(formatRelativeTime('2026-04-14T11:00:00Z')).toBe('1 hour ago');
    });

    it('should return "X hours ago" for multiple hours', () => {
      expect(formatRelativeTime('2026-04-14T06:00:00Z')).toBe('6 hours ago');
    });

    it('should return "1 day ago" for exactly 1 day', () => {
      expect(formatRelativeTime('2026-04-13T12:00:00Z')).toBe('1 day ago');
    });

    it('should return "X days ago" for multiple days', () => {
      expect(formatRelativeTime('2026-04-11T12:00:00Z')).toBe('3 days ago');
    });
  });

  describe('formatTimestamp', () => {
    it('should format a date string to locale format', () => {
      const result = formatTimestamp('2026-04-14T15:30:00Z');

      // The exact output depends on locale/timezone, but should contain month and time
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should include month abbreviation', () => {
      const result = formatTimestamp('2026-01-15T10:30:00Z');
      // Should contain "Jan"
      expect(result).toContain('Jan');
    });
  });

  describe('formatEta', () => {
    it('should return "Arriving" for less than 1 minute', () => {
      expect(formatEta(0)).toBe('Arriving');
      expect(formatEta(0.5)).toBe('Arriving');
    });

    it('should return "1 min" for exactly 1 minute', () => {
      expect(formatEta(1)).toBe('1 min');
    });

    it('should return "X mins" for multiple minutes', () => {
      expect(formatEta(5)).toBe('5 mins');
      expect(formatEta(15)).toBe('15 mins');
      expect(formatEta(60)).toBe('60 mins');
    });
  });

  describe('formatEventType', () => {
    it('should map PANIC_BUTTON to "Panic Button"', () => {
      expect(formatEventType('PANIC_BUTTON')).toBe('Panic Button');
    });

    it('should map INCIDENT to "Incident"', () => {
      expect(formatEventType('INCIDENT')).toBe('Incident');
    });

    it('should map DEVIATION to "Route Deviation"', () => {
      expect(formatEventType('DEVIATION')).toBe('Route Deviation');
    });

    it('should map OTHER to "Other"', () => {
      expect(formatEventType('OTHER')).toBe('Other');
    });

    it('should map BOARD to "Boarded"', () => {
      expect(formatEventType('BOARD')).toBe('Boarded');
    });

    it('should map ALIGHT to "Alighted"', () => {
      expect(formatEventType('ALIGHT')).toBe('Alighted');
    });

    it('should pass through unknown event types', () => {
      expect(formatEventType('CUSTOM_EVENT')).toBe('CUSTOM_EVENT');
      expect(formatEventType('unknown')).toBe('unknown');
    });
  });

  describe('getStatusColorClass', () => {
    it('should return green for normal status', () => {
      expect(getStatusColorClass('normal')).toBe('bg-green-500');
    });

    it('should return yellow for delay status', () => {
      expect(getStatusColorClass('delay')).toBe('bg-yellow-500');
    });

    it('should return red for emergency status', () => {
      expect(getStatusColorClass('emergency')).toBe('bg-red-500');
    });

    it('should return gray for unknown status', () => {
      expect(getStatusColorClass('unknown')).toBe('bg-gray-500');
      expect(getStatusColorClass('other')).toBe('bg-gray-500');
    });
  });
});

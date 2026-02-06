import { describe, it, expect } from 'vitest';
import {
    formatAsDateTimeLocalValue,
    parseSessionDate,
    getDeviceTimezone,
} from './dateUtils';

describe('formatAsDateTimeLocalValue', () => {
    it('returns YYYY-MM-DDTHH:mm format', () => {
        const date = new Date('2026-02-06T14:30:00Z');
        const result = formatAsDateTimeLocalValue(date);
        // Should be 16 chars: "YYYY-MM-DDTHH:mm"
        expect(result).toHaveLength(16);
        expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    });

    it('round-trips through new Date().toISOString() back to the same instant', () => {
        // This is the exact flow: server ISO → Date → datetime-local → user edits → new Date(local).toISOString()
        const originalIso = '2026-06-15T18:45:00.000Z';
        const original = new Date(originalIso);

        // Step 1: Format for the input (what the user sees)
        const localStr = formatAsDateTimeLocalValue(original);

        // Step 2: Convert back the same way the form does on submit
        const restored = new Date(localStr).toISOString();

        // The restored ISO should represent the same instant.
        // new Date(localStr) interprets the string as local time,
        // and toISOString() converts back to UTC — so it should match.
        expect(new Date(restored).getTime()).toBe(original.getTime());
    });

    it('handles midnight correctly', () => {
        const midnight = new Date('2026-01-01T00:00:00Z');
        const result = formatAsDateTimeLocalValue(midnight);
        expect(result).toMatch(/T\d{2}:\d{2}$/);
    });
});

describe('parseSessionDate', () => {
    it('parses ISO 8601 strings', () => {
        const result = parseSessionDate('2026-02-06T14:30:00.000Z');
        expect(result).toBeInstanceOf(Date);
        expect(result.toISOString()).toBe('2026-02-06T14:30:00.000Z');
    });

    it('parses ISO strings without milliseconds', () => {
        const result = parseSessionDate('2026-02-06T14:30:00Z');
        expect(result).toBeInstanceOf(Date);
        expect(result.getFullYear()).toBe(2026);
    });
});

describe('getDeviceTimezone', () => {
    it('returns a non-empty IANA timezone string', () => {
        const tz = getDeviceTimezone();
        expect(tz).toBeTruthy();
        // IANA timezones contain a slash (e.g., "America/New_York", "UTC" is the exception)
        expect(typeof tz).toBe('string');
    });
});

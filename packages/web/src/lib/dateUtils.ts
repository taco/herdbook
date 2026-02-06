/**
 * Convert a Date object to a string compatible with <input type="datetime-local">.
 * The input element works in local time, so we shift the UTC instant
 * by the browser's current UTC offset before slicing the ISO string.
 */
export function formatAsDateTimeLocalValue(date: Date): string {
    const tzOffsetMs = date.getTimezoneOffset() * 60_000;
    return new Date(date.getTime() - tzOffsetMs).toISOString().slice(0, 16);
}

/**
 * Parse a session date value from the GraphQL layer into a Date object.
 * The DateTimeResolver always returns ISO 8601 strings, so we parse directly.
 */
export function parseSessionDate(value: string): Date {
    return new Date(value);
}

/**
 * Return the device's IANA timezone identifier (e.g. "America/New_York").
 */
export function getDeviceTimezone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/**
 * Format a session time for display, including the timezone abbreviation.
 * e.g. "3:30 PM EST"
 */
export function formatSessionTime(date: Date): string {
    return date.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

/**
 * Format a session date and time for display, including the timezone.
 * e.g. "Feb 6, 3:30 PM EST"
 */
export function formatSessionDateTime(date: Date): string {
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
    });
}

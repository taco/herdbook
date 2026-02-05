/**
 * API configuration and URL builders.
 *
 * VITE_API_URL must be set to the base API URL (e.g., https://localhost:4000).
 * No defaults - this will throw if not configured.
 */

function getApiUrl(): string {
    const url = import.meta.env.VITE_API_URL;
    if (!url) {
        throw new Error(
            'VITE_API_URL environment variable is not set. ' +
                'Add it to your .env.local file (e.g., VITE_API_URL=https://localhost:4000)'
        );
    }
    return url;
}

/** Base API URL (e.g., https://localhost:4000) */
export const API_URL = getApiUrl();

/** GraphQL endpoint URL */
export const GRAPHQL_URL = `${API_URL}/graphql`;

/** Build a REST API endpoint URL */
export function apiEndpoint(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_URL}${normalizedPath}`;
}

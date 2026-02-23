/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Base API URL (e.g., https://localhost:4000). Required. */
    readonly VITE_API_URL: string;
    readonly VITE_DEV_EMAIL?: string;
    readonly VITE_DEV_PASSWORD?: string;
    readonly VITE_DEV_AUTOLOGIN?: string;
    /** Sentry DSN for error tracking. Omit to disable Sentry. */
    readonly VITE_SENTRY_DSN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

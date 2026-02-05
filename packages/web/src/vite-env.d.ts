/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Base API URL (e.g., https://localhost:4000). Required. */
    readonly VITE_API_URL: string;
    readonly VITE_DEV_EMAIL?: string;
    readonly VITE_DEV_PASSWORD?: string;
    readonly VITE_DEV_AUTOLOGIN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_DEV_EMAIL?: string;
    readonly VITE_DEV_PASSWORD?: string;
    readonly VITE_DEV_AUTOLOGIN?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import fs from 'fs';

function getHttpsConfig(): { key: string; cert: string } | false {
    if (process.env.USE_HTTPS === 'false') {
        return false;
    }
    const key = path.resolve(__dirname, '../../localhost+3-key.pem');
    const cert = path.resolve(__dirname, '../../localhost+3.pem');
    if (fs.existsSync(key) && fs.existsSync(cert)) {
        return { key, cert };
    }
    return false;
}

const httpsConfig = getHttpsConfig();
const apiTarget =
    process.env.VITE_API_URL ??
    (httpsConfig ? 'https://localhost:4000' : 'http://localhost:4000');

export default defineConfig({
    plugins: [
        react(),
        tailwindcss(),
        VitePWA({
            registerType: 'autoUpdate',
            manifest: {
                name: 'Herdbook',
                short_name: 'Herdbook',
                description: 'Horse management application',
                display: 'standalone',
                theme_color: '#ffffff',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                    },
                ],
            },
        }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 3000,
        https: httpsConfig || undefined,
        host: true,
        proxy: {
            '/graphql': {
                target: apiTarget,
                secure: false,
            },
            '/api': {
                target: apiTarget,
                secure: false,
            },
        },
    },
});

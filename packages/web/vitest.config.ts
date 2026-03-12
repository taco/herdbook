import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    define: {
        __BUILD_SHA__: JSON.stringify('test'),
        __BUILD_TIME__: JSON.stringify('2000-01-01T00:00:00.000Z'),
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/test/setup.ts',
    },
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            'virtual:pwa-register/react': path.resolve(
                __dirname,
                './src/test/stubs/pwa-register-react.ts'
            ),
        },
    },
});

import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    server: {
        port: 3000,
        // Bind to localhost only — never expose the dev server to the network
        host: '127.0.0.1',
    },
    plugins: [react()],
    // NOTE: Do NOT inject any API keys here. All secrets must remain server-side
    // (Supabase Edge Functions, backend services). VITE_* env vars are bundled
    // into the client JS and are publicly readable.
    resolve: {
        alias: {
            '@': path.resolve(__dirname, '.'),
        }
    }
});


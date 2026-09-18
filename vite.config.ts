import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  base: './',
  plugins: [react(), {
    name: 'local-dev-connect-policy',
    transformIndexHtml(html) {
      return command === 'serve' ? html.replace("connect-src 'none'", "connect-src 'self' ws://127.0.0.1:* ws://localhost:*") : html;
    },
  }],
  server: { host: '127.0.0.1', port: 3000, strictPort: true },
}));

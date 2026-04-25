/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
//
// Local dev WebSocket setup (only needed if running services on localhost):
//   export VITE_API_URL=http://localhost:3001                # api-gateway
//   export VITE_ALERTS_WS_URL=http://localhost:3002          # emergency-alerts
//   export VITE_PRESENCE_WS_URL=http://localhost:3003        # student-presence
//   export VITE_MAPTILER_KEY=<your-key>
//   pnpm dev
//
// When VITE_API_URL points at the cluster (e.g. https://api.sbtm.ca) the
// per-service overrides are not needed: the cluster ingress routes
// /ws/alerts and /ws/presence to the right services.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/setupTests.ts',
    css: true,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});

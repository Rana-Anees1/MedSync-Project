import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Later: add a proxy so the frontend can call the Express API without CORS issues.
// server: { proxy: { '/api': 'http://localhost:5000' } }
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, open: true },
  preview: { port: 4173 },
});

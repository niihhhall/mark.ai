import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// In production the dashboard is served by the FastAPI backend under
// /admin/dashboard, so assets must resolve from that base. In dev it stays at
// root for the Vite dev server (npm run dev -> http://localhost:5173).
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  base: mode === 'production' ? '/admin/dashboard/' : '/',
}))

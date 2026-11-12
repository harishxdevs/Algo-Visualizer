import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served from the domain root by default (Vercel, Netlify).
// For GitHub Pages set VITE_BASE=/algo-visualizer/ (see the deploy:pages script).
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/',
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  // Treat as SPA: dev and preview servers will serve index.html
  // for any path that doesn't match a real file (e.g. /embed).
  appType: 'spa',

  server: {
    headers: {
      // Allow the /embed route to be loaded inside cross-origin iframes
      'Access-Control-Allow-Origin': '*',
    },
  },

  preview: {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
})

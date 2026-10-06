import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_API_PROXY_TARGET || 'http://localhost:8001'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': backendUrl,
        '/health': backendUrl,
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
    },
  }
})

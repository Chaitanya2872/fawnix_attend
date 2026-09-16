import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function isServerResponse(value) {
  return Boolean(
    value &&
      typeof value.writeHead === 'function' &&
      typeof value.end === 'function'
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:5000'
  const backendProxy = {
    target: apiTarget,
    changeOrigin: true,
    configure(proxy) {
      proxy.on('error', (error, _req, res) => {
        if (!isServerResponse(res) || res.headersSent) {
          return
        }

        res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          success: false,
          error: 'Backend Unavailable',
          message: `Backend unavailable at ${apiTarget}. Start the Flask backend and try again.`,
          detail: error.message
        }))
      })
    }
  }

  return {
    plugins: [react()],
    resolve: {
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom'],
      extensions: ['.mjs', '.mts', '.ts', '.tsx', '.js', '.jsx', '.json']
    },
    server: {
      proxy: {
        '/api': backendProxy,
        '/health': backendProxy
      }
    }
  }
})

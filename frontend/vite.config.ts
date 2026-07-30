import type { ServerResponse } from 'node:http'
import { defineConfig, loadEnv, type ProxyOptions } from 'vite'
import react from '@vitejs/plugin-react'

function isServerResponse(value: unknown): value is ServerResponse {
  return Boolean(
    value &&
    typeof (value as ServerResponse).writeHead === 'function' &&
    typeof (value as ServerResponse).end === 'function'
  )
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://localhost:5000'
  const backendProxy: ProxyOptions = {
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
      dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
    },
    server: {
      proxy: {
        '/api': backendProxy,
        '/health': backendProxy
      }
    }
  }
})

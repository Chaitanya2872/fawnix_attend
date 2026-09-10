"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var vite_1 = require("vite");
var plugin_react_1 = require("@vitejs/plugin-react");
function isServerResponse(value) {
    return Boolean(value &&
        typeof value.writeHead === 'function' &&
        typeof value.end === 'function');
}
// https://vite.dev/config/
exports.default = (0, vite_1.defineConfig)(function (_a) {
    var mode = _a.mode;
    var env = (0, vite_1.loadEnv)(mode, process.cwd(), '');
    var apiTarget = env.VITE_API_PROXY_TARGET || env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
    var backendProxy = {
        target: apiTarget,
        changeOrigin: true,
        configure: function (proxy) {
            proxy.on('error', function (error, _req, res) {
                if (!isServerResponse(res) || res.headersSent) {
                    return;
                }
                res.writeHead(502, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: false,
                    error: 'Backend Unavailable',
                    message: "Backend unavailable at ".concat(apiTarget, ". Start the Flask backend and try again."),
                    detail: error.message
                }));
            });
        }
    };
    return {
        plugins: [(0, plugin_react_1.default)()],
        resolve: {
            dedupe: ['react', 'react-dom', 'react-router', 'react-router-dom']
        },
        server: {
            proxy: {
                '/api': backendProxy,
                '/health': backendProxy
            }
        }
    };
});

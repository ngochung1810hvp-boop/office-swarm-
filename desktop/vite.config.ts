import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite config tailored for Tauri:
// - Fixed port 1420 (allowlisted in CORS on the Python side).
// - HMR talks back over the same port so the Tauri webview reloads on save.
// - `build.target` matches Tauri's WebView2 baseline on Windows.
const host = process.env.TAURI_DEV_HOST;

export default defineConfig({
    plugins: [react()],
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: host || false,
        hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    build: {
        target: ["es2021", "chrome105", "safari13"],
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});

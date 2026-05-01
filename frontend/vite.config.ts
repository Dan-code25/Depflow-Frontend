import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  // Load env variables (without VITE_ prefix restriction)
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/gemini": {
          target: "https://generativelanguage.googleapis.com",
          changeOrigin: true,
          // Append the key directly in the rewrite — reliable across all http-proxy versions
          rewrite: (path) =>
            path.replace(/^\/api\/gemini/, "") + `?key=${env.GEMINI_API_KEY}`,
        },
      },
    },
  };
});
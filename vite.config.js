import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // Load environment variables from .env files
  const env = loadEnv(mode, process.cwd(), '');
  const backendPort = env.PORT || 3000;
  const backendHost = env.HOST && env.HOST !== '0.0.0.0' ? env.HOST : 'localhost';
  const backendTarget = env.BACKEND_URL || `http://${backendHost}:${backendPort}`;

  return {
    server: {
      port: parseInt(env.VITE_PORT || '5173', 10),
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true
        }
      }
    }
  };
});


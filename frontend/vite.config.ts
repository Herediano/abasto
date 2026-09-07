import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // Escuchar en toda la red (para verlo desde el celular / un túnel).
    host: true,
    // Dejar pasar cualquier host: el túnel usa un dominio aleatorio.
    allowedHosts: true,
    // El frontend llama a `/api` (VITE_API_URL) y Vite lo reenvía al backend,
    // así todo entra por un solo puerto y un solo dominio.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});

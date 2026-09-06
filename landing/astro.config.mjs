// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// El dominio real (abasto.ai) es un TO-DO: cuando exista, actualizar `site`
// para que el sitemap y las URLs canónicas/hreflang salgan absolutas.
export default defineConfig({
  site: 'https://abasto.ai',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
    routing: {
      prefixDefaultLocale: false, // "/" = español, "/en/" = inglés
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: { es: 'es-AR', en: 'en-US' },
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});

# Abasto — landing

Sitio de marketing de Abasto. Estático, bilingüe (español por defecto, inglés en
`/en/`), construido con **Astro 5 + Tailwind v4**. Separado del producto
(`frontend/`) pero comparte el sistema visual **Yerba**.

## Correr

```bash
cd landing
npm install
npm run dev        # http://localhost:4321
npm run build      # genera dist/ (estático)
npm run preview    # sirve el build
```

## Cómo está armado

```
src/
  layouts/Base.astro       cáscara: <head>, SEO/hreflang, tema, fondo, header, footer
  components/
    Background.astro        "El escritorio de fondo" (5 capas, parallax + latido)
    Header.astro            sticky, nav, toggles, CTA, menú mobile
    Footer.astro
    Logo.astro              abasto.ai (.ai en verde)
    ThemeToggle.astro       claro → oscuro → auto (localStorage)
    LangToggle.astro        ES · EN, conserva ancla y posición
    MiniDesk.astro          maqueta del escritorio (HTML/CSS, no screenshot)
    Page.astro              ensambla todas las secciones
  sections/                 Hero, Problema, Escritorio, Crece, Vision, Contacto
  styles/
    tokens.css             copia fiel de los --ab-* de frontend/src/styles.css
    global.css             mapea tokens a Tailwind v4 + clases base (.u-*)
  i18n/
    ui.ts                  TODO el copy, es + en
    utils.ts               getLangFromUrl / useTranslations / rutas localizadas
  pages/
    index.astro            español  (/)
    en/index.astro         inglés   (/en/)
```

### El fondo

`Background.astro` es la pieza de diseño propia: la caja de módulos del
escritorio vive como textura detrás de todo (grilla bento tenue vía `mask`
tokenizada → sigue el tema), con grano SVG, spotlight cálido en el hero y
cuatro "latidos" de estado ámbar/verde muy espaciados. Sin JS se ve completo;
`prefers-reduced-motion` congela parallax y latido.

## Sincronizar el tema con la app

`src/styles/tokens.css` es una **copia manual** de los bloques `--ab-*` de
`frontend/src/styles.css`. Si cambian en la app, copiarlos acá.

## Pendientes (TO-DO)

- [ ] **Dominio + Cloudflare Pages.** Crear el proyecto, conectar el repo
      (root `landing/`, build `npm run build`, output `dist`), apuntar
      `abasto.ai`. Actualizar `site` en `astro.config.mjs`.
- [ ] **Web3Forms.** Crear la key (destino `martinianoherediaf@gmail.com`) y
      cargarla como `PUBLIC_WEB3FORMS_KEY` en Cloudflare. Sin key, el form
      muestra un aviso y ofrece el mailto.
- [ ] **Colores de `MiniDesk`** — hoy están eyeballed de la captura de Gaston.
      Pegar los hex exactos del `HUES` actual de `frontend/src/lib/modules.tsx`
      (la app en producción tiene tonos más saturados que esta rama).
- [ ] **Capturas reales del escritorio** con `npm run db:seed-demo` (claro y
      oscuro) para reemplazar / complementar `MiniDesk`.
- [ ] **OG en PNG** 1200×630 (hoy es `public/og.svg`).
- [ ] Revisión de copy con el equipo (es y en).

Hecho: fuentes self-host (Fontsource, sin Google), favicon (grilla bento +
punto de aviso), escritorio de la landing alineado con la app real.

## Deploy en Cloudflare Pages

- Framework preset: **Astro**
- Root directory: `landing`
- Build command: `npm run build`
- Build output: `dist`
- Variables de entorno: `PUBLIC_WEB3FORMS_KEY`

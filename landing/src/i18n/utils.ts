import { ui, defaultLang, type Lang, type UIKey } from './ui';

/** El idioma que sale de la URL: "/en/..." => en, cualquier otra cosa => es. */
export function getLangFromUrl(url: URL): Lang {
  const [, seg] = url.pathname.split('/');
  if (seg === 'en') return 'en';
  return defaultLang;
}

/** Traductor ligado a un idioma; cae al español si falta una clave. */
export function useTranslations(lang: Lang) {
  return function t(key: UIKey): string {
    return ui[lang][key] ?? ui[defaultLang][key];
  };
}

/** Prefija una ruta con el idioma ("/" para es, "/en" para en). */
export function localizePath(path: string, lang: Lang): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  if (lang === defaultLang) return clean === '/' ? '/' : clean;
  return clean === '/' ? '/en/' : `/en${clean}`;
}

/** La misma página en el otro idioma, conservando el ancla (#seccion). */
export function alternatePath(url: URL, to: Lang): string {
  let path = url.pathname;
  if (path.startsWith('/en/')) path = path.slice(3);
  else if (path === '/en') path = '/';
  return localizePath(path, to) + (url.hash || '');
}

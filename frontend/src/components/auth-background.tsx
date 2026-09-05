import { useEffect, useRef, type RefObject } from 'react';

/**
 * Fondo de las pantallas de login/signup: íconos de retail/depósito (caja,
 * changuito, etiqueta, camión, código de barras, bolsa) a la deriva, con
 * física real de colisión contra las paredes, entre ellos y contra la
 * tarjeta del medio (para que no pasen por detrás y queden invisibles).
 *
 * Los íconos son los mismos trazos "fill" de @phosphor-icons/react que ya usa
 * el riel de la app (Package, ShoppingCartSimple, Tag, Truck, Barcode,
 * ShoppingBag) — así el fondo habla el mismo idioma visual que la navegación,
 * no formas inventadas.
 *
 * La resolución de choques (rotar(), resolverChoque()) es la función clásica
 * de colisión elástica 2D del tutorial de Chris Courses/JS Mastery
 * (https://gist.github.com/christopher4lis/f9ccb589ee8ecf751481f05a8e59b1dc).
 */

type Vector = { x: number; y: number };

type Forma = {
  x: number;
  y: number;
  velocidad: Vector;
  masa: number;
  r: number;
  escalaIcono: number;
  rot: number;
  vrot: number;
  path: Path2D;
  faseRespiro: number;
  velRespiro: number;
  colorVar: string;
  color: string;
};

// Trazos "fill", viewBox 0 0 256 256 -- calcados de @phosphor-icons/react
// (dist/defs/<Icono>.es.js, variante "fill"), los mismos que usa app-shell.tsx.
const ICONOS_D = [
  // Package
  'M223.68,66.15,135.68,18a15.88,15.88,0,0,0-15.36,0l-88,48.17a16,16,0,0,0-8.32,14v95.64a16,16,0,0,0,8.32,14l88,48.17a15.88,15.88,0,0,0,15.36,0l88-48.17a16,16,0,0,0,8.32-14V80.18A16,16,0,0,0,223.68,66.15ZM128,32l80.35,44L178.57,92.29l-80.35-44Zm0,88L47.65,76,81.56,57.43l80.35,44Zm88,55.85h0l-80,43.79V133.83l32-17.51V152a8,8,0,0,0,16,0V107.56l32-17.51v85.76Z',
  // ShoppingCartSimple
  'M239.71,74.14l-25.64,92.28A24.06,24.06,0,0,1,191,184H92.16A24.06,24.06,0,0,1,69,166.42L33.92,40H16a8,8,0,0,1,0-16H40a8,8,0,0,1,7.71,5.86L57.19,64H232a8,8,0,0,1,7.71,10.14ZM88,200a16,16,0,1,0,16,16A16,16,0,0,0,88,200Zm104,0a16,16,0,1,0,16,16A16,16,0,0,0,192,200Z',
  // Tag
  'M243.31,136,144,36.69A15.86,15.86,0,0,0,132.69,32H40a8,8,0,0,0-8,8v92.69A15.86,15.86,0,0,0,36.69,144L136,243.31a16,16,0,0,0,22.63,0l84.68-84.68a16,16,0,0,0,0-22.63ZM84,96A12,12,0,1,1,96,84,12,12,0,0,1,84,96Z',
  // Truck
  'M255.43,117l-14-35A15.93,15.93,0,0,0,226.58,72H192V64a8,8,0,0,0-8-8H32A16,16,0,0,0,16,72V184a16,16,0,0,0,16,16H49a32,32,0,0,0,62,0h50a32,32,0,0,0,62,0h17a16,16,0,0,0,16-16V120A8.13,8.13,0,0,0,255.43,117ZM80,208a16,16,0,1,1,16-16A16,16,0,0,1,80,208ZM32,136V72H176v64Zm160,72a16,16,0,1,1,16-16A16,16,0,0,1,192,208Zm0-96V88h34.58l9.6,24Z',
  // Barcode
  'M224,40H32a8,8,0,0,0-8,8V208a8,8,0,0,0,8,8H224a8,8,0,0,0,8-8V48A8,8,0,0,0,224,40ZM40,64a8,8,0,0,1,8-8H80a8,8,0,0,1,0,16H56V96a8,8,0,0,1-16,0ZM80,200H48a8,8,0,0,1-8-8V160a8,8,0,0,1,16,0v24H80a8,8,0,0,1,0,16Zm24-48a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm32,0a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm24,8a8,8,0,0,1-8-8V104a8,8,0,0,1,16,0v48A8,8,0,0,1,160,160Zm56,32a8,8,0,0,1-8,8H176a8,8,0,0,1,0-16h24V160a8,8,0,0,1,16,0Zm0-96a8,8,0,0,1-16,0V72H176a8,8,0,0,1,0-16h32a8,8,0,0,1,8,8Z',
  // ShoppingBag
  'M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40Zm-88,96A48.05,48.05,0,0,1,80,88a8,8,0,0,1,16,0,32,32,0,0,0,64,0,8,8,0,0,1,16,0A48.05,48.05,0,0,1,128,136Z',
];
const ICONOS: Path2D[] = ICONOS_D.map(d => new Path2D(d));

const VARIABLES_COLOR = ['--ab-primary', '--ab-ok', '--ab-warn', '--ab-primary-line'];
const CANTIDAD_FORMAS = ICONOS_D.length; // uno de cada ícono, nunca se repite
const VELOCIDAD_MAX = 3.8;
// Además del radio de cada uno, este margen mantiene aire entre los íconos
// incluso cuando "chocan" -- que se rocen, no que se toquen.
const ESPACIO_MINIMO = 18;
// Corregir de golpe el 100% de una superposición es lo que producía el
// flickering: un objeto atrapado entre dos límites (la tarjeta y el borde,
// o dos íconos) se corregía para un lado y al cuadro siguiente violaba el
// otro, rebotando sin asentarse nunca. Corrigiendo sólo una fracción por
// cuadro (técnica estándar de motores como Box2D) el sistema converge suave
// en vez de flickear, sin robarle energía al movimiento (eso es aparte, en
// la reflexión de velocidad, que sigue siendo elástica).
const CORRECCION_PARCIAL = 0.5;

/** Fisher-Yates: un orden al azar de [0..n). */
function barajar(n: number): number[] {
  const orden = Array.from({ length: n }, (_, i) => i);
  for (let i = orden.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [orden[i], orden[j]] = [orden[j], orden[i]];
  }
  return orden;
}

/** Pasa una velocidad al sistema de coordenadas rotado `angulo`. */
function rotar(velocidad: Vector, angulo: number): Vector {
  return {
    x: velocidad.x * Math.cos(angulo) - velocidad.y * Math.sin(angulo),
    y: velocidad.x * Math.sin(angulo) + velocidad.y * Math.cos(angulo),
  };
}

/** Colisión elástica 2D entre dos formas (ver cita de la fuente arriba). */
function resolverChoque(a: Forma, b: Forma) {
  const dvx = a.velocidad.x - b.velocidad.x;
  const dvy = a.velocidad.y - b.velocidad.y;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (dvx * dx + dvy * dy >= 0) return;

  const angulo = -Math.atan2(b.y - a.y, b.x - a.x);
  const m1 = a.masa;
  const m2 = b.masa;
  const u1 = rotar(a.velocidad, angulo);
  const u2 = rotar(b.velocidad, angulo);

  const v1: Vector = { x: (u1.x * (m1 - m2) + u2.x * 2 * m2) / (m1 + m2), y: u1.y };
  const v2: Vector = { x: (u2.x * (m2 - m1) + u1.x * 2 * m1) / (m1 + m2), y: u2.y };

  const final1 = rotar(v1, -angulo);
  const final2 = rotar(v2, -angulo);
  a.velocidad.x = final1.x;
  a.velocidad.y = final1.y;
  b.velocidad.x = final2.x;
  b.velocidad.y = final2.y;
}

type Rect = { left: number; right: number; top: number; bottom: number };

/** Círculo contra rectángulo (AABB) estático: la tarjeta no se mueve, así que rebota como una pared -- no se reparte impulso, sólo se refleja la velocidad. */
function resolverChoqueRectangulo(f: Forma, rect: Rect) {
  const cx = Math.min(Math.max(f.x, rect.left), rect.right);
  const cy = Math.min(Math.max(f.y, rect.top), rect.bottom);
  let dx = f.x - cx;
  let dy = f.y - cy;
  let dist = Math.hypot(dx, dy);
  if (dist === 0) {
    // El centro cayó adentro del rectángulo: salir por el borde más cercano.
    const dl = f.x - rect.left;
    const dr = rect.right - f.x;
    const dt = f.y - rect.top;
    const db = rect.bottom - f.y;
    const min = Math.min(dl, dr, dt, db);
    if (min === dl) { dx = -1; dy = 0; }
    else if (min === dr) { dx = 1; dy = 0; }
    else if (min === dt) { dx = 0; dy = -1; }
    else { dx = 0; dy = 1; }
    dist = 0.001;
  }
  if (dist >= f.r) return;
  const nx = dx / dist;
  const ny = dy / dist;
  f.x += nx * (f.r - dist) * CORRECCION_PARCIAL;
  f.y += ny * (f.r - dist) * CORRECCION_PARCIAL;
  const vn = f.velocidad.x * nx + f.velocidad.y * ny;
  if (vn < 0) {
    f.velocidad.x -= 2 * vn * nx;
    f.velocidad.y -= 2 * vn * ny;
  }
}

export function AuthBackground({ obstaculoRef }: { obstaculoRef?: RefObject<HTMLElement | null> }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvasActual = canvasRef.current;
    const ctxActual = canvasActual?.getContext('2d');
    if (!canvasActual || !ctxActual) return;
    // Alias con tipo no-nulable: las funciones de abajo son declaraciones
    // (se izan), así que TS no puede confiar en el chequeo de arriba para
    // ellas si siguen usando canvasActual/ctxActual directamente.
    const canvas: HTMLCanvasElement = canvasActual;
    const ctx: CanvasRenderingContext2D = ctxActual;

    // "Reducir movimiento" nunca apaga el loop del todo -- cortarlo por
    // completo es lo que rompía la animación (sólo se veía redibujar cuando
    // otra cosa disparaba un resize, como pasar a pantalla completa). En vez
    // de cancelar el requestAnimationFrame, baja la velocidad; el loop corre
    // siempre.
    const factorMovimiento = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.3 : 1;
    let ancho = 0;
    let alto = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cuadro = 0;
    const formas: Forma[] = [];

    function resolverColores() {
      const estilo = getComputedStyle(document.documentElement);
      for (const forma of formas) forma.color = estilo.getPropertyValue(forma.colorVar).trim();
    }

    /** Nace del lado pedido de la tarjeta, nunca adentro. */
    function elegirPosicionLado(r: number, lado: 'izquierda' | 'derecha', rect: Rect | null): { x: number; y: number } {
      const y = r + Math.random() * Math.max(1, alto - 2 * r);
      if (!rect) return { x: r + Math.random() * Math.max(1, ancho - 2 * r), y };
      if (lado === 'izquierda') {
        const maxX = Math.max(r, rect.left - r);
        return { x: Math.min(r + Math.random() * Math.max(1, maxX - r), maxX), y };
      }
      const minX = Math.min(ancho - r, rect.right + r);
      return { x: Math.max(minX + Math.random() * Math.max(1, ancho - r - minX), minX), y };
    }

    function crearFormas() {
      formas.length = 0;
      const rect = obtenerRectObstaculo();
      // Sin esto, por azar podían quedar 5 de un lado y 1 solo del otro
      // (una tirada al azar de pocos objetos se agrupa más seguido de lo que
      // parece) -- mitad y mitad garantizado, así arranca poblado de los dos
      // lados. Encima el radio se adapta al margen real de cada lado: en una
      // ventana angosta, mejor un ícono chico que uno grande sin lugar para
      // rebotar (eso era lo que flickeaba).
      const margenIzq = rect ? Math.max(rect.left, 0) : ancho / 2;
      const margenDer = rect ? Math.max(ancho - rect.right, 0) : ancho / 2;
      const mitad = Math.ceil(CANTIDAD_FORMAS / 2);
      const ordenIconos = barajar(ICONOS.length); // cada ícono aparece una sola vez
      for (let i = 0; i < CANTIDAD_FORMAS; i++) {
        const lado: 'izquierda' | 'derecha' = i < mitad ? 'izquierda' : 'derecha';
        const margenLado = lado === 'izquierda' ? margenIzq : margenDer;
        const radioMax = Math.min(62, Math.max(12, margenLado * 0.55 - ESPACIO_MINIMO / 2));
        const radioMin = Math.max(10, radioMax * 0.55);
        const r = radioMin + Math.random() * Math.max(1, radioMax - radioMin);
        const { x, y } = elegirPosicionLado(r, lado, rect);
        formas.push({
          x,
          y,
          velocidad: {
            x: (Math.random() - 0.5) * VELOCIDAD_MAX * factorMovimiento,
            y: (Math.random() - 0.5) * VELOCIDAD_MAX * factorMovimiento,
          },
          masa: 1,
          r,
          escalaIcono: (r * 1.9) / 256,
          rot: Math.random() * Math.PI * 2,
          vrot: (Math.random() - 0.5) * 0.025 * factorMovimiento,
          path: ICONOS[ordenIconos[i]],
          faseRespiro: Math.random() * Math.PI * 2,
          velRespiro: (0.01 + Math.random() * 0.012) * factorMovimiento,
          colorVar: VARIABLES_COLOR[i % VARIABLES_COLOR.length],
          color: '',
        });
      }
      resolverColores();
    }

    function redimensionar() {
      const padre = canvas.parentElement;
      if (!padre) return;
      ancho = padre.clientWidth;
      alto = padre.clientHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = ancho * dpr;
      canvas.height = alto * dpr;
      canvas.style.width = `${ancho}px`;
      canvas.style.height = `${alto}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      crearFormas();
      // Cambiar width/height resetea el canvas, y el ResizeObserver dispara
      // una vez apenas se lo observa: sin este dibujo acá, el primer cuadro
      // se vería en blanco hasta el siguiente tick del loop.
      dibujar();
    }

    /** Rectángulo de la tarjeta, en coordenadas del canvas (no de la pantalla). */
    function obtenerRectObstaculo(): Rect | null {
      const el = obstaculoRef?.current;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const base = canvas.getBoundingClientRect();
      return { left: r.left - base.left, right: r.right - base.left, top: r.top - base.top, bottom: r.bottom - base.top };
    }

    function paso() {
      cuadro++;
      const rectObstaculo = obtenerRectObstaculo();
      for (const f of formas) {
        // Un choque perfectamente elástico es un "billar" clásico: puede
        // quedar atrapado rebotando en una sola zona sin explorar el resto
        // de la mesa (son órbitas periódicas, no es casualidad) -- por eso a
        // veces se ven 5 de un lado y 1 solo del otro. Un empujoncito
        // aleatorio muy chico en la dirección (no en la velocidad: el módulo
        // no cambia) rompe esa periodicidad de a poco, sin que se note como
        // un salto, y con el tiempo se terminan repartiendo solos.
        const desvio = (Math.random() - 0.5) * 0.05 * factorMovimiento;
        const vx = f.velocidad.x;
        const vy = f.velocidad.y;
        f.velocidad.x = vx * Math.cos(desvio) - vy * Math.sin(desvio);
        f.velocidad.y = vx * Math.sin(desvio) + vy * Math.cos(desvio);

        f.x += f.velocidad.x;
        f.y += f.velocidad.y;
        f.rot += f.vrot;
        if (f.x - f.r < 0) {
          f.x = f.r;
          f.velocidad.x = Math.abs(f.velocidad.x);
        } else if (f.x + f.r > ancho) {
          f.x = ancho - f.r;
          f.velocidad.x = -Math.abs(f.velocidad.x);
        }
        if (f.y - f.r < 0) {
          f.y = f.r;
          f.velocidad.y = Math.abs(f.velocidad.y);
        } else if (f.y + f.r > alto) {
          f.y = alto - f.r;
          f.velocidad.y = -Math.abs(f.velocidad.y);
        }
        // La tarjeta cuenta como una pared más: así ninguno pasa por detrás
        // y queda escondido ahí (con vidriado o sin él).
        if (rectObstaculo) resolverChoqueRectangulo(f, rectObstaculo);
      }
      for (let i = 0; i < formas.length; i++) {
        for (let j = i + 1; j < formas.length; j++) {
          const a = formas[i];
          const b = formas[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distancia = Math.hypot(dx, dy) || 0.001;
          const minima = a.r + b.r + ESPACIO_MINIMO;
          if (distancia < minima) {
            // Separar antes de resolver la velocidad, si no quedan pegados
            // empujándose cuadro a cuadro -- y con el margen de arriba, el
            // "roce" deja aire entre los dos en vez de tocarse borde a borde.
            const nx = dx / distancia;
            const ny = dy / distancia;
            const superposicion = ((minima - distancia) / 2) * CORRECCION_PARCIAL;
            a.x -= nx * superposicion;
            a.y -= ny * superposicion;
            b.x += nx * superposicion;
            b.y += ny * superposicion;
            resolverChoque(a, b);
          }
        }
      }
    }

    function dibujar() {
      ctx.clearRect(0, 0, ancho, alto);
      for (const f of formas) {
        // Un respiro sutil (escala oscilando) para que no sea sólo traslación
        // -- da la sensación de que están "vivos", no fichas deslizándose.
        const respiro = 1 + Math.sin(cuadro * f.velRespiro + f.faseRespiro) * 0.06;
        ctx.save();
        ctx.translate(f.x, f.y);
        ctx.rotate(f.rot);
        ctx.scale(f.escalaIcono * respiro, f.escalaIcono * respiro);
        ctx.translate(-128, -128);
        ctx.globalAlpha = 0.58;
        ctx.fillStyle = f.color;
        ctx.fill(f.path);
        ctx.restore();
      }
    }

    let raf = 0;
    function loop() {
      paso();
      dibujar();
      raf = requestAnimationFrame(loop);
    }

    redimensionar();
    raf = requestAnimationFrame(loop);

    const padre = canvas.parentElement;
    const ro = padre ? new ResizeObserver(redimensionar) : null;
    if (padre && ro) ro.observe(padre);

    // Los colores vienen de las variables del tema: si alguien cambia entre
    // claro y oscuro, las formas los toman en el próximo cuadro sin recrear
    // la escena (el loop corre siempre, así que no hace falta forzar un
    // redibujo acá).
    const mo = new MutationObserver(resolverColores);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    function alCambiarVisibilidad() {
      if (document.hidden) cancelAnimationFrame(raf);
      else raf = requestAnimationFrame(loop);
    }
    document.addEventListener('visibilitychange', alCambiarVisibilidad);

    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
      mo.disconnect();
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);
    };
  }, [obstaculoRef]);

  return <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0" />;
}

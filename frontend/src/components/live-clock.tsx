import { motion, useSpring, useTransform, type MotionValue } from 'motion/react';
import { useEffect, useState } from 'react';

/**
 * Un dígito 0-9 que rueda verticalmente al cambiar — misma técnica del
 * "Counter" de React Bits (spring + useTransform sobre 10 copias apiladas),
 * pero para un solo dígito 0-9 en vez de la cuenta completa: acá no hay
 * "lugares" (decenas, centenas) que dividir, cada posición de HH:MM:SS ya es
 * su propio dígito.
 */
function RollingDigit({ digit, height }: { digit: number; height: number }) {
  const spring = useSpring(digit, { stiffness: 300, damping: 30, mass: 0.7 });
  useEffect(() => {
    spring.set(digit);
  }, [digit, spring]);
  return (
    <span className="relative inline-block overflow-hidden tabular" style={{ height, width: '0.62em' }}>
      {Array.from({ length: 10 }, (_, n) => (
        <RollingDigitFace key={n} mv={spring} n={n} height={height} />
      ))}
    </span>
  );
}

function RollingDigitFace({ mv, n, height }: { mv: MotionValue<number>; n: number; height: number }) {
  const y = useTransform(mv, latest => {
    const offset = (10 + n - (latest % 10)) % 10;
    let px = offset * height;
    if (offset > 5) px -= 10 * height;
    return px;
  });
  return (
    <motion.span className="absolute inset-0 flex items-center justify-center" style={{ y }}>
      {n}
    </motion.span>
  );
}

/** Reloj en vivo HH:MM:SS con dígitos que ruedan al cambiar (mismo look que el
 *  odómetro de "Counter" de React Bits). `:` es texto plano, no rueda. */
export function LiveClock({ fontSize = 14, className }: { fontSize?: number; className?: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const height = fontSize * 1.25;
  const groups: [number, number][] = [
    [Math.floor(h / 10), h % 10],
    [Math.floor(m / 10), m % 10],
    [Math.floor(s / 10), s % 10],
  ];

  return (
    <span
      className={className}
      style={{ fontSize, lineHeight: 1, fontVariantNumeric: 'tabular-nums', display: 'inline-flex', alignItems: 'center' }}
      aria-label={now.toLocaleTimeString('es-AR')}
    >
      {groups.map(([tens, units], i) => (
        <span key={i} className="inline-flex items-center">
          {i > 0 && <span className="mx-px opacity-60">:</span>}
          <RollingDigit digit={tens} height={height} />
          <RollingDigit digit={units} height={height} />
        </span>
      ))}
    </span>
  );
}

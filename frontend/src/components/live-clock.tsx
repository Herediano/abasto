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

/** Reloj en vivo HH:MM con los segundos como badge chico arriba a la derecha
 *  (mismo look que el odómetro de "Counter" de React Bits, dígito a dígito).
 *  `:` es texto plano, no rueda. */
export function LiveClock({
  fontSize = 14,
  showSeconds = true,
  secondsScale = 0.22,
  className,
}: {
  fontSize?: number;
  showSeconds?: boolean;
  /** Tamaño de los segundos relativo a `fontSize`. */
  secondsScale?: number;
  className?: string;
}) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const height = fontSize * 1.25;
  const secondsFontSize = fontSize * secondsScale;
  const secondsHeight = secondsFontSize * 1.25;

  return (
    <span
      className={className}
      style={{ display: 'inline-flex', alignItems: 'flex-start' }}
      aria-label={now.toLocaleTimeString('es-AR', { hour12: false })}
    >
      <span
        className="inline-flex items-center"
        style={{ fontSize, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}
      >
        <RollingDigit digit={Math.floor(h / 10)} height={height} />
        <RollingDigit digit={h % 10} height={height} />
        <span className="relative mx-px inline-block" style={{ height, width: '0.32em' }}>
          <span className="absolute inset-0 flex items-center justify-center">:</span>
        </span>
        <RollingDigit digit={Math.floor(m / 10)} height={height} />
        <RollingDigit digit={m % 10} height={height} />
      </span>
      {/* Al costado del último dígito de los minutos, pegados — no arriba. */}
      {showSeconds && (
        <span
          className="ml-1 inline-flex items-center text-muted-foreground"
          style={{ fontSize: secondsFontSize, fontVariantNumeric: 'tabular-nums', transform: `translateY(${secondsHeight * 0.68}px)` }}
        >
          <RollingDigit digit={Math.floor(s / 10)} height={secondsHeight} />
          <RollingDigit digit={s % 10} height={secondsHeight} />
        </span>
      )}
    </span>
  );
}

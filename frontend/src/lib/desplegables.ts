/*
 * Desplegables excluyentes del escritorio: campana, checklist y menú de
 * cuenta. Cada uno se registra acá mientras está abierto y, al abrirse,
 * `cerrarOtrosDesplegables` cierra los demás — no puede haber dos paneles
 * flotando a la vez.
 */

type Cerrar = () => void;

const abiertos = new Map<string, Cerrar>();

/** Devuelve una función para des-registrar (usar en el cleanup del effect). */
export function registrarDesplegable(id: string, cerrar: Cerrar): () => void {
  abiertos.set(id, cerrar);
  return () => {
    abiertos.delete(id);
  };
}

/** Cierra todos los desplegables abiertos EXCEPTO el que se está abriendo. */
export function cerrarOtrosDesplegables(abriendo: string) {
  for (const [id, cerrar] of abiertos) {
    if (id !== abriendo) cerrar();
  }
}
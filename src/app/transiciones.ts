import { ESTADOS, ESTADO, TRANSICIONES, type EstadoOS } from "@/domain/estados";

const posicion = (e: EstadoOS) => ESTADOS.indexOf(e);

/**
 * Un cambio pide motivo cuando no es avance natural: rechazar, retener o
 * regresar a un estado anterior (O.C. rechazada, sobrecosto, espera de
 * refacción). Quién puede hacerlo lo decide el backend, no esta función.
 */
export function requiereMotivo(de: EstadoOS, a: EstadoOS): boolean {
  if (a === "rechazada" || a === "retenida") return true;
  return posicion(a) < posicion(de);
}

/** Destinos que permite la topología, con el avance natural primero. */
export function destinos(de: EstadoOS): EstadoOS[] {
  return [...TRANSICIONES[de]].sort((a, b) => Number(requiereMotivo(de, a)) - Number(requiereMotivo(de, b)));
}

export const esTerminal = (e: EstadoOS): boolean => ESTADO[e].terminal === true;

/**
 * Camino que seguirá la O.S. si todo avanza sin retornos: el primer destino
 * no excepcional de cada estado, hasta cerrar. Sirve para dibujar lo que falta.
 */
export function caminoRestante(desde: EstadoOS): EstadoOS[] {
  const camino: EstadoOS[] = [];
  let actual = desde;
  for (let i = 0; i < ESTADOS.length; i++) {
    const siguiente = destinos(actual).find((d) => !requiereMotivo(actual, d));
    if (!siguiente || camino.includes(siguiente)) break;
    camino.push(siguiente);
    actual = siguiente;
  }
  return camino;
}

/**
 * Estados a los que no se entra con un clic: piden su propio formulario.
 * "Unidad recibida" exige registrar la condición, las fotos y quién entrega.
 */
export const requiereFormulario = (a: EstadoOS): boolean => a === "unidad_recibida";

/** Destinos que se pueden ejecutar desde el diálogo de cambio de estado. */
export const destinosDirectos = (de: EstadoOS): EstadoOS[] => destinos(de).filter((d) => !requiereFormulario(d));

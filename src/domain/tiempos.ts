import { ESTADO, type EstadoOS } from "./estados";
import type { EventoOS } from "./bitacora";

/**
 * Tiempos de la O.S. derivados de la bitácora. No se guarda nada: cada número
 * se recalcula de los eventos que cambiaron el estado. Funciones puras; `ahora`
 * se recibe para que los tramos abiertos se puedan probar.
 */

const DIA = 86_400_000;

export interface TramoEstadoOS {
  estado: EstadoOS;
  /** ISO. */
  desde: string;
  /** ISO; null en el tramo abierto (el estado actual). */
  hasta: string | null;
  /** Lo que duró, o lo que lleva si sigue abierto. */
  dias: number;
  esEspera: boolean;
  /** Quién movió la O.S. a este estado. */
  usuarioNombre: string;
  /** Motivo capturado al entrar, en retornos y retenciones. */
  motivo: string | null;
}

const ms = (iso: string) => new Date(iso).getTime();
const aIso = (ahora: Date | string) => (typeof ahora === "string" ? ahora : ahora.toISOString());

/** Los eventos que movieron el estado, en orden cronológico. */
const cambios = (eventos: readonly EventoOS[]) =>
  eventos
    .filter((e): e is EventoOS & { estadoDespues: EstadoOS } => e.estadoDespues != null)
    .sort((a, b) => ms(a.en) - ms(b.en));

export function tramosPorEstado(eventos: readonly EventoOS[], ahora: Date | string = new Date()): TramoEstadoOS[] {
  const fin = aIso(ahora);
  const lista = cambios(eventos);
  return lista.map((e, i) => {
    const siguiente = lista[i + 1];
    // El estado terminal no acumula días: la O.S. ya no espera nada.
    const terminal = ESTADO[e.estadoDespues].terminal === true;
    const hasta = siguiente ? siguiente.en : terminal ? e.en : null;
    return {
      estado: e.estadoDespues,
      desde: e.en,
      hasta,
      dias: Math.max(0, (ms(hasta ?? fin) - ms(e.en)) / DIA),
      esEspera: ESTADO[e.estadoDespues].espera,
      usuarioNombre: e.usuarioNombre,
      motivo: e.motivo ?? null,
    };
  });
}

export const tramoActual = (eventos: readonly EventoOS[], ahora: Date | string = new Date()): TramoEstadoOS | null =>
  tramosPorEstado(eventos, ahora).at(-1) ?? null;

export const diasTotales = (eventos: readonly EventoOS[], ahora: Date | string = new Date()): number =>
  tramosPorEstado(eventos, ahora).reduce((a, t) => a + t.dias, 0);

export const diasEnEspera = (eventos: readonly EventoOS[], ahora: Date | string = new Date()): number =>
  tramosPorEstado(eventos, ahora)
    .filter((t) => t.esEspera)
    .reduce((a, t) => a + t.dias, 0);

/** 0 a 100. Sin días transcurridos no hay espera que medir. */
export function porcentajeEspera(eventos: readonly EventoOS[], ahora: Date | string = new Date()): number {
  const total = diasTotales(eventos, ahora);
  return total > 0 ? (diasEnEspera(eventos, ahora) / total) * 100 : 0;
}

/** Los tres puntos de espera medibles, más la espera de refacción. */
export const PUNTOS_ESPERA = ["pendiente_autorizacion", "autorizacion_oc", "en_proceso_pago", "espera_refaccion"] as const;

export type PuntoEspera = (typeof PUNTOS_ESPERA)[number];

/** Días acumulados en cada punto de espera; un punto visitado dos veces suma ambas. */
export function desgloseEspera(eventos: readonly EventoOS[], ahora: Date | string = new Date()): Record<PuntoEspera, number> {
  const r: Record<PuntoEspera, number> = { pendiente_autorizacion: 0, autorizacion_oc: 0, en_proceso_pago: 0, espera_refaccion: 0 };
  for (const t of tramosPorEstado(eventos, ahora)) {
    const p = PUNTOS_ESPERA.find((x) => x === t.estado);
    if (p) r[p] += t.dias;
  }
  return r;
}

/** Estados por los que ya pasó la O.S., sin importar cuántas veces. */
export const estadosVisitados = (eventos: readonly EventoOS[]): Set<EstadoOS> =>
  new Set(cambios(eventos).map((e) => e.estadoDespues));

import { ESTADO, type EstadoOS } from "./estados";
import type { EstadoOC } from "./compras";
import { eventosDe, type EventoOS } from "./bitacora";

/**
 * Tiempos de la O.S. derivados de la bitácora. No se guarda nada: cada número
 * se recalcula de los eventos. Funciones puras; `ahora` se recibe para que los
 * tramos abiertos se puedan probar.
 *
 * Los puntos de espera medibles son cuatro. El del cliente es un estatus de la
 * O.S. (Pte Autorización). Los de Dirección, Tesorería y proveedor viven en las
 * O.C. de la O.S.: se miden por los estados que reporta cada O.C.
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
  /** Motivo capturado al entrar, en retornos y cancelaciones. */
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

/* ── Puntos de espera ─────────────────────────────────────────────── */

export const PUNTOS_ESPERA = ["cliente", "direccion", "tesoreria", "proveedor"] as const;

export type PuntoEspera = (typeof PUNTOS_ESPERA)[number];

export const PUNTO_ESPERA: Record<PuntoEspera, string> = {
  cliente: "Pte Autorización · Cliente",
  direccion: "Autorización de O.C. · Dirección",
  tesoreria: "Pago de O.C. · Tesorería",
  proveedor: "Espera de refacción · proveedor",
};

/** Qué estado de la O.C. es espera de quién. */
const ESPERA_DE_OC: Partial<Record<EstadoOC, PuntoEspera>> = {
  en_autorizacion: "direccion",
  // Autorizada y todavía no enviada al proveedor: falta que Tesorería pague.
  autorizada: "tesoreria",
  enviada_proveedor: "proveedor",
  recibida_parcial: "proveedor",
};

type Intervalo = [number, number];

/** Fin de la vida de la O.S.: su cierre si terminó, o ahora si sigue abierta. */
function finDeVida(eventos: readonly EventoOS[], ahora: string): number {
  const ultimo = cambios(eventos).at(-1);
  return ultimo && ESTADO[ultimo.estadoDespues].terminal ? ms(ultimo.en) : ms(ahora);
}

/** Intervalos de espera de cada punto, en milisegundos. */
function intervalosEspera(eventos: readonly EventoOS[], ahora: string): Record<PuntoEspera, Intervalo[]> {
  const r: Record<PuntoEspera, Intervalo[]> = { cliente: [], direccion: [], tesoreria: [], proveedor: [] };
  const tope = finDeVida(eventos, ahora);

  for (const t of tramosPorEstado(eventos, ahora)) {
    if (t.estado === "pendiente_autorizacion") r.cliente.push([ms(t.desde), t.hasta ? ms(t.hasta) : tope]);
  }

  // Cada O.C. reporta su estado con un evento; el intervalo dura hasta el siguiente reporte.
  const porOC = new Map<string, { en: number; estado: EstadoOC }[]>();
  for (const e of eventosDe(eventos, "oc_vinculada")) {
    const lista = porOC.get(e.carga.folio) ?? [];
    lista.push({ en: ms(e.en), estado: e.carga.estado });
    porOC.set(e.carga.folio, lista);
  }
  for (const lista of porOC.values()) {
    lista.sort((a, b) => a.en - b.en);
    lista.forEach((x, i) => {
      const punto = ESPERA_DE_OC[x.estado];
      if (!punto) return;
      const hasta = Math.min(lista[i + 1]?.en ?? tope, tope);
      if (hasta > x.en) r[punto].push([x.en, hasta]);
    });
  }
  return r;
}

/** Suma de una unión de intervalos: dos O.C. esperando a la vez cuentan una vez. */
function duracionUnion(intervalos: Intervalo[]): number {
  const orden = [...intervalos].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let actual: Intervalo | null = null;
  for (const [ini, fin] of orden) {
    if (!actual || ini > actual[1]) {
      if (actual) total += actual[1] - actual[0];
      actual = [ini, fin];
    } else {
      actual[1] = Math.max(actual[1], fin);
    }
  }
  if (actual) total += actual[1] - actual[0];
  return total / DIA;
}

/** Días acumulados en cada punto de espera; un punto visitado dos veces suma ambas. */
export function desgloseEspera(eventos: readonly EventoOS[], ahora: Date | string = new Date()): Record<PuntoEspera, number> {
  const iv = intervalosEspera(eventos, aIso(ahora));
  return {
    cliente: duracionUnion(iv.cliente),
    direccion: duracionUnion(iv.direccion),
    tesoreria: duracionUnion(iv.tesoreria),
    proveedor: duracionUnion(iv.proveedor),
  };
}

/** Días en que la O.S. esperaba a alguien, sin contar dos veces esperas simultáneas. */
export function diasEnEspera(eventos: readonly EventoOS[], ahora: Date | string = new Date()): number {
  const iv = intervalosEspera(eventos, aIso(ahora));
  return duracionUnion(PUNTOS_ESPERA.flatMap((p) => iv[p]));
}

/** 0 a 100. Sin días transcurridos no hay espera que medir. */
export function porcentajeEspera(eventos: readonly EventoOS[], ahora: Date | string = new Date()): number {
  const total = diasTotales(eventos, ahora);
  return total > 0 ? Math.min(100, (diasEnEspera(eventos, ahora) / total) * 100) : 0;
}

/** Estados por los que ya pasó la O.S., sin importar cuántas veces. */
export const estadosVisitados = (eventos: readonly EventoOS[]): Set<EstadoOS> =>
  new Set(cambios(eventos).map((e) => e.estadoDespues));

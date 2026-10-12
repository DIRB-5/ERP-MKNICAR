import {
  eventosDe,
  vigente,
  type CargaAutorizacionCliente,
  type CargaPresupuesto,
  type EventoDe,
  type EventoOS,
} from "@/domain/bitacora";
import { TASA_IVA } from "@/app/sat";

export interface Totales {
  servicios: number;
  refacciones: number;
  /** Sin IVA. */
  subtotal: number;
  iva: number;
  total: number;
  horas: number;
}

export function totalesVersion(p: CargaPresupuesto): Totales {
  const servicios = p.servicios.reduce((a, x) => a + x.horas * x.tarifa, 0);
  const refacciones = p.refacciones.reduce((a, x) => a + x.cantidad * x.precio, 0);
  const subtotal = servicios + refacciones;
  return {
    servicios,
    refacciones,
    subtotal,
    iva: subtotal * TASA_IVA,
    total: subtotal * (1 + TASA_IVA),
    horas: p.servicios.reduce((a, x) => a + x.horas, 0),
  };
}

export interface VersionPresupuesto {
  evento: EventoDe<"presupuesto_emitido"> | EventoDe<"adenda_emitida">;
  carga: CargaPresupuesto;
  totales: Totales;
  /** ISO de cuando se envió al cliente; null si aún no sale. */
  enviadaEn: string | null;
  respuesta: (CargaAutorizacionCliente & { registradaEn: string; registro: string }) | null;
  /** Cuánto de esta versión cuenta para el total vigente (sin IVA). */
  autorizado: number;
}

/** Las versiones se apilan en orden; ninguna sustituye a otra. */
export function versiones(eventos: readonly EventoOS[]): VersionPresupuesto[] {
  const emitidas = [...eventosDe(eventos, "presupuesto_emitido"), ...eventosDe(eventos, "adenda_emitida")].sort(
    (a, b) => a.carga.version - b.carga.version
  );
  const solicitudes = eventosDe(eventos, "autorizacion_solicitada");
  const respuestas = eventosDe(eventos, "autorizacion_cliente");
  return emitidas.map((e) => {
    const totales = totalesVersion(e.carga);
    const r = respuestas.filter((x) => x.carga.version === e.carga.version).at(-1);
    const respuesta = r ? { ...r.carga, registradaEn: r.en, registro: r.usuarioNombre } : null;
    const autorizado =
      respuesta?.resultado === "autorizada"
        ? totales.subtotal
        : respuesta?.resultado === "parcial"
          ? (respuesta.montoAutorizado ?? 0)
          : 0;
    return {
      evento: e,
      carga: e.carga,
      totales,
      enviadaEn: solicitudes.find((x) => x.carga.version === e.carga.version)?.en ?? null,
      respuesta,
      autorizado,
    };
  });
}

export interface Autorizado {
  /** Suma de lo autorizado en todas las versiones, sin IVA. */
  subtotal: number;
  servicios: number;
  refacciones: number;
  horas: number;
}

/**
 * Total vigente: la suma de las versiones autorizadas. Una autorización
 * parcial reparte su monto entre servicios y refacciones en proporción.
 */
export function autorizado(eventos: readonly EventoOS[]): Autorizado {
  const r: Autorizado = { subtotal: 0, servicios: 0, refacciones: 0, horas: 0 };
  for (const v of versiones(eventos)) {
    if (v.autorizado === 0 || v.totales.subtotal === 0) continue;
    const f = v.autorizado / v.totales.subtotal;
    r.subtotal += v.autorizado;
    r.servicios += v.totales.servicios * f;
    r.refacciones += v.totales.refacciones * f;
    r.horas += v.totales.horas * f;
  }
  return r;
}

export interface CostoReal {
  manoObra: number;
  refacciones: number;
  total: number;
  horas: number;
}

/** Costo incurrido, con las correcciones aplicadas. */
export function costoReal(eventos: readonly EventoOS[]): CostoReal {
  const mo = eventosDe(eventos, "mano_obra_cargada").map((e) => vigente(e, eventos).carga);
  const manoObra = mo.reduce((a, m) => a + m.horas * m.costoHora, 0);
  const refacciones = eventosDe(eventos, "refaccion_consumida").reduce((a, e) => a + e.carga.cantidad * e.carga.costoUnitario, 0);
  return { manoObra, refacciones, total: manoObra + refacciones, horas: mo.reduce((a, m) => a + m.horas, 0) };
}

/** Desviación en porcentaje firmado; null si no hay base contra qué medir. */
export const desviacion = (real: number, base: number): number | null => (base > 0 ? ((real - base) / base) * 100 : null);

import type { Area } from "./areas";

/**
 * Máquina de estados de la Orden de Servicio.
 *
 * Nueve estatus, por decisión del cliente (14 oct 2026). Sustituye a la máquina
 * de 20 estados acordada con el COO el 21 sep 2026: la autorización de la O.C.
 * por Dirección y su pago por Tesorería dejan de ser estatus de la O.S. y se
 * miden en la propia O.C. (ver `tiempos.ts`). Calidad y factura ya no son
 * estatus: son requisitos para pasar a Remisión y a Cerrada (`expediente.ts`).
 */
export const ESTADOS = [
  "programacion",
  "diagnostico",
  "cotizar",
  "pendiente_autorizacion",
  "autorizado_compra",
  "en_reparacion",
  "remision",
  "cerrada",
  "cancelada",
] as const;

export type EstadoOS = (typeof ESTADOS)[number];

/** Tono visual del chip. `espera` es exclusivo de los puntos medibles. */
export type Tono = "espera" | "critico" | "activo" | "cerrado" | "futuro";

export interface EstadoDef {
  /** Como lo nombra el cliente. */
  label: string;
  /** Área responsable mientras la O.S. está en este estado. */
  area: Area;
  tono: Tono;
  /** true en los puntos de espera medibles: ahí se cuenta el tiempo muerto. */
  espera: boolean;
  /** Estado terminal: la O.S. no avanza más desde aquí. */
  terminal?: boolean;
}

export const ESTADO: Record<EstadoOS, EstadoDef> = {
  programacion:           { label: "Recolección y/o Programación", area: "operacion",      tono: "activo",  espera: false },
  diagnostico:            { label: "Diagnóstico / Requisición",    area: "operacion",      tono: "activo",  espera: false },
  cotizar:                { label: "Cotizar",                      area: "abastecimiento", tono: "activo",  espera: false },
  pendiente_autorizacion: { label: "Pte Autorización",             area: "cliente",        tono: "espera",  espera: true  },
  // Aquí corren las esperas de Dirección y Tesorería, medidas en la O.C.
  autorizado_compra:      { label: "Autorizado a compra",          area: "abastecimiento", tono: "activo",  espera: false },
  en_reparacion:          { label: "En reparación",                area: "operacion",      tono: "activo",  espera: false },
  remision:               { label: "Remisión",                     area: "operacion",      tono: "cerrado", espera: false },
  cerrada:                { label: "Cerrada",                      area: "operacion",      tono: "cerrado", espera: false, terminal: true },
  cancelada:              { label: "Cancelada",                    area: "operacion",      tono: "critico", espera: false, terminal: true },
};

/**
 * Transiciones permitidas. Retornos acordados con el cliente, todos con motivo:
 *  - Pte Autorización → Cotizar: el cliente pide recotizar.
 *  - Autorizado a compra → Cotizar: Dirección rechaza la O.C. o el proveedor no surte.
 *  - En reparación → Pte Autorización: sobrecosto.
 *  - Remisión → En reparación: no pasa la revisión de salida o el cliente la regresa.
 * Cualquier estatus abierto puede cancelarse, también con motivo.
 *
 * Quién puede ejecutar cada transición se resuelve en el motor de
 * autorizaciones del backend; aquí solo vive la topología.
 */
export const TRANSICIONES: Record<EstadoOS, readonly EstadoOS[]> = {
  programacion:           ["diagnostico", "cancelada"],
  diagnostico:            ["cotizar", "cancelada"],
  cotizar:                ["pendiente_autorizacion", "cancelada"],
  pendiente_autorizacion: ["autorizado_compra", "cotizar", "cancelada"],
  autorizado_compra:      ["en_reparacion", "cotizar", "cancelada"],
  en_reparacion:          ["remision", "pendiente_autorizacion", "cancelada"],
  remision:               ["cerrada", "en_reparacion", "cancelada"],
  cerrada:                [],
  cancelada:              [],
};

export const puedeTransicionar = (de: EstadoOS, a: EstadoOS): boolean =>
  TRANSICIONES[de].includes(a);

/** Umbrales de antigüedad en días. Configurables por tipo de documento. */
export const UMBRAL_DIAS = { ok: 2, alerta: 5 } as const;

export type NivelAntiguedad = "ok" | "alerta" | "critico";

export const nivelAntiguedad = (dias: number): NivelAntiguedad =>
  dias <= UMBRAL_DIAS.ok ? "ok" : dias <= UMBRAL_DIAS.alerta ? "alerta" : "critico";

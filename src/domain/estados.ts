import type { Area } from "./areas";

/**
 * Máquina de estados de la Orden de Servicio.
 *
 * Definida con el COO el 21 de septiembre de 2026. Incluye los tres estados
 * que salieron de esa sesión: `rechazada`, `espera_refaccion` y `retenida`.
 */
export const ESTADOS = [
  "programada",
  "unidad_recibida",
  "en_diagnostico",
  "requisicion_generada",
  "en_cotizacion",
  "presupuesto_elaborado",
  "pendiente_autorizacion",
  "autorizada_compra",
  "oc_creada",
  "autorizacion_oc",
  "en_proceso_pago",
  "espera_refaccion",
  "material_recibido",
  "en_reparacion",
  "terminada_qa",
  "remisionada",
  "retenida",
  "facturada",
  "cerrada",
  "rechazada",
] as const;

export type EstadoOS = (typeof ESTADOS)[number];

/** Tono visual del chip. `espera` es exclusivo de los puntos medibles. */
export type Tono = "espera" | "critico" | "activo" | "cerrado" | "futuro";

export interface EstadoDef {
  /** Nombre en participio, como se muestra al usuario. */
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
  programada:            { label: "Programada",                 area: "operacion",       tono: "activo",  espera: false },
  unidad_recibida:       { label: "Unidad recibida",            area: "operacion",       tono: "activo",  espera: false },
  en_diagnostico:        { label: "En diagnóstico",             area: "operacion",       tono: "activo",  espera: false },
  requisicion_generada:  { label: "Requisición generada",       area: "operacion",       tono: "activo",  espera: false },
  en_cotizacion:         { label: "En cotización",              area: "abastecimiento",  tono: "activo",  espera: false },
  presupuesto_elaborado: { label: "Presupuesto elaborado",      area: "operacion",       tono: "activo",  espera: false },
  pendiente_autorizacion:{ label: "Pendiente de autorización",  area: "cliente",         tono: "espera",  espera: true  },
  autorizada_compra:     { label: "Autorizada a compra",        area: "cliente",         tono: "activo",  espera: false },
  oc_creada:             { label: "O.C. creada",                area: "abastecimiento",  tono: "activo",  espera: false },
  autorizacion_oc:       { label: "Autorización de O.C.",       area: "direccion",       tono: "espera",  espera: true  },
  en_proceso_pago:       { label: "En proceso de pago",         area: "tesoreria",       tono: "espera",  espera: true  },
  espera_refaccion:      { label: "En espera de refacción",     area: "abastecimiento",  tono: "espera",  espera: true  },
  material_recibido:     { label: "Material recibido",          area: "almacen",         tono: "activo",  espera: false },
  en_reparacion:         { label: "En reparación",              area: "operacion",       tono: "activo",  espera: false },
  terminada_qa:          { label: "Terminada / QA",             area: "operacion",       tono: "activo",  espera: false },
  remisionada:           { label: "Remisionada",                area: "operacion",       tono: "cerrado", espera: false },
  retenida:              { label: "Retenida",                   area: "direccion",       tono: "critico", espera: true  },
  facturada:             { label: "Facturada",                  area: "operacion",       tono: "cerrado", espera: false },
  cerrada:               { label: "Cerrada",                    area: "operacion",       tono: "cerrado", espera: false, terminal: true },
  rechazada:             { label: "Rechazada",                  area: "cliente",         tono: "critico", espera: false, terminal: true },
};

/**
 * Transiciones permitidas. Incluye los dos retornos definidos con el COO:
 * autorizacion_oc → presupuesto_elaborado (O.C. rechazada por Dirección) y
 * en_reparacion → pendiente_autorizacion (sobrecosto fuera de tolerancia).
 *
 * Quién puede ejecutar cada transición se resuelve en el motor de
 * autorizaciones del backend; aquí solo vive la topología.
 */
export const TRANSICIONES: Record<EstadoOS, readonly EstadoOS[]> = {
  programada:            ["unidad_recibida", "rechazada"],
  unidad_recibida:       ["en_diagnostico"],
  en_diagnostico:        ["requisicion_generada"],
  requisicion_generada:  ["en_cotizacion"],
  en_cotizacion:         ["presupuesto_elaborado"],
  presupuesto_elaborado: ["pendiente_autorizacion"],
  pendiente_autorizacion:["autorizada_compra", "rechazada", "presupuesto_elaborado"],
  autorizada_compra:     ["oc_creada"],
  oc_creada:             ["autorizacion_oc"],
  autorizacion_oc:       ["en_proceso_pago", "presupuesto_elaborado"],
  en_proceso_pago:       ["material_recibido", "espera_refaccion"],
  espera_refaccion:      ["material_recibido", "en_reparacion"],
  material_recibido:     ["en_reparacion"],
  en_reparacion:         ["terminada_qa", "espera_refaccion", "pendiente_autorizacion"],
  terminada_qa:          ["remisionada"],
  remisionada:           ["facturada", "retenida"],
  retenida:              ["facturada"],
  facturada:             ["cerrada"],
  cerrada:               [],
  rechazada:             [],
};

export const puedeTransicionar = (de: EstadoOS, a: EstadoOS): boolean =>
  TRANSICIONES[de].includes(a);

/** Umbrales de antigüedad en días. Configurables por tipo de documento. */
export const UMBRAL_DIAS = { ok: 2, alerta: 5 } as const;

export type NivelAntiguedad = "ok" | "alerta" | "critico";

export const nivelAntiguedad = (dias: number): NivelAntiguedad =>
  dias <= UMBRAL_DIAS.ok ? "ok" : dias <= UMBRAL_DIAS.alerta ? "alerta" : "critico";

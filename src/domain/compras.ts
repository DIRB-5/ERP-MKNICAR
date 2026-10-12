import type { EstadoOS, Tono } from "./estados";

/**
 * Ciclo de compras: requisición → cotización → comparativo → O.C. → recepción
 * → comprobante del proveedor. Definido con el COO el 21 de septiembre de 2026.
 *
 * Igual que en `estados.ts`, aquí vive solo la topología. Quién ejecuta cada
 * transición lo resuelve el motor de autorizaciones del backend.
 *
 * Tono `espera` (ámbar) solo donde coincide con un punto de espera medible de
 * la O.S.: la O.C. en autorización es el punto de Dirección (`autorizacion_oc`).
 */

export interface EstadoCompraDef {
  /** En participio, como se muestra al usuario. */
  label: string;
  tono: Tono;
  /** El documento espera a alguien fuera de Abastecimiento. */
  espera: boolean;
  /** El documento ya no avanza desde aquí. */
  terminal?: boolean;
}

/* ── Requisición ──────────────────────────────────────────────────── */

export const ESTADOS_REQUISICION = [
  "borrador",
  "enviada",
  "en_cotizacion",
  "cotizada",
  "en_comparativo",
  "adjudicada",
  "parcialmente_adjudicada",
  "cancelada",
] as const;

export type EstadoRequisicion = (typeof ESTADOS_REQUISICION)[number];

export const ESTADO_REQUISICION: Record<EstadoRequisicion, EstadoCompraDef> = {
  borrador:                { label: "Borrador",                tono: "futuro",  espera: false },
  enviada:                 { label: "Enviada",                 tono: "activo",  espera: false },
  en_cotizacion:           { label: "En cotización",           tono: "activo",  espera: true },
  cotizada:                { label: "Cotizada",                tono: "activo",  espera: false },
  en_comparativo:          { label: "En comparativo",          tono: "activo",  espera: false },
  parcialmente_adjudicada: { label: "Parcialmente adjudicada", tono: "activo",  espera: false },
  adjudicada:              { label: "Adjudicada",              tono: "cerrado", espera: false, terminal: true },
  cancelada:               { label: "Cancelada",               tono: "critico", espera: false, terminal: true },
};

export const TRANSICIONES_REQUISICION: Record<EstadoRequisicion, readonly EstadoRequisicion[]> = {
  borrador:                ["enviada", "cancelada"],
  enviada:                 ["en_cotizacion", "cancelada"],
  en_cotizacion:           ["cotizada", "cancelada"],
  cotizada:                ["en_comparativo", "cancelada"],
  // La adjudicación es por partida: un comparativo puede dejar partidas sin proveedor.
  en_comparativo:          ["adjudicada", "parcialmente_adjudicada", "cancelada"],
  parcialmente_adjudicada: ["adjudicada"],
  adjudicada:              [],
  cancelada:               [],
};

/* ── Orden de compra ──────────────────────────────────────────────── */

export const ESTADOS_OC = [
  "borrador",
  "en_autorizacion",
  "autorizada",
  "rechazada",
  "enviada_proveedor",
  "recibida_parcial",
  "recibida_total",
  "cerrada",
  "cancelada",
] as const;

export type EstadoOC = (typeof ESTADOS_OC)[number];

export const ESTADO_OC: Record<EstadoOC, EstadoCompraDef> = {
  borrador:          { label: "Borrador",                tono: "futuro",  espera: false },
  en_autorizacion:   { label: "En autorización",         tono: "espera",  espera: true },
  autorizada:        { label: "Autorizada",              tono: "activo",  espera: false },
  rechazada:         { label: "Rechazada",               tono: "critico", espera: false, terminal: true },
  enviada_proveedor: { label: "Enviada al proveedor",    tono: "activo",  espera: true },
  recibida_parcial:  { label: "Recibida parcialmente",   tono: "activo",  espera: true },
  recibida_total:    { label: "Recibida",                tono: "activo",  espera: false },
  cerrada:           { label: "Cerrada",                 tono: "cerrado", espera: false, terminal: true },
  cancelada:         { label: "Cancelada",               tono: "critico", espera: false, terminal: true },
};

/**
 * La O.C. rechazada no se corrige: termina aquí y la O.S. regresa a
 * presupuesto por su propio retorno (`autorizacion_oc → presupuesto_elaborado`).
 * La siguiente O.C. sale del presupuesto corregido.
 */
export const TRANSICIONES_OC: Record<EstadoOC, readonly EstadoOC[]> = {
  borrador:          ["en_autorizacion", "cancelada"],
  en_autorizacion:   ["autorizada", "rechazada"],
  autorizada:        ["enviada_proveedor", "cancelada"],
  enviada_proveedor: ["recibida_parcial", "recibida_total", "cancelada"],
  // Se cierra con faltante cuando el backorder pasa de DIAS_BACKORDER.
  recibida_parcial:  ["recibida_total", "cerrada"],
  recibida_total:    ["cerrada"],
  rechazada:         [],
  cerrada:           [],
  cancelada:         [],
};

/** El retorno de la O.S. que corresponde a una O.C. rechazada. Ya existe en `estados.ts`. */
export const RETORNO_OC_RECHAZADA: { de: EstadoOS; a: EstadoOS } = {
  de: "autorizacion_oc",
  a: "presupuesto_elaborado",
};

/* ── Comprobante del proveedor (CFDI) ─────────────────────────────── */

export const ESTADOS_COMPROBANTE = [
  "recibido",
  "en_validacion",
  "conciliado",
  "con_diferencia",
  "rechazado",
  "pagado",
] as const;

export type EstadoComprobante = (typeof ESTADOS_COMPROBANTE)[number];

export const ESTADO_COMPROBANTE: Record<EstadoComprobante, EstadoCompraDef> = {
  recibido:       { label: "Recibido",       tono: "activo",  espera: false },
  en_validacion:  { label: "En validación",  tono: "activo",  espera: false },
  conciliado:     { label: "Conciliado",     tono: "activo",  espera: false },
  con_diferencia: { label: "Con diferencia", tono: "critico", espera: true },
  rechazado:      { label: "Rechazado",      tono: "critico", espera: false, terminal: true },
  pagado:         { label: "Pagado",         tono: "cerrado", espera: false, terminal: true },
};

/**
 * Solo un comprobante conciliado se paga. Uno con diferencia se aclara con el
 * proveedor y vuelve a conciliarse; nunca salta directo a pagado.
 */
export const TRANSICIONES_COMPROBANTE: Record<EstadoComprobante, readonly EstadoComprobante[]> = {
  recibido:       ["en_validacion", "rechazado"],
  en_validacion:  ["conciliado", "con_diferencia", "rechazado"],
  con_diferencia: ["conciliado", "rechazado"],
  conciliado:     ["pagado"],
  rechazado:      [],
  pagado:         [],
};

/* ── Transiciones ─────────────────────────────────────────────────── */

export interface EstadosDe {
  requisicion: EstadoRequisicion;
  ordenCompra: EstadoOC;
  comprobante: EstadoComprobante;
}

export type DocumentoCompras = keyof EstadosDe;

const TRANSICIONES: { [D in DocumentoCompras]: Record<EstadosDe[D], readonly EstadosDe[D][]> } = {
  requisicion: TRANSICIONES_REQUISICION,
  ordenCompra: TRANSICIONES_OC,
  comprobante: TRANSICIONES_COMPROBANTE,
};

export const puedeTransicionar = <D extends DocumentoCompras>(doc: D, de: EstadosDe[D], a: EstadosDe[D]): boolean =>
  (TRANSICIONES[doc] as Record<EstadosDe[D], readonly EstadosDe[D][]>)[de].includes(a);

/* ── Políticas de compra ──────────────────────────────────────────── */
// Decisión del COO, 21 sep 2026. Las editará la pantalla de Configuración de
// compras; mientras tanto viven aquí y el backend aplica las suyas.

/** Días que se espera un faltante antes de cerrar la O.C. con lo recibido. */
export const DIAS_BACKORDER = 5;

/** Cotizaciones mínimas para pasar una requisición a comparativo. */
export const COTIZACIONES_MINIMAS = 3;

/** Variación aceptada entre el precio de la O.C. y el de la factura (5 %). */
export const TOLERANCIA_PRECIO = 0.05;

/** Flete y maniobras se reparten entre las partidas en proporción a su monto. */
export const PRORRATEO_GASTOS = "monto" as const;

/* ── Documentos fiscales del proveedor ────────────────────────────── */

export type TipoDocumentoFiscal = "constancia_situacion_fiscal" | "opinion_cumplimiento" | "caratula_banco";

export const TIPO_DOCUMENTO_FISCAL: Record<TipoDocumentoFiscal, string> = {
  constancia_situacion_fiscal: "Constancia de situación fiscal",
  opinion_cumplimiento: "Opinión de cumplimiento (SAT)",
  caratula_banco: "Carátula bancaria",
};

/** La opinión de cumplimiento del SAT caduca cada mes. */
export const MESES_VIGENCIA_OPINION = 1;

export type SituacionDocumentos = "vigentes" | "opinion_vencida" | "sin_opinion";

/**
 * Señal de documentos del proveedor. Solo informa: si se le puede pagar o no
 * lo define Tesorería, no esta función.
 * `hoy` y `vigenciaHasta` en AAAA-MM-DD.
 */
export function situacionDocumentos(
  documentos: readonly { tipo: TipoDocumentoFiscal; vigenciaHasta: string | null }[],
  hoy: string
): SituacionDocumentos {
  const opiniones = documentos.filter((d) => d.tipo === "opinion_cumplimiento");
  if (opiniones.length === 0) return "sin_opinion";
  // Cuenta la opinión más reciente: una vieja vencida no opaca a la nueva.
  const vigencia = opiniones.map((d) => d.vigenciaHasta ?? "").sort().at(-1) ?? "";
  return vigencia !== "" && vigencia >= hoy ? "vigentes" : "opinion_vencida";
}

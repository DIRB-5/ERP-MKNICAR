import type { EstadoOS } from "./estados";
import type { EstadoOC, EstadoRequisicion } from "./compras";
import type { ElementoInventario, SeveridadDano } from "./tipos";
import type { ArchivoAdjunto } from "./tipos/compras";

/**
 * Bitácora de la O.S.: todo lo que le pasa, en orden, para siempre.
 *
 * Es append-only. No hay editar ni borrar: una corrección es un evento nuevo
 * (`correccion`) que referencia al anterior, y el valor original sigue ahí.
 * El expediente, los tiempos y el estado actual se derivan de aquí.
 */

export const TIPOS_EVENTO = [
  "os_creada",
  "cambio_estado",
  "recepcion_registrada",
  "tecnico_asignado",
  "hallazgo_agregado",
  "requisicion_generada",
  "requisicion_actualizada",
  "presupuesto_emitido",
  "adenda_emitida",
  "autorizacion_solicitada",
  "autorizacion_cliente",
  "oc_vinculada",
  "material_recibido",
  "mano_obra_cargada",
  "refaccion_consumida",
  "calidad_liberada",
  "nota_agregada",
  "evidencia_agregada",
  "remision_emitida",
  "factura_vinculada",
  "os_cerrada",
  "correccion",
] as const;

export type TipoEvento = (typeof TIPOS_EVENTO)[number];

/** Secciones del expediente. El registro con sus reglas vive en `expediente.ts`. */
export type ClaveSeccion =
  | "recepcion"
  | "diagnostico"
  | "abastecimiento"
  | "presupuesto"
  | "autorizacion"
  | "compra"
  | "materiales"
  | "reparacion"
  | "calidad"
  | "entrega"
  | "facturacion"
  | "cierre";

/* ── Cargas por tipo ──────────────────────────────────────────────── */

export interface CargaRecepcion {
  /** ISO: cuándo llegó la unidad, que puede ser antes de registrarlo. */
  fechaHora: string;
  kilometraje: number;
  /** 0 a 8, en octavos de tanque. */
  nivelCombustible: number;
  recibeNombre: string;
  entregaNombre: string;
  inventario: Record<ElementoInventario, boolean>;
  inventarioExtra: string;
  objetosPersonales: string;
  danosPrevios: { zona: string; descripcion: string; severidad: SeveridadDano }[];
  /** Una por vista; la etiqueta dice cuál (frente, trasera, izquierda, derecha). */
  fotos: { etiqueta: string; archivo: ArchivoAdjunto }[];
  autorizaDiagnostico: boolean;
  /** Referencia a la firma; null mientras no exista el capturador. */
  firmaEntrega: string | null;
}

export interface RefCatalogo {
  /** null cuando no está en el catálogo: se marca "fuera de catálogo". */
  id: string | null;
  clave: string;
  descripcion: string;
}

export interface CargaHallazgo {
  hallazgoId: string;
  descripcion: string;
  severidad: SeveridadDano;
  evidencias: ArchivoAdjunto[];
  /** Servicios del catálogo que resuelven el hallazgo, con sus horas estándar. */
  servicios: (RefCatalogo & { horas: number })[];
  refacciones: (RefCatalogo & { cantidad: number })[];
}

export interface PartidaServicio {
  concepto: string;
  clave: string;
  horas: number;
  tarifa: number;
}

export interface PartidaRefaccion {
  concepto: string;
  clave: string;
  cantidad: number;
  precio: number;
}

/** Versión 1 es el presupuesto; las siguientes, adendas. Se apilan, nunca se sustituyen. */
export interface CargaPresupuesto {
  version: number;
  folio: string;
  servicios: PartidaServicio[];
  refacciones: PartidaRefaccion[];
  /** AAAA-MM-DD. */
  vigenciaHasta: string;
  /** Por qué se emite la adenda (sobrecosto, trabajo adicional). Vacío en la versión 1. */
  motivo: string;
}

export type MedioAutorizacion = "correo" | "portal" | "firma_fisica" | "llamada" | "whatsapp";
export type ResultadoAutorizacion = "autorizada" | "rechazada" | "parcial";

export interface CargaAutorizacionSolicitada {
  version: number;
  medio: MedioAutorizacion;
  enviadaA: string;
}

export interface CargaAutorizacionCliente {
  version: number;
  /** ISO: cuándo respondió el cliente, aunque se registre después. */
  respondidaEn: string;
  medio: MedioAutorizacion;
  autorizo: string;
  resultado: ResultadoAutorizacion;
  /** Solo en autorización parcial: el importe sin IVA que sí autorizó. */
  montoAutorizado: number | null;
  evidencia: ArchivoAdjunto | null;
}

export interface CargaRequisicion {
  folio: string;
  estado: EstadoRequisicion;
  comparativoFolio: string | null;
}

export interface CargaOC {
  folio: string;
  proveedor: string;
  estado: EstadoOC;
  monto: number;
}

export interface CargaMaterial {
  partidas: { descripcion: string; cantidad: number; almacen: string; capaCostoId: string }[];
  /** Lo que sigue sin llegar después de esta recepción. */
  pendientes: { descripcion: string; cantidad: number }[];
}

export interface CargaManoObra {
  tecnicoId: string;
  tecnicoNombre: string;
  /** AAAA-MM-DD. */
  fecha: string;
  horas: number;
  /** Mientras no exista el módulo de personal, se captura con la entrada. */
  costoHora: number;
  descripcion: string;
}

export interface CargaConsumo {
  numeroParte: string;
  descripcion: string;
  cantidad: number;
  costoUnitario: number;
  /** Salida de almacén y capa PEPS de la que salió. */
  salidaFolio: string;
  capaCostoId: string;
}

export interface CargaCalidad {
  puntos: { punto: string; cumple: boolean }[];
  liberoId: string;
  liberoNombre: string;
  observaciones: string;
}

export interface CargaRemision {
  folio: string;
  kilometrajeSalida: number;
  /** ISO. */
  entregadaEn: string;
  recibeNombre: string;
  firma: string | null;
}

export interface CargaFactura {
  folio: string;
  monto: number;
  /** AAAA-MM-DD. */
  fecha: string;
  /** Una factura puede cubrir varias O.S. */
  osFolios: string[];
}

export interface CargaNota {
  seccion: ClaveSeccion;
  texto: string;
}

export interface CargaEvidencia {
  seccion: ClaveSeccion;
  descripcion: string;
  archivo: ArchivoAdjunto;
}

/** Valores nuevos de los campos corregidos; el evento original no se toca. */
export interface CargaCorreccion {
  seccion: ClaveSeccion;
  corrigeId: string;
  cambios: Record<string, string | number>;
}

export interface CargasEvento {
  os_creada: Record<string, never>;
  cambio_estado: Record<string, never>;
  recepcion_registrada: CargaRecepcion;
  tecnico_asignado: { tecnicoId: string; tecnicoNombre: string };
  hallazgo_agregado: CargaHallazgo;
  requisicion_generada: CargaRequisicion;
  requisicion_actualizada: CargaRequisicion;
  presupuesto_emitido: CargaPresupuesto;
  adenda_emitida: CargaPresupuesto;
  autorizacion_solicitada: CargaAutorizacionSolicitada;
  autorizacion_cliente: CargaAutorizacionCliente;
  oc_vinculada: CargaOC;
  material_recibido: CargaMaterial;
  mano_obra_cargada: CargaManoObra;
  refaccion_consumida: CargaConsumo;
  calidad_liberada: CargaCalidad;
  nota_agregada: CargaNota;
  evidencia_agregada: CargaEvidencia;
  remision_emitida: CargaRemision;
  factura_vinculada: CargaFactura;
  os_cerrada: Record<string, never>;
  correccion: CargaCorreccion;
}

interface EventoBase<T extends TipoEvento> {
  id: string;
  osId: string;
  tipo: T;
  /** ISO, sello del servidor; nunca del cliente. */
  en: string;
  usuarioId: string;
  usuarioNombre: string;
  /** Presentes cuando el evento movió la O.S. de estado. */
  estadoAntes?: EstadoOS;
  estadoDespues?: EstadoOS;
  carga: CargasEvento[T];
  /** Obligatorio en correcciones y en retornos de estado. */
  motivo?: string;
}

export type EventoOS = { [T in TipoEvento]: EventoBase<T> }[TipoEvento];

export type EventoDe<T extends TipoEvento> = Extract<EventoOS, { tipo: T }>;

/** Lo que el cliente propone; id, sello de tiempo y usuario los pone el servidor. */
export type EventoPropuesto = { [T in TipoEvento]: { tipo: T; carga: CargasEvento[T]; motivo?: string } }[TipoEvento];

export const esTipo = <T extends TipoEvento>(e: EventoOS, tipo: T): e is EventoDe<T> => e.tipo === tipo;

export const eventosDe = <T extends TipoEvento>(eventos: readonly EventoOS[], tipo: T): EventoDe<T>[] =>
  eventos.filter((e): e is EventoDe<T> => e.tipo === tipo);

/* ── Correcciones ─────────────────────────────────────────────────── */

export interface Correccion {
  en: string;
  usuarioNombre: string;
  motivo: string;
  /** Valores antes de esta corrección, para seguir consultándolos. */
  anteriores: Record<string, unknown>;
}

/** Evento con sus correcciones aplicadas en orden; el original queda en `original`. */
export type Vigente<E extends EventoOS> = E & { original: E; correcciones: Correccion[] };

export function vigente<E extends EventoOS>(evento: E, eventos: readonly EventoOS[]): Vigente<E> {
  const correcciones: Correccion[] = [];
  let carga: Record<string, unknown> = { ...(evento.carga as Record<string, unknown>) };
  for (const c of eventosDe(eventos, "correccion")) {
    if (c.carga.corrigeId !== evento.id) continue;
    const anteriores: Record<string, unknown> = {};
    for (const campo of Object.keys(c.carga.cambios)) anteriores[campo] = carga[campo];
    carga = { ...carga, ...c.carga.cambios };
    correcciones.push({ en: c.en, usuarioNombre: c.usuarioNombre, motivo: c.motivo ?? "", anteriores });
  }
  // Los cambios solo tocan campos de CORREGIBLES, con el mismo tipo que el original.
  return { ...evento, carga, original: evento, correcciones } as unknown as Vigente<E>;
}

/** Campos que se pueden corregir de cada tipo de evento, con su etiqueta. */
export const CORREGIBLES: Partial<Record<TipoEvento, { campo: string; etiqueta: string; tipo: "texto" | "numero" }[]>> = {
  recepcion_registrada: [
    { campo: "kilometraje", etiqueta: "Kilometraje de entrada", tipo: "numero" },
    { campo: "nivelCombustible", etiqueta: "Combustible (octavos)", tipo: "numero" },
    { campo: "entregaNombre", etiqueta: "Quién entregó", tipo: "texto" },
    { campo: "objetosPersonales", etiqueta: "Pertenencias", tipo: "texto" },
  ],
  hallazgo_agregado: [{ campo: "descripcion", etiqueta: "Descripción del hallazgo", tipo: "texto" }],
  tecnico_asignado: [{ campo: "tecnicoNombre", etiqueta: "Técnico asignado", tipo: "texto" }],
  mano_obra_cargada: [
    { campo: "horas", etiqueta: "Horas", tipo: "numero" },
    { campo: "descripcion", etiqueta: "Trabajo realizado", tipo: "texto" },
  ],
  calidad_liberada: [{ campo: "observaciones", etiqueta: "Observaciones de calidad", tipo: "texto" }],
  remision_emitida: [
    { campo: "kilometrajeSalida", etiqueta: "Kilometraje de salida", tipo: "numero" },
    { campo: "recibeNombre", etiqueta: "Quién recibió", tipo: "texto" },
  ],
  factura_vinculada: [{ campo: "monto", etiqueta: "Monto de la factura", tipo: "numero" }],
};

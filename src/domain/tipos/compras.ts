import type { EstadoComprobante, EstadoOC, EstadoRequisicion, TipoDocumentoFiscal } from "../compras";

/*
 * Tipos del módulo de compras. Hoy solo `Proveedor` y sus partes tienen
 * pantalla; el resto queda escrito porque requisiciones, comparativo, O.C.,
 * recepción y comprobantes se cuelgan de aquí en las siguientes corridas.
 *
 * Fechas: AAAA-MM-DD cuando es un día, ISO 8601 cuando importa la hora.
 */

/* ── Proveedor ────────────────────────────────────────────────────── */

export type CondicionesPago = "contado" | "credito";
export type Moneda = "MXN" | "USD";

export interface ContactoProveedor {
  nombre: string;
  puesto: string;
  telefono: string;
  correo: string;
}

/**
 * A dónde le deposita Tesorería. Todo es opcional en el alta: cadena vacía
 * significa "aún no se tiene". Un proveedor cobra por transferencia (cuenta o
 * CLABE), a tarjeta, o por convenio con referencia; rara vez por las tres.
 */
export interface DatosBancariosProveedor {
  /** "Depositar a": titular de la cuenta, que puede no ser la razón social. */
  beneficiario: string;
  banco: string;
  cuenta: string;
  /** CLABE interbancaria, 18 dígitos. */
  clabe: string;
  tarjeta: string;
  /** Número de convenio para pago de servicios (p. ej. CIE). */
  convenio: string;
  referencia: string;
  solicita: string;
  comentarios: string;
}

export interface ArchivoAdjunto {
  nombre: string;
  /** Dónde descargarlo; la API devuelve la URL firmada. */
  url: string;
}

export interface DocumentoFiscalProveedor {
  id: string;
  tipo: TipoDocumentoFiscal;
  fechaDocumento: string;
  /** null en documentos que no caducan (la carátula bancaria). */
  vigenciaHasta: string | null;
  archivo: ArchivoAdjunto | null;
}

export interface Proveedor {
  id: string;

  /* Fiscales: sin ellos Tesorería no puede pagar. */
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  /** Clave del catálogo c_RegimenFiscal del SAT, p. ej. "601". */
  regimenFiscal: string;
  /** Clave del catálogo c_UsoCFDI del SAT, p. ej. "G01". */
  usoCfdi: string;
  domicilioFiscal: string;
  codigoPostal: string;
  correoFacturacion: string;

  /* Comerciales */
  condicionesPago: CondicionesPago;
  /** null cuando es de contado. */
  diasCredito: number | null;
  /** null = sin límite registrado. */
  limiteCredito: number | null;
  moneda: Moneda;
  /** Referencia al catálogo de categorías de productos. */
  categoriaIds: string[];
  /** Sucursales que surte. Vacío = todas. */
  tallerIds: string[];

  /* Contacto: el primero es el principal. */
  contactos: ContactoProveedor[];

  /* Pago */
  datosBancarios: DatosBancariosProveedor;

  documentos: DocumentoFiscalProveedor[];

  /** Baja lógica: un proveedor con O.C. históricas se desactiva, nunca se borra. */
  activo: boolean;
}

/** Lo que se captura en alta y edición. El id y el estatus los pone el sistema. */
export type DatosProveedor = Omit<Proveedor, "id" | "activo">;

/* ── Requisición ──────────────────────────────────────────────────── */

/**
 * De dónde nace la requisición: de una O.S. (refacciones para una unidad) o de
 * un almacén físico que repone stock. "Almacén" aquí es el lugar donde entra
 * la mercancía, no el centro de costos.
 */
export type OrigenRequisicion = { tipo: "os"; osId: string } | { tipo: "almacen"; almacenId: string };

export interface PartidaRequisicion {
  id: string;
  requisicionId: string;
  /** null si se pide algo que aún no está en el catálogo. */
  productoId: string | null;
  descripcion: string;
  numeroParte: string;
  unidadMedida: string;
  cantidad: number;
  /** Taller al que se entrega lo que se compre para esta partida. */
  tallerEntregaId: string;
}

export interface Requisicion {
  id: string;
  folio: string;
  origen: OrigenRequisicion;
  /** Taller que la levanta. */
  tallerId: string;
  estado: EstadoRequisicion;
  creadaEn: string;
  solicitante: string;
  partidas: PartidaRequisicion[];
  /** Proveedores invitados a cotizar. */
  proveedorIds: string[];
}

/* ── Cotización y comparativo ─────────────────────────────────────── */

export interface PartidaCotizacion {
  partidaRequisicionId: string;
  precioUnitario: number;
  /** null si cotiza en existencia. */
  diasEntrega: number | null;
  /** El proveedor puede cotizar menos de lo pedido. */
  cantidadOfrecida: number;
  observaciones: string;
}

export interface CotizacionProveedor {
  id: string;
  requisicionId: string;
  proveedorId: string;
  recibidaEn: string;
  moneda: Moneda;
  vigenciaHasta: string | null;
  partidas: PartidaCotizacion[];
}

/** Adjudicación por partida, no por cotización completa. */
export interface Adjudicacion {
  partidaRequisicionId: string;
  cotizacionId: string;
  proveedorId: string;
  cantidad: number;
  precioUnitario: number;
  /** Obligatorio cuando no se elige la oferta más barata. */
  justificacion: string | null;
}

/** Un comparativo puede terminar en varias O.C. a proveedores distintos. */
export interface Comparativo {
  id: string;
  requisicionIds: string[];
  cotizacionIds: string[];
  adjudicaciones: Adjudicacion[];
  cerradoEn: string | null;
}

/* ── Orden de compra ──────────────────────────────────────────────── */

export interface PartidaOC {
  id: string;
  ordenCompraId: string;
  /** De qué partida de requisición viene: una O.C. junta varias requisiciones. */
  partidaRequisicionId: string;
  requisicionId: string;
  /** Las requisiciones pueden ser de talleres distintos. */
  tallerEntregaId: string;
  productoId: string | null;
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  /** Lo recibido acumulado; la recepción es parcial por naturaleza. */
  cantidadRecibida: number;
}

/** O.C. ↔ requisición es N:M: la relación se lee desde las partidas. */
export interface OrdenCompra {
  id: string;
  folio: string;
  proveedorId: string;
  comparativoId: string | null;
  estado: EstadoOC;
  moneda: Moneda;
  creadaEn: string;
  /** Las requisiciones de donde salen sus partidas. */
  requisicionIds: string[];
  partidas: PartidaOC[];
  /** Flete y maniobras; se prorratean según PRORRATEO_GASTOS. */
  gastosAdicionales: number;
}

/* ── Recepción ────────────────────────────────────────────────────── */

export interface PartidaRecepcion {
  partidaOcId: string;
  cantidadRecibida: number;
  /** Costo con el que entra al almacén, ya prorrateados los gastos. */
  costoUnitario: number;
  /** Capa PEPS que generó esta entrada. */
  capaCostoId: string;
}

export interface RecepcionOC {
  id: string;
  ordenCompraId: string;
  fecha: string;
  recibio: string;
  /** Almacén físico donde entró la mercancía. */
  almacenId: string;
  partidas: PartidaRecepcion[];
}

/* ── Comprobante del proveedor ────────────────────────────────────── */

/**
 * El CFDI se amarra a la O.C., no a la O.S. Conciliación a tres bandas: lo
 * pedido (O.C.), lo recibido (recepciones) y lo facturado (este comprobante).
 */
export interface ComprobanteProveedor {
  id: string;
  ordenCompraId: string;
  proveedorId: string;
  /** Folio fiscal del CFDI. */
  uuid: string;
  serieFolio: string;
  fechaEmision: string;
  moneda: Moneda;
  subtotal: number;
  iva: number;
  total: number;
  estado: EstadoComprobante;
  /** Explicación cuando quedó con diferencia. */
  diferencia: string | null;
  xml: ArchivoAdjunto | null;
  pdf: ArchivoAdjunto | null;
}

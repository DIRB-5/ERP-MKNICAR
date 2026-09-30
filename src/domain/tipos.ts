import type { EstadoOS } from "./estados";

/* ── Clientes ─────────────────────────────────────────────────────── */

export type TipoCliente = "flotilla" | "particular";
export type EstadoCliente = "activo" | "credito_suspendido";
export type CanalContacto = "correo" | "whatsapp";

export interface Contacto {
  id: string;
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  /** Solo quien tiene esta facultad recibe la solicitud de autorización de presupuesto. */
  autorizaPresupuesto: boolean;
  canalPreferido: CanalContacto;
}

export interface Cliente {
  id: string;
  razonSocial: string;
  rfc: string;
  tipo: TipoCliente;
  convenioId: string | null;
  ejecutivoCuenta: string;
  estado: EstadoCliente;
  contactos: Contacto[];
}

/**
 * Alta de cliente. El id y los ids de contacto los asigna el backend; todo
 * cliente nace activo: suspender el crédito es decisión de Tesorería, no del alta.
 */
export interface DatosAltaCliente {
  razonSocial: string;
  rfc: string;
  tipo: TipoCliente;
  convenioId: string | null;
  ejecutivoCuenta: string;
  contactos: Omit<Contacto, "id">[];
}

/* ── Unidades ─────────────────────────────────────────────────────── */

export type TipoUnidad = "combustion" | "hibrido" | "electrico";
export type EstadoUnidad = "activa" | "baja" | "siniestrada";

/**
 * La unidad no guarda un taller actual: dónde está sale de su O.S. abierta.
 * Ver CLAUDE.md, "La unidad y el taller".
 */
export interface Unidad {
  id: string;
  placas: string;
  vin: string;
  /** Número que el cliente usa internamente para la unidad. */
  numeroEconomico?: string;
  marca: string;
  modelo: string;
  anio: number;
  tipo: TipoUnidad;
  clienteId: string;
  tallerBaseId: string;
  kilometrajeUltimo: number;
  /** AAAA-MM-DD. */
  fechaKilometraje: string;
  estado: EstadoUnidad;
}

/** Alta completa de unidad. Toda unidad nace activa. */
export type DatosAltaUnidad = Omit<Unidad, "id" | "estado">;

/* ── Vistas de lectura que arma el backend ────────────────────────── */

export interface TallerRef {
  id: string;
  nombre: string;
}

export interface OSAbiertaRef {
  folio: string;
  /** Taller donde está la unidad ahora mismo. */
  taller: TallerRef;
  estado: EstadoOS;
}

export interface UnidadResumen {
  unidad: Unidad;
  cliente: { id: string; razonSocial: string };
  tallerBase: TallerRef;
  /** null: la unidad está en operación con el cliente. */
  osAbierta: OSAbiertaRef | null;
  osAbiertas: number;
  /** AAAA-MM-DD del último servicio cerrado. */
  ultimoServicio: string | null;
}

export interface ClienteResumen {
  cliente: Cliente;
  unidades: number;
  osAbiertas: number;
  facturadoPeriodo: number;
}

export interface OrdenHistorial {
  folio: string;
  /** AAAA-MM-DD de apertura. */
  fecha: string;
  tipoServicio: string;
  taller: TallerRef;
  estado: EstadoOS;
  /** null mientras la O.S. sigue abierta. */
  diasCiclo: number | null;
  costo: number;
  /**
   * AAAA-MM-DD en que vence la garantía de esta O.S. La calcula el backend
   * según su tipo de servicio; el frontend no conoce los plazos.
   */
  garantiaVigenteHasta?: string | null;
}

export interface ExpedienteUnidad {
  resumen: UnidadResumen;
  costoAcumulado: number;
  osHistoricas: number;
  /** null si todavía no hay kilometraje suficiente para calcularlo. */
  costoPorKm: number | null;
  diasFueraOperacionAnio: number;
}

/* ── Orden de servicio: alta y recepción ─────────────────────────── */

export type TipoIngreso = "cita" | "recoleccion" | "directo";
export type TipoServicio = "preventivo" | "correctivo" | "diagnostico" | "garantia" | "siniestro";
export type PrioridadOS = "normal" | "alta" | "critica";

export interface Recoleccion {
  direccion: string;
  fechaHora: Date;
  contactoEnSitio: string;
}

/**
 * La O.S. al abrirse NO sabe qué tiene el vehículo: es el contenedor donde
 * después cabrá el diagnóstico (estado `en_diagnostico`, lo hace un técnico).
 * Al abrir solo se captura el motivo que reporta el cliente, en sus palabras.
 */
export interface OrdenServicio {
  folio: string;
  clienteId: string;
  unidadId: string;
  tallerId: string;
  tipoIngreso: TipoIngreso;
  tipoServicio: TipoServicio;
  /** Lo que dijo el cliente ("hace un ruido al frenar"), nunca un diagnóstico. */
  motivoReportado: string;
  prioridad: PrioridadOS;
  /** null si el cliente aún no tiene contactos: no se bloquea el ingreso. */
  contactoSolicitaId: string | null;
  contactoAutorizaId: string | null;
  canalAutorizacion: CanalContacto;
  cobraDiagnostico: boolean;
  /** O.S. original cuando es retrabajo o garantía. */
  osPadreId?: string;
  programadaPara?: Date;
  recoleccion?: Recoleccion;
  estado: EstadoOS;
  creadaEn: Date;
  creadaPor: string;
}

/** Lo que captura el formulario de alta; folio, estado y auditoría los pone el backend. */
export type DatosAltaOS = Omit<OrdenServicio, "folio" | "estado" | "creadaEn" | "creadaPor">;

export const ELEMENTOS_INVENTARIO = [
  "llave",
  "refaccion",
  "gato",
  "herramienta",
  "tapetes",
  "documentos",
  "estereo",
  "placas",
] as const;

export type ElementoInventario = (typeof ELEMENTOS_INVENTARIO)[number];

export type SeveridadDano = "leve" | "moderado" | "grave";

export interface DanoPrevio {
  zona: string;
  descripcion: string;
  severidad: SeveridadDano;
}

export interface FotoRecepcion {
  /** Referencia al archivo. Hoy es local; la subida real llega con la API. */
  referencia: string;
  etiqueta: string;
}

/**
 * Al recibir se registra la CONDICIÓN en que llega la unidad, nunca un
 * diagnóstico: si un campo pide algo técnico, el asesor lo va a inventar.
 */
export interface RecepcionUnidad {
  osId: string;
  fechaHora: Date;
  /** Kilometraje u horómetro. */
  kilometraje: number;
  /** 0 a 8, en octavos de tanque. */
  nivelCombustible: number;
  /** Asesor que recibe, del contexto de sesión. */
  recibeId: string;
  entregaNombre: string;
  inventario: Record<ElementoInventario, boolean>;
  objetosPersonales: string;
  danosPrevios: DanoPrevio[];
  fotos: FotoRecepcion[];
  autorizaDiagnostico: boolean;
  /** Referencia a la firma; null mientras no exista el capturador. */
  firmaEntrega: string | null;
}

export type DatosRecepcion = Omit<RecepcionUnidad, "osId">;

/** Un ingreso esperado hoy: la O.S. con lo necesario para recibirla. */
export interface IngresoEsperado {
  orden: OrdenServicio;
  cliente: { id: string; razonSocial: string };
  unidad: Unidad;
  /** Hora de la cita o de la recolección. */
  hora: Date | null;
}

/** Alta rápida: lo mínimo para no frenar el ingreso. VIN y taller base, después. */
export interface DatosAltaRapidaUnidad {
  placas: string;
  marca: string;
  modelo: string;
  anio: number;
  clienteId: string;
}

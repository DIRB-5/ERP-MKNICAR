import type {
  Cliente,
  DatosAltaOS,
  DatosAltaRapidaUnidad,
  DatosAltaUnidad,
  DatosRecepcion,
  IngresoEsperado,
  OrdenServicio,
  Unidad,
  ClienteResumen,
  DatosAltaCliente,
  EstadoCliente,
  EstadoUnidad,
  ExpedienteUnidad,
  OrdenHistorial,
  TipoCliente,
  TipoUnidad,
  UnidadResumen,
} from "@/domain/tipos";

/**
 * Contratos de la capa de datos. Las páginas dependen de estas firmas, nunca
 * de una implementación: hoy la de memoria, mañana la de la API.
 *
 * `alcance` es el taller activo de la sesión. El scoping por taller vive aquí
 * desde el primer fetch, no se agrega después.
 */

export interface FiltrosClientes {
  alcance: string;
  texto?: string;
  tipo?: TipoCliente;
  estado?: EstadoCliente;
}

export interface FiltrosUnidades {
  alcance: string;
  tallerBaseId?: string;
  clienteId?: string;
  tipo?: TipoUnidad;
  estado?: EstadoUnidad;
  /** Solo unidades con O.S. abierta. */
  soloEnPiso?: boolean;
}

export interface ClienteRepo {
  listar(filtros: FiltrosClientes): Promise<ClienteResumen[]>;
  obtener(id: string): Promise<Cliente | null>;
  unidadesDe(clienteId: string): Promise<UnidadResumen[]>;
  ordenesDe(clienteId: string): Promise<OrdenHistorial[]>;
  /** Rechaza un RFC que ya exista en el padrón. */
  crear(datos: DatosAltaCliente): Promise<Cliente>;
}

export interface UnidadRepo {
  listar(filtros: FiltrosUnidades): Promise<UnidadResumen[]>;
  obtener(placas: string): Promise<ExpedienteUnidad | null>;
  historialDe(placas: string): Promise<OrdenHistorial[]>;
  altaRapida(datos: DatosAltaRapidaUnidad): Promise<Unidad>;
  /** Rechaza placas o VIN que ya existan en el padrón. */
  crear(datos: DatosAltaUnidad): Promise<Unidad>;
}

export interface OrdenServicioRepo {
  /** O.S. programadas y recolecciones en ruta para ese día en el taller. */
  ingresosDelDia(tallerId: string, fecha: Date): Promise<IngresoEsperado[]>;
  obtener(folio: string): Promise<IngresoEsperado | null>;
  /** Devuelve la O.S. en estado `programada`. */
  crear(datos: DatosAltaOS): Promise<OrdenServicio>;
  /** Transiciona a `unidad_recibida`. */
  recibir(osId: string, datos: DatosRecepcion): Promise<OrdenServicio>;
  /** Unidad que llegó sin cita: crea y recibe en una sola operación. */
  ingresoDirecto(alta: DatosAltaOS, recepcion: DatosRecepcion): Promise<OrdenServicio>;
}

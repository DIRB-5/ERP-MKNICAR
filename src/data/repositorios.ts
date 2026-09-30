import type {
  CategoriaProducto,
  Cliente,
  ClienteResumen,
  CuentasPorCobrar,
  DashboardFinanciero,
  DashboardPersonal,
  DatosAltaCliente,
  DatosAltaOS,
  DatosAltaProducto,
  DatosAltaProveedor,
  DatosAltaRapidaUnidad,
  DatosAltaUnidad,
  DatosRecepcion,
  DetalleProducto,
  DetalleProveedor,
  EstadoCliente,
  EstadoProveedor,
  EstadoUnidad,
  ExpedienteUnidad,
  IngresoEsperado,
  OrdenHistorial,
  OrdenServicio,
  Producto,
  Proveedor,
  SaldoProveedor,
  Subcategoria,
  TipoCliente,
  TipoProducto,
  TipoUnidad,
  Unidad,
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

/** Solo lectura: los pagos se autorizan en el motor de autorizaciones del backend. */
export interface TesoreriaRepo {
  dashboard(alcance: string, periodo: string): Promise<DashboardFinanciero>;
  cuentasPorPagar(alcance: string): Promise<SaldoProveedor[]>;
  cuentasPorCobrar(alcance: string): Promise<CuentasPorCobrar>;
}

export interface FiltrosProductos {
  texto?: string;
  categoriaId?: string;
  subcategoriaId?: string;
  tipo?: TipoProducto;
}

export interface FiltrosProveedores {
  texto?: string;
  /** Proveedores que surten esa categoría. */
  categoriaId?: string;
  estado?: EstadoProveedor;
}

export interface CatalogoRepo {
  categorias(): Promise<CategoriaProducto[]>;
  productos(filtros: FiltrosProductos): Promise<Producto[]>;
  producto(id: string): Promise<DetalleProducto | null>;
  proveedores(filtros: FiltrosProveedores): Promise<Proveedor[]>;
  proveedor(id: string): Promise<DetalleProveedor | null>;
  /** Rechaza un RFC que ya exista en el padrón de proveedores. */
  crearProveedor(datos: DatosAltaProveedor): Promise<Proveedor>;
  /** Rechaza un número de parte que ya exista para la misma marca. */
  crearProducto(datos: DatosAltaProducto): Promise<Producto>;
  crearCategoria(nombre: string): Promise<CategoriaProducto>;
  crearSubcategoria(categoriaId: string, nombre: string): Promise<Subcategoria>;
}

export interface PersonalRepo {
  dashboard(alcance: string, periodo: string): Promise<DashboardPersonal>;
}

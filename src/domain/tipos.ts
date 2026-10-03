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
  /** Lo que llega con la unidad y no está en la lista: herramienta especial, accesorios, equipo del cliente. */
  inventarioExtra: string;
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

/* ── Tesorería: vistas de lectura que arma el backend ─────────────── */

/** Cartera por antigüedad. `porVencer` aún no vence; los demás son días vencidos. */
export interface TramosCartera {
  porVencer: number;
  d1a30: number;
  d31a60: number;
  mas60: number;
}

export interface ResumenFinanciero {
  facturadoMes: number;
  metaMes: number;
  porCobrar: number;
  vencidoPorCobrar: number;
  diasCartera: number;
  facturasAbiertas: number;
  porPagar: number;
  venceEstaSemana: number;
  ocPorLiquidar: number;
  proveedores: number;
  margenBruto: number;
  margenVariacionPts: number;
  utilidadBruta: number;
}

export interface MesFinanciero {
  /** AAAA-MM. */
  mes: string;
  presupuestado: number;
  facturado: number;
  costoReal: number;
}

export interface IndicadoresPresupuesto {
  /** Porcentaje con signo: facturado contra presupuestado. */
  desviacionPromedio: number;
  facturadasDebajoDelPresupuesto: number;
  sinFacturarTrasRemision: number;
}

export interface FlujoTaller {
  taller: TallerRef;
  osFacturadas: number;
  presupuestado: number;
  facturado: number;
  costoRefacciones: number;
  costoManoObra: number;
  porCobrar: number;
  vencido: number;
}

export interface PorFacturar {
  folioOs: string;
  cliente: string;
  monto: number;
  diasDesdeRemision: number;
}

export interface VencimientoPago {
  proveedor: string;
  folioOc: string;
  monto: number;
  /** AAAA-MM-DD. */
  vence: string;
}

export interface GastoProveedor {
  proveedor: string;
  ordenesCompra: number;
  monto: number;
  /** Porcentaje contra el mes anterior. */
  variacion: number;
}

export interface DashboardFinanciero {
  resumen: ResumenFinanciero | null;
  meses: MesFinanciero[];
  indicadores: IndicadoresPresupuesto | null;
  cartera: TramosCartera | null;
  flujo: FlujoTaller[];
  porFacturar: PorFacturar[];
  vencimientos: VencimientoPago[];
  proveedores: GastoProveedor[];
}

/* Cuentas por pagar */

export type AutorizacionPago = "pendiente" | "autorizada" | "rechazada";
export type EstadoPago = "por_programar" | "programada" | "pagada";

export interface FacturaProveedor {
  folio: string;
  folioOc: string;
  /** O.S. que originó el gasto; null si la O.C. no viene de una O.S. */
  folioOs: string | null;
  /** AAAA-MM-DD. */
  emision: string;
  vence: string;
  monto: number;
  saldo: number;
  /** 0 si aún no vence. */
  diasVencida: number;
  /** La autoriza Dirección: es el punto de espera `autorizacion_oc`. */
  autorizacion: AutorizacionPago;
  pago: EstadoPago;
}

export interface SaldoProveedor {
  id: string;
  nombre: string;
  categoria: string;
  ocAbiertas: number;
  creditoDias: number;
  /** Porcentaje de entregas a tiempo. */
  cumplimiento: number;
  facturas: FacturaProveedor[];
}

/* Cuentas por cobrar (fuera de la fase 1: se muestra vacío hasta que exista el módulo) */

export type EstadoFacturaCliente = "por_vencer" | "vencida" | "pago_parcial";

export interface FacturaCliente {
  folio: string;
  foliosOs: string[];
  emision: string;
  vence: string;
  monto: number;
  saldo: number;
  diasVencida: number;
  estado: EstadoFacturaCliente;
}

export interface CarteraCliente {
  cliente: { id: string; razonSocial: string };
  unidades: number;
  diasPromedioPago: number;
  tramos: TramosCartera;
  facturas: FacturaCliente[];
}

export interface AccionCobranza {
  id: string;
  texto: string;
  detalle: string;
  accion: string;
}

export interface GestionCobranza {
  id: string;
  cliente: string;
  /** AAAA-MM-DD. */
  fecha: string;
  tipo: string;
  resultado: string;
}

export interface CuentasPorCobrar {
  clientes: CarteraCliente[];
  acciones: AccionCobranza[];
  gestiones: GestionCobranza[];
}

/* ── Catálogo de proveedores y productos ─────────────────────────── */

export interface Subcategoria {
  id: string;
  nombre: string;
  /** Productos en la subcategoría. */
  total: number;
}

/** Las categorías son dato del catálogo, no constantes del código. */
export interface CategoriaProducto {
  id: string;
  nombre: string;
  total: number;
  subcategorias: Subcategoria[];
}

export type TipoProducto = "original" | "oem" | "generico" | "reconstruido";

export interface Producto {
  id: string;
  numeroParte: string;
  descripcion: string;
  marca: string;
  categoria: { id: string; nombre: string };
  subcategoria: { id: string; nombre: string } | null;
  tipo: TipoProducto;
  /** Pieza, juego, metro, cubeta… */
  unidadMedida: string;
  /** null mientras no exista el módulo de inventarios. */
  existencia: number | null;
  proveedores: number;
  ultimoCosto: number;
  costoPromedio: number;
  precioSugerido: number;
}

export type Disponibilidad = "inmediata" | "sobre_pedido" | "agotado";

export interface PrecioProveedor {
  proveedor: { id: string; nombre: string };
  precio: number;
  /** AAAA-MM-DD de la última cotización o compra. */
  fecha: string;
  entregaDias: number;
  disponibilidad: Disponibilidad;
}

export interface DetalleProducto {
  producto: Producto;
  precios: PrecioProveedor[];
  /** Costo por mes, AAAA-MM, de los últimos doce meses. */
  historicoCosto: { mes: string; costo: number }[];
  unidadesCompradasAnio: number;
  osDondeSeUso: number;
  talleres: { taller: TallerRef; unidades: number }[];
}

export type EstadoProveedor = "activo" | "suspendido";

export interface Proveedor {
  id: string;
  razonSocial: string;
  rfc: string;
  /** Nombres de las categorías que surte. */
  categorias: string[];
  productos: number;
  creditoDias: number;
  entregaPromedioDias: number;
  /** Porcentaje de entregas a tiempo. */
  cumplimiento: number;
  comprasAnio: number;
  /** 1 a 5. */
  calificacion: number;
  estado: EstadoProveedor;
}

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

export interface DetalleProveedor {
  proveedor: Proveedor;
  datosBancarios: DatosBancariosProveedor;
  regimenFiscal: string;
  usoCfdi: string;
  domicilioFiscal: string;
  contactos: ContactoProveedor[];
  /** Porcentaje de piezas devueltas. */
  devoluciones: number;
  ordenes: { folio: string; detalle: string; monto: number; estado: string }[];
}

/** Alta de proveedor. Todo proveedor nace activo; suspenderlo es decisión de Abastecimiento. */
export interface DatosAltaProveedor {
  razonSocial: string;
  rfc: string;
  /** Clave del catálogo c_RegimenFiscal del SAT, p. ej. "601". */
  regimenFiscal: string;
  /** Clave del catálogo c_UsoCFDI del SAT, p. ej. "G01". */
  usoCfdi: string;
  codigoPostal: string;
  domicilioFiscal: string;
  categoriaIds: string[];
  /** 0 = contado. */
  creditoDias: number;
  datosBancarios: DatosBancariosProveedor;
  contactos: ContactoProveedor[];
}

export interface PrecioAlta {
  proveedorId: string;
  precio: number;
  entregaDias: number;
  disponibilidad: Disponibilidad;
}

/** Alta de producto. Los costos se derivan de los precios de sus proveedores. */
export interface DatosAltaProducto {
  numeroParte: string;
  descripcion: string;
  marca: string;
  categoriaId: string;
  subcategoriaId: string | null;
  tipo: TipoProducto;
  unidadMedida: string;
  precioSugerido: number;
  precios: PrecioAlta[];
}

/* ── Personal y mano de obra (fuera de la fase 1: vacío hasta que exista el módulo) ── */

export interface ResumenPersonal {
  plantilla: number;
  talleres: number;
  turnos: number;
  tecnicosProductivos: number;
  /** Costo integrado con prestaciones. */
  costoNomina: number;
  /** Porcentaje del ingreso del periodo. */
  nominaSobreIngreso: number;
  metaNominaSobreIngreso: number;
  /** Horas aplicadas a O.S. sobre horas disponibles, en porcentaje. */
  recuperacionHoras: number;
  objetivoRecuperacion: number;
}

export interface PersonalTaller {
  taller: TallerRef;
  tecnicos: number;
  asesores: number;
  administrativos: number;
  costoMensual: number;
  horasDisponibles: number;
  horasAplicadas: number;
  /** Ingreso del periodo, para calcular nómina sobre ingreso. */
  ingreso: number;
}

export interface CapacidadTaller {
  taller: TallerRef;
  horasDisponibles: number;
  /** Horas que piden las O.S. abiertas. */
  horasDemandadas: number;
}

export type EstadoCertificacion = "vigente" | "por_vencer" | "vencida";

export interface Certificacion {
  nombre: string;
  personas: number;
  /** Talleres con al menos una persona certificada, de los seis. */
  talleresCubiertos: number;
  talleresTotales: number;
  /** AAAA-MM-DD del próximo vencimiento; null si no vence. */
  vence: string | null;
  estado: EstadoCertificacion;
  talleresSinCobertura: string[];
}

/**
 * Productividad por técnico. Sin sueldo individual: el costo por hora es el
 * de su puesto en su taller.
 */
export interface ProductividadTecnico {
  id: string;
  nombre: string;
  taller: string;
  puesto: string;
  horasDisponibles: number;
  horasAplicadas: number;
  horasFacturadas: number;
  ordenes: number;
  retrabajos: number;
  costoHora: number;
}

export interface DashboardPersonal {
  resumen: ResumenPersonal | null;
  talleres: PersonalTaller[];
  puestos: { puesto: string; personas: number }[];
  antiguedadPromedioAnios: number | null;
  rotacionAnual: number | null;
  capacidad: CapacidadTaller[];
  certificaciones: Certificacion[];
  tecnicos: ProductividadTecnico[];
}

/* Perfil de técnico */

export type NivelHabilidad = "basico" | "intermedio" | "avanzado" | "experto";

export interface Habilidad {
  nombre: string;
  /** 0 a 100, de la última evaluación. */
  valor: number;
  nivel: NivelHabilidad;
  /** Promedio del taller en la misma habilidad, para comparar. */
  promedioTaller: number;
}

export interface CertificacionTecnico {
  nombre: string;
  /** AAAA-MM-DD. */
  obtenida: string;
  /** AAAA-MM-DD; null si no vence. */
  vence: string | null;
}

export interface OrdenTecnico {
  folio: string;
  placas: string;
  cliente: string;
  servicio: string;
  horasEstandar: number;
  horasReales: number;
  costoManoObra: number;
  manoObraFacturada: number;
  estado: EstadoOS;
}

export interface PerfilTecnico {
  id: string;
  nombre: string;
  puesto: string;
  nivel: string;
  numeroEmpleado: string;
  taller: TallerRef;
  turno: string;
  activo: boolean;
  /** Especialidades que se muestran como etiquetas junto al nombre. */
  especialidades: string[];
  /** AAAA-MM-DD. */
  fechaIngreso: string;
  recuperacion: number;
  recuperacionVariacionPts: number;
  ordenesMes: number;
  horasAplicadasMes: number;
  horasDisponiblesMes: number;
  retrabajos90Dias: number;
  tasaRetrabajo: number;
  tasaRetrabajoTaller: number;
  /** Sueldo + prestaciones + carga social, por hora. */
  costoHora: number;
  costoMensual: number;
  /** Porcentaje de la nómina de su taller. */
  participacionNominaTaller: number;
  /** Mano de obra facturada en sus O.S. del mes. */
  valorGenerado: number;
  relacionValorCostoTaller: number;
  habilidades: Habilidad[];
  /** AAAA-MM-DD de la última evaluación de habilidades. */
  ultimaEvaluacion: string | null;
  certificaciones: CertificacionTecnico[];
  /** Últimos doce meses, AAAA-MM. */
  meses: { mes: string; horasAplicadas: number; horasDisponibles: number }[];
  /**
   * Solo lo reciben RRHH y Dirección: el backend decide quién lo ve y manda
   * null a los demás. El frontend nunca lo filtra por su cuenta.
   */
  expediente: { etiqueta: string; valor: string }[] | null;
  ordenesRecientes: OrdenTecnico[];
}

/** Persona con facultad de recibir unidades en un taller. La facultad la asigna RRHH. */
export interface PersonaReceptora {
  id: string;
  nombre: string;
  puesto: string;
}

export type TipoContrato = "indeterminado" | "determinado" | "por_obra";

/**
 * Alta de técnico. Habilidades y productividad no se capturan aquí: salen de
 * la primera evaluación y de sus O.S.
 */
export interface DatosAltaTecnico {
  nombre: string;
  numeroEmpleado: string;
  correo: string;
  telefono: string;
  puesto: string;
  nivel: string;
  tallerId: string;
  turno: string;
  /** AAAA-MM-DD. */
  fechaIngreso: string;
  tipoContrato: TipoContrato;
  especialidades: string[];
  /** Facultad de recibir unidades: lo pone en la lista "Recibe" de su taller. */
  puedeRecibirUnidades: boolean;
  /** Sueldo + prestaciones + carga social. */
  costoMensualIntegrado: number;
  horasDisponiblesMes: number;
  certificaciones: CertificacionTecnico[];
  /** Datos del expediente: solo RRHH y Dirección los ven después. */
  curp: string | null;
  nss: string | null;
}

/** Evaluación de habilidades de un técnico. El nivel se deriva del puntaje. */
export interface DatosEvaluacion {
  /** AAAA-MM-DD. */
  fecha: string;
  evaluador: string;
  habilidades: { nombre: string; valor: number }[];
  observaciones: string;
  /** Horas de capacitación sugeridas para cerrar las brechas; 0 si no hay. */
  horasCapacitacion: number;
}

/* ── Compras: comparativo de cotizaciones ─────────────────────────── */

export interface ProveedorInvitado {
  proveedor: { id: string; nombre: string };
  /** Cuándo respondió, ISO 8601; null si todavía no cotiza. */
  respondio: string | null;
  entregaDias: number | null;
  creditoDias: number | null;
}

export interface Oferta {
  proveedorId: string;
  precioUnitario: number;
  disponibilidad: Disponibilidad;
  /** Días para surtir cuando no es inmediata. */
  diasEntrega: number | null;
}

export interface ConceptoRequisicion {
  id: string;
  descripcion: string;
  /** Sistema del vehículo: suspensión, frenos… */
  sistema: string;
  numeroParte: string;
  cantidad: number;
  /** Último costo de compra; null si nunca se ha comprado. */
  ultimoCosto: number | null;
  /** Una por proveedor que cotizó este concepto. */
  ofertas: Oferta[];
}

export interface ComparativoCotizacion {
  /** Folio de la requisición. */
  folio: string;
  estado: string;
  folioOs: string;
  servicio: string;
  unidad: { placas: string; marca: string; modelo: string };
  cliente: string;
  taller: string;
  /** AAAA-MM-DD. */
  solicitada: string;
  /** Presupuesto estimado cuando se levantó la requisición. */
  estimadoInicial: number;
  proveedores: ProveedorInvitado[];
  conceptos: ConceptoRequisicion[];
}

export interface RequisicionEnComparativo {
  folio: string;
  folioOs: string;
  cliente: string;
  placas: string;
  taller: string;
  conceptos: number;
  respuestas: number;
  invitados: number;
  solicitada: string;
  estimadoInicial: number;
}

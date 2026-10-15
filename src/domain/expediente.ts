import type { Area } from "./areas";
import { ESTADO, ESTADOS, type EstadoOS } from "./estados";
import { eventosDe, type ClaveSeccion, type EventoOS, type TipoEvento } from "./bitacora";
import { estadosVisitados } from "./tiempos";
import type { PrioridadOS, TallerRef, TipoIngreso, TipoServicio } from "./tipos";

export type { ClaveSeccion } from "./bitacora";

/**
 * Registro de secciones del expediente de la O.S. Mismo patrón que el de
 * catálogos: las secciones se declaran aquí y la página las itera. Agregar una
 * es declararla y crear su componente en pages/ordenes/expediente/secciones.
 *
 * El estado actual no esconde el pasado: una sección aparece cuando el ciclo
 * llega a `nace` y se queda para siempre. El estado solo decide si se edita.
 */
export interface SeccionExpediente {
  clave: ClaveSeccion;
  titulo: string;
  /** Da el color del dato vía `--dom`. */
  area: Area;
  /** Estado en que la sección aparece. */
  nace: EstadoOS;
  /** A partir de aquí es solo lectura. null: nunca cierra por estado. */
  cierraEn: EstadoOS | null;
  /** No se puede pasar a este estado sin completarla. */
  obligatoriaPara: EstadoOS | null;
  /**
   * La alimenta otro módulo (Compras, Almacén): desde el expediente solo se
   * consulta, aunque admite notas y evidencias como cualquier sección.
   */
  soloLectura?: boolean;
}

export const SECCIONES: readonly SeccionExpediente[] = [
  { clave: "recepcion", titulo: "Recepción", area: "operacion", nace: "diagnostico", cierraEn: "cotizar", obligatoriaPara: null },
  { clave: "diagnostico", titulo: "Diagnóstico", area: "operacion", nace: "diagnostico", cierraEn: "pendiente_autorizacion", obligatoriaPara: "cotizar" },
  { clave: "abastecimiento", titulo: "Abastecimiento", area: "abastecimiento", nace: "cotizar", cierraEn: "pendiente_autorizacion", obligatoriaPara: "pendiente_autorizacion" },
  { clave: "presupuesto", titulo: "Presupuesto", area: "operacion", nace: "cotizar", cierraEn: "autorizado_compra", obligatoriaPara: "pendiente_autorizacion" },
  { clave: "autorizacion", titulo: "Autorización del cliente", area: "cliente", nace: "pendiente_autorizacion", cierraEn: "autorizado_compra", obligatoriaPara: "autorizado_compra" },
  { clave: "compra", titulo: "Compra", area: "abastecimiento", nace: "autorizado_compra", cierraEn: null, obligatoriaPara: null, soloLectura: true },
  { clave: "materiales", titulo: "Materiales", area: "almacen", nace: "autorizado_compra", cierraEn: null, obligatoriaPara: null, soloLectura: true },
  { clave: "reparacion", titulo: "Reparación", area: "operacion", nace: "en_reparacion", cierraEn: "remision", obligatoriaPara: "remision" },
  // La revisión de salida ya no es estatus: se hace al terminar la reparación y es requisito para Remisión.
  { clave: "calidad", titulo: "Calidad", area: "operacion", nace: "en_reparacion", cierraEn: "remision", obligatoriaPara: "remision" },
  { clave: "entrega", titulo: "Entrega", area: "operacion", nace: "remision", cierraEn: "cerrada", obligatoriaPara: "cerrada" },
  // La factura ya no es estatus: se vincula en Remisión y es requisito para cerrar.
  { clave: "facturacion", titulo: "Facturación", area: "operacion", nace: "remision", cierraEn: "cerrada", obligatoriaPara: "cerrada" },
  { clave: "cierre", titulo: "Cierre", area: "direccion", nace: "cerrada", cierraEn: null, obligatoriaPara: null, soloLectura: true },
];

/** A qué sección pertenece cada evento. Notas, evidencias y correcciones dicen la suya en su carga. */
export const SECCION_DEL_EVENTO: Partial<Record<TipoEvento, ClaveSeccion>> = {
  recepcion_registrada: "recepcion",
  tecnico_asignado: "diagnostico",
  hallazgo_agregado: "diagnostico",
  requisicion_generada: "abastecimiento",
  requisicion_actualizada: "abastecimiento",
  cotizacion_registrada: "abastecimiento",
  proveedor_elegido: "abastecimiento",
  presupuesto_emitido: "presupuesto",
  adenda_emitida: "presupuesto",
  autorizacion_solicitada: "autorizacion",
  autorizacion_cliente: "autorizacion",
  oc_vinculada: "compra",
  material_recibido: "materiales",
  mano_obra_cargada: "reparacion",
  refaccion_consumida: "reparacion",
  calidad_liberada: "calidad",
  remision_emitida: "entrega",
  factura_vinculada: "facturacion",
};

/**
 * Eventos que se capturan desde el expediente: solo entran mientras su sección
 * está abierta. Los demás los registra su propio módulo o una transición.
 */
export const CAPTURABLES: readonly TipoEvento[] = [
  "tecnico_asignado",
  "hallazgo_agregado",
  "cotizacion_registrada",
  "proveedor_elegido",
  "presupuesto_emitido",
  "adenda_emitida",
  "autorizacion_cliente",
  "mano_obra_cargada",
  "calidad_liberada",
  "remision_emitida",
  "factura_vinculada",
];

/**
 * Capturas permitidas aunque su sección esté cerrada. La adenda de sobrecosto
 * nace en reparación y dispara el retorno a autorización del cliente.
 */
export const CAPTURA_FUERA_DE_SECCION: Partial<Record<TipoEvento, readonly EstadoOS[]>> = {
  adenda_emitida: ["en_reparacion"],
};

const posicion = (e: EstadoOS) => ESTADOS.indexOf(e);

/** La sección existe en cuanto el ciclo pasó por su estado de nacimiento, aunque después regrese. */
export const seccionVisible = (s: SeccionExpediente, eventos: readonly EventoOS[]): boolean =>
  estadosVisitados(eventos).has(s.nace);

/**
 * Abierta mientras el estado actual está entre `nace` y `cierraEn`. Se mide por
 * posición en el ciclo, así que un retorno (sobrecosto, O.C. rechazada) la
 * vuelve a abrir. Un estado terminal cierra todo.
 */
export function seccionAbierta(s: SeccionExpediente, actual: EstadoOS): boolean {
  if (s.soloLectura || ESTADO[actual].terminal) return false;
  const p = posicion(actual);
  return p >= posicion(s.nace) && (s.cierraEn == null || p < posicion(s.cierraEn));
}

/**
 * Qué secciones se muestran desplegadas al abrir el expediente: las abiertas y,
 * de las ya cerradas, solo la más reciente. En una O.S. terminada, ninguna.
 */
export function desplegadasPorDefecto(eventos: readonly EventoOS[], actual: EstadoOS): Set<ClaveSeccion> {
  const r = new Set<ClaveSeccion>();
  if (ESTADO[actual].terminal) return r;
  const visibles = SECCIONES.filter((s) => seccionVisible(s, eventos));
  for (const s of visibles) if (seccionAbierta(s, actual)) r.add(s.clave);
  const cerradas = visibles.filter((s) => !seccionAbierta(s, actual));
  const anterior = cerradas.at(-1);
  if (anterior) r.add(anterior.clave);
  return r;
}

/* ── Solicitud de refacciones y cotización ────────────────────────── */

export interface PiezaSolicitada {
  /** `<hallazgoId>:<n>`: estable mientras el hallazgo exista. */
  id: string;
  productoId: string | null;
  clave: string;
  descripcion: string;
  cantidad: number;
}

/**
 * Las piezas de la solicitud son las refacciones de los hallazgos: lo que el
 * diagnóstico registró no se vuelve a capturar.
 */
export function piezasSolicitadas(eventos: readonly EventoOS[]): PiezaSolicitada[] {
  return eventosDe(eventos, "hallazgo_agregado").flatMap((h) =>
    h.carga.refacciones.map((r, i) => ({
      id: `${h.carga.hallazgoId}:${i}`,
      productoId: r.id,
      clave: r.clave,
      descripcion: r.descripcion,
      cantidad: r.cantidad,
    }))
  );
}

/** La cotización vigente de cada proveedor: la más reciente. */
export function cotizacionesVigentes(eventos: readonly EventoOS[]) {
  const porProveedor = new Map<string, ReturnType<typeof eventosDe<"cotizacion_registrada">>[number]>();
  for (const c of eventosDe(eventos, "cotizacion_registrada").sort((a, b) => a.en.localeCompare(b.en))) porProveedor.set(c.carga.proveedorId, c);
  return [...porProveedor.values()];
}

/** Proveedor elegido por pieza: la elección más reciente. */
export function elecciones(eventos: readonly EventoOS[]) {
  const porPieza = new Map<string, ReturnType<typeof eventosDe<"proveedor_elegido">>[number]>();
  for (const e of eventosDe(eventos, "proveedor_elegido").sort((a, b) => a.en.localeCompare(b.en))) porPieza.set(e.carga.piezaId, e);
  return porPieza;
}

/* ── Requisitos para avanzar ──────────────────────────────────────── */

/** Lo último que se registró después de la entrada más reciente a un estado. */
function desdeUltimaEntrada(eventos: readonly EventoOS[], estado: EstadoOS): EventoOS[] {
  const entradas = eventos.filter((e) => e.estadoDespues === estado).map((e) => e.en).sort();
  const desde = entradas.at(-1);
  return desde ? eventos.filter((e) => e.en >= desde) : [];
}

const versiones = (eventos: readonly EventoOS[]) => [
  ...eventosDe(eventos, "presupuesto_emitido"),
  ...eventosDe(eventos, "adenda_emitida"),
];

/** Versión más reciente del presupuesto, o 0 si no hay. */
export const ultimaVersion = (eventos: readonly EventoOS[]): number =>
  Math.max(0, ...versiones(eventos).map((v) => v.carga.version));

/** Versiones a las que el cliente ya respondió. */
export const versionesRespondidas = (eventos: readonly EventoOS[]): Set<number> =>
  new Set(eventosDe(eventos, "autorizacion_cliente").map((a) => a.carga.version));

/**
 * Qué le falta a cada sección para permitir su transición obligatoria. null
 * cuando está completa. Solo sirve para no ofrecer acciones imposibles: el
 * backend vuelve a validar.
 */
export const REQUISITOS: Partial<Record<ClaveSeccion, (eventos: readonly EventoOS[]) => string | null>> = {
  diagnostico: (ev) => {
    const faltan: string[] = [];
    if (eventosDe(ev, "tecnico_asignado").length === 0) faltan.push("asignar al técnico");
    if (eventosDe(ev, "hallazgo_agregado").length === 0) faltan.push("registrar al menos un hallazgo");
    return faltan.length ? `Falta ${faltan.join(" y ")} en Diagnóstico.` : null;
  },
  abastecimiento: (ev) => {
    const elegidas = elecciones(ev);
    const faltan = piezasSolicitadas(ev).filter((p) => !elegidas.has(p.id)).length;
    return faltan > 0 ? `Falta elegir proveedor para ${faltan} ${faltan === 1 ? "pieza" : "piezas"} en Abastecimiento.` : null;
  },
  presupuesto: (ev) => {
    const ultima = ultimaVersion(ev);
    if (ultima === 0) return "Falta emitir el presupuesto.";
    return versionesRespondidas(ev).has(ultima) ? "Falta emitir una adenda: la última versión ya tiene respuesta del cliente." : null;
  },
  autorizacion: (ev) => {
    const ultima = ultimaVersion(ev);
    const respuesta = eventosDe(ev, "autorizacion_cliente").filter((a) => a.carga.version === ultima).at(-1);
    if (!respuesta) return `Falta registrar la respuesta del cliente a la versión ${ultima}.`;
    return respuesta.carga.resultado === "rechazada" ? "El cliente rechazó la última versión del presupuesto." : null;
  },
  reparacion: (ev) =>
    eventosDe(ev, "mano_obra_cargada").length > 0 ? null : "Falta registrar al menos una entrada de mano de obra en Reparación.",
  calidad: (ev) =>
    // Si la unidad regresó a reparación, se vuelve a liberar.
    desdeUltimaEntrada(ev, "en_reparacion").some((e) => e.tipo === "calidad_liberada")
      ? null
      : "Falta la liberación de calidad.",
  entrega: (ev) => (eventosDe(ev, "remision_emitida").length > 0 ? null : "Falta registrar la entrega en la remisión."),
  facturacion: (ev) => (eventosDe(ev, "factura_vinculada").length > 0 ? null : "Falta vincular al menos una factura."),
};

/** Por qué no se puede pasar a `destino`, o null si nada lo impide. */
export function bloqueoPara(destino: EstadoOS, eventos: readonly EventoOS[]): string | null {
  for (const s of SECCIONES) {
    if (s.obligatoriaPara !== destino) continue;
    const falta = REQUISITOS[s.clave]?.(eventos);
    if (falta) return falta;
  }
  return null;
}

/* ── Calidad ──────────────────────────────────────────────────────── */

/** Lista de verificación de salida. Quien libera no puede ser quien reparó. */
export const PUNTOS_CALIDAD = [
  "Trabajos del presupuesto autorizado terminados",
  "Prueba de manejo sin ruidos ni vibraciones",
  "Sin fugas de aceite, refrigerante ni combustible",
  "Niveles de fluidos completos",
  "Sin testigos encendidos en el tablero",
  "Piezas reemplazadas listas para entregar al cliente",
  "Unidad limpia y sin herramienta olvidada",
] as const;

/* ── El expediente ────────────────────────────────────────────────── */

export interface CabeceraOS {
  folio: string;
  estado: EstadoOS;
  unidad: { id: string; placas: string; marca: string; modelo: string; anio: number; vin: string };
  cliente: { id: string; razonSocial: string };
  taller: TallerRef;
  /** Taller base de la unidad; si difiere, la O.S. se marca "Fuera de base". */
  tallerBase: TallerRef | null;
  tipoIngreso: TipoIngreso;
  tipoServicio: TipoServicio;
  prioridad: PrioridadOS;
  motivosReportados: string[];
  /** Quien autoriza del lado del cliente, si está registrado. */
  contactoAutoriza: string | null;
}

export interface Expediente {
  cabecera: CabeceraOS;
  /** La bitácora completa, en orden cronológico. */
  eventos: EventoOS[];
}

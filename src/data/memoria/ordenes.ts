/*
 * Repositorio de órdenes de servicio en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 */
import { ESTADO, puedeTransicionar, type EstadoOS } from "@/domain/estados";
import { SERIE } from "@/domain/folios";
import type { DatosAltaOS, IngresoEsperado, OrdenActiva, OrdenServicio } from "@/domain/tipos";
import { diasEntre } from "@/app/fechas";
import { esTerminal, requiereFormulario, requiereMotivo } from "@/app/transiciones";
import type { OrdenServicioRepo } from "../repositorios";
import { buscarCliente, expedientesOS, historialEstados, ordenes, recepciones, unidades } from "./almacen";

const TODOS = "Todos los talleres";

const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/**
 * Toda transición pasa por la topología del dominio y queda en el historial.
 * Nunca se asigna el estado a mano.
 */
function transicionar(os: OrdenServicio, a: EstadoOS, comentario: string | null = null): void {
  if (!puedeTransicionar(os.estado, a)) {
    throw new Error(`La O.S. ${os.folio} no puede pasar de "${ESTADO[os.estado].label}" a "${ESTADO[a].label}".`);
  }
  if (requiereMotivo(os.estado, a) && !comentario?.trim()) {
    throw new Error(`Pasar a "${ESTADO[a].label}" requiere un motivo.`);
  }
  const ahora = new Date().toISOString();
  const tramos = historialEstados.get(os.folio) ?? [];
  const actual = tramos[tramos.length - 1];
  if (actual) actual.hasta = ahora;
  tramos.push({ estado: a, desde: ahora, hasta: null, responsable: null, comentario: comentario?.trim() || null });
  historialEstados.set(os.folio, tramos);
  os.estado = a;

  // La ubicación de la unidad sale de su O.S. abierta: se mantiene al día.
  const u = unidades.find((x) => x.unidad.id === os.unidadId);
  if (u?.osAbierta?.folio === os.folio) {
    if (esTerminal(a)) {
      u.osAbierta = null;
      u.osAbiertas = Math.max(0, u.osAbiertas - 1);
    } else {
      u.osAbierta.estado = a;
    }
  }
}

function aActiva(os: OrdenServicio): OrdenActiva | null {
  const u = unidades.find((x) => x.unidad.id === os.unidadId);
  if (!u) return null;
  const tramos = historialEstados.get(os.folio) ?? [];
  const desde = tramos[tramos.length - 1]?.desde;
  return {
    folio: os.folio,
    estado: os.estado,
    diasEnEstado: desde ? Math.max(0, diasEntre(new Date(desde), new Date())) : 0,
    prioridad: os.prioridad,
    tipoServicio: os.tipoServicio,
    unidad: { id: u.unidad.id, placas: u.unidad.placas, marca: u.unidad.marca, modelo: u.unidad.modelo },
    cliente: { id: os.clienteId, razonSocial: buscarCliente(os.clienteId)?.razonSocial ?? u.cliente.razonSocial },
    taller: { id: os.tallerId, nombre: os.tallerId },
    tallerBase: u.tallerBase.id ? u.tallerBase : null,
    asesor: null,
    entregaComprometida: os.entregaComprometida ?? null,
  };
}

function aIngreso(os: OrdenServicio): IngresoEsperado | null {
  const u = unidades.find((x) => x.unidad.id === os.unidadId);
  if (!u) return null;
  return {
    orden: os,
    cliente: { id: os.clienteId, razonSocial: buscarCliente(os.clienteId)?.razonSocial ?? u.cliente.razonSocial },
    unidad: u.unidad,
    // La cita se agenda por día; solo la recolección tiene hora.
    hora: os.recoleccion?.fechaHora ?? null,
  };
}

let consecutivo = 0;

function nueva(datos: DatosAltaOS): OrdenServicio {
  consecutivo += 1;
  const os: OrdenServicio = {
    ...datos,
    folio: `${SERIE.os}-${String(consecutivo).padStart(5, "0")}`,
    // Estado inicial de la máquina; no es una transición.
    estado: "programada",
    creadaEn: new Date(),
    creadaPor: "",
  };
  ordenes.push(os);
  historialEstados.set(os.folio, [
    { estado: "programada", desde: os.creadaEn.toISOString(), hasta: null, responsable: null, comentario: null },
  ]);
  return os;
}

export const ordenServicioRepoMemoria: OrdenServicioRepo = {
  async ingresosDelDia(tallerId, fecha) {
    return ordenes
      .filter((os) => os.estado === "programada" && (tallerId === TODOS || os.tallerId === tallerId))
      .filter((os) => {
        const cuando = os.recoleccion?.fechaHora ?? os.programadaPara;
        return cuando != null && mismoDia(cuando, fecha);
      })
      .map(aIngreso)
      .filter((x): x is IngresoEsperado => x != null)
      .sort((a, b) => (a.hora?.getTime() ?? 0) - (b.hora?.getTime() ?? 0));
  },

  async obtener(folio) {
    const os = ordenes.find((o) => o.folio === folio);
    return os ? aIngreso(os) : null;
  },

  async crear(datos) {
    return nueva(datos);
  },

  async recibir(osId, datos) {
    const os = ordenes.find((o) => o.folio === osId);
    if (!os) throw new Error(`No existe la O.S. ${osId}.`);
    transicionar(os, "unidad_recibida");
    recepciones.push({ ...datos, osId });

    const u = unidades.find((x) => x.unidad.id === os.unidadId);
    if (u) {
      u.unidad.kilometrajeUltimo = datos.kilometraje;
      u.unidad.fechaKilometraje = datos.fechaHora.toISOString().slice(0, 10);
      u.osAbierta = { folio: os.folio, taller: { id: os.tallerId, nombre: os.tallerId }, estado: os.estado };
      u.osAbiertas += 1;
    }
    return os;
  },

  async ingresoDirecto(alta, recepcion) {
    const os = nueva({ ...alta, tipoIngreso: "directo" });
    return this.recibir(os.folio, recepcion);
  },

  async activas(f) {
    const texto = f.texto?.trim().toLowerCase();
    return ordenes
      .filter((os) => !esTerminal(os.estado) && (f.alcance === TODOS || os.tallerId === f.alcance))
      .map(aActiva)
      .filter((x): x is OrdenActiva => x != null)
      .filter(
        (o) =>
          (!f.estado || o.estado === f.estado) &&
          (!f.area || ESTADO[o.estado].area === f.area) &&
          (!f.soloEnEspera || ESTADO[o.estado].espera) &&
          (!texto || [o.folio, o.unidad.placas, o.cliente.razonSocial].some((x) => x.toLowerCase().includes(texto)))
      )
      .sort((a, b) => b.diasEnEstado - a.diasEnEstado);
  },

  async detalle(folio) {
    const os = ordenes.find((o) => o.folio === folio);
    const resumen = os ? aActiva(os) : null;
    if (!os || !resumen) return null;
    const u = unidades.find((x) => x.unidad.id === os.unidadId);
    const recepcion = recepciones.find((r) => r.osId === folio);
    return {
      resumen,
      vin: u?.unidad.vin ?? "",
      anio: u?.unidad.anio ?? 0,
      kilometrajeIngreso: recepcion?.kilometraje ?? null,
      clienteTipo: buscarCliente(os.clienteId)?.tipo ?? null,
      tipoIngreso: os.tipoIngreso,
      motivoReportado: os.motivoReportado,
      historial: historialEstados.get(folio) ?? [],
      expediente: expedientesOS.get(folio) ?? {
        presupuesto: null,
        compras: [],
        manoObra: [],
        costoRefacciones: null,
      },
    };
  },

  async cambiarEstado(folio, a, comentario) {
    const os = ordenes.find((o) => o.folio === folio);
    if (!os) throw new Error(`No existe la O.S. ${folio}.`);
    if (requiereFormulario(a)) throw new Error(`"${ESTADO[a].label}" se registra con el formulario de recepción.`);
    transicionar(os, a, comentario);
  },
};

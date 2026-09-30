/*
 * Repositorio de órdenes de servicio en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 */
import { puedeTransicionar, type EstadoOS } from "@/domain/estados";
import { SERIE } from "@/domain/folios";
import type { DatosAltaOS, IngresoEsperado, OrdenServicio } from "@/domain/tipos";
import type { OrdenServicioRepo } from "../repositorios";
import { buscarCliente, ordenes, recepciones, unidades } from "./almacen";

const TODOS = "Todos los talleres";

const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

/** Toda transición pasa por la topología del dominio. Nunca se asigna el estado a mano. */
function transicionar(os: OrdenServicio, a: EstadoOS): void {
  if (!puedeTransicionar(os.estado, a)) {
    throw new Error(`La O.S. ${os.folio} no puede pasar de "${os.estado}" a "${a}".`);
  }
  os.estado = a;
}

function aIngreso(os: OrdenServicio): IngresoEsperado | null {
  const u = unidades.find((x) => x.unidad.id === os.unidadId);
  if (!u) return null;
  return {
    orden: os,
    cliente: { id: os.clienteId, razonSocial: buscarCliente(os.clienteId)?.razonSocial ?? u.cliente.razonSocial },
    unidad: u.unidad,
    hora: os.recoleccion?.fechaHora ?? os.programadaPara ?? null,
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
};

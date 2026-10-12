/*
 * Repositorio de órdenes de servicio en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Hace el papel del backend: sella los eventos, valida cada transición
 * (topología, motivo y secciones obligatorias) y nunca edita ni borra la
 * bitácora.
 */
import { ESTADO, puedeTransicionar, type EstadoOS } from "@/domain/estados";
import { SERIE, type TipoDocumento } from "@/domain/folios";
import { eventosDe, type EventoOS, type EventoPropuesto, type MedioAutorizacion } from "@/domain/bitacora";
import { CAPTURABLES, CAPTURA_FUERA_DE_SECCION, SECCIONES, SECCION_DEL_EVENTO, bloqueoPara, seccionAbierta, ultimaVersion, type Expediente } from "@/domain/expediente";
import { tramoActual } from "@/domain/tiempos";
import type { DatosAltaOS, DatosRecepcion, IngresoEsperado, OrdenActiva, OrdenServicio } from "@/domain/tipos";
import { esTerminal, requiereFormulario, requiereMotivo } from "@/app/transiciones";
import { usuarioActual } from "@/app/sesion";
import type { OrdenServicioRepo } from "../repositorios";
import { bitacoras, buscarCliente, ordenes, unidades } from "./almacen";

const TODOS = "Todos los talleres";

const mismoDia = (a: Date, b: Date) => a.toDateString() === b.toDateString();

const buscarOS = (folio: string): OrdenServicio => {
  const os = ordenes.find((o) => o.folio === folio);
  if (!os) throw new Error(`No existe la O.S. ${folio}.`);
  return os;
};

const eventosDeOS = (folio: string): EventoOS[] => bitacoras.get(folio) ?? [];

/** El servidor sella: id, hora y usuario nunca vienen del cliente. */
function sellar(os: OrdenServicio, p: EventoPropuesto, cambio?: { de: EstadoOS; a: EstadoOS }): EventoOS {
  const u = usuarioActual();
  const evento = {
    ...p,
    id: crypto.randomUUID(),
    osId: os.folio,
    en: new Date().toISOString(),
    usuarioId: u.id,
    usuarioNombre: u.nombre,
    ...(cambio ? { estadoAntes: cambio.de, estadoDespues: cambio.a } : {}),
  } as EventoOS;
  bitacoras.set(os.folio, [...eventosDeOS(os.folio), evento]);
  return evento;
}

const MEDIO_DE_CANAL: Record<OrdenServicio["canalAutorizacion"], MedioAutorizacion> = { correo: "correo", whatsapp: "whatsapp" };

let consecutivoDocs = 0;
const folioDoc = (serie: string) => `${serie}-${String(++consecutivoDocs).padStart(5, "0")}`;

/**
 * Toda transición pasa por la topología del dominio y por las secciones
 * obligatorias. Nunca se asigna el estado a mano.
 */
function transicionar(os: OrdenServicio, a: EstadoOS, motivo: string | null, propuesto?: EventoPropuesto): EventoOS {
  if (!puedeTransicionar(os.estado, a)) {
    throw new Error(`La O.S. ${os.folio} no puede pasar de "${ESTADO[os.estado].label}" a "${ESTADO[a].label}".`);
  }
  if (requiereMotivo(os.estado, a) && !motivo?.trim()) {
    throw new Error(`Pasar a "${ESTADO[a].label}" requiere un motivo.`);
  }
  const bloqueo = bloqueoPara(a, eventosDeOS(os.folio));
  if (bloqueo) throw new Error(bloqueo);

  const de = os.estado;
  const base: EventoPropuesto = propuesto ?? (a === "cerrada" ? { tipo: "os_cerrada", carga: {} } : { tipo: "cambio_estado", carga: {} });
  const evento = sellar(os, { ...base, ...(motivo?.trim() ? { motivo: motivo.trim() } : {}) }, { de, a });
  os.estado = a;

  const u = unidades.find((x) => x.unidad.id === os.unidadId);

  // Enviar al cliente es entrar a "pendiente de autorización": ahí arranca la espera #1.
  if (a === "pendiente_autorizacion") {
    const contacto = buscarCliente(os.clienteId)?.contactos.find((c) => c.id === os.contactoAutorizaId);
    sellar(os, {
      tipo: "autorizacion_solicitada",
      carga: {
        version: ultimaVersion(eventosDeOS(os.folio)),
        medio: MEDIO_DE_CANAL[os.canalAutorizacion],
        enviadaA: contacto?.nombre ?? u?.cliente.razonSocial ?? "",
      },
    });
  }

  // La ubicación de la unidad sale de su O.S. abierta: se mantiene al día.
  if (u?.osAbierta?.folio === os.folio) {
    if (esTerminal(a)) {
      u.osAbierta = null;
      u.osAbiertas = Math.max(0, u.osAbiertas - 1);
    } else {
      u.osAbierta.estado = a;
    }
  }
  return evento;
}

function aActiva(os: OrdenServicio): OrdenActiva | null {
  const u = unidades.find((x) => x.unidad.id === os.unidadId);
  if (!u) return null;
  return {
    folio: os.folio,
    estado: os.estado,
    diasEnEstado: tramoActual(eventosDeOS(os.folio))?.dias ?? 0,
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
    // Estado inicial de la máquina; no es una transición, pero abre la bitácora.
    estado: "programada",
    creadaEn: new Date(),
    creadaPor: "",
  };
  ordenes.push(os);
  sellar(os, { tipo: "os_creada", carga: {} }, { de: "programada", a: "programada" });
  return os;
}

const aCargaRecepcion = (d: DatosRecepcion) => ({
  fechaHora: d.fechaHora.toISOString(),
  kilometraje: d.kilometraje,
  nivelCombustible: d.nivelCombustible,
  recibeNombre: d.recibeId,
  entregaNombre: d.entregaNombre,
  inventario: d.inventario,
  inventarioExtra: d.inventarioExtra,
  objetosPersonales: d.objetosPersonales,
  danosPrevios: d.danosPrevios,
  fotos: d.fotos.map((f) => ({ etiqueta: f.etiqueta, archivo: { nombre: f.etiqueta, url: f.referencia } })),
  autorizaDiagnostico: d.autorizaDiagnostico,
  firmaEntrega: d.firmaEntrega,
});

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
    const os = buscarOS(osId);
    transicionar(os, "unidad_recibida", null, { tipo: "recepcion_registrada", carga: aCargaRecepcion(datos) });

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

  async obtenerExpediente(folio): Promise<Expediente | null> {
    const os = ordenes.find((o) => o.folio === folio);
    if (!os) return null;
    const u = unidades.find((x) => x.unidad.id === os.unidadId);
    const cliente = buscarCliente(os.clienteId);
    return {
      cabecera: {
        folio: os.folio,
        estado: os.estado,
        unidad: {
          id: os.unidadId,
          placas: u?.unidad.placas ?? "",
          marca: u?.unidad.marca ?? "",
          modelo: u?.unidad.modelo ?? "",
          anio: u?.unidad.anio ?? 0,
          vin: u?.unidad.vin ?? "",
        },
        cliente: { id: os.clienteId, razonSocial: cliente?.razonSocial ?? u?.cliente.razonSocial ?? "" },
        taller: { id: os.tallerId, nombre: os.tallerId },
        tallerBase: u?.tallerBase.id ? u.tallerBase : null,
        tipoIngreso: os.tipoIngreso,
        tipoServicio: os.tipoServicio,
        prioridad: os.prioridad,
        motivosReportados: os.motivosReportados,
        contactoAutoriza: cliente?.contactos.find((c) => c.id === os.contactoAutorizaId)?.nombre ?? null,
      },
      eventos: [...eventosDeOS(folio)].sort((a, b) => a.en.localeCompare(b.en)),
    };
  },

  async listarEventos(osId) {
    return [...eventosDeOS(osId)];
  },

  async registrarEvento(osId, p) {
    const os = buscarOS(osId);
    if (p.tipo === "correccion") {
      if (!p.motivo?.trim()) throw new Error("Toda corrección lleva un motivo.");
      if (Object.keys(p.carga.cambios).length === 0) throw new Error("La corrección no cambia nada.");
    }

    const clave = CAPTURABLES.includes(p.tipo) ? SECCION_DEL_EVENTO[p.tipo] : undefined;
    const seccion = clave ? SECCIONES.find((s) => s.clave === clave) : undefined;
    const excepcion = CAPTURA_FUERA_DE_SECCION[p.tipo]?.includes(os.estado) ?? false;
    if (seccion && !excepcion && !seccionAbierta(seccion, os.estado)) {
      throw new Error(`${seccion.titulo} está cerrada: para cambiar algo, usa "Corregir".`);
    }

    // Quien libera no puede ser quien reparó.
    if (p.tipo === "calidad_liberada") {
      const reparo = new Set(eventosDe(eventosDeOS(osId), "mano_obra_cargada").map((m) => m.carga.tecnicoId));
      if (!p.carga.liberoId) throw new Error("Sin sesión no se puede saber quién libera.");
      if (reparo.has(p.carga.liberoId)) throw new Error("Quien libera calidad no puede ser quien reparó la unidad.");
    }

    // Los folios y la versión los asigna el servidor.
    if (p.tipo === "presupuesto_emitido" || p.tipo === "adenda_emitida") {
      return sellar(os, { ...p, carga: { ...p.carga, folio: folioDoc(SERIE.presupuesto), version: ultimaVersion(eventosDeOS(osId)) + 1 } });
    }
    if (p.tipo === "remision_emitida") {
      return sellar(os, { ...p, carga: { ...p.carga, folio: folioDoc(SERIE.remision) } });
    }
    return sellar(os, p);
  },

  async transicionar(osId, destino, carga) {
    const os = buscarOS(osId);
    if (requiereFormulario(destino)) throw new Error(`"${ESTADO[destino].label}" se registra con el formulario de recepción.`);
    return transicionar(os, destino, carga.motivo ?? null);
  },

  async cambiarEstado(folio, a, comentario) {
    await this.transicionar(folio, a, { motivo: comentario ?? undefined });
  },

  async buscarDocumento(tipo: TipoDocumento, folio) {
    for (const [osFolio, eventos] of bitacoras) {
      const hay = eventos.some((e) => {
        switch (tipo) {
          case "os":
            return e.osId === folio;
          case "presupuesto":
            return (e.tipo === "presupuesto_emitido" || e.tipo === "adenda_emitida") && e.carga.folio === folio;
          case "remision":
            return e.tipo === "remision_emitida" && e.carga.folio === folio;
          case "factura":
            return e.tipo === "factura_vinculada" && e.carga.folio === folio;
          case "ordenCompra":
            return e.tipo === "oc_vinculada" && e.carga.folio === folio;
          case "requisicion":
            return (e.tipo === "requisicion_generada" || e.tipo === "requisicion_actualizada") && e.carga.folio === folio;
        }
      });
      if (hay) return osFolio;
    }
    return null;
  },
};

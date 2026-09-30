import { useState } from "react";
import { Campo, Input, Select, SoloLectura, Textarea } from "@/components/Campo/Campo";
import { Buscador, type OpcionBusqueda } from "@/components/Buscador/Buscador";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Folio } from "@/components/Folio/Folio";
import { fecha, numero } from "@/domain/format";
import type {
  CanalContacto,
  Cliente,
  DatosAltaOS,
  OrdenHistorial,
  PrioridadOS,
  TipoServicio,
  UnidadResumen,
} from "@/domain/tipos";
import {
  useAltaRapidaUnidad,
  useClientes,
  useHistorialUnidad,
  useUnidades,
} from "@/data/consultas";
import { TALLERES } from "@/app/navegacion";
import { deInputFechaHora, fechaLocal } from "@/app/fechas";
import { revisarOsPadre } from "@/app/validacionesIngreso";
import { CANAL, TIPO_UNIDAD } from "@/pages/catalogos/etiquetas";
import { PRIORIDAD, TIPO_SERVICIO } from "./etiquetas";
import f from "./Formulario.module.css";

/** El padrón se busca completo: una unidad puede llegar a un taller que no es su base. */
const TODO_EL_PADRON = TALLERES[0];

export type ModoAlta = "programada" | "directo";

export interface EstadoAlta {
  cliente: Cliente | null;
  clienteTexto: string;
  unidad: UnidadResumen | null;
  unidadTexto: string;
  tallerId: string;
  tipoIngreso: "cita" | "recoleccion";
  programadaPara: string;
  recoleccion: { direccion: string; fechaHora: string; contactoEnSitio: string };
  tipoServicio: TipoServicio | "";
  motivo: string;
  prioridad: PrioridadOS;
  esRetrabajo: boolean;
  osPadre: OrdenHistorial | null;
  contactoSolicitaId: string;
  contactoAutorizaId: string;
  canal: CanalContacto;
}

export type CampoAlta =
  | "cliente"
  | "unidad"
  | "tallerId"
  | "programadaPara"
  | "direccion"
  | "recoleccionFecha"
  | "contactoEnSitio"
  | "tipoServicio"
  | "motivo"
  | "osPadre";

export const altaInicial = (tallerId: string): EstadoAlta => ({
  cliente: null,
  clienteTexto: "",
  unidad: null,
  unidadTexto: "",
  tallerId,
  tipoIngreso: "cita",
  programadaPara: "",
  recoleccion: { direccion: "", fechaHora: "", contactoEnSitio: "" },
  tipoServicio: "",
  motivo: "",
  prioridad: "normal",
  esRetrabajo: false,
  osPadre: null,
  contactoSolicitaId: "",
  contactoAutorizaId: "",
  canal: "correo",
});

export interface RevisionAlta {
  errores: Partial<Record<CampoAlta, string>>;
  /** Se muestran pero no detienen. */
  advertencias: string[];
  /** Detienen el guardado hasta que el usuario confirma en el diálogo. */
  confirmaciones: string[];
}

export function revisarAlta(e: EstadoAlta, modo: ModoAlta): RevisionAlta {
  const errores: RevisionAlta["errores"] = {};
  const advertencias: string[] = [];
  const confirmaciones: string[] = [];

  if (!e.cliente) errores.cliente = "Elige el cliente.";
  if (!e.unidad) errores.unidad = "Elige la unidad o regístrala.";
  if (!e.tallerId) errores.tallerId = "Elige el taller.";
  if (!e.tipoServicio) errores.tipoServicio = "Elige el tipo de servicio.";
  if (!e.motivo.trim()) errores.motivo = "Escribe lo que reporta el cliente.";

  if (modo === "programada") {
    if (e.tipoIngreso === "cita" && !deInputFechaHora(e.programadaPara)) {
      errores.programadaPara = "Indica fecha y hora de la cita.";
    }
    if (e.tipoIngreso === "recoleccion") {
      if (!e.recoleccion.direccion.trim()) errores.direccion = "Indica dónde se recoge la unidad.";
      if (!deInputFechaHora(e.recoleccion.fechaHora)) errores.recoleccionFecha = "Indica cuándo se recoge.";
      if (!e.recoleccion.contactoEnSitio.trim()) errores.contactoEnSitio = "Indica a quién buscar en sitio.";
    }
  }

  if (e.esRetrabajo) {
    const r = revisarOsPadre(e.osPadre ?? undefined, new Date());
    if (r.error) errores.osPadre = r.error;
    if (r.advertencia) advertencias.push(r.advertencia);
  }

  if (e.cliente && !e.cliente.contactos.some((c) => c.autorizaPresupuesto)) {
    advertencias.push("El cliente no tiene contactos que autoricen presupuestos: habrá que registrarlos antes de enviar la cotización.");
  }

  if (e.unidad?.osAbierta) {
    confirmaciones.push(
      `La unidad ${e.unidad.unidad.placas} ya tiene abierta la O.S. ${e.unidad.osAbierta.folio}. ¿Abrir otra de todos modos?`
    );
  }
  if (e.cliente?.estado === "credito_suspendido") {
    confirmaciones.push(`${e.cliente.razonSocial} tiene el crédito suspendido.`);
  }

  return { errores, advertencias, confirmaciones };
}

/** Solo se llama cuando `revisarAlta` no devolvió errores. */
export function aDatosAlta(e: EstadoAlta, modo: ModoAlta): DatosAltaOS {
  const cliente = e.cliente as Cliente;
  const unidad = e.unidad as UnidadResumen;
  const recoleccion =
    modo === "programada" && e.tipoIngreso === "recoleccion"
      ? {
          direccion: e.recoleccion.direccion.trim(),
          fechaHora: deInputFechaHora(e.recoleccion.fechaHora) as Date,
          contactoEnSitio: e.recoleccion.contactoEnSitio.trim(),
        }
      : undefined;
  return {
    clienteId: cliente.id,
    unidadId: unidad.unidad.id,
    tallerId: e.tallerId,
    tipoIngreso: modo === "directo" ? "directo" : e.tipoIngreso,
    tipoServicio: e.tipoServicio as TipoServicio,
    motivoReportado: e.motivo.trim(),
    prioridad: e.prioridad,
    contactoSolicitaId: e.contactoSolicitaId || null,
    contactoAutorizaId: e.contactoAutorizaId || null,
    canalAutorizacion: e.canal,
    cobraDiagnostico: cobraDiagnostico(cliente),
    osPadreId: e.esRetrabajo ? e.osPadre?.folio : undefined,
    programadaPara:
      modo === "programada" ? deInputFechaHora(e.programadaPara) ?? recoleccion?.fechaHora : undefined,
    recoleccion,
  };
}

/** Regla comercial: a las flotillas no se les cobra diagnóstico. */
const cobraDiagnostico = (c: Cliente) => c.tipo !== "flotilla";

interface Props {
  modo: ModoAlta;
  estado: EstadoAlta;
  onCambiar: (siguiente: EstadoAlta) => void;
  errores: RevisionAlta["errores"];
}

export function FormAltaOS({ modo, estado: e, onCambiar, errores }: Props) {
  const set = <K extends keyof EstadoAlta>(k: K, v: EstadoAlta[K]) => onCambiar({ ...e, [k]: v });

  const { data: clientes, isFetching: buscandoClientes } = useClientes({
    alcance: TODO_EL_PADRON,
    texto: e.clienteTexto || undefined,
  });
  const { data: unidadesCliente } = useUnidades({ alcance: TODO_EL_PADRON, clienteId: e.cliente?.id ?? "__ninguno__" });
  const { data: historial } = useHistorialUnidad(e.unidad?.unidad.placas ?? "");
  const altaRapida = useAltaRapidaUnidad();

  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nueva, setNueva] = useState({ placas: "", marca: "", modelo: "", anio: "" });

  const opcionesCliente: OpcionBusqueda[] = (clientes ?? []).slice(0, 20).map((c) => ({
    id: c.cliente.id,
    etiqueta: c.cliente.razonSocial,
    detalle: `${c.cliente.rfc} · ${c.cliente.tipo === "flotilla" ? "Flotilla" : "Particular"}`,
  }));

  const q = e.unidadTexto.trim().toLowerCase();
  const unidadesFiltradas = (unidadesCliente ?? []).filter(
    (u) =>
      !q ||
      [u.unidad.placas, u.unidad.marca, u.unidad.modelo, u.unidad.numeroEconomico ?? ""].some((x) =>
        x.toLowerCase().includes(q)
      )
  );
  const opcionesUnidad: OpcionBusqueda[] = unidadesFiltradas.slice(0, 20).map((u) => ({
    id: u.unidad.id,
    etiqueta: u.unidad.placas,
    detalle: `${u.unidad.marca} ${u.unidad.modelo} ${u.unidad.anio}${u.unidad.numeroEconomico ? ` · Eco. ${u.unidad.numeroEconomico}` : ""}`,
  }));

  const cerradas = (historial ?? []).filter((o) => o.estado === "cerrada");
  const contactos = e.cliente?.contactos ?? [];
  const autorizan = contactos.filter((c) => c.autorizaPresupuesto);

  const registrarUnidad = async () => {
    if (!e.cliente) return;
    const unidad = await altaRapida.mutateAsync({
      placas: nueva.placas,
      marca: nueva.marca,
      modelo: nueva.modelo,
      anio: Number(nueva.anio),
      clienteId: e.cliente.id,
    });
    onCambiar({
      ...e,
      unidad: {
        unidad,
        cliente: { id: e.cliente.id, razonSocial: e.cliente.razonSocial },
        tallerBase: { id: "", nombre: "Sin asignar" },
        osAbierta: null,
        osAbiertas: 0,
        ultimoServicio: null,
      },
      unidadTexto: unidad.placas,
    });
    setAltaAbierta(false);
    setNueva({ placas: "", marca: "", modelo: "", anio: "" });
  };

  const anioNueva = Number(nueva.anio);
  const nuevaValida =
    nueva.placas.trim() && nueva.marca.trim() && nueva.modelo.trim() && anioNueva >= 1950 && anioNueva <= new Date().getFullYear() + 1;

  return (
    <>
      {/* ── Cliente y unidad ─────────────────────────────── */}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Cliente y unidad</legend>
        <div className={f.rejilla2}>
          <Campo etiqueta="Cliente" obligatorio error={errores.cliente}>
            {(c) => (
              <Buscador
                {...c}
                placeholder="Razón social o RFC"
                texto={e.clienteTexto}
                onTexto={(t) => onCambiar({ ...e, clienteTexto: t })}
                opciones={opcionesCliente}
                cargando={buscandoClientes}
                seleccion={e.cliente ? { id: e.cliente.id, etiqueta: e.cliente.razonSocial } : null}
                onSeleccionar={(o) => {
                  const cliente = (clientes ?? []).find((x) => x.cliente.id === o?.id)?.cliente ?? null;
                  const autoriza = cliente?.contactos.find((x) => x.autorizaPresupuesto);
                  onCambiar({
                    ...e,
                    cliente,
                    clienteTexto: o?.etiqueta ?? e.clienteTexto,
                    // Cambiar de cliente invalida todo lo que colgaba del anterior.
                    unidad: null,
                    unidadTexto: "",
                    osPadre: null,
                    contactoSolicitaId: "",
                    contactoAutorizaId: autoriza?.id ?? "",
                    canal: autoriza?.canalPreferido ?? "correo",
                  });
                }}
                sinResultados="Ningún cliente coincide en el padrón."
              />
            )}
          </Campo>

          <Campo
            etiqueta="Unidad"
            obligatorio
            error={errores.unidad}
            ayuda={
              e.cliente && !altaAbierta ? (
                <Button variante="fantasma" onClick={() => setAltaAbierta(true)}>
                  La unidad no está registrada
                </Button>
              ) : !e.cliente ? (
                "Primero elige el cliente."
              ) : undefined
            }
          >
            {(c) => (
              <Buscador
                {...c}
                disabled={!e.cliente}
                placeholder="Placas, marca, modelo o núm. económico"
                texto={e.unidadTexto}
                onTexto={(t) => onCambiar({ ...e, unidadTexto: t })}
                opciones={opcionesUnidad}
                seleccion={e.unidad ? { id: e.unidad.unidad.id, etiqueta: e.unidad.unidad.placas } : null}
                onSeleccionar={(o) =>
                  onCambiar({
                    ...e,
                    unidad: (unidadesCliente ?? []).find((u) => u.unidad.id === o?.id) ?? null,
                    unidadTexto: o?.etiqueta ?? e.unidadTexto,
                    osPadre: null,
                  })
                }
                sinResultados="Este cliente no tiene unidades con ese dato."
              />
            )}
          </Campo>
        </div>

        {altaAbierta && e.cliente && (
          <div className={f.altaRapida} role="group" aria-label="Alta rápida de unidad">
            <div className={f.altaTitulo}>
              Alta rápida para {e.cliente.razonSocial}
              <span className={f.nota}> · VIN, número económico y taller base se completan después</span>
            </div>
            <div className={f.rejilla4}>
              <Campo etiqueta="Placas" obligatorio>
                {(c) => <Input {...c} value={nueva.placas} onChange={(x) => setNueva({ ...nueva, placas: x.target.value.toUpperCase() })} />}
              </Campo>
              <Campo etiqueta="Marca" obligatorio>
                {(c) => <Input {...c} value={nueva.marca} onChange={(x) => setNueva({ ...nueva, marca: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Modelo" obligatorio>
                {(c) => <Input {...c} value={nueva.modelo} onChange={(x) => setNueva({ ...nueva, modelo: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Año" obligatorio>
                {(c) => <Input {...c} inputMode="numeric" maxLength={4} value={nueva.anio} onChange={(x) => setNueva({ ...nueva, anio: x.target.value.replace(/\D/g, "") })} />}
              </Campo>
            </div>
            {altaRapida.error && <Aviso tono="critico" titulo={altaRapida.error.message} />}
            <div className={f.accionesLinea}>
              <Button variante="primario" disabled={!nuevaValida || altaRapida.isPending} onClick={registrarUnidad}>
                Registrar y usar
              </Button>
              <Button variante="fantasma" onClick={() => setAltaAbierta(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {e.unidad && (
          <div className={f.rejilla5}>
            <SoloLectura etiqueta="Marca">{e.unidad.unidad.marca}</SoloLectura>
            <SoloLectura etiqueta="Modelo">{e.unidad.unidad.modelo}</SoloLectura>
            <SoloLectura etiqueta="Año">{e.unidad.unidad.anio}</SoloLectura>
            <SoloLectura etiqueta="Tipo">{TIPO_UNIDAD[e.unidad.unidad.tipo]}</SoloLectura>
            <SoloLectura etiqueta="Km del último servicio">
              {e.unidad.unidad.kilometrajeUltimo > 0
                ? `${numero(e.unidad.unidad.kilometrajeUltimo)} km · ${fecha(fechaLocal(e.unidad.unidad.fechaKilometraje), { anio: true })}`
                : "Sin registro"}
            </SoloLectura>
          </div>
        )}

        {e.cliente?.estado === "credito_suspendido" && (
          <Aviso tono="critico" titulo={`${e.cliente.razonSocial} tiene el crédito suspendido`}>
            Se puede recibir la unidad, pero Dirección debe saberlo antes de autorizar compras.
          </Aviso>
        )}
        {e.unidad?.osAbierta && (
          <Aviso tono="critico" titulo="Esta unidad ya tiene una O.S. abierta">
            <Folio folio={e.unidad.osAbierta.folio} tipo="os" /> en {e.unidad.osAbierta.taller.nombre}. Se pedirá
            confirmación al guardar.
          </Aviso>
        )}
      </fieldset>

      {/* ── Ingreso ─────────────────────────────────────── */}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Ingreso</legend>
        <div className={f.rejilla2}>
          <Campo etiqueta="Taller" obligatorio error={errores.tallerId}>
            {(c) => (
              <Select {...c} value={e.tallerId} onChange={(x) => set("tallerId", x.target.value)}>
                <option value="">Elige un taller</option>
                {TALLERES.slice(1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            )}
          </Campo>
          {modo === "programada" && (
            <Campo etiqueta="Tipo de ingreso" obligatorio>
              {(c) => (
                <Select {...c} value={e.tipoIngreso} onChange={(x) => set("tipoIngreso", x.target.value as EstadoAlta["tipoIngreso"])}>
                  <option value="cita">Cita: el cliente trae la unidad</option>
                  <option value="recoleccion">Recolección: vamos por la unidad</option>
                </Select>
              )}
            </Campo>
          )}
        </div>

        {modo === "programada" && e.tipoIngreso === "recoleccion" && (
          <div className={f.rejilla3}>
            <Campo etiqueta="Dirección de recolección" obligatorio error={errores.direccion}>
              {(c) => (
                <Input {...c} value={e.recoleccion.direccion} onChange={(x) => set("recoleccion", { ...e.recoleccion, direccion: x.target.value })} />
              )}
            </Campo>
            <Campo etiqueta="Fecha y hora de recolección" obligatorio error={errores.recoleccionFecha}>
              {(c) => (
                <Input {...c} type="datetime-local" value={e.recoleccion.fechaHora} onChange={(x) => set("recoleccion", { ...e.recoleccion, fechaHora: x.target.value })} />
              )}
            </Campo>
            <Campo etiqueta="Contacto en sitio" obligatorio error={errores.contactoEnSitio}>
              {(c) => (
                <Input {...c} placeholder="Nombre y teléfono" value={e.recoleccion.contactoEnSitio} onChange={(x) => set("recoleccion", { ...e.recoleccion, contactoEnSitio: x.target.value })} />
              )}
            </Campo>
          </div>
        )}

        {modo === "programada" && (
          <div className={f.rejilla2}>
            <Campo
              etiqueta={e.tipoIngreso === "cita" ? "Fecha y hora programada" : "Llegada estimada al taller"}
              obligatorio={e.tipoIngreso === "cita"}
              error={errores.programadaPara}
              ayuda={e.tipoIngreso === "recoleccion" ? "Si la dejas vacía se toma la hora de recolección." : undefined}
            >
              {(c) => <Input {...c} type="datetime-local" value={e.programadaPara} onChange={(x) => set("programadaPara", x.target.value)} />}
            </Campo>
          </div>
        )}
      </fieldset>

      {/* ── Motivo ──────────────────────────────────────── */}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Motivo</legend>
        <div className={f.rejilla2}>
          <Campo etiqueta="Tipo de servicio" obligatorio error={errores.tipoServicio}>
            {(c) => (
              <Select {...c} value={e.tipoServicio} onChange={(x) => set("tipoServicio", x.target.value as TipoServicio)}>
                <option value="">Elige uno</option>
                {(Object.keys(TIPO_SERVICIO) as TipoServicio[]).map((t) => (
                  <option key={t} value={t}>{TIPO_SERVICIO[t]}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Prioridad" obligatorio>
            {(c) => (
              <Select {...c} value={e.prioridad} onChange={(x) => set("prioridad", x.target.value as PrioridadOS)}>
                {(Object.keys(PRIORIDAD) as PrioridadOS[]).map((p) => (
                  <option key={p} value={p}>{PRIORIDAD[p]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
        <Campo
          etiqueta="Motivo reportado por el cliente"
          obligatorio
          error={errores.motivo}
          ayuda="Escribe lo que dijo el cliente, con sus palabras. El diagnóstico lo hace el técnico después."
        >
          {(c) => (
            <Textarea
              {...c}
              placeholder={'Por ejemplo: "Hace un ruido al frenar" o "se prende el testigo del motor en carretera"'}
              value={e.motivo}
              onChange={(x) => set("motivo", x.target.value)}
            />
          )}
        </Campo>
        <label className={f.casilla}>
          <input
            type="checkbox"
            checked={e.esRetrabajo}
            onChange={(x) => onCambiar({ ...e, esRetrabajo: x.target.checked, osPadre: null })}
          />
          Es retrabajo o garantía de una O.S. anterior
        </label>
        {e.esRetrabajo && (
          <Campo
            etiqueta="O.S. original"
            obligatorio
            error={errores.osPadre}
            ayuda={!e.unidad ? "Primero elige la unidad." : cerradas.length === 0 ? "Esta unidad no tiene O.S. cerradas." : undefined}
          >
            {(c) => (
              <Select
                {...c}
                disabled={!e.unidad}
                value={e.osPadre?.folio ?? ""}
                onChange={(x) => set("osPadre", cerradas.find((o) => o.folio === x.target.value) ?? null)}
              >
                <option value="">Elige la O.S. original</option>
                {cerradas.map((o) => (
                  <option key={o.folio} value={o.folio}>
                    {o.folio} · {o.tipoServicio} · {fecha(fechaLocal(o.fecha), { anio: true })}
                  </option>
                ))}
              </Select>
            )}
          </Campo>
        )}
      </fieldset>

      {/* ── Autorización ────────────────────────────────── */}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Autorización</legend>
        {e.cliente && contactos.length === 0 && (
          <Aviso titulo="El cliente no tiene contactos registrados">
            Puedes continuar; los contactos se agregan en el expediente del cliente antes de enviar la cotización.
          </Aviso>
        )}
        <div className={f.rejilla3}>
          <Campo etiqueta="Contacto que solicita">
            {(c) => (
              <Select {...c} disabled={contactos.length === 0} value={e.contactoSolicitaId} onChange={(x) => set("contactoSolicitaId", x.target.value)}>
                <option value="">Sin especificar</option>
                {contactos.map((k) => (
                  <option key={k.id} value={k.id}>{k.nombre} · {k.puesto}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo
            etiqueta="Quién autoriza el presupuesto"
            ayuda="Solo aparecen los contactos con facultad de autorizar."
          >
            {(c) => (
              <Select
                {...c}
                disabled={autorizan.length === 0}
                value={e.contactoAutorizaId}
                onChange={(x) => {
                  const k = autorizan.find((a) => a.id === x.target.value);
                  onCambiar({ ...e, contactoAutorizaId: x.target.value, canal: k?.canalPreferido ?? e.canal });
                }}
              >
                <option value="">{autorizan.length === 0 ? "Nadie con facultad" : "Elige un contacto"}</option>
                {autorizan.map((k) => (
                  <option key={k.id} value={k.id}>{k.nombre} · {k.puesto}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Canal" ayuda="Por defecto, el preferido del contacto.">
            {(c) => (
              <Select {...c} value={e.canal} onChange={(x) => set("canal", x.target.value as CanalContacto)}>
                {(Object.keys(CANAL) as CanalContacto[]).map((k) => (
                  <option key={k} value={k}>{CANAL[k]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
      </fieldset>

      {/* ── Comercial ───────────────────────────────────── */}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Comercial</legend>
        <div className={f.rejilla2}>
          <SoloLectura etiqueta="Convenio aplicable">
            {e.cliente ? e.cliente.convenioId ?? "Sin convenio: tarifas de lista" : "—"}
          </SoloLectura>
          <SoloLectura etiqueta="¿Se cobra diagnóstico?">
            {e.cliente ? (cobraDiagnostico(e.cliente) ? "Sí" : "No, es flotilla") : "—"}
          </SoloLectura>
        </div>
      </fieldset>
    </>
  );
}

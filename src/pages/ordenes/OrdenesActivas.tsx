import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Folio } from "@/components/Folio/Folio";
import { Antiguedad } from "@/components/Antiguedad/Antiguedad";
import { PuntoArea } from "@/components/PuntoArea/PuntoArea";
import { AREAS, AREA_LABEL, type Area } from "@/domain/areas";
import { ESTADOS, ESTADO, type EstadoOS } from "@/domain/estados";
import { fecha, numero } from "@/domain/format";
import type { OrdenActiva } from "@/domain/tipos";
import { useOrdenesActivas } from "@/data/consultas";
import type { FiltrosActivas } from "@/data/repositorios";
import { useTaller } from "@/app/useTaller";
import { fechaLocal } from "@/app/fechas";
import { esTerminal } from "@/app/transiciones";
import { ChipFueraDeBase } from "@/pages/catalogos/etiquetas";
import { PRIORIDAD } from "./ingreso/etiquetas";
import { DialogoCambioEstado } from "./DialogoCambioEstado";
import { EstadoEditable } from "./EstadoEditable";
import c from "@/pages/catalogos/Catalogo.module.css";

const ABIERTOS = ESTADOS.filter((e) => !esTerminal(e));
const CLAVES_FILTRO = ["q", "estado", "area", "espera"] as const;

const deLista = <T extends string>(lista: readonly T[], v: string | null): T | undefined => lista.find((x) => x === v);

/** Todas las O.S. abiertas, para darles seguimiento y moverlas de estado. */
export function OrdenesActivas() {
  const alcance = useTaller();
  const [params, setParams] = useSearchParams();
  const [cambiando, setCambiando] = useState<{ orden: OrdenActiva; destino: EstadoOS } | null>(null);

  const filtros: FiltrosActivas = {
    alcance,
    texto: params.get("q") || undefined,
    estado: deLista<EstadoOS>(ABIERTOS, params.get("estado")),
    area: deLista<Area>(AREAS, params.get("area")),
    soloEnEspera: params.get("espera") === "1",
  };
  const { data: ordenes, isPending } = useOrdenesActivas(filtros);
  const hayFiltros = CLAVES_FILTRO.some((k) => params.get(k));

  const poner = (clave: string, valor: string) => {
    const s = new URLSearchParams(params);
    if (valor) s.set(clave, valor);
    else s.delete(clave);
    setParams(s, { replace: true });
  };

  const limpiar = () => {
    const s = new URLSearchParams(params);
    CLAVES_FILTRO.forEach((k) => s.delete(k));
    setParams(s, { replace: true });
  };

  const enEspera = (ordenes ?? []).filter((o) => ESTADO[o.estado].espera).length;

  const columnas: readonly Columna<OrdenActiva>[] = [
    { id: "folio", encabezado: "Folio", fija: true, celda: (o) => <Folio folio={o.folio} tipo="os" /> },
    {
      id: "estado",
      encabezado: "Estatus",
      celda: (o) => <EstadoEditable folio={o.folio} estado={o.estado} onElegir={(destino) => setCambiando({ orden: o, destino })} />,
    },
    { id: "dias", encabezado: "En el estado", numerica: true, celda: (o) => <Antiguedad dias={o.diasEnEstado} /> },
    { id: "area", encabezado: "Responsable", celda: (o) => <PuntoArea area={ESTADO[o.estado].area} etiqueta /> },
    {
      id: "unidad",
      encabezado: "Unidad",
      celda: (o) => (
        <div>
          <Folio folio={o.unidad.placas} />
          <div className={c.secundario}>
            {o.unidad.marca} {o.unidad.modelo}
          </div>
        </div>
      ),
    },
    { id: "cliente", encabezado: "Cliente", celda: (o) => o.cliente.razonSocial },
    {
      id: "taller",
      encabezado: "Taller",
      celda: (o) => (
        <span className={c.ubicacion}>
          {o.taller.nombre}
          {o.tallerBase && o.tallerBase.id !== o.taller.id && <ChipFueraDeBase base={o.tallerBase.nombre} />}
        </span>
      ),
    },
    { id: "prioridad", encabezado: "Prioridad", celda: (o) => <span className={o.prioridad === "critica" ? c.critico : undefined}>{PRIORIDAD[o.prioridad]}</span> },
    {
      id: "entrega",
      encabezado: "Entrega",
      numerica: true,
      celda: (o) => (o.entregaComprometida ? fecha(fechaLocal(o.entregaComprometida)) : "—"),
    },
  ];

  return (
    <>
      <Panel
        titulo="O.S. activas"
        subtitulo={
          ordenes
            ? `${numero(ordenes.length)} abiertas · ${numero(enEspera)} detenidas en un punto de espera · ${alcance}`
            : alcance
        }
        alBorde
      >
        <div className={c.filtros} role="search" aria-label="Filtrar O.S. activas">
          <label className={c.campo}>
            <span>Buscar</span>
            <input type="search" placeholder="Folio, placas o cliente" value={filtros.texto ?? ""} onChange={(e) => poner("q", e.target.value)} />
          </label>
          <label className={c.campo}>
            <span>Estado</span>
            <select value={filtros.estado ?? ""} onChange={(e) => poner("estado", e.target.value)}>
              <option value="">Todos los abiertos</option>
              {ABIERTOS.map((e) => (
                <option key={e} value={e}>{ESTADO[e].label}</option>
              ))}
            </select>
          </label>
          <label className={c.campo}>
            <span>Área responsable</span>
            <select value={filtros.area ?? ""} onChange={(e) => poner("area", e.target.value)}>
              <option value="">Todas</option>
              {AREAS.map((a) => (
                <option key={a} value={a}>{AREA_LABEL[a]}</option>
              ))}
            </select>
          </label>
          <label className={c.interruptor}>
            <input type="checkbox" role="switch" checked={filtros.soloEnEspera} onChange={(e) => poner("espera", e.target.checked ? "1" : "")} />
            Solo detenidas en espera
          </label>
          <span className={c.contador} aria-live="polite">
            <b>{ordenes ? numero(ordenes.length) : "—"}</b> O.S.
          </span>
        </div>

        <DataTable
          plano
          columnas={columnas}
          filas={ordenes ?? []}
          claveFila={(o) => o.folio}
          vacio={
            isPending ? (
              <EmptyState titulo="Cargando O.S.…" />
            ) : hayFiltros ? (
              <EmptyState titulo="Ninguna O.S. coincide con los filtros">
                <div className={c.acciones}>
                  <button type="button" className={c.botonSecundario} onClick={limpiar}>
                    Limpiar filtros
                  </button>
                </div>
              </EmptyState>
            ) : (
              <EmptyState titulo="No hay O.S. abiertas">
                Las O.S. aparecen aquí desde que se programan o se reciben, y salen al cerrarse.
              </EmptyState>
            )
          }
        />
      </Panel>

      {cambiando && (
        <DialogoCambioEstado
          folio={cambiando.orden.folio}
          estado={cambiando.orden.estado}
          inicial={cambiando.destino}
          onCerrar={() => setCambiando(null)}
        />
      )}
    </>
  );
}

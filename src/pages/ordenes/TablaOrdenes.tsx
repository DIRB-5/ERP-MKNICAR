import { useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Folio } from "@/components/Folio/Folio";
import { Estado } from "@/components/Estado/Estado";
import { Antiguedad } from "@/components/Antiguedad/Antiguedad";
import { Monto } from "@/components/Monto/Monto";
import { PRIORIDAD_LABEL } from "@/components/TarjetaOS/TarjetaOS";
import { ESTADOS, ESTADO, type EstadoOS } from "@/domain/estados";
import { fecha, numero } from "@/domain/format";
import { ETAPAS, ETAPA_LABEL, type Etapa } from "@/app/etapas";
import type { Prioridad } from "@/app/useKanbanOrdenes";
import { TAMANO_PAGINA, useOrdenes, type FiltrosOrdenes, type FilaOrden } from "@/app/useOrdenes";
import { useTaller } from "@/app/useTaller";
import styles from "./TablaOrdenes.module.css";

const PRIORIDADES: readonly Prioridad[] = ["critica", "alta", "normal"];

/** Parámetros de la URL que son filtros. `vista` y `pagina` no cuentan. */
const CLAVES_FILTRO = ["etapa", "estado", "prioridad", "cliente", "asesor", "desde", "hasta"] as const;

const deLista = <T extends string>(lista: readonly T[], v: string | null): T | undefined =>
  lista.find((x) => x === v);

const COLUMNAS: readonly Columna<FilaOrden>[] = [
  { id: "folio", encabezado: "Folio O.S.", fija: true, celda: (o) => <Folio folio={o.folio} tipo="os" /> },
  {
    id: "unidad",
    encabezado: "Unidad",
    celda: (o) => (
      <div>
        <Folio folio={o.placa} />
        <div className={styles.secundario}>{o.modelo}</div>
      </div>
    ),
  },
  { id: "cliente", encabezado: "Cliente", celda: (o) => o.cliente },
  { id: "estado", encabezado: "Estado", celda: (o) => <Estado estado={o.estado} /> },
  { id: "dias", encabezado: "En el estado", numerica: true, celda: (o) => <Antiguedad dias={o.dias} /> },
  { id: "monto", encabezado: "Monto", numerica: true, celda: (o) => <Monto valor={o.monto} /> },
  { id: "prioridad", encabezado: "Prioridad", celda: (o) => PRIORIDAD_LABEL[o.prioridad].replace("Prioridad ", "") },
  { id: "asesor", encabezado: "Asesor", celda: (o) => o.asesor },
  { id: "taller", encabezado: "Taller", celda: (o) => o.taller },
  {
    id: "entrega",
    encabezado: "Entrega",
    numerica: true,
    celda: (o) => (o.entrega ? fecha(new Date(o.entrega)) : "—"),
  },
];

export function TablaOrdenes() {
  const taller = useTaller();
  const [params, setParams] = useSearchParams();

  const filtros: FiltrosOrdenes = {
    etapa: deLista<Etapa>(ETAPAS, params.get("etapa")),
    estado: deLista<EstadoOS>(ESTADOS, params.get("estado")),
    prioridad: deLista<Prioridad>(PRIORIDADES, params.get("prioridad")),
    cliente: params.get("cliente") ?? undefined,
    asesor: params.get("asesor") ?? undefined,
    desde: params.get("desde") ?? undefined,
    hasta: params.get("hasta") ?? undefined,
  };
  const pagina = Math.max(1, Number(params.get("pagina")) || 1);
  const resultado = useOrdenes(taller, filtros, pagina);

  const hayFiltros = CLAVES_FILTRO.some((c) => params.get(c));
  const totalPaginas = resultado ? Math.max(1, Math.ceil(resultado.total / TAMANO_PAGINA)) : 1;

  // Cambiar un filtro regresa a la primera página.
  const poner = (clave: string, valor: string) => {
    const s = new URLSearchParams(params);
    if (valor) s.set(clave, valor);
    else s.delete(clave);
    s.delete("pagina");
    setParams(s, { replace: true });
  };

  const irAPagina = (p: number) => {
    const s = new URLSearchParams(params);
    s.set("pagina", String(p));
    setParams(s);
  };

  const limpiar = () => {
    const s = new URLSearchParams(params);
    CLAVES_FILTRO.forEach((c) => s.delete(c));
    s.delete("pagina");
    setParams(s, { replace: true });
  };

  return (
    <Panel
      titulo="Lista de O.S."
      subtitulo={
        resultado
          ? `${numero(resultado.total)} O.S.${hayFiltros ? " con los filtros aplicados" : ""}`
          : taller
      }
      alBorde
    >
      <div className={styles.filtros} role="search" aria-label="Filtrar O.S.">
        <label className={styles.campo}>
          <span>Etapa</span>
          <select value={filtros.etapa ?? ""} onChange={(e) => poner("etapa", e.target.value)}>
            <option value="">Todas</option>
            {ETAPAS.map((e) => (
              <option key={e} value={e}>{ETAPA_LABEL[e]}</option>
            ))}
          </select>
        </label>
        <label className={styles.campo}>
          <span>Estado</span>
          <select value={filtros.estado ?? ""} onChange={(e) => poner("estado", e.target.value)}>
            <option value="">Todos</option>
            {ESTADOS.map((e) => (
              <option key={e} value={e}>{ESTADO[e].label}</option>
            ))}
          </select>
        </label>
        <label className={styles.campo}>
          <span>Prioridad</span>
          <select value={filtros.prioridad ?? ""} onChange={(e) => poner("prioridad", e.target.value)}>
            <option value="">Todas</option>
            {PRIORIDADES.map((p) => (
              <option key={p} value={p}>{PRIORIDAD_LABEL[p].replace("Prioridad ", "")}</option>
            ))}
          </select>
        </label>
        <label className={styles.campo}>
          <span>Cliente</span>
          <input
            type="search"
            placeholder="Nombre del cliente"
            value={filtros.cliente ?? ""}
            onChange={(e) => poner("cliente", e.target.value)}
          />
        </label>
        <label className={styles.campo}>
          <span>Asesor</span>
          <input
            type="search"
            placeholder="Nombre del asesor"
            value={filtros.asesor ?? ""}
            onChange={(e) => poner("asesor", e.target.value)}
          />
        </label>
        <label className={styles.campo}>
          <span>Ingreso desde</span>
          <input type="date" value={filtros.desde ?? ""} max={filtros.hasta} onChange={(e) => poner("desde", e.target.value)} />
        </label>
        <label className={styles.campo}>
          <span>hasta</span>
          <input type="date" value={filtros.hasta ?? ""} min={filtros.desde} onChange={(e) => poner("hasta", e.target.value)} />
        </label>
        {hayFiltros && (
          <button type="button" className={styles.limpiar} onClick={limpiar}>
            Limpiar filtros
          </button>
        )}
      </div>

      <DataTable
        plano
        columnas={COLUMNAS}
        filas={resultado?.filas ?? []}
        claveFila={(o) => o.folio}
        vacio={
          <EmptyState titulo={resultado ? "Ninguna O.S. coincide con los filtros" : undefined}>
            {resultado && hayFiltros ? "Prueba quitando algún filtro." : undefined}
          </EmptyState>
        }
      />

      {resultado && resultado.total > 0 && (
        <nav className={styles.paginacion} aria-label="Paginación">
          <span>
            {numero((pagina - 1) * TAMANO_PAGINA + 1)}–{numero(Math.min(pagina * TAMANO_PAGINA, resultado.total))} de{" "}
            {numero(resultado.total)}
          </span>
          <div className={styles.pasos}>
            <button type="button" disabled={pagina <= 1} onClick={() => irAPagina(pagina - 1)}>
              ← Anterior
            </button>
            <button type="button" disabled={pagina >= totalPaginas} onClick={() => irAPagina(pagina + 1)}>
              Siguiente →
            </button>
          </div>
        </nav>
      )}
    </Panel>
  );
}

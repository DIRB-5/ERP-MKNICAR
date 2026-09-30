import { Link, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { numero } from "@/domain/format";
import type { ClienteResumen, EstadoCliente, TipoCliente } from "@/domain/tipos";
import { useClientes } from "@/data/consultas";
import type { FiltrosClientes } from "@/data/repositorios";
import { useTaller } from "@/app/useTaller";
import { ChipEstadoCliente, ESTADO_CLIENTE, TIPO_CLIENTE } from "@/pages/catalogos/etiquetas";
import { TabsCatalogos } from "@/pages/catalogos/TabsCatalogos";
import styles from "@/pages/catalogos/Catalogo.module.css";

const TIPOS = Object.keys(TIPO_CLIENTE) as TipoCliente[];
const ESTADOS = Object.keys(ESTADO_CLIENTE) as EstadoCliente[];
const CLAVES_FILTRO = ["q", "tipo", "estado"] as const;

const deLista = <T extends string>(lista: readonly T[], v: string | null): T | undefined =>
  lista.find((x) => x === v);

export const rutaCliente = (id: string) => `/clientes/${encodeURIComponent(id)}`;

const COLUMNAS: readonly Columna<ClienteResumen>[] = [
  {
    id: "razon",
    encabezado: "Razón social",
    fija: true,
    celda: ({ cliente }) => (
      <Link
        to={rutaCliente(cliente.id)}
        className={`${styles.enlace} ${cliente.estado === "credito_suspendido" ? styles.critico : ""}`}
      >
        {cliente.razonSocial}
      </Link>
    ),
  },
  { id: "rfc", encabezado: "RFC", celda: ({ cliente }) => cliente.rfc },
  { id: "tipo", encabezado: "Tipo", celda: ({ cliente }) => TIPO_CLIENTE[cliente.tipo] },
  { id: "unidades", encabezado: "Unidades", numerica: true, celda: (c) => numero(c.unidades) },
  { id: "abiertas", encabezado: "O.S. abiertas", numerica: true, celda: (c) => numero(c.osAbiertas) },
  { id: "facturado", encabezado: "Facturado del periodo", numerica: true, celda: (c) => <Monto valor={c.facturadoPeriodo} /> },
  { id: "convenio", encabezado: "Convenio", celda: ({ cliente }) => cliente.convenioId ?? "Sin convenio" },
  { id: "ejecutivo", encabezado: "Ejecutivo", celda: ({ cliente }) => cliente.ejecutivoCuenta },
  { id: "estado", encabezado: "Estado", celda: ({ cliente }) => <ChipEstadoCliente estado={cliente.estado} /> },
];

export function Component() {
  const alcance = useTaller();
  const [params, setParams] = useSearchParams();

  const filtros: FiltrosClientes = {
    alcance,
    texto: params.get("q") || undefined,
    tipo: deLista(TIPOS, params.get("tipo")),
    estado: deLista(ESTADOS, params.get("estado")),
  };

  const { data: clientes, isPending } = useClientes(filtros);
  const hayFiltros = CLAVES_FILTRO.some((c) => params.get(c));

  const poner = (clave: string, valor: string) => {
    const s = new URLSearchParams(params);
    if (valor) s.set(clave, valor);
    else s.delete(clave);
    setParams(s, { replace: true });
  };

  const limpiar = () => {
    const s = new URLSearchParams(params);
    CLAVES_FILTRO.forEach((c) => s.delete(c));
    setParams(s, { replace: true });
  };

  const vacio = isPending ? (
    <EmptyState titulo="Cargando clientes…" />
  ) : hayFiltros ? (
    <EmptyState titulo="Ningún cliente coincide con los filtros">
      <div className={styles.acciones}>
        <button type="button" className={styles.botonSecundario} onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </EmptyState>
  ) : (
    <EmptyState titulo="Aún no hay clientes registrados">
      Registra un cliente para darle de alta sus unidades y sus contactos de autorización.
      <div className={styles.acciones}>
        <Link to="/clientes/nuevo" className={styles.botonPrimario}>
          + Registrar cliente
        </Link>
      </div>
    </EmptyState>
  );

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <h1 className={styles.titulo}>Clientes</h1>
        <TabsCatalogos />
        <Link to="/clientes/nuevo" className={`${styles.botonPrimario} ${styles.alFinal}`}>
          + Registrar cliente
        </Link>
      </header>

      <Panel titulo="Cartera de clientes" subtitulo={alcance} alBorde>
        <div className={styles.filtros} role="search" aria-label="Filtrar clientes">
          <label className={styles.campo}>
            <span>Buscar</span>
            <input
              type="search"
              placeholder="Razón social o RFC"
              value={filtros.texto ?? ""}
              onChange={(e) => poner("q", e.target.value)}
            />
          </label>
          <label className={styles.campo}>
            <span>Tipo</span>
            <select value={filtros.tipo ?? ""} onChange={(e) => poner("tipo", e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_CLIENTE[t]}</option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Estado</span>
            <select value={filtros.estado ?? ""} onChange={(e) => poner("estado", e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{ESTADO_CLIENTE[s].label}</option>
              ))}
            </select>
          </label>
          <span className={styles.contador} aria-live="polite">
            <b>{clientes ? numero(clientes.length) : "—"}</b> {clientes?.length === 1 ? "cliente" : "clientes"}
          </span>
        </div>

        <DataTable
          plano
          columnas={COLUMNAS}
          filas={clientes ?? []}
          claveFila={(c) => c.cliente.id}
          vacio={vacio}
        />
      </Panel>
    </div>
  );
}

Component.displayName = "ListaClientes";

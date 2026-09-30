import { Link, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { numero } from "@/domain/format";
import type { EstadoUnidad, TipoUnidad } from "@/domain/tipos";
import { useClientes, useUnidades } from "@/data/consultas";
import type { FiltrosUnidades } from "@/data/repositorios";
import { useTaller } from "@/app/useTaller";
import { ESTADO_UNIDAD, TIPO_UNIDAD } from "@/pages/catalogos/etiquetas";
import { TabsCatalogos } from "@/pages/catalogos/TabsCatalogos";
import styles from "@/pages/catalogos/Catalogo.module.css";
import { COLUMNAS_UNIDADES } from "./columnasUnidades";

const TIPOS = Object.keys(TIPO_UNIDAD) as TipoUnidad[];
const ESTADOS = Object.keys(ESTADO_UNIDAD) as EstadoUnidad[];
const CLAVES_FILTRO = ["taller", "cliente", "tipo", "estado", "enPiso"] as const;

const deLista = <T extends string>(lista: readonly T[], v: string | null): T | undefined =>
  lista.find((x) => x === v);

export function Component() {
  const alcance = useTaller();
  const [params, setParams] = useSearchParams();

  const filtros: FiltrosUnidades = {
    alcance,
    tallerBaseId: params.get("taller") || undefined,
    clienteId: params.get("cliente") || undefined,
    tipo: deLista(TIPOS, params.get("tipo")),
    estado: deLista(ESTADOS, params.get("estado")),
    soloEnPiso: params.get("enPiso") === "1",
  };

  const { data: unidades, isPending } = useUnidades(filtros);
  // Opciones de los filtros: salen del universo sin filtrar, para no desaparecer al elegir una.
  const { data: todas } = useUnidades({ alcance });
  const { data: clientes } = useClientes({ alcance });

  const talleres = [...new Map((todas ?? []).map((u) => [u.tallerBase.id, u.tallerBase.nombre]))]
    .sort((a, b) => a[1].localeCompare(b[1], "es"));

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
    <EmptyState titulo="Cargando unidades…" />
  ) : hayFiltros ? (
    <EmptyState titulo="Ninguna unidad coincide con los filtros">
      <div className={styles.acciones}>
        <button type="button" className={styles.botonSecundario} onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </EmptyState>
  ) : (
    <EmptyState titulo="Aún no hay unidades registradas">
      Registra la primera unidad de una flotilla para empezar su expediente.
      <div className={styles.acciones}>
        <Link to="/unidades/nueva" className={styles.botonPrimario}>
          + Registrar unidad
        </Link>
      </div>
    </EmptyState>
  );

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <h1 className={styles.titulo}>Unidades</h1>
        <TabsCatalogos />
        <Link to="/unidades/nueva" className={`${styles.botonPrimario} ${styles.alFinal}`}>
          + Registrar unidad
        </Link>
      </header>

      <Panel titulo="Padrón de unidades" subtitulo={alcance} alBorde>
        <div className={styles.filtros} role="search" aria-label="Filtrar unidades">
          <label className={styles.campo}>
            <span>Taller base</span>
            <select value={filtros.tallerBaseId ?? ""} onChange={(e) => poner("taller", e.target.value)}>
              <option value="">Todos</option>
              {talleres.map(([id, nombre]) => (
                <option key={id} value={id}>{nombre}</option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Cliente</span>
            <select value={filtros.clienteId ?? ""} onChange={(e) => poner("cliente", e.target.value)}>
              <option value="">Todos</option>
              {(clientes ?? []).map((c) => (
                <option key={c.cliente.id} value={c.cliente.id}>{c.cliente.razonSocial}</option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Tipo de unidad</span>
            <select value={filtros.tipo ?? ""} onChange={(e) => poner("tipo", e.target.value)}>
              <option value="">Todos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_UNIDAD[t]}</option>
              ))}
            </select>
          </label>
          <label className={styles.campo}>
            <span>Estado</span>
            <select value={filtros.estado ?? ""} onChange={(e) => poner("estado", e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map((s) => (
                <option key={s} value={s}>{ESTADO_UNIDAD[s].label}</option>
              ))}
            </select>
          </label>
          <label className={styles.interruptor}>
            <input
              type="checkbox"
              role="switch"
              checked={filtros.soloEnPiso}
              onChange={(e) => poner("enPiso", e.target.checked ? "1" : "")}
            />
            Solo en piso
          </label>
          <span className={styles.contador} aria-live="polite">
            <b>{unidades ? numero(unidades.length) : "—"}</b> {unidades?.length === 1 ? "unidad" : "unidades"}
          </span>
        </div>

        <DataTable
          plano
          columnas={COLUMNAS_UNIDADES}
          filas={unidades ?? []}
          claveFila={(u) => u.unidad.id}
          vacio={vacio}
        />
      </Panel>
    </div>
  );
}

Component.displayName = "ListaUnidades";

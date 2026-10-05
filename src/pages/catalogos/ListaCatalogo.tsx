import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { numero } from "@/domain/format";
import { CATALOGOS, esClaveCatalogo, type CatalogoDef } from "@/domain/catalogos";
import type { RegistroCatalogo } from "@/domain/tipos";
import { useRegistros } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { ChipActivo, mostrarValor } from "./valores";
import { useReferencias } from "./referencias";
import c from "./Catalogo.module.css";
import s from "./CatalogosGenericos.module.css";

function Lista({ def }: { def: CatalogoDef }) {
  const alcance = useTaller();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const texto = params.get("q") ?? "";
  const incluirInactivos = params.get("inactivos") === "1";
  const { data: registros, isPending } = useRegistros(def.clave, {
    alcance,
    texto: texto || undefined,
    incluirInactivos,
  });
  const referencias = useReferencias(def, alcance);

  const poner = (k: string, v: string) => {
    const n = new URLSearchParams(params);
    if (v) n.set(k, v);
    else n.delete(k);
    setParams(n, { replace: true });
  };

  const columnas: readonly Columna<RegistroCatalogo>[] = def.columnas.map((col, i) => ({
    id: col.clave,
    encabezado: col.etiqueta,
    ancho: col.ancho,
    numerica: col.alineacion === "derecha",
    fija: i === 0,
    celda: (r: RegistroCatalogo) =>
      col.clave === "activo" ? (
        <ChipActivo activo={r.activo} />
      ) : (
        <span className={i === 0 ? c.celdaFuerte : !r.activo ? s.inactivo : undefined}>
          {mostrarValor(
            def.campos.find((x) => x.clave === col.clave),
            r.valores[col.clave],
            referencias
          )}
        </span>
      ),
  }));

  const nuevo = `/catalogos/${def.clave}/nuevo`;

  return (
    <div className={c.vista}>
      <div className={s.migas}>
        <Link to="/catalogos">Catálogos</Link> / {def.nombre}
      </div>
      <header className={c.encabezado}>
        <div>
          <h1 className={c.titulo}>{def.nombre}</h1>
          <p className={s.subtitulo}>{def.descripcion}</p>
        </div>
        <Link to={nuevo} className={`${c.botonPrimario} ${c.alFinal}`}>
          + Nuevo {def.nombreSingular}
        </Link>
      </header>

      <Panel titulo={def.nombre} subtitulo={def.porTaller ? `Registros de ${alcance}` : "Aplican a todos los talleres"} alBorde>
        <div className={c.filtros} role="search" aria-label={`Filtrar ${def.nombre.toLowerCase()}`}>
          <label className={c.campo}>
            <span>Buscar</span>
            <input type="search" placeholder="Cualquier dato" value={texto} onChange={(e) => poner("q", e.target.value)} />
          </label>
          <label className={c.interruptor}>
            <input
              type="checkbox"
              role="switch"
              checked={incluirInactivos}
              onChange={(e) => poner("inactivos", e.target.checked ? "1" : "")}
            />
            Incluir dados de baja
          </label>
          <span className={c.contador} aria-live="polite">
            <b>{registros ? numero(registros.length) : "—"}</b> {registros?.length === 1 ? def.nombreSingular : def.nombre.toLowerCase()}
          </span>
        </div>
        <DataTable
          plano
          columnas={columnas}
          filas={registros ?? []}
          claveFila={(r) => r.id}
          onSeleccionar={(r) => navigate(`/catalogos/${def.clave}/${encodeURIComponent(r.id)}`)}
          vacio={
            isPending ? (
              <EmptyState titulo="Cargando…" />
            ) : texto ? (
              <EmptyState titulo={`Ningún ${def.nombreSingular} coincide con "${texto}"`}>
                <div className={c.acciones}>
                  <button type="button" className={c.botonSecundario} onClick={() => poner("q", "")}>
                    Limpiar búsqueda
                  </button>
                </div>
              </EmptyState>
            ) : (
              <EmptyState titulo={`Aún no hay ${def.nombre.toLowerCase()}`}>
                <div className={c.acciones}>
                  <Link to={nuevo} className={c.botonPrimario}>
                    + Nuevo {def.nombreSingular}
                  </Link>
                </div>
              </EmptyState>
            )
          }
        />
      </Panel>
    </div>
  );
}

export function Component() {
  const { clave } = useParams();
  if (!esClaveCatalogo(clave)) {
    return (
      <EmptyState titulo="Ese catálogo no existe">
        <Link to="/catalogos">Ver todos los catálogos</Link>
      </EmptyState>
    );
  }
  // key: al cambiar de catálogo se reinicia todo el estado de la lista.
  return <Lista key={clave} def={CATALOGOS[clave]} />;
}

Component.displayName = "ListaCatalogo";

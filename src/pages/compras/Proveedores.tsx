import { useSearchParams, useNavigate } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { Surface } from "@/components/Surface/Surface";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { numero } from "@/domain/format";
import { situacionDocumentos } from "@/domain/compras";
import type { Proveedor } from "@/domain/tipos/compras";
import { useCategorias, useProveedores } from "@/data/consultas";
import { hoyISO } from "@/app/fechas";
import { ProveedorFormulario } from "./ProveedorFormulario";
import { ChipActivo, ChipDocumentos, condicionesPago } from "./proveedorEtiquetas";
import c from "@/pages/catalogos/Catalogo.module.css";
import s from "./Proveedores.module.css";

type Alcance = "activos" | "todos";

export function Component() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const texto = params.get("q") ?? "";
  const categoriaId = params.get("cat") ?? "";
  const alcance: Alcance = params.get("ver") === "todos" ? "todos" : "activos";
  const nuevo = params.has("nuevo");

  const hoy = hoyISO();
  const { data: categorias = [] } = useCategorias();
  const nombreCategoria = new Map(categorias.map((x) => [x.id, x.nombre]));
  const { data, isPending } = useProveedores({
    texto: texto || undefined,
    categoriaId: categoriaId || undefined,
    incluirInactivos: alcance === "todos",
  });
  const filas = data ?? [];
  const vencidos = filas.filter((p) => p.activo && situacionDocumentos(p.documentos, hoy) === "opinion_vencida").length;

  const poner = (cambios: Record<string, string | null>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v == null || v === "") n.delete(k);
      else n.set(k, v);
    }
    setParams(n, { replace: true });
  };

  const hayFiltros = Boolean(texto || categoriaId);

  const columnas: readonly Columna<Proveedor>[] = [
    {
      id: "razon",
      encabezado: "Razón social",
      fija: true,
      celda: (p) => (
        <div className={s.razon}>
          <span className={`${c.celdaFuerte} ${p.activo ? "" : s.inactivo}`}>{p.razonSocial}</span>
          {p.nombreComercial && <span className={c.secundario}>{p.nombreComercial}</span>}
        </div>
      ),
    },
    { id: "rfc", encabezado: "RFC", celda: (p) => <span className={s.cifra}>{p.rfc}</span> },
    { id: "pago", encabezado: "Condiciones de pago", celda: (p) => <span className={s.cifra}>{condicionesPago(p)}</span> },
    {
      id: "cats",
      encabezado: "Categorías",
      celda: (p) =>
        p.categoriaIds.length === 0 ? "—" : p.categoriaIds.map((id) => nombreCategoria.get(id) ?? "Sin nombre").join(" · "),
    },
    { id: "docs", encabezado: "Documentos", celda: (p) => <ChipDocumentos proveedor={p} hoy={hoy} /> },
    { id: "estatus", encabezado: "Estatus", celda: (p) => <ChipActivo activo={p.activo} /> },
  ];

  const vacio = isPending ? (
    <EmptyState titulo="Cargando…" />
  ) : hayFiltros ? (
    <EmptyState titulo="Ningún proveedor coincide">
      <div className={c.acciones}>
        <button type="button" className={c.botonSecundario} onClick={() => poner({ q: null, cat: null })}>
          Limpiar filtros
        </button>
      </div>
    </EmptyState>
  ) : (
    <EmptyState titulo={alcance === "activos" ? "Aún no hay proveedores activos" : "Aún no hay proveedores registrados"}>
      Registra a los proveedores que surten refacciones y servicios.
      <div className={c.acciones}>
        <button type="button" className={c.botonPrimario} onClick={() => poner({ nuevo: "1" })}>
          + Nuevo proveedor
        </button>
      </div>
    </EmptyState>
  );

  return (
    <div className={c.vista}>
      <header className={c.encabezado}>
        <div>
          <h1 className={c.titulo}>Proveedores</h1>
          <p className={s.subtitulo}>Padrón de quienes surten refacciones y servicios a los talleres.</p>
        </div>
        <div className={c.alFinal}>
          <button type="button" className={c.botonPrimario} onClick={() => poner({ nuevo: "1" })}>
            + Nuevo proveedor
          </button>
        </div>
      </header>

      <Panel
        titulo="Padrón de proveedores"
        subtitulo="Abre un proveedor para ver sus datos fiscales, documentos y compras"
        extra={
          <SegmentedControl
            etiqueta="Ver"
            opciones={[
              { id: "activos", etiqueta: "Activos" },
              { id: "todos", etiqueta: "Todos" },
            ]}
            valor={alcance}
            onCambiar={(v) => poner({ ver: v === "todos" ? "todos" : null })}
          />
        }
        alBorde
      >
        <div className={c.filtros} role="search" aria-label="Filtrar proveedores">
          <label className={c.campo}>
            <span>Buscar</span>
            <input type="search" placeholder="Razón social o RFC" value={texto} onChange={(e) => poner({ q: e.target.value })} />
          </label>
          <label className={c.campo}>
            <span>Categoría</span>
            <select value={categoriaId} onChange={(e) => poner({ cat: e.target.value })}>
              <option value="">Todas</option>
              {categorias.map((x) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </select>
          </label>
          {hayFiltros && (
            <button type="button" className={c.botonSecundario} onClick={() => poner({ q: null, cat: null })}>
              Limpiar filtros
            </button>
          )}
          <span className={c.contador} aria-live="polite">
            <b>{data ? numero(filas.length) : "—"}</b> {filas.length === 1 ? "proveedor" : "proveedores"}
            {vencidos > 0 && ` · ${numero(vencidos)} con opinión vencida`}
          </span>
        </div>

        <Surface variante="solid" elevacion="none" className={s.tabla}>
          <DataTable
            plano
            columnas={columnas}
            filas={filas}
            claveFila={(p) => p.id}
            onSeleccionar={(p) => navigate(`/compras/proveedores/${encodeURIComponent(p.id)}`)}
            vacio={vacio}
          />
        </Surface>
      </Panel>

      <ProveedorFormulario
        abierto={nuevo}
        proveedor={null}
        onCerrar={() => poner({ nuevo: null })}
        onGuardado={(p) => navigate(`/compras/proveedores/${encodeURIComponent(p.id)}`)}
      />
    </div>
  );
}

Component.displayName = "Proveedores";

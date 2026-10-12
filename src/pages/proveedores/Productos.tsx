import { Link, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { Surface } from "@/components/Surface/Surface";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { numero } from "@/domain/format";
import type { Producto, TipoProducto } from "@/domain/tipos";
import { useCategorias, useProductos } from "@/data/consultas";
import { TabsCatalogos } from "@/pages/catalogos/TabsCatalogos";
import { ArbolCategorias } from "./ArbolCategorias";
import { PanelProducto } from "./PanelProducto";
import { TIPO_PRODUCTO, margen } from "./etiquetas";
import c from "@/pages/catalogos/Catalogo.module.css";
import s from "./Productos.module.css";

const TIPOS = Object.keys(TIPO_PRODUCTO) as TipoProducto[];

const COLUMNAS_PRODUCTOS: readonly Columna<Producto>[] = [
  { id: "parte", encabezado: "Núm. de parte", fija: true, celda: (p) => <Folio folio={p.numeroParte} /> },
  { id: "desc", encabezado: "Descripción", celda: (p) => <span className={c.celdaFuerte}>{p.descripcion}</span> },
  { id: "marca", encabezado: "Marca", celda: (p) => p.marca },
  { id: "cat", encabezado: "Categoría", celda: (p) => p.subcategoria?.nombre ?? p.categoria.nombre },
  { id: "tipo", encabezado: "Tipo", celda: (p) => <Chip>{TIPO_PRODUCTO[p.tipo]}</Chip> },
  { id: "unidad", encabezado: "Unidad", celda: (p) => p.unidadMedida },
  { id: "exist", encabezado: "Existencia", numerica: true, celda: (p) => (p.existencia == null ? "—" : numero(p.existencia)) },
  { id: "prov", encabezado: "Proveedores", numerica: true, celda: (p) => numero(p.proveedores) },
  { id: "ultimo", encabezado: "Último costo", numerica: true, celda: (p) => <Monto valor={p.ultimoCosto} /> },
  { id: "prom", encabezado: "Costo promedio", numerica: true, celda: (p) => <Monto valor={p.costoPromedio} /> },
  { id: "precio", encabezado: "Precio sugerido", numerica: true, celda: (p) => <Monto valor={p.precioSugerido} /> },
  {
    id: "margen",
    encabezado: "Margen %",
    numerica: true,
    celda: (p) => {
      const m = margen(p.precioSugerido, p.costoPromedio);
      return m == null ? "—" : <span className={m < 20 ? c.critico : undefined}>{m.toFixed(1)}%</span>;
    },
  },
];

export function Component() {
  const [params, setParams] = useSearchParams();

  const categoriaId = params.get("cat") ?? "";
  const subcategoriaId = params.get("sub") ?? "";
  const texto = params.get("q") ?? "";
  const tipo = TIPOS.find((x) => x === params.get("tipo"));
  const sel = params.get("sel") ?? "";

  const { data: categorias = [], isPending: cargandoCategorias } = useCategorias();
  const productos = useProductos({
    texto: texto || undefined,
    categoriaId: categoriaId || undefined,
    subcategoriaId: subcategoriaId || undefined,
    tipo,
  });

  const poner = (cambios: Record<string, string>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    setParams(n, { replace: true });
  };

  const hayFiltros = Boolean(texto || categoriaId || tipo);
  const limpiar = () => poner({ q: "", cat: "", sub: "", tipo: "" });

  const filas = productos.data ?? [];

  const vacio = productos.isPending ? (
    <EmptyState titulo="Cargando…" />
  ) : hayFiltros ? (
    <EmptyState titulo="Ningún producto coincide">
      <div className={c.acciones}>
        <button type="button" className={c.botonSecundario} onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </EmptyState>
  ) : (
    <EmptyState titulo="Aún no hay productos en el catálogo">
      El catálogo se carga importándolo o dando de alta cada producto.
      <div className={c.acciones}>
        <Link to="/productos/nuevo" className={c.botonPrimario}>
          + Nuevo producto
        </Link>
      </div>
    </EmptyState>
  );

  return (
    <div className={c.vista}>
      <header className={c.encabezado}>
        <h1 className={c.titulo}>Productos</h1>
        <TabsCatalogos />
        <div className={`${s.accionesEncabezado} ${c.alFinal}`}>
          <button type="button" className={c.botonSecundario} disabled title="Próximamente">
            Importar catálogo
          </button>
          <Link to="/productos/nuevo" className={c.botonPrimario}>
            + Nuevo producto
          </Link>
        </div>
      </header>

      <div className={`${s.layout} ${sel ? s.conDetalle : ""}`}>
        <Surface as="aside" className={s.lateral}>
          <ArbolCategorias
            categorias={categorias}
            categoriaId={categoriaId}
            subcategoriaId={subcategoriaId}
            cargando={cargandoCategorias}
            onElegir={(cat, sub) => poner({ cat, sub, sel: "" })}
          />
        </Surface>

        <Panel titulo="Productos" subtitulo="Selecciona un producto para ver precios por proveedor y consumo" alBorde>
          <div className={c.filtros} role="search" aria-label="Filtrar catálogo">
            <label className={c.campo}>
              <span>Buscar</span>
              <input
                type="search"
                placeholder="Núm. de parte, descripción o marca"
                value={texto}
                onChange={(e) => poner({ q: e.target.value })}
              />
            </label>
            <label className={c.campo}>
              <span>Tipo</span>
              <select value={tipo ?? ""} onChange={(e) => poner({ tipo: e.target.value })}>
                <option value="">Todos</option>
                {TIPOS.map((t) => (
                  <option key={t} value={t}>{TIPO_PRODUCTO[t]}</option>
                ))}
              </select>
            </label>
            {hayFiltros && (
              <button type="button" className={c.botonSecundario} onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
            <span className={c.contador} aria-live="polite">
              <b>{productos.data ? numero(filas.length) : "—"}</b> {filas.length === 1 ? "producto" : "productos"}
            </span>
          </div>

          <DataTable
            plano
            columnas={COLUMNAS_PRODUCTOS}
            filas={filas}
            claveFila={(p) => p.id}
            filaSeleccionada={sel}
            onSeleccionar={(p) => poner({ sel: p.id === sel ? "" : p.id })}
            vacio={vacio}
          />
        </Panel>

        {sel && (
          <Surface as="aside" variante="strong" className={s.detalle} aria-label="Detalle del producto">
            <PanelProducto id={sel} onCerrar={() => poner({ sel: "" })} />
          </Surface>
        )}
      </div>
    </div>
  );
}

Component.displayName = "Productos";

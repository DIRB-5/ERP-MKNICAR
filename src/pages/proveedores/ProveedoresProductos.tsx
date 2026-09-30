import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { Surface } from "@/components/Surface/Surface";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { numero } from "@/domain/format";
import type { EstadoProveedor, Producto, Proveedor, TipoProducto } from "@/domain/tipos";
import { useCategorias, useProductos, useProveedores } from "@/data/consultas";
import { TabsCatalogos } from "@/pages/catalogos/TabsCatalogos";
import { ArbolCategorias } from "./ArbolCategorias";
import { PanelProducto } from "./PanelProducto";
import { PanelProveedor } from "./PanelProveedor";
import { ESTADO_PROVEEDOR, TIPO_PRODUCTO, estrellas, margen } from "./etiquetas";
import c from "@/pages/catalogos/Catalogo.module.css";
import s from "./ProveedoresProductos.module.css";

type Pestana = "productos" | "proveedores";

const TIPOS = Object.keys(TIPO_PRODUCTO) as TipoProducto[];
const ESTADOS = Object.keys(ESTADO_PROVEEDOR) as EstadoProveedor[];

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

const COLUMNAS_PROVEEDORES: readonly Columna<Proveedor>[] = [
  {
    id: "razon",
    encabezado: "Razón social",
    fija: true,
    celda: (p) => <span className={`${c.celdaFuerte} ${p.estado === "suspendido" ? c.critico : ""}`}>{p.razonSocial}</span>,
  },
  { id: "rfc", encabezado: "RFC", celda: (p) => <Folio folio={p.rfc} /> },
  { id: "cats", encabezado: "Categorías que surte", celda: (p) => p.categorias.join(" · ") },
  { id: "prod", encabezado: "Productos", numerica: true, celda: (p) => numero(p.productos) },
  { id: "credito", encabezado: "Crédito", numerica: true, celda: (p) => `${numero(p.creditoDias)} días` },
  { id: "entrega", encabezado: "Entrega prom.", numerica: true, celda: (p) => `${p.entregaPromedioDias.toFixed(1)} días` },
  {
    id: "cumpl",
    encabezado: "Cumplimiento",
    numerica: true,
    celda: (p) => <span className={p.cumplimiento < 85 ? c.critico : undefined}>{p.cumplimiento.toFixed(0)}%</span>,
  },
  { id: "compras", encabezado: "Compras del año", numerica: true, celda: (p) => <Monto valor={p.comprasAnio} /> },
  {
    id: "calif",
    encabezado: "Calificación",
    celda: (p) => (
      <span className={s.estrellas} role="img" aria-label={`${p.calificacion} de 5`} title={`${p.calificacion} de 5`}>
        {estrellas(p.calificacion)}
      </span>
    ),
  },
  { id: "estado", encabezado: "Estado", celda: (p) => <Chip tono={ESTADO_PROVEEDOR[p.estado].tono}>{ESTADO_PROVEEDOR[p.estado].label}</Chip> },
];

export function Component() {
  const { pathname } = useLocation();
  const pestana: Pestana = pathname.startsWith("/proveedores") ? "proveedores" : "productos";
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();

  const categoriaId = params.get("cat") ?? "";
  const subcategoriaId = params.get("sub") ?? "";
  const texto = params.get("q") ?? "";
  const tipo = TIPOS.find((x) => x === params.get("tipo"));
  const estado = ESTADOS.find((x) => x === params.get("estado"));
  const sel = params.get("sel") ?? "";

  const { data: categorias = [], isPending: cargandoCategorias } = useCategorias();
  const productos = useProductos({
    texto: texto || undefined,
    categoriaId: categoriaId || undefined,
    subcategoriaId: subcategoriaId || undefined,
    tipo,
  });
  const proveedores = useProveedores({ texto: texto || undefined, categoriaId: categoriaId || undefined, estado });

  const poner = (cambios: Record<string, string>) => {
    const n = new URLSearchParams(params);
    for (const [k, v] of Object.entries(cambios)) {
      if (v) n.set(k, v);
      else n.delete(k);
    }
    setParams(n, { replace: true });
  };

  const hayFiltros = Boolean(texto || categoriaId || tipo || estado);
  const limpiar = () => poner({ q: "", cat: "", sub: "", tipo: "", estado: "" });

  const lista = pestana === "productos" ? productos : proveedores;
  const filas = lista.data ?? [];
  const suspendidos = (proveedores.data ?? []).filter((p) => p.estado === "suspendido").length;

  const vacio = lista.isPending ? (
    <EmptyState titulo="Cargando…" />
  ) : hayFiltros ? (
    <EmptyState titulo={`Ningún ${pestana === "productos" ? "producto" : "proveedor"} coincide`}>
      <div className={c.acciones}>
        <button type="button" className={c.botonSecundario} onClick={limpiar}>
          Limpiar filtros
        </button>
      </div>
    </EmptyState>
  ) : (
    <EmptyState titulo={pestana === "productos" ? "Aún no hay productos en el catálogo" : "Aún no hay proveedores registrados"}>
      {pestana === "productos"
        ? "El catálogo se carga importándolo o dando de alta cada producto."
        : "Registra a los proveedores que surten refacciones y servicios."}
      <div className={c.acciones}>
        <Link to={pestana === "productos" ? "/productos/nuevo" : "/proveedores/nuevo"} className={c.botonPrimario}>
          {pestana === "productos" ? "+ Nuevo producto" : "+ Nuevo proveedor"}
        </Link>
      </div>
    </EmptyState>
  );

  return (
    <div className={c.vista}>
      <header className={c.encabezado}>
        <h1 className={c.titulo}>Proveedores y productos</h1>
        <TabsCatalogos />
        <div className={`${s.accionesEncabezado} ${c.alFinal}`}>
          <button type="button" className={c.botonSecundario} disabled title="Próximamente">
            Importar catálogo
          </button>
          <Link to={pestana === "productos" ? "/productos/nuevo" : "/proveedores/nuevo"} className={c.botonPrimario}>
            {pestana === "productos" ? "+ Nuevo producto" : "+ Nuevo proveedor"}
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

        <Panel
          titulo={pestana === "productos" ? "Productos" : "Proveedores"}
          subtitulo={
            pestana === "productos"
              ? "Selecciona un producto para ver precios por proveedor y consumo"
              : "Selecciona un proveedor para ver datos fiscales, contactos y desempeño"
          }
          extra={
            <SegmentedControl
              etiqueta="Ver"
              opciones={[
                { id: "productos", etiqueta: "Productos" },
                { id: "proveedores", etiqueta: "Proveedores" },
              ]}
              valor={pestana}
              onCambiar={(p) => {
                // Cambiar de pestaña conserva categoría y búsqueda, no la selección.
                const n = new URLSearchParams(params);
                n.delete("sel");
                n.delete(p === "productos" ? "estado" : "tipo");
                navigate({ pathname: `/${p}`, search: n.toString() }, { replace: true });
              }}
            />
          }
          alBorde
        >
          <div className={c.filtros} role="search" aria-label="Filtrar catálogo">
            <label className={c.campo}>
              <span>Buscar</span>
              <input
                type="search"
                placeholder={pestana === "productos" ? "Núm. de parte, descripción o marca" : "Razón social o RFC"}
                value={texto}
                onChange={(e) => poner({ q: e.target.value })}
              />
            </label>
            {pestana === "productos" ? (
              <label className={c.campo}>
                <span>Tipo</span>
                <select value={tipo ?? ""} onChange={(e) => poner({ tipo: e.target.value })}>
                  <option value="">Todos</option>
                  {TIPOS.map((t) => (
                    <option key={t} value={t}>{TIPO_PRODUCTO[t]}</option>
                  ))}
                </select>
              </label>
            ) : (
              <label className={c.campo}>
                <span>Estado</span>
                <select value={estado ?? ""} onChange={(e) => poner({ estado: e.target.value })}>
                  <option value="">Todos</option>
                  {ESTADOS.map((x) => (
                    <option key={x} value={x}>{ESTADO_PROVEEDOR[x].label}</option>
                  ))}
                </select>
              </label>
            )}
            {hayFiltros && (
              <button type="button" className={c.botonSecundario} onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
            <span className={c.contador} aria-live="polite">
              <b>{lista.data ? numero(filas.length) : "—"}</b>{" "}
              {pestana === "productos" ? "productos" : "proveedores"}
              {pestana === "proveedores" && suspendidos > 0 && ` · ${numero(suspendidos)} suspendido${suspendidos === 1 ? "" : "s"}`}
            </span>
          </div>

          {pestana === "productos" ? (
            <DataTable
              plano
              columnas={COLUMNAS_PRODUCTOS}
              filas={productos.data ?? []}
              claveFila={(p) => p.id}
              filaSeleccionada={sel}
              onSeleccionar={(p) => poner({ sel: p.id === sel ? "" : p.id })}
              vacio={vacio}
            />
          ) : (
            <DataTable
              plano
              columnas={COLUMNAS_PROVEEDORES}
              filas={proveedores.data ?? []}
              claveFila={(p) => p.id}
              filaSeleccionada={sel}
              onSeleccionar={(p) => poner({ sel: p.id === sel ? "" : p.id })}
              vacio={vacio}
            />
          )}
        </Panel>

        {sel && (
          <Surface as="aside" variante="strong" className={s.detalle} aria-label="Detalle">
            {pestana === "productos" ? (
              <PanelProducto id={sel} onCerrar={() => poner({ sel: "" })} />
            ) : (
              <PanelProveedor id={sel} onCerrar={() => poner({ sel: "" })} />
            )}
          </Surface>
        )}
      </div>
    </div>
  );
}

Component.displayName = "ProveedoresProductos";

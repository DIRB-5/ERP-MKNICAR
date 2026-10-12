/*
 * Repositorio del catálogo de productos y categorías en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Arranca vacío a propósito (CLAUDE.md, regla 8): ni categorías ni productos
 * de ejemplo. Lo que se registra en la sesión vive aquí hasta recargar.
 */
import type { CategoriaProducto, DetalleProducto } from "@/domain/tipos";
import type { CatalogoRepo } from "../repositorios";
import { proveedorPorId } from "./proveedores";

const categorias: CategoriaProducto[] = [];
const productos: DetalleProducto[] = [];

const normal = (t: string) => t.trim().toLowerCase();
const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, x) => a + x, 0) / xs.length : 0);

export const catalogoRepoMemoria: CatalogoRepo = {
  async categorias() {
    return categorias;
  },
  async productos(f) {
    const texto = f.texto ? normal(f.texto) : "";
    return productos
      .map((d) => d.producto)
      .filter(
        (p) =>
          (!f.categoriaId || p.categoria.id === f.categoriaId) &&
          (!f.subcategoriaId || p.subcategoria?.id === f.subcategoriaId) &&
          (!f.tipo || p.tipo === f.tipo) &&
          (!texto || [p.numeroParte, p.descripcion, p.marca].some((x) => normal(x).includes(texto)))
      );
  },
  async producto(id) {
    return productos.find((d) => d.producto.id === id) ?? null;
  },
  async crearProducto(d) {
    const parte = d.numeroParte.trim().toUpperCase();
    if (productos.some((x) => x.producto.numeroParte === parte && normal(x.producto.marca) === normal(d.marca))) {
      throw new Error(`El número de parte ${parte} de ${d.marca.trim()} ya está en el catálogo.`);
    }
    const categoria = categorias.find((c) => c.id === d.categoriaId);
    if (!categoria) throw new Error("La categoría elegida ya no existe.");
    const subcategoria = categoria.subcategorias.find((x) => x.id === d.subcategoriaId) ?? null;
    const hoy = new Date().toISOString().slice(0, 10);

    const precios = d.precios.flatMap((x) => {
      const prov = proveedorPorId(x.proveedorId);
      return prov
        ? [{ proveedor: { id: prov.id, nombre: prov.razonSocial }, precio: x.precio, fecha: hoy, entregaDias: x.entregaDias, disponibilidad: x.disponibilidad }]
        : [];
    });
    const costo = promedio(precios.map((x) => x.precio));

    const producto = {
      id: crypto.randomUUID(),
      numeroParte: parte,
      descripcion: d.descripcion.trim(),
      marca: d.marca.trim(),
      categoria: { id: categoria.id, nombre: categoria.nombre },
      subcategoria: subcategoria ? { id: subcategoria.id, nombre: subcategoria.nombre } : null,
      tipo: d.tipo,
      unidadMedida: d.unidadMedida.trim(),
      existencia: null,
      proveedores: precios.length,
      // Sin compras todavía: el último costo y el promedio salen de las cotizaciones capturadas.
      ultimoCosto: precios.length ? Math.min(...precios.map((x) => x.precio)) : 0,
      costoPromedio: costo,
      precioSugerido: d.precioSugerido,
    };
    productos.push({ producto, precios, historicoCosto: [], unidadesCompradasAnio: 0, osDondeSeUso: 0, talleres: [] });

    categoria.total += 1;
    if (subcategoria) subcategoria.total += 1;
    // Quien cotiza un producto surte su categoría.
    for (const x of precios) {
      const p = proveedorPorId(x.proveedor.id);
      if (p && !p.categoriaIds.includes(categoria.id)) p.categoriaIds.push(categoria.id);
    }
    return producto;
  },

  async crearCategoria(nombre) {
    const n = nombre.trim();
    if (categorias.some((c) => normal(c.nombre) === normal(n))) throw new Error(`La categoría "${n}" ya existe.`);
    const categoria: CategoriaProducto = { id: crypto.randomUUID(), nombre: n, total: 0, subcategorias: [] };
    categorias.push(categoria);
    return categoria;
  },

  async crearSubcategoria(categoriaId, nombre) {
    const categoria = categorias.find((c) => c.id === categoriaId);
    if (!categoria) throw new Error("La categoría ya no existe.");
    const n = nombre.trim();
    if (categoria.subcategorias.some((x) => normal(x.nombre) === normal(n))) {
      throw new Error(`"${n}" ya existe en ${categoria.nombre}.`);
    }
    const sub = { id: crypto.randomUUID(), nombre: n, total: 0 };
    categoria.subcategorias.push(sub);
    return sub;
  },
};

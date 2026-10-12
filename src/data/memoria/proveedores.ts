/*
 * Padrón de proveedores en memoria. TEMPORAL: SE BORRA CUANDO EXISTA LA API.
 *
 * Arranca vacío a propósito (CLAUDE.md, regla 8). Lo que se registra en la
 * sesión vive aquí hasta recargar.
 */
import type { DatosProveedor, Proveedor } from "@/domain/tipos/compras";
import type { ProveedorRepo } from "../repositorios";

const proveedores: Proveedor[] = [];

const normal = (t: string) => t.trim().toLowerCase();

/** Para el catálogo de productos, que liga precios a proveedores. */
export const proveedorPorId = (id: string): Proveedor | undefined => proveedores.find((p) => p.id === id);

function revisarRfcUnico(rfc: string, excepto?: string) {
  const otro = proveedores.find((p) => p.rfc === rfc && p.id !== excepto);
  if (otro) throw new Error(`El RFC ${rfc} ya está registrado a nombre de ${otro.razonSocial}.`);
}

function encontrar(id: string): Proveedor {
  const p = proveedorPorId(id);
  if (!p) throw new Error("El proveedor ya no existe.");
  return p;
}

export const proveedorRepoMemoria: ProveedorRepo = {
  async listarProveedores(f) {
    const texto = f.texto ? normal(f.texto) : "";
    return proveedores.filter(
      (p) =>
        (f.incluirInactivos || p.activo) &&
        (!f.categoriaId || p.categoriaIds.includes(f.categoriaId)) &&
        (!texto || [p.razonSocial, p.nombreComercial, p.rfc].some((x) => normal(x).includes(texto)))
    );
  },
  async obtenerProveedor(id) {
    return proveedorPorId(id) ?? null;
  },
  async crearProveedor(d: DatosProveedor) {
    revisarRfcUnico(d.rfc);
    const p: Proveedor = { ...d, id: crypto.randomUUID(), activo: true };
    proveedores.push(p);
    return p;
  },
  async actualizarProveedor(id, d) {
    const p = encontrar(id);
    revisarRfcUnico(d.rfc, id);
    Object.assign(p, d);
    return p;
  },
  async desactivarProveedor(id) {
    const p = encontrar(id);
    p.activo = false;
    return p;
  },
  async reactivarProveedor(id) {
    const p = encontrar(id);
    p.activo = true;
    return p;
  },
};

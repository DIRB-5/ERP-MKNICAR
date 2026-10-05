/*
 * Repositorio genérico de catálogos en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Arranca vacío (CLAUDE.md, regla 8). Lo que se captura vive hasta recargar.
 */
import { CATALOGOS, type ClaveCatalogo } from "@/domain/catalogos";
import type { RegistroCatalogo } from "@/domain/tipos";
import type { CatalogoGenericoRepo } from "../repositorios";

const TODOS = "Todos los talleres";
const registros = new Map<ClaveCatalogo, RegistroCatalogo[]>();
const de = (c: ClaveCatalogo) => registros.get(c) ?? registros.set(c, []).get(c) ?? [];

/** El primer campo requerido de texto hace de llave: no se repite entre activos. */
function revisarDuplicado(c: ClaveCatalogo, valores: RegistroCatalogo["valores"], id?: string): void {
  const llave = CATALOGOS[c].campos.find((x) => x.requerido && x.tipo === "texto");
  if (!llave) return;
  const v = String(valores[llave.clave] ?? "").trim().toLowerCase();
  const otro = de(c).find((r) => r.id !== id && r.activo && String(r.valores[llave.clave] ?? "").trim().toLowerCase() === v);
  if (otro) throw new Error(`Ya existe un registro activo con ${llave.etiqueta.toLowerCase()} "${valores[llave.clave]}".`);
}

export const catalogoGenericoRepoMemoria: CatalogoGenericoRepo = {
  async listar(c, f) {
    const texto = f.texto?.trim().toLowerCase();
    const def = CATALOGOS[c];
    return de(c).filter(
      (r) =>
        (f.incluirInactivos || r.activo) &&
        (!def.porTaller || f.alcance === TODOS || r.tallerId === f.alcance) &&
        (!texto || Object.values(r.valores).some((v) => String(v ?? "").toLowerCase().includes(texto)))
    );
  },
  async obtener(c, id) {
    return de(c).find((r) => r.id === id) ?? null;
  },
  async crear(c, valores, tallerId) {
    revisarDuplicado(c, valores);
    const r: RegistroCatalogo = { id: crypto.randomUUID(), activo: true, tallerId, valores };
    de(c).push(r);
    return r;
  },
  async actualizar(c, id, valores, tallerId) {
    const r = de(c).find((x) => x.id === id);
    if (!r) throw new Error("El registro ya no existe.");
    revisarDuplicado(c, valores, id);
    r.valores = valores;
    r.tallerId = tallerId;
    return r;
  },
  async cambiarActivo(c, id, activo) {
    const r = de(c).find((x) => x.id === id);
    if (!r) throw new Error("El registro ya no existe.");
    if (activo) revisarDuplicado(c, r.valores, id);
    r.activo = activo;
  },
};

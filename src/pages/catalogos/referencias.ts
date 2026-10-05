import { useQueries } from "@tanstack/react-query";
import { CATALOGOS, type CatalogoDef, type ClaveCatalogo } from "@/domain/catalogos";
import { catalogoGenericoRepo } from "@/data";
import { etiquetaRegistro } from "./valores";

/**
 * Registros de los catálogos que este referencia, como id → etiqueta. Incluye
 * los dados de baja: un registro viejo puede apuntar a uno ya inactivo.
 */
export function useReferencias(def: CatalogoDef, alcance: string): Map<string, string> {
  const refs = [
    ...new Set(def.campos.flatMap((c) => (c.tipo === "referencia" && c.catalogoRef ? [c.catalogoRef] : []))),
  ] as ClaveCatalogo[];
  const consultas = useQueries({
    queries: refs.map((ref) => ({
      queryKey: ["catalogos", ref, "lista", { alcance, incluirInactivos: true }],
      queryFn: () => catalogoGenericoRepo.listar(ref, { alcance, incluirInactivos: true }),
    })),
  });
  const mapa = new Map<string, string>();
  consultas.forEach((q, i) => {
    const ref = refs[i];
    if (!ref || !CATALOGOS[ref]) return;
    for (const r of q.data ?? []) mapa.set(r.id, etiquetaRegistro(ref, r));
  });
  return mapa;
}

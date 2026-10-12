import { eventosDe, vigente, type EventoOS } from "@/domain/bitacora";
import type { ArchivoAdjunto } from "@/domain/tipos/compras";
import { usuarioActual } from "@/app/sesion";

/**
 * Archivos elegidos en el navegador. Sin API viven como URL local de la
 * sesión; la API devolverá la suya al subirlos.
 */
export const aAdjuntos = (files: FileList | null): ArchivoAdjunto[] =>
  files ? Array.from(files).map((f) => ({ nombre: f.name, url: URL.createObjectURL(f) })) : [];

export interface OpcionTecnico {
  id: string;
  nombre: string;
}

/**
 * Técnicos que se pueden elegir mientras no exista el catálogo de personal:
 * el usuario de la sesión y los que ya trabajaron en esta O.S. El id del
 * técnico es lo que compara la regla de calidad (quien libera ≠ quien reparó).
 */
export function opcionesTecnico(eventos: readonly EventoOS[]): OpcionTecnico[] {
  const vistos = new Map<string, string>();
  const yo = usuarioActual();
  if (yo.id) vistos.set(yo.id, `${yo.nombre} (tú)`);
  for (const e of eventosDe(eventos, "tecnico_asignado")) {
    const c = vigente(e, eventos).carga;
    if (!vistos.has(c.tecnicoId)) vistos.set(c.tecnicoId, c.tecnicoNombre);
  }
  for (const e of eventosDe(eventos, "mano_obra_cargada")) {
    if (!vistos.has(e.carga.tecnicoId)) vistos.set(e.carga.tecnicoId, e.carga.tecnicoNombre);
  }
  return [...vistos].map(([id, nombre]) => ({ id, nombre }));
}

/** Técnico escrito a mano, sin cuenta en el sistema: su id sale del nombre. */
export const tecnicoPorNombre = (nombre: string): OpcionTecnico => ({
  id: `nombre:${nombre.trim().toLowerCase()}`,
  nombre: nombre.trim(),
});

export const OTRO = "__otro__";

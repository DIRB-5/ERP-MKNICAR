import { ESTADO, type EstadoOS } from "@/domain/estados";

/**
 * Columnas del kanban y de los tableros: los estatus abiertos de la O.S., en
 * el orden del ciclo. Con nueve estatus ya no hace falta agruparlos.
 */
export const ETAPAS = [
  "programacion",
  "diagnostico",
  "cotizar",
  "pendiente_autorizacion",
  "autorizado_compra",
  "en_reparacion",
  "remision",
] as const satisfies readonly EstadoOS[];

export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL = Object.fromEntries(ETAPAS.map((e) => [e, ESTADO[e].label])) as Record<Etapa, string>;

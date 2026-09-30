import { useQuery } from "@tanstack/react-query";
import type { Etapa } from "./etapas";

export type Prioridad = "critica" | "alta" | "normal";

export interface TarjetaOrden {
  folio: string;
  placa: string;
  modelo: string;
  cliente: string;
  /** Monto presupuestado o estimado de la O.S. */
  monto: number;
  /** Días en el estado actual. */
  dias: number;
  taller: string;
  asesor: string;
  prioridad: Prioridad;
  /** Nota corta del estado: "3 recordatorios enviados". */
  detalle: string;
}

export interface ColumnaKanban {
  /** Total de O.S. en la etapa; las tarjetas pueden venir recortadas. */
  conteo: number;
  monto: number;
  tarjetas: TarjetaOrden[];
}

export type KanbanOrdenes = Record<Etapa, ColumnaKanban>;

/**
 * O.S. abiertas agrupadas por etapa, acotadas al taller activo.
 * Deshabilitado hasta que exista el contrato con el backend.
 */
export function useKanbanOrdenes(taller: string): KanbanOrdenes | undefined {
  const { data } = useQuery({
    queryKey: ["ordenes", "kanban", taller],
    queryFn: (): Promise<KanbanOrdenes> => {
      throw new Error("Endpoint del kanban de O.S. pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

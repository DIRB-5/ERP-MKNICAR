import { useQuery } from "@tanstack/react-query";
import type { EstadoOS } from "@/domain/estados";
import type { Etapa } from "./etapas";
import type { Prioridad } from "./useKanbanOrdenes";

/** Filtros de la lista. Se resuelven en el backend, no sobre una página ya cargada. */
export interface FiltrosOrdenes {
  etapa?: Etapa;
  estado?: EstadoOS;
  prioridad?: Prioridad;
  cliente?: string;
  asesor?: string;
  /** Fecha de ingreso de la unidad, AAAA-MM-DD. */
  desde?: string;
  hasta?: string;
}

export interface FilaOrden {
  folio: string;
  placa: string;
  modelo: string;
  cliente: string;
  estado: EstadoOS;
  /** Días en el estado actual. */
  dias: number;
  monto: number;
  asesor: string;
  taller: string;
  prioridad: Prioridad;
  /** Entrega comprometida, ISO 8601. */
  entrega: string | null;
}

export interface PaginaOrdenes {
  total: number;
  filas: FilaOrden[];
}

export const TAMANO_PAGINA = 50;

/**
 * Lista paginada de O.S. del taller activo con filtros.
 * Deshabilitado hasta que exista el contrato con el backend.
 */
export function useOrdenes(
  taller: string,
  filtros: FiltrosOrdenes,
  pagina: number
): PaginaOrdenes | undefined {
  const { data } = useQuery({
    queryKey: ["ordenes", "lista", taller, filtros, pagina],
    queryFn: (): Promise<PaginaOrdenes> => {
      throw new Error("Endpoint de lista de O.S. pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

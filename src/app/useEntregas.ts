import { useQuery } from "@tanstack/react-query";

export type SituacionEntrega = "lista" | "en_proceso" | "en_riesgo" | "entregada";

export interface EntregaComprometida {
  folio: string;
  placa: string;
  modelo: string;
  cliente: string;
  /** Fecha comprometida, AAAA-MM-DD. */
  fecha: string;
  situacion: SituacionEntrega;
}

/**
 * Entregas comprometidas de un mes (AAAA-MM) en el taller activo.
 * Deshabilitado hasta que exista el contrato con el backend.
 */
export function useEntregas(taller: string, mes: string): EntregaComprometida[] | undefined {
  const { data } = useQuery({
    queryKey: ["ordenes", "entregas", taller, mes],
    queryFn: (): Promise<EntregaComprometida[]> => {
      throw new Error("Endpoint de entregas comprometidas pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

import { useQuery } from "@tanstack/react-query";

/**
 * Contador del menú de Órdenes de Servicio, acotado al taller activo.
 *
 * Deshabilitado hasta que exista el contrato con el backend y se acuerde con
 * el cliente qué cuenta (O.S. abiertas, detenidas en un punto de espera o
 * asignadas al rol). Mientras tanto devuelve `undefined` y el menú no
 * muestra badge: un número inventado es peor que ninguno.
 */
export function useConteoOrdenes(taller: string): number | undefined {
  const { data } = useQuery({
    queryKey: ["ordenes", "conteo", taller],
    queryFn: (): Promise<number> => {
      throw new Error("Endpoint de conteo de O.S. pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

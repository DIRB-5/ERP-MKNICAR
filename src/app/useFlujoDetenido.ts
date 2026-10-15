import { useQuery } from "@tanstack/react-query";
import type { DatosFlujo } from "@/components/AlertaFlujo/AlertaFlujo";

/** Los tres puntos medibles: el cliente en la O.S.; Dirección y Tesorería en sus O.C. */
export type FlujoDetenido = Record<"cliente" | "direccion" | "tesoreria", DatosFlujo>;

/**
 * Conteo, antigüedad promedio y monto detenido en los tres puntos de espera,
 * acotado al taller activo.
 *
 * Deshabilitado hasta que exista el contrato con el backend: devuelve
 * `undefined` y las tarjetas muestran guiones.
 */
export function useFlujoDetenido(taller: string): FlujoDetenido | undefined {
  const { data } = useQuery({
    queryKey: ["tableros", "flujo-detenido", taller],
    queryFn: (): Promise<FlujoDetenido> => {
      throw new Error("Endpoint de flujo detenido pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

import { useQuery } from "@tanstack/react-query";
import type { Etapa } from "./etapas";

/** Variaciones contra el mes anterior: porcentaje, salvo donde se indica. */
export interface KpisDireccion {
  ingresoMes: number;
  ingresoVariacion: number;
  /** Margen y su variación en puntos porcentuales. */
  margenBruto: number;
  margenVariacionPts: number;
  ticketPromedio: number;
  ticketVariacion: number;
  cicloPromedioDias: number;
  cicloVariacionDias: number;
  unidadesAtendidas: number;
  unidadesVariacion: number;
}

export interface IngresoTaller {
  taller: string;
  facturado: number;
  porFacturar: number;
  meta: number;
}

export { ETAPAS, type Etapa } from "./etapas";

export interface OsPorEtapa {
  conteo: Record<Etapa, number>;
  detenidasPorTerceros: number;
  enPisoDeTaller: number;
}

export interface FilaRankingTaller {
  taller: string;
  osActivas: number;
  ingresoMes: number;
  margen: number;
  cicloPromedioDias: number;
  /** Porcentaje de la meta mensual alcanzado. */
  cumplimientoMeta: number;
}

export interface FilaClienteTop {
  id: string;
  cliente: string;
  unidadesEnAdministracion: number;
  osDelMes: number;
  facturado: number;
  saldoVencido: number;
}

export interface CarteraCxc {
  total: number;
  vencidoMas60: number;
  diasCartera: number;
  tramos: { d0a30: number; d31a60: number; d61a90: number; mas90: number };
}

/** Cada sección llega por separado: una sin datos no vacía a las demás. */
export interface TableroDireccion {
  kpis?: KpisDireccion;
  ingresoPorTaller?: IngresoTaller[];
  osPorEtapa?: OsPorEtapa;
  ranking?: FilaRankingTaller[];
  topClientes?: FilaClienteTop[];
  cuentasPorCobrar?: CarteraCxc;
}

/**
 * Datos del tablero de Dirección General, acotados al taller activo.
 * Deshabilitado hasta que exista el contrato con el backend.
 */
export function useTableroDireccion(taller: string): TableroDireccion | undefined {
  const { data } = useQuery({
    queryKey: ["tableros", "direccion", taller],
    queryFn: (): Promise<TableroDireccion> => {
      throw new Error("Endpoint del tablero de Dirección pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

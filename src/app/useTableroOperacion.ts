import { useQuery } from "@tanstack/react-query";
import type { EstadoOS } from "@/domain/estados";

export interface EstadoPiso {
  unidadesEnPiso: number;
  ingresaronHoy: number;
  sinDiagnostico: number;
  bahiasOcupadas: number;
  bahiasTotales: number;
  osAbiertas: number;
  osBloqueadas: number;
  osMasDe5Dias: number;
  entregasHoy: number;
  entregasListas: number;
  entregasEnRiesgo: number;
}

export interface UnidadEnPiso {
  folio: string;
  placa: string;
  modelo: string;
  cliente: string;
  estado: EstadoOS;
  estadiaDias: number;
  /** Motivo del bloqueo; null si avanza. */
  bloqueo: string | null;
  tecnico: string | null;
  /** Fecha comprometida de entrega, ISO 8601. */
  entrega: string | null;
}

export interface CargaTecnico {
  id: string;
  nombre: string;
  osAsignadas: number;
  horasComprometidas: number;
  horasDisponibles: number;
}

export interface RefaccionCritica {
  id: string;
  descripcion: string;
  numeroParte: string;
  folioOs: string;
  proveedor: string;
  esperaDias: number;
  /** ISO 8601. */
  llegadaEstimada: string | null;
}

export interface Calidad {
  retrabajosSemana: number;
  cumplimientoEntrega: number;
  metaCumplimientoEntrega: number;
  diagnosticoPromedioHoras: number;
  diagnosticoVariacionHoras: number;
  diagnosticosUltimos7Dias: number;
}

export interface AccionPendiente {
  id: string;
  texto: string;
  contexto: string;
  accion: string;
  to: string;
}

export interface TurnoHoy {
  tecnicosPresentes: number;
  tecnicosTotales: number;
  horasDisponibles: number;
  citasRecepcion: number;
}

export interface TableroOperacion {
  piso?: EstadoPiso;
  unidades?: UnidadEnPiso[];
  cargaTecnicos?: CargaTecnico[];
  refacciones?: RefaccionCritica[];
  calidad?: Calidad;
  acciones?: AccionPendiente[];
  turno?: TurnoHoy;
}

/**
 * Datos del tablero de Operación del taller activo.
 * Deshabilitado hasta que exista el contrato con el backend.
 */
export function useTableroOperacion(taller: string): TableroOperacion | undefined {
  const { data } = useQuery({
    queryKey: ["tableros", "operacion", taller],
    queryFn: (): Promise<TableroOperacion> => {
      throw new Error("Endpoint del tablero de Operación pendiente de contrato.");
    },
    enabled: false,
  });
  return data;
}

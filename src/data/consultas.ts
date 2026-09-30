import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DatosAltaCliente,
  DatosAltaOS,
  DatosAltaRapidaUnidad,
  DatosAltaUnidad,
  DatosRecepcion,
} from "@/domain/tipos";
import { clienteRepo, ordenServicioRepo, unidadRepo } from "./index";
import type { FiltrosClientes, FiltrosUnidades } from "./repositorios";

export const useClientes = (f: FiltrosClientes) =>
  useQuery({ queryKey: ["clientes", "lista", f], queryFn: () => clienteRepo.listar(f) });

export const useCliente = (id: string) =>
  useQuery({ queryKey: ["clientes", id], queryFn: () => clienteRepo.obtener(id) });

export const useUnidadesDeCliente = (id: string) =>
  useQuery({ queryKey: ["clientes", id, "unidades"], queryFn: () => clienteRepo.unidadesDe(id) });

export const useOrdenesDeCliente = (id: string) =>
  useQuery({ queryKey: ["clientes", id, "ordenes"], queryFn: () => clienteRepo.ordenesDe(id) });

export const useUnidades = (f: FiltrosUnidades) =>
  useQuery({ queryKey: ["unidades", "lista", f], queryFn: () => unidadRepo.listar(f) });

export const useExpedienteUnidad = (placas: string) =>
  useQuery({ queryKey: ["unidades", placas], queryFn: () => unidadRepo.obtener(placas) });

export const useHistorialUnidad = (placas: string) =>
  useQuery({ queryKey: ["unidades", placas, "historial"], queryFn: () => unidadRepo.historialDe(placas) });

/* ── Órdenes de servicio: ingresos y recepción ─────────────────────── */

const claveDia = (d: Date) => d.toDateString();

export const useIngresosDelDia = (tallerId: string, fecha: Date) =>
  useQuery({
    queryKey: ["ordenes", "ingresos", tallerId, claveDia(fecha)],
    queryFn: () => ordenServicioRepo.ingresosDelDia(tallerId, fecha),
  });

export const useIngreso = (folio: string) =>
  useQuery({ queryKey: ["ordenes", "ingreso", folio], queryFn: () => ordenServicioRepo.obtener(folio) });

/** Tras escribir, todo lo que muestra O.S. o unidades puede haber cambiado. */
function useInvalidar() {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["ordenes"] }),
      qc.invalidateQueries({ queryKey: ["unidades"] }),
      qc.invalidateQueries({ queryKey: ["clientes"] }),
    ]);
}

export function useCrearOS() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: (d: DatosAltaOS) => ordenServicioRepo.crear(d), onSuccess: invalidar });
}

export function useRecibirOS() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (v: { folio: string; datos: DatosRecepcion }) => ordenServicioRepo.recibir(v.folio, v.datos),
    onSuccess: invalidar,
  });
}

export function useIngresoDirecto() {
  const invalidar = useInvalidar();
  return useMutation({
    mutationFn: (v: { alta: DatosAltaOS; recepcion: DatosRecepcion }) =>
      ordenServicioRepo.ingresoDirecto(v.alta, v.recepcion),
    onSuccess: invalidar,
  });
}

export function useAltaRapidaUnidad() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: (d: DatosAltaRapidaUnidad) => unidadRepo.altaRapida(d), onSuccess: invalidar });
}

export function useCrearCliente() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: (d: DatosAltaCliente) => clienteRepo.crear(d), onSuccess: invalidar });
}

export function useCrearUnidad() {
  const invalidar = useInvalidar();
  return useMutation({ mutationFn: (d: DatosAltaUnidad) => unidadRepo.crear(d), onSuccess: invalidar });
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  DatosAltaCliente,
  DatosAltaOS,
  DatosAltaProducto,
  DatosAltaProveedor,
  DatosAltaTecnico,
  DatosAltaRapidaUnidad,
  DatosAltaUnidad,
  DatosRecepcion,
} from "@/domain/tipos";
import { catalogoRepo, clienteRepo, ordenServicioRepo, personalRepo, tesoreriaRepo, unidadRepo } from "./index";
import type { FiltrosClientes, FiltrosProductos, FiltrosProveedores, FiltrosUnidades } from "./repositorios";

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

/* ── Tesorería ───────────────────────────────────────────────────── */

export const useDashboardFinanciero = (alcance: string, periodo: string) =>
  useQuery({
    queryKey: ["tesoreria", "dashboard", alcance, periodo],
    queryFn: () => tesoreriaRepo.dashboard(alcance, periodo),
  });

export const useCuentasPorPagar = (alcance: string) =>
  useQuery({ queryKey: ["tesoreria", "cxp", alcance], queryFn: () => tesoreriaRepo.cuentasPorPagar(alcance) });

export const useCuentasPorCobrar = (alcance: string) =>
  useQuery({ queryKey: ["tesoreria", "cxc", alcance], queryFn: () => tesoreriaRepo.cuentasPorCobrar(alcance) });

/* ── Catálogo de proveedores y productos ─────────────────────────── */

export const useCategorias = () =>
  useQuery({ queryKey: ["catalogo", "categorias"], queryFn: () => catalogoRepo.categorias() });

export const useProductos = (f: FiltrosProductos) =>
  useQuery({ queryKey: ["catalogo", "productos", f], queryFn: () => catalogoRepo.productos(f) });

export const useProducto = (id: string) =>
  useQuery({ queryKey: ["catalogo", "producto", id], queryFn: () => catalogoRepo.producto(id), enabled: id !== "" });

export const useProveedores = (f: FiltrosProveedores) =>
  useQuery({ queryKey: ["catalogo", "proveedores", f], queryFn: () => catalogoRepo.proveedores(f) });

export const useProveedor = (id: string) =>
  useQuery({ queryKey: ["catalogo", "proveedor", id], queryFn: () => catalogoRepo.proveedor(id), enabled: id !== "" });

export function useCrearProveedor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DatosAltaProveedor) => catalogoRepo.crearProveedor(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["catalogo"] }),
  });
}

function useInvalidarCatalogo() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: ["catalogo"] });
}

export function useCrearProducto() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({ mutationFn: (d: DatosAltaProducto) => catalogoRepo.crearProducto(d), onSuccess: invalidar });
}

export function useCrearCategoria() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({ mutationFn: (nombre: string) => catalogoRepo.crearCategoria(nombre), onSuccess: invalidar });
}

export function useCrearSubcategoria() {
  const invalidar = useInvalidarCatalogo();
  return useMutation({
    mutationFn: (v: { categoriaId: string; nombre: string }) => catalogoRepo.crearSubcategoria(v.categoriaId, v.nombre),
    onSuccess: invalidar,
  });
}

/* ── Personal ────────────────────────────────────────────────────── */

export const useDashboardPersonal = (alcance: string, periodo: string) =>
  useQuery({
    queryKey: ["personal", "dashboard", alcance, periodo],
    queryFn: () => personalRepo.dashboard(alcance, periodo),
  });

export const usePerfilTecnico = (id: string) =>
  useQuery({ queryKey: ["personal", "tecnico", id], queryFn: () => personalRepo.tecnico(id) });

export const useReceptores = (tallerId: string) =>
  useQuery({
    queryKey: ["personal", "receptores", tallerId],
    queryFn: () => personalRepo.receptores(tallerId),
    enabled: tallerId !== "",
  });

export function useCrearTecnico() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: DatosAltaTecnico) => personalRepo.crearTecnico(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["personal"] }),
  });
}

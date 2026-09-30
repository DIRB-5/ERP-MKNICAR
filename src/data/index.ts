import type { ClienteRepo, OrdenServicioRepo, UnidadRepo } from "./repositorios";
import { clienteRepoMemoria } from "./memoria/clientes";
import { unidadRepoMemoria } from "./memoria/unidades";
import { ordenServicioRepoMemoria } from "./memoria/ordenes";

/** Punto único de cambio: cuando exista la API, aquí se conecta su implementación. */
export const clienteRepo: ClienteRepo = clienteRepoMemoria;
export const unidadRepo: UnidadRepo = unidadRepoMemoria;
export const ordenServicioRepo: OrdenServicioRepo = ordenServicioRepoMemoria;

export type {
  ClienteRepo,
  UnidadRepo,
  OrdenServicioRepo,
  FiltrosClientes,
  FiltrosUnidades,
} from "./repositorios";

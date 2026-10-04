import type {
  CatalogoRepo,
  ClienteRepo,
  CompraRepo,
  OrdenServicioRepo,
  PersonalRepo,
  TesoreriaRepo,
  UnidadRepo,
} from "./repositorios";
import { clienteRepoMemoria } from "./memoria/clientes";
import { unidadRepoMemoria } from "./memoria/unidades";
import { ordenServicioRepoMemoria } from "./memoria/ordenes";
import { tesoreriaRepoMemoria } from "./memoria/tesoreria";
import { catalogoRepoMemoria } from "./memoria/catalogo";
import { personalRepoMemoria } from "./memoria/personal";
import { compraRepoMemoria } from "./memoria/compras";

/** Punto único de cambio: cuando exista la API, aquí se conecta su implementación. */
export const clienteRepo: ClienteRepo = clienteRepoMemoria;
export const unidadRepo: UnidadRepo = unidadRepoMemoria;
export const ordenServicioRepo: OrdenServicioRepo = ordenServicioRepoMemoria;
export const tesoreriaRepo: TesoreriaRepo = tesoreriaRepoMemoria;
export const catalogoRepo: CatalogoRepo = catalogoRepoMemoria;
export const personalRepo: PersonalRepo = personalRepoMemoria;
export const compraRepo: CompraRepo = compraRepoMemoria;

export type {
  ClienteRepo,
  UnidadRepo,
  OrdenServicioRepo,
  TesoreriaRepo,
  CatalogoRepo,
  PersonalRepo,
  CompraRepo,
  FiltrosActivas,
  FiltrosClientes,
  FiltrosProductos,
  FiltrosProveedores,
  FiltrosUnidades,
} from "./repositorios";

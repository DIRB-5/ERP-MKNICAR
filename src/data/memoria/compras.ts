/*
 * Repositorio de compras en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Vacío a propósito (CLAUDE.md, regla 8): ni requisiciones ni cotizaciones de ejemplo.
 */
import type { CompraRepo } from "../repositorios";

export const compraRepoMemoria: CompraRepo = {
  async comparativos() {
    return [];
  },
  async comparativo() {
    return null;
  },
};

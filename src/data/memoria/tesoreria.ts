/*
 * Repositorio de tesorería en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Vacío a propósito (CLAUDE.md, regla 8): las pantallas muestran su estado vacío.
 */
import type { TesoreriaRepo } from "../repositorios";

export const tesoreriaRepoMemoria: TesoreriaRepo = {
  async dashboard() {
    return {
      resumen: null,
      meses: [],
      indicadores: null,
      cartera: null,
      flujo: [],
      porFacturar: [],
      vencimientos: [],
      proveedores: [],
    };
  },
  async cuentasPorPagar() {
    return [];
  },
  async cuentasPorCobrar() {
    return { clientes: [], acciones: [], gestiones: [] };
  },
};

/*
 * Repositorio de personal en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Vacío a propósito (CLAUDE.md, regla 8). El módulo de personal está fuera de
 * la fase 1: la pantalla existe para que el cliente la vea, sin datos.
 */
import type { PersonalRepo } from "../repositorios";

export const personalRepoMemoria: PersonalRepo = {
  async dashboard() {
    return {
      resumen: null,
      talleres: [],
      puestos: [],
      antiguedadPromedioAnios: null,
      rotacionAnual: null,
      capacidad: [],
      certificaciones: [],
      tecnicos: [],
    };
  },
  async tecnico() {
    return null;
  },
  async receptores() {
    return [];
  },
};

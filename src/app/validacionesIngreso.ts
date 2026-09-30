import type { OrdenHistorial, Unidad } from "@/domain/tipos";
import { fecha, numero } from "@/domain/format";
import { diasEntre, fechaLocal } from "./fechas";

/**
 * Umbrales para advertir un salto de kilometraje improbable. Solo advierten,
 * nunca bloquean: el vehículo ya está en el taller.
 */
export const KM_MAXIMO_POR_DIA = 1_000;
export const KM_SALTO_MAXIMO = 50_000;

export interface Revision {
  error?: string;
  advertencia?: string;
}

export function revisarKilometraje(km: number, unidad: Unidad | null, cuando: Date): Revision {
  // Sin lectura previa (p. ej. alta rápida) no hay contra qué comparar.
  if (!unidad || unidad.kilometrajeUltimo <= 0) return {};
  const anterior = unidad.kilometrajeUltimo;
  if (km < anterior) {
    return {
      error: `No puede ser menor al último registrado: ${numero(anterior)} km. Si el odómetro se cambió, anótalo en objetos o daños y avisa a tu supervisor.`,
    };
  }
  const salto = km - anterior;
  const dias = Math.max(1, diasEntre(fechaLocal(unidad.fechaKilometraje), cuando));
  if (salto > KM_SALTO_MAXIMO || salto / dias > KM_MAXIMO_POR_DIA) {
    return {
      advertencia: `Son ${numero(salto)} km más que la última lectura, hace ${numero(dias)} ${dias === 1 ? "día" : "días"}. Confirma que el número sea correcto.`,
    };
  }
  return {};
}

/**
 * Retrabajo o garantía: la O.S. padre debe estar cerrada y dentro de su
 * garantía. La vigencia la calcula el backend por tipo de servicio.
 */
export function revisarOsPadre(padre: OrdenHistorial | undefined, hoy: Date): Revision {
  if (!padre) return { error: "Elige la O.S. original." };
  if (padre.estado !== "cerrada") {
    return { error: `La O.S. ${padre.folio} no está cerrada: no puede ser origen de un retrabajo.` };
  }
  if (!padre.garantiaVigenteHasta) {
    return { advertencia: `La O.S. ${padre.folio} no trae fecha de garantía; confirma la vigencia con tu supervisor.` };
  }
  if (fechaLocal(padre.garantiaVigenteHasta) < new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())) {
    return { error: `La garantía de la O.S. ${padre.folio} venció el ${fecha(fechaLocal(padre.garantiaVigenteHasta), { anio: true })}.` };
  }
  return {};
}

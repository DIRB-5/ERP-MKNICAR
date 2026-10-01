import type { NivelHabilidad } from "@/domain/tipos";

/**
 * Nivel a partir del puntaje de 0 a 100. Cortes tomados del prototipo
 * aprobado; confirmar con RRHH antes de que el backend los fije.
 */
export function nivelPorPuntaje(valor: number): NivelHabilidad {
  if (valor >= 90) return "experto";
  if (valor >= 70) return "avanzado";
  if (valor >= 50) return "intermedio";
  return "basico";
}

/** Por debajo de este puntaje, la habilidad es una brecha que limita asignaciones. */
export const UMBRAL_BRECHA = 60;

export const NIVEL_LABEL: Record<NivelHabilidad, string> = {
  experto: "Experto",
  avanzado: "Avanzado",
  intermedio: "Intermedio",
  basico: "Básico",
};

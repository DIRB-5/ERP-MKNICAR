/**
 * Contexto de sesión: usuario, rol y taller. PENDIENTE (ver CLAUDE.md): hoy no
 * hay sesión, así que no hay usuario. Quien lo consuma debe mostrar el hueco,
 * no inventar un nombre.
 */
export interface Sesion {
  usuarioId: string | null;
  nombre: string | null;
  /** Taller al que pertenece el usuario; null si no hay sesión. */
  tallerId: string | null;
}

export const useSesion = (): Sesion => ({ usuarioId: null, nombre: null, tallerId: null });

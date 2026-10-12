/**
 * Usuario de la sesión. PROVISIONAL: el contexto de sesión (usuario, rol y
 * taller activo) sigue pendiente del contrato con el backend.
 *
 * Mientras tanto no hay usuario: `id` vacío. Lo que dependa de saber quién es
 * (por ejemplo, que quien libera calidad no sea quien reparó) se deshabilita
 * con la razón visible en lugar de suponer.
 */
export interface UsuarioSesion {
  id: string;
  nombre: string;
}

const SIN_SESION: UsuarioSesion = { id: "", nombre: "Sin sesión" };

let actual: UsuarioSesion = SIN_SESION;

export const usuarioActual = (): UsuarioSesion => actual;

export const haySesion = (): boolean => actual.id !== "";

/** Solo para desarrollo (dev/muestra.ts) hasta que exista el inicio de sesión. */
export const fijarSesion = (u: UsuarioSesion) => {
  actual = u;
};

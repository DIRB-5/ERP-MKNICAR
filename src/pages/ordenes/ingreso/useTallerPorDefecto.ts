import { useTaller } from "@/app/useTaller";
import { useSesion } from "@/app/useSesion";
import { TALLERES } from "@/app/navegacion";

/** Taller por defecto: el del usuario; mientras no hay sesión, el del encabezado. */
export function useTallerPorDefecto(): string {
  const sesion = useSesion();
  const encabezado = useTaller();
  return sesion.tallerId ?? (encabezado === TALLERES[0] ? "" : encabezado);
}

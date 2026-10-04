/**
 * Interruptor de los datos de muestra. Aquí no hay datos (CLAUDE.md, regla 8):
 * viven en dev/muestra.ts, fuera de src/, y solo se cargan en desarrollo.
 *
 * Se activa abriendo la app con ?muestra y se quita con ?muestra=0. Se recuerda
 * mientras dure la pestaña para sobrevivir a recargas.
 */
const CLAVE = "erp-mknicar:muestra";
let activa = false;

export function quiereMuestra(): boolean {
  const param = new URLSearchParams(window.location.search).get("muestra");
  try {
    if (param === "0") sessionStorage.removeItem(CLAVE);
    else if (param !== null) sessionStorage.setItem(CLAVE, "1");
    return sessionStorage.getItem(CLAVE) === "1";
  } catch {
    // Sin sessionStorage (modo privado estricto): solo cuenta el parámetro.
    return param !== null && param !== "0";
  }
}

export const marcarMuestra = () => {
  activa = true;
};

export const muestraActiva = () => activa;

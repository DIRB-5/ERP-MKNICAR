/** CURP: 18 caracteres con sexo (H, M o X) en la posición 11. Valida forma, no existencia en RENAPO. */
const CURP = /^[A-Z]{4}\d{6}[HMX][A-Z]{5}[A-Z\d]\d$/;

export const curpValida = (c: string) => CURP.test(c.trim().toUpperCase());

/**
 * NSS del IMSS: 11 dígitos; el último es verificador (algoritmo de Luhn sobre
 * los primeros 10).
 */
export function nssValido(nss: string): boolean {
  const d = nss.replace(/\D/g, "");
  if (d.length !== 11) return false;
  const suma = [...d.slice(0, 10)].reduce((a, c, i) => {
    const n = Number(c) * (i % 2 === 0 ? 1 : 2);
    return a + (n > 9 ? n - 9 : n);
  }, 0);
  return (10 - (suma % 10)) % 10 === Number(d[10]);
}

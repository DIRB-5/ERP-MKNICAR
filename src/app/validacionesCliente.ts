/**
 * RFC mexicano: 3 letras (persona moral) o 4 (persona física), fecha AAMMDD
 * y homoclave de 3. Valida forma, no existencia ante el SAT.
 */
const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z\d]{3}$/;

export const normalizarRfc = (rfc: string) => rfc.trim().toUpperCase().replace(/[\s-]/g, "");

export function revisarRfc(rfc: string): string | undefined {
  const r = normalizarRfc(rfc);
  if (!r) return "Captura el RFC.";
  if (!RFC.test(r)) return "El RFC no tiene un formato válido: 12 caracteres para persona moral, 13 para física.";
  const [, aa = "", mm = "", dd = ""] = r.match(/^[A-ZÑ&]{3,4}(\d{2})(\d{2})(\d{2})/) ?? [];
  const mes = Number(mm);
  const dia = Number(dd);
  if (!aa || mes < 1 || mes > 12 || dia < 1 || dia > 31) return "La fecha dentro del RFC no es válida.";
  return undefined;
}

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const correoValido = (c: string) => CORREO.test(c.trim());

/** Diez dígitos nacionales; se toleran espacios, guiones y el prefijo +52. */
export function telefonoValido(t: string): boolean {
  const d = t.replace(/[^\d]/g, "").replace(/^52(?=\d{10}$)/, "");
  return d.length === 10;
}

/** Código postal mexicano: cinco dígitos. CFDI 4.0 lo exige en el domicilio fiscal. */
export const codigoPostalValido = (cp: string) => /^\d{5}$/.test(cp.trim());

/**
 * CLABE: 18 dígitos; el último es verificador (pesos 3, 7, 1 sobre los
 * primeros 17). Detecta la mayoría de los errores de captura.
 */
export function clabeValida(clabe: string): boolean {
  const d = clabe.replace(/\s/g, "");
  if (!/^\d{18}$/.test(d)) return false;
  const pesos = [3, 7, 1];
  const suma = [...d.slice(0, 17)].reduce((a, c, i) => a + ((Number(c) * (pesos[i % 3] ?? 1)) % 10), 0);
  return (10 - (suma % 10)) % 10 === Number(d[17]);
}

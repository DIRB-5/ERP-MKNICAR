/** VIN: 17 caracteres; nunca I, O ni Q, para no confundirlos con 1 y 0. */
const VIN = /^[A-HJ-NPR-Z\d]{17}$/;

export const normalizarPlacas = (p: string) => p.trim().toUpperCase().replace(/\s+/g, "");

export function revisarPlacas(p: string): string | undefined {
  const n = normalizarPlacas(p);
  if (!n) return "Captura las placas.";
  if (!/^[A-Z\d-]{5,10}$/.test(n)) return "Solo letras, números y guiones (5 a 10 caracteres).";
  return undefined;
}

export function revisarVin(v: string): string | undefined {
  const n = v.trim().toUpperCase();
  if (!n) return "Captura el VIN (número de serie).";
  if (n.length !== 17) return `El VIN tiene 17 caracteres; llevas ${n.length}.`;
  if (!VIN.test(n)) return "El VIN no lleva las letras I, O ni Q.";
  return undefined;
}

export function revisarAnio(a: string): string | undefined {
  const n = Number(a);
  const max = new Date().getFullYear() + 1;
  if (!a) return "Captura el año modelo.";
  if (!Number.isInteger(n) || n < 1950 || n > max) return `Debe estar entre 1950 y ${max}.`;
  return undefined;
}

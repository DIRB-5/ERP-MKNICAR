const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MXN_ENTERO = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const NUM = new Intl.NumberFormat("es-MX");

/** $34,780.00 — un saldo negativo va entre paréntesis. */
export function moneda(valor: number, opts?: { entero?: boolean }): string {
  const fmt = opts?.entero ? MXN_ENTERO : MXN;
  return valor < 0 ? `(${fmt.format(Math.abs(valor))})` : fmt.format(valor);
}

export const numero = (valor: number): string => NUM.format(valor);

const MENOS = "\u2212"; // U+2212, no un guion

/** +41.7% / −9.1% — siempre con signo explícito. */
export function porcentaje(valor: number, decimales = 1): string {
  const abs = Math.abs(valor).toFixed(decimales);
  if (valor > 0) return `+${abs}%`;
  if (valor < 0) return `${MENOS}${abs}%`;
  return `${abs}%`;
}

/** Puntos porcentuales: +1.8 pts / −1.8 pts */
export function puntos(valor: number, decimales = 1): string {
  const abs = Math.abs(valor).toFixed(decimales);
  const signo = valor > 0 ? "+" : valor < 0 ? MENOS : "";
  return `${signo}${abs} pts`;
}

/** Un decimal solo cuando lleva menos de un día: 0.4 d · 7 d */
export const dias = (valor: number): string =>
  valor < 1 ? valor.toFixed(1) : String(Math.round(valor));

const HORA = new Intl.DateTimeFormat("es-MX", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const MES = new Intl.DateTimeFormat("es-MX", { month: "short" });

/**
 * 22 ago · 22 ago 2026 — nunca numérica ambigua.
 *
 * Se arma por partes: el formato de Intl para es-MX une día y mes con guion
 * ("03-sep") y algunos motores abrevian septiembre como "sept". El mes se
 * deja siempre en tres letras, sin punto.
 */
export function fecha(d: Date, opts?: { anio?: boolean }): string {
  const mes = MES.format(d).replace(/\./g, "").slice(0, 3).toLowerCase();
  const base = `${d.getDate()} ${mes}`;
  return opts?.anio ? `${base} ${d.getFullYear()}` : base;
}

/** 22 ago, 14:32 */
export const fechaHora = (d: Date): string => `${fecha(d)}, ${HORA.format(d)}`;

/** UUID fiscal truncado: A19C…4D07 */
export const uuidCorto = (uuid: string): string =>
  uuid.length <= 9 ? uuid : `${uuid.slice(0, 4)}\u2026${uuid.slice(-4)}`;

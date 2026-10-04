/**
 * "2026-09-22" → fecha en hora local. `new Date("2026-09-22")` la lee como
 * medianoche UTC y en México cae un día antes.
 */
export function fechaLocal(iso: string): Date {
  const [a = 0, m = 1, d = 1] = iso.slice(0, 10).split("-").map(Number);
  return new Date(a, m - 1, d);
}

const dos = (n: number) => String(n).padStart(2, "0");

/** Date → valor de `<input type="datetime-local">` en hora local. */
export const aInputFechaHora = (d: Date): string =>
  `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`;

/** Valor de `datetime-local` → Date local; null si está vacío o es inválido. */
export function deInputFechaHora(v: string): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

const HORA = new Intl.DateTimeFormat("es-MX", { hour: "2-digit", minute: "2-digit", hour12: false });

/** 14:32 */
export const hora = (d: Date): string => HORA.format(d);

/** Días completos entre dos fechas, sin importar la hora. */
export function diasEntre(desde: Date, hasta: Date): number {
  const a = new Date(desde.getFullYear(), desde.getMonth(), desde.getDate());
  const b = new Date(hasta.getFullYear(), hasta.getMonth(), hasta.getDate());
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** Hoy como AAAA-MM-DD en hora local, para `<input type="date">`. */
export const hoyISO = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}`;
};

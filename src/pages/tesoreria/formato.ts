import { moneda } from "@/domain/format";

/** Millones y miles abreviados para ejes y etiquetas de gráfica: $2.15 M · $987 K. */
export const abreviado = (v: number): string =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(2)} M`
    : v >= 1_000
      ? `$${Math.round(v / 1_000)} K`
      : moneda(v, { entero: true });

const MES = new Intl.DateTimeFormat("es-MX", { month: "long" });

/** "2026-08" → "Agosto". */
export function nombreMes(aaaamm: string): string {
  const [a = 0, m = 1] = aaaamm.split("-").map(Number);
  const t = MES.format(new Date(a, m - 1, 1));
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export const pct = (parte: number, total: number): string =>
  total > 0 ? `${((parte / total) * 100).toFixed(1)}%` : "0.0%";

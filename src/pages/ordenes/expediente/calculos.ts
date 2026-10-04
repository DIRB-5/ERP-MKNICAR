import type { ConceptoPresupuesto, ExpedienteOS, PresupuestoOS } from "@/domain/tipos";
import { TASA_IVA } from "@/app/sat";

export const importe = (c: ConceptoPresupuesto) => c.cantidad * c.precioUnitario - c.descuento;

export interface TotalesPresupuesto {
  refacciones: number;
  manoObra: number;
  descuentos: number;
  /** Subtotal ya con descuentos, sin IVA. */
  subtotal: number;
  iva: number;
  total: number;
  /** Costo de las refacciones según el presupuesto. */
  costo: number;
  /** Subtotal menos costo, como la "Utilidad" del sistema anterior. */
  utilidad: number;
}

export function totales(p: PresupuestoOS | null): TotalesPresupuesto | null {
  if (!p) return null;
  const suma = (f: (c: ConceptoPresupuesto) => number, tipo?: ConceptoPresupuesto["tipo"]) =>
    p.conceptos.filter((c) => !tipo || c.tipo === tipo).reduce((a, c) => a + f(c), 0);
  const subtotal = suma(importe);
  const costo = suma((c) => c.cantidad * c.costo);
  return {
    refacciones: suma(importe, "refaccion"),
    manoObra: suma(importe, "mano_obra"),
    descuentos: suma((c) => c.descuento),
    subtotal,
    iva: subtotal * TASA_IVA,
    total: subtotal * (1 + TASA_IVA),
    costo,
    utilidad: subtotal - costo,
  };
}

export interface Trazabilidad {
  ingreso: number;
  costoRefacciones: number;
  /** false cuando aún no hay compra real y se usa el costo del presupuesto. */
  refaccionesReales: boolean;
  costoManoObra: number;
  manoObraFacturada: number;
  margen: number;
  margenPct: number | null;
  margenPresupuestadoPct: number | null;
}

export function trazabilidad(e: ExpedienteOS): Trazabilidad | null {
  const t = totales(e.presupuesto);
  if (!t) return null;
  const costoRefacciones = e.costoRefacciones ?? t.costo;
  const costoManoObra = e.manoObra.reduce((a, m) => a + m.horasReales * m.costoHora, 0);
  const margen = t.subtotal - costoRefacciones - costoManoObra;
  return {
    ingreso: t.subtotal,
    costoRefacciones,
    refaccionesReales: e.costoRefacciones != null,
    costoManoObra,
    manoObraFacturada: t.manoObra,
    margen,
    margenPct: t.subtotal > 0 ? (margen / t.subtotal) * 100 : null,
    margenPresupuestadoPct: t.subtotal > 0 ? (t.utilidad / t.subtotal) * 100 : null,
  };
}

import type { TonoChip } from "@/components/Chip/Chip";
import type { Disponibilidad, TipoProducto } from "@/domain/tipos";

export const TIPO_PRODUCTO: Record<TipoProducto, string> = {
  original: "Original",
  oem: "OEM",
  generico: "Genérico",
  reconstruido: "Reconstruido",
};

export const DISPONIBILIDAD: Record<Disponibilidad, { label: string; tono: TonoChip }> = {
  inmediata: { label: "Inmediata", tono: "ok" },
  sobre_pedido: { label: "Sobre pedido", tono: "neutro" },
  agotado: { label: "Agotado", tono: "critico" },
};

/** Margen sobre el precio sugerido, contra el costo promedio. */
export const margen = (precio: number, costo: number): number | null =>
  precio > 0 ? ((precio - costo) / precio) * 100 : null;

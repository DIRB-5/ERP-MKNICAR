import type { TonoChip } from "@/components/Chip/Chip";
import type { AutorizacionPago, EstadoFacturaCliente, EstadoPago } from "@/domain/tipos";

export const AUTORIZACION: Record<AutorizacionPago, { label: string; tono: TonoChip }> = {
  pendiente: { label: "Por autorizar", tono: "neutro" },
  autorizada: { label: "Autorizada", tono: "ok" },
  rechazada: { label: "Rechazada", tono: "critico" },
};

export const PAGO: Record<EstadoPago, { label: string; tono: TonoChip }> = {
  por_programar: { label: "Por programar", tono: "neutro" },
  programada: { label: "Programada", tono: "brand" },
  pagada: { label: "Pagada", tono: "ok" },
};

export const ESTADO_FACTURA_CLIENTE: Record<EstadoFacturaCliente, { label: string; tono: TonoChip }> = {
  por_vencer: { label: "Por vencer", tono: "neutro" },
  vencida: { label: "Vencida", tono: "critico" },
  pago_parcial: { label: "Pago parcial", tono: "brand" },
};

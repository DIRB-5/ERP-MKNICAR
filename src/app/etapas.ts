/**
 * Las seis etapas en que se agrupan los estados de la O.S. para tableros y
 * kanban, tal como las muestra el prototipo aprobado. Qué estado cae en qué
 * etapa lo resuelve el backend.
 */
export const ETAPAS = [
  "diagnostico",
  "cotizacion",
  "autorizacion",
  "compra_pago",
  "reparacion",
  "entrega",
] as const;

export type Etapa = (typeof ETAPAS)[number];

export const ETAPA_LABEL: Record<Etapa, string> = {
  diagnostico: "Diagnóstico y requisición",
  cotizacion: "Cotización",
  autorizacion: "Pendiente de autorización",
  compra_pago: "Compra y pago",
  reparacion: "En reparación",
  entrega: "Entrega y facturación",
};

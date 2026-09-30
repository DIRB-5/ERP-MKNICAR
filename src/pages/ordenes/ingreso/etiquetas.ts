import type {
  ElementoInventario,
  PrioridadOS,
  TipoIngreso,
  TipoServicio,
} from "@/domain/tipos";

export const TIPO_SERVICIO: Record<TipoServicio, string> = {
  preventivo: "Preventivo",
  correctivo: "Correctivo",
  diagnostico: "Diagnóstico",
  garantia: "Garantía",
  siniestro: "Siniestro",
};

export const TIPO_INGRESO: Record<TipoIngreso, string> = {
  cita: "Cita",
  recoleccion: "Recolección",
  directo: "Ingreso directo",
};

export const PRIORIDAD: Record<PrioridadOS, string> = {
  normal: "Normal",
  alta: "Alta",
  critica: "Crítica",
};

export const INVENTARIO: Record<ElementoInventario, string> = {
  llave: "Llave",
  refaccion: "Llanta de refacción",
  gato: "Gato",
  herramienta: "Herramienta",
  tapetes: "Tapetes",
  documentos: "Documentos (tarjeta de circulación, póliza)",
  estereo: "Estéreo",
  placas: "Placas",
};

/** Mínimo exigido: los cuatro costados y el tablero con el kilometraje visible. */
export const FOTOS_REQUERIDAS = [
  "Frente",
  "Trasera",
  "Costado izquierdo",
  "Costado derecho",
  "Tablero con kilometraje",
] as const;

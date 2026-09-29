/** Series de folio, independientes por taller y tipo de documento. */
export const SERIE = {
  os: "OS",
  requisicion: "REQ",
  presupuesto: "PRE",
  ordenCompra: "OC",
  remision: "REM",
  factura: "A",
} as const;

export type TipoDocumento = keyof typeof SERIE;

/** Ruta de detalle de cada tipo de documento, para que todo folio navegue. */
export const RUTA_DOCUMENTO: Record<TipoDocumento, (folio: string) => string> = {
  os: (f) => `/ordenes/${f}`,
  requisicion: (f) => `/requisiciones/${f}`,
  presupuesto: (f) => `/presupuestos/${f}`,
  ordenCompra: (f) => `/compras/${f}`,
  remision: (f) => `/remisiones/${f}`,
  factura: (f) => `/facturas/${f}`,
};

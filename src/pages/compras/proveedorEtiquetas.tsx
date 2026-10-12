import { Chip, type TonoChip } from "@/components/Chip/Chip";
import { numero } from "@/domain/format";
import { situacionDocumentos, type SituacionDocumentos } from "@/domain/compras";
import type { DatosProveedor, Moneda, Proveedor } from "@/domain/tipos/compras";

export const MONEDA: Record<Moneda, string> = { MXN: "Pesos (MXN)", USD: "Dólares (USD)" };

/** El ícono acompaña al texto: la señal no depende solo del color. */
export const SITUACION_DOCUMENTOS: Record<SituacionDocumentos, { label: string; icono: string; tono: TonoChip }> = {
  vigentes: { label: "Vigentes", icono: "✓", tono: "ok" },
  opinion_vencida: { label: "Opinión vencida", icono: "!", tono: "critico" },
  sin_opinion: { label: "Sin opinión", icono: "–", tono: "neutro" },
};

export function ChipDocumentos({ proveedor, hoy }: { proveedor: Proveedor; hoy: string }) {
  const s = SITUACION_DOCUMENTOS[situacionDocumentos(proveedor.documentos, hoy)];
  return (
    <Chip tono={s.tono}>
      <span aria-hidden="true">{s.icono}</span> {s.label}
    </Chip>
  );
}

export function ChipActivo({ activo }: { activo: boolean }) {
  return <Chip tono={activo ? "ok" : "neutro"}>{activo ? "Activo" : "Inactivo"}</Chip>;
}

export const condicionesPago = (p: Proveedor): string =>
  p.condicionesPago === "contado" ? "Contado" : `Crédito ${numero(p.diasCredito ?? 0)} días`;

/**
 * Datos fiscales que faltan. Sin ellos Tesorería no puede pagar; el alta no los
 * exige porque al registrar a un proveedor nuevo no siempre se tienen todos.
 */
export function fiscalesFaltantes(p: Proveedor): string[] {
  const faltan: [boolean, string][] = [
    [!p.regimenFiscal, "régimen fiscal"],
    [!p.domicilioFiscal, "domicilio fiscal"],
    [!p.codigoPostal, "código postal"],
    [!p.correoFacturacion, "correo de facturación"],
  ];
  return faltan.filter(([falta]) => falta).map(([, nombre]) => nombre);
}

/** Lo editable de un proveedor, para guardarlo con un cambio puntual (p. ej. un documento). */
export const datosDe = ({ id: _id, activo: _activo, ...datos }: Proveedor): DatosProveedor => datos;

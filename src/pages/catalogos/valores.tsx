import type { ReactNode } from "react";
import { Monto } from "@/components/Monto/Monto";
import { Chip } from "@/components/Chip/Chip";
import { numero } from "@/domain/format";
import { CATALOGOS, type CampoCatalogo, type ClaveCatalogo } from "@/domain/catalogos";
import type { RegistroCatalogo, ValorCampo } from "@/domain/tipos";

/** Cómo se nombra un registro cuando otro catálogo lo referencia: sus dos primeros campos de texto. */
export function etiquetaRegistro(c: ClaveCatalogo, r: RegistroCatalogo): string {
  return CATALOGOS[c].campos
    .filter((x) => x.tipo === "texto")
    .slice(0, 2)
    .map((x) => String(r.valores[x.clave] ?? "").trim())
    .filter(Boolean)
    .join(" · ");
}

/** Valor de un campo como se muestra en tablas: cifras con Monto, sí/no con texto. */
export function mostrarValor(
  campo: CampoCatalogo | undefined,
  valor: ValorCampo | undefined,
  referencias?: Map<string, string>
): ReactNode {
  if (valor == null || valor === "") return "—";
  switch (campo?.tipo) {
    case "moneda":
      return <Monto valor={Number(valor)} />;
    case "porcentaje":
      return <Monto valor={Number(valor)} formato="porcentaje" />;
    case "numero":
      return numero(Number(valor));
    case "booleano":
      return valor ? "Sí" : "No";
    case "referencia":
      return referencias?.get(String(valor)) ?? "—";
    default:
      return String(valor);
  }
}

export const ChipActivo = ({ activo }: { activo: boolean }) => (
  <Chip tono={activo ? "ok" : "neutro"}>{activo ? "Activo" : "Dado de baja"}</Chip>
);

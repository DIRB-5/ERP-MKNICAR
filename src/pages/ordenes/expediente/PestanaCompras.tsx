import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { fecha } from "@/domain/format";
import type { DocumentoCompra } from "@/domain/tipos";
import { fechaLocal } from "@/app/fechas";

const TIPO: Record<DocumentoCompra["tipo"], string> = {
  requisicion: "Requisición",
  ordenCompra: "Orden de compra",
};

const COLUMNAS: readonly Columna<DocumentoCompra>[] = [
  { id: "tipo", encabezado: "Documento", celda: (d) => TIPO[d.tipo] },
  { id: "folio", encabezado: "Folio", celda: (d) => <Folio folio={d.folio} tipo={d.tipo} /> },
  { id: "proveedor", encabezado: "Proveedor", celda: (d) => d.proveedor ?? "—" },
  { id: "estado", encabezado: "Estado", celda: (d) => d.estado },
  { id: "fecha", encabezado: "Fecha", numerica: true, celda: (d) => fecha(fechaLocal(d.fecha), { anio: true }) },
  { id: "monto", encabezado: "Monto", numerica: true, celda: (d) => (d.monto != null ? <Monto valor={d.monto} /> : "—") },
];

/** Requisiciones y O.C. que salieron de esta O.S. La requisición abre su comparativo. */
export function PestanaCompras({ compras }: { compras: DocumentoCompra[] }) {
  return (
    <DataTable
      plano
      columnas={COLUMNAS}
      filas={compras}
      claveFila={(d) => d.folio}
      vacio={
        <EmptyState titulo="Sin compras ligadas">
          La requisición se genera después del diagnóstico; de ahí salen el comparativo y las O.C.
        </EmptyState>
      }
    />
  );
}

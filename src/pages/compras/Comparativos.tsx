import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { fecha, numero } from "@/domain/format";
import type { RequisicionEnComparativo } from "@/domain/tipos";
import { useComparativos } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { fechaLocal } from "@/app/fechas";
import styles from "@/pages/tableros/Tableros.module.css";

const COLUMNAS: readonly Columna<RequisicionEnComparativo>[] = [
  { id: "folio", encabezado: "Requisición", fija: true, celda: (r) => <Folio folio={r.folio} tipo="requisicion" /> },
  { id: "os", encabezado: "O.S.", celda: (r) => <Folio folio={r.folioOs} tipo="os" /> },
  { id: "unidad", encabezado: "Unidad", celda: (r) => <Folio folio={r.placas} /> },
  { id: "cliente", encabezado: "Cliente", celda: (r) => r.cliente },
  { id: "taller", encabezado: "Taller", celda: (r) => r.taller },
  { id: "conceptos", encabezado: "Conceptos", numerica: true, celda: (r) => numero(r.conceptos) },
  {
    id: "respuestas",
    encabezado: "Respuestas",
    numerica: true,
    celda: (r) => (
      <span className={r.respuestas < r.invitados ? styles.malo : undefined}>
        {numero(r.respuestas)} de {numero(r.invitados)}
      </span>
    ),
  },
  { id: "estimado", encabezado: "Estimado", numerica: true, celda: (r) => <Monto valor={r.estimadoInicial} /> },
  { id: "solicitada", encabezado: "Solicitada", numerica: true, celda: (r) => fecha(fechaLocal(r.solicitada)) },
];

export function Component() {
  const taller = useTaller();
  const { data, isPending } = useComparativos(taller);
  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Comparativo de cotizaciones</h1>
          <p className={styles.subtitulo}>{taller} · requisiciones en espera de elegir proveedor</p>
        </div>
      </header>
      <Panel titulo="Requisiciones en comparativo" subtitulo="Abre una para comparar ofertas y elegir proveedor" alBorde>
        <DataTable
          plano
          columnas={COLUMNAS}
          filas={data ?? []}
          claveFila={(r) => r.folio}
          vacio={<EmptyState titulo={isPending ? "Cargando…" : "No hay requisiciones en comparativo"} />}
        />
      </Panel>
    </div>
  );
}

Component.displayName = "Comparativos";

import type { Columna } from "@/components/DataTable/DataTable";
import { Folio } from "@/components/Folio/Folio";
import { Estado } from "@/components/Estado/Estado";
import { Monto } from "@/components/Monto/Monto";
import { fecha, dias as fmtDias } from "@/domain/format";
import type { OrdenHistorial, TallerRef } from "@/domain/tipos";
import { fechaLocal } from "@/app/fechas";
import { ChipFueraDeBase } from "@/pages/catalogos/etiquetas";
import styles from "@/pages/catalogos/Catalogo.module.css";

/**
 * Historial de O.S. Con `base`, cada O.S. atendida en otro taller se marca.
 */
export function columnasHistorial(base?: TallerRef): readonly Columna<OrdenHistorial>[] {
  return [
    { id: "folio", encabezado: "Folio", fija: true, celda: (o) => <Folio folio={o.folio} tipo="os" /> },
    { id: "fecha", encabezado: "Fecha", numerica: true, celda: (o) => fecha(fechaLocal(o.fecha), { anio: true }) },
    { id: "servicio", encabezado: "Tipo de servicio", celda: (o) => o.tipoServicio },
    {
      id: "taller",
      encabezado: "Taller",
      celda: (o) => (
        <span className={styles.ubicacion}>
          {o.taller.nombre}
          {base && o.taller.id !== base.id && <ChipFueraDeBase base={base.nombre} />}
        </span>
      ),
    },
    { id: "estado", encabezado: "Estado", celda: (o) => <Estado estado={o.estado} /> },
    {
      id: "ciclo",
      encabezado: "Días de ciclo",
      numerica: true,
      celda: (o) => (o.diasCiclo == null ? "En curso" : fmtDias(o.diasCiclo)),
    },
    { id: "costo", encabezado: "Costo", numerica: true, celda: (o) => <Monto valor={o.costo} /> },
  ];
}

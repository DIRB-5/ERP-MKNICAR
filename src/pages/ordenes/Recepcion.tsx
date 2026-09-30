import { Link, Navigate, useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { Aviso } from "@/components/Aviso/Aviso";
import { fecha, numero } from "@/domain/format";
import type { IngresoEsperado } from "@/domain/tipos";
import { useIngresosDelDia } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { hora } from "@/app/fechas";
import { TIPO_INGRESO } from "./ingreso/etiquetas";
import styles from "./Recepcion.module.css";

const resumir = (t: string, max = 70) => (t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t);

const COLUMNAS: readonly Columna<IngresoEsperado>[] = [
  { id: "folio", encabezado: "Folio", fija: true, celda: (i) => <Folio folio={i.orden.folio} tipo="os" /> },
  { id: "hora", encabezado: "Hora", numerica: true, celda: (i) => (i.hora ? hora(i.hora) : "—") },
  {
    id: "unidad",
    encabezado: "Unidad",
    celda: (i) => (
      <div>
        <Folio folio={i.unidad.placas} />
        <div className={styles.secundario}>
          {i.unidad.marca} {i.unidad.modelo}
        </div>
      </div>
    ),
  },
  { id: "cliente", encabezado: "Cliente", celda: (i) => i.cliente.razonSocial },
  {
    id: "tipo",
    encabezado: "Tipo de ingreso",
    celda: (i) => <Chip tono={i.orden.tipoIngreso === "recoleccion" ? "brand" : "neutro"}>{TIPO_INGRESO[i.orden.tipoIngreso]}</Chip>,
  },
  {
    id: "motivo",
    encabezado: "Motivo reportado",
    celda: (i) => (
      <span className={styles.motivo} title={i.orden.motivoReportado}>
        “{resumir(i.orden.motivoReportado)}”
      </span>
    ),
  },
  {
    id: "accion",
    encabezado: "",
    numerica: true,
    celda: (i) => (
      <Link to={`/ordenes/recepcion/${encodeURIComponent(i.orden.folio)}`} className={styles.recibir}>
        Recibir
      </Link>
    ),
  },
];

/** Cola de lo que se espera hoy en el taller activo: citas y recolecciones en ruta. */
export function ColaIngresos() {
  const taller = useTaller();
  const [params] = useSearchParams();
  const hoy = new Date();
  const { data: ingresos, isPending } = useIngresosDelDia(taller, hoy);
  const recibida = params.get("recibida");
  const programada = params.get("programada");

  const botonDirecto = (
    <Link to="/ordenes/ingreso-directo" className={styles.botonPrimario}>
      Ingreso directo
    </Link>
  );

  return (
    <div className={styles.cola}>
      {recibida && <Aviso titulo={`Unidad recibida. La O.S. ${recibida} pasó a "Unidad recibida".`} />}
      {programada && <Aviso titulo={`O.S. ${programada} programada.`} />}

      <div className={styles.barra}>
        <div>
          <div className={styles.titulo}>Ingresos de hoy</div>
          <div className={styles.secundario}>
            {taller} · {fecha(hoy, { anio: true })}
            {ingresos && ingresos.length > 0 && ` · ${numero(ingresos.length)} por recibir`}
          </div>
        </div>
        {botonDirecto}
      </div>

      <Panel titulo="Citas y recolecciones en ruta" alBorde>
        <DataTable
          plano
          columnas={COLUMNAS}
          filas={ingresos ?? []}
          claveFila={(i) => i.orden.folio}
          vacio={
            <EmptyState titulo={isPending ? "Cargando ingresos…" : "No hay ingresos programados para hoy"}>
              {!isPending && (
                <>
                  Si llegó una unidad sin cita, regístrala aquí.
                  <div className={styles.acciones}>{botonDirecto}</div>
                </>
              )}
            </EmptyState>
          }
        />
      </Panel>
    </div>
  );
}

/** /ordenes/recepcion es la vista "Ingresos de hoy" de Órdenes de Servicio. */
export function Component() {
  return <Navigate to="/ordenes?vista=ingresos" replace />;
}

Component.displayName = "Recepcion";

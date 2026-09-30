import { Surface } from "@/components/Surface/Surface";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { Antiguedad } from "@/components/Antiguedad/Antiguedad";
import type { Prioridad, TarjetaOrden } from "@/app/useKanbanOrdenes";
import styles from "./TarjetaOS.module.css";

export const PRIORIDAD_LABEL: Record<Prioridad, string> = {
  critica: "Prioridad crítica",
  alta: "Prioridad alta",
  normal: "Prioridad normal",
};

const iniciales = (nombre: string): string =>
  nombre
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

/** Tarjeta de una O.S. en el kanban. El folio es el enlace a su detalle. */
export function TarjetaOS({ orden }: { orden: TarjetaOrden }) {
  const { critica = "", alta = "", normal = "" } = styles;
  const franja = orden.prioridad === "critica" ? critica : orden.prioridad === "alta" ? alta : normal;
  return (
    <Surface as="article" variante="solid" className={styles.tarjeta}>
      <div className={`${styles.franja} ${franja}`} role="img" aria-label={PRIORIDAD_LABEL[orden.prioridad]} title={PRIORIDAD_LABEL[orden.prioridad]} />
      <div className={styles.cuerpo}>
        <div className={styles.fila}>
          <Folio folio={orden.folio} tipo="os" />
          <Antiguedad dias={orden.dias} />
        </div>
        <div className={styles.unidad}>
          {orden.placa} · {orden.modelo}
        </div>
        <div className={styles.cliente}>{orden.cliente}</div>
        <div className={`${styles.fila} ${styles.montoFila}`}>
          <Monto valor={orden.monto} escala="sm" />
          <span className={styles.avatar} title={orden.asesor} aria-label={`Asesor: ${orden.asesor}`}>
            {iniciales(orden.asesor)}
          </span>
        </div>
        <div className={styles.pie}>
          <span className={styles.taller}>{orden.taller}</span>
          <span className={styles.detalle}>{orden.detalle}</span>
        </div>
      </div>
    </Surface>
  );
}

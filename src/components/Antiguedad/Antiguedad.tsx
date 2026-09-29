import { nivelAntiguedad } from "@/domain/estados";
import { dias as fmtDias } from "@/domain/format";
import styles from "./Antiguedad.module.css";

export interface AntiguedadProps {
  /** Días en el estado actual. Un decimal si es menos de un día. */
  dias: number;
}

/**
 * Días que un documento lleva detenido en su estado.
 * Es la pieza que convierte el ERP en herramienta de medición.
 */
export function Antiguedad({ dias }: AntiguedadProps) {
  const nivel = nivelAntiguedad(dias);
  return (
    <span className={`${styles.badge} ${styles[nivel]}`}>
      {fmtDias(dias)}
      <i className={styles.unidad}>d</i>
    </span>
  );
}

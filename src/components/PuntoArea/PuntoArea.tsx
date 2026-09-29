import { AREA_LABEL, areaVar, type Area } from "@/domain/areas";
import styles from "./PuntoArea.module.css";

export interface PuntoAreaProps {
  area: Area;
  /** Muestra el nombre del área junto al punto. */
  etiqueta?: boolean;
}

/**
 * Punto de 6px con el color del área responsable.
 *
 * Nunca va solo: si `etiqueta` es false, el punto lleva `title` y `aria-label`
 * con el nombre del área. El color no puede ser el único portador del
 * significado.
 */
export function PuntoArea({ area, etiqueta = false }: PuntoAreaProps) {
  const nombre = AREA_LABEL[area];
  return (
    <span className={styles.wrap} style={{ ["--dom" as string]: areaVar(area) }}>
      <span className={styles.punto} title={nombre} aria-label={nombre} role="img" />
      {etiqueta && <span className={styles.label}>{nombre}</span>}
    </span>
  );
}

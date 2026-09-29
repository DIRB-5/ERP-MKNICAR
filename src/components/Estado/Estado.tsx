import { ESTADO, type EstadoOS } from "@/domain/estados";
import styles from "./Estado.module.css";

export interface EstadoProps {
  estado: EstadoOS;
  /** Sobre superficie de vidrio el chip usa los fondos translúcidos. */
  sobreVidrio?: boolean;
}

/** Chip que nombra el estado de la O.S. Siempre lleva texto, nunca solo color. */
export function Estado({ estado, sobreVidrio = false }: EstadoProps) {
  const def = ESTADO[estado];
  const clases = [styles.chip, styles[def.tono], sobreVidrio ? styles.vidrio : ""]
    .filter(Boolean)
    .join(" ");
  return <span className={clases}>{def.label}</span>;
}

import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import styles from "./Panel.module.css";

export interface PanelProps {
  titulo: string;
  subtitulo?: ReactNode;
  /** Enlace a la vista completa, arriba a la derecha. */
  accion?: { etiqueta: string; to: string };
  /** Contenido extra del encabezado: leyenda, cifras resumen. */
  extra?: ReactNode;
  /** Sin relleno interior, para tablas que llegan al borde. */
  alBorde?: boolean;
  className?: string;
  children: ReactNode;
}

/** Tarjeta de tablero con encabezado. El contenedor es vidrio; el dato va dentro. */
export function Panel({ titulo, subtitulo, accion, extra, alBorde = false, className, children }: PanelProps) {
  return (
    <Surface className={`${styles.panel} ${alBorde ? styles.alBorde : ""} ${className ?? ""}`}>
      <div className={styles.head}>
        <div>
          <h3 className={styles.titulo}>{titulo}</h3>
          {subtitulo && <div className={styles.subtitulo}>{subtitulo}</div>}
        </div>
        {extra}
        {accion && (
          <Link className={styles.accion} to={accion.to}>
            {accion.etiqueta} →
          </Link>
        )}
      </div>
      <div className={styles.cuerpo}>{children}</div>
    </Surface>
  );
}

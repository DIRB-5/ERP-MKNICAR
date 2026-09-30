import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

export interface EmptyStateProps {
  /** Por defecto dice que aún no hay datos, no que el valor sea cero. */
  titulo?: string;
  children?: ReactNode;
}

export function EmptyState({ titulo = "Sin datos todavía", children }: EmptyStateProps) {
  return (
    <div className={styles.vacio}>
      <div className={styles.titulo}>{titulo}</div>
      {children && <div className={styles.detalle}>{children}</div>}
    </div>
  );
}

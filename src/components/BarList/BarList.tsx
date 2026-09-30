import type { ReactNode } from "react";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./BarList.module.css";

export interface FilaBarra {
  id: string;
  etiqueta: ReactNode;
  valor: number;
  /** Texto del valor a la derecha de la barra. */
  texto: ReactNode;
  /** Nota secundaria bajo la etiqueta. */
  nota?: ReactNode;
  tono?: "brand" | "alerta" | "critico" | "ok";
}

export interface BarListProps {
  filas?: readonly FilaBarra[];
  /** Tope de la escala. Por defecto el mayor valor. */
  max?: number;
  vacio?: string;
}

/** Barras horizontales con etiqueta y valor escritos. */
export function BarList({ filas, max, vacio }: BarListProps) {
  if (!filas || filas.length === 0) return <EmptyState titulo={vacio} />;
  const tope = Math.max(1, max ?? Math.max(...filas.map((f) => f.valor)));
  return (
    <ul className={styles.lista}>
      {filas.map((f) => (
        <li key={f.id} className={styles.fila}>
          <div className={styles.etiqueta}>
            {f.etiqueta}
            {f.nota && <div className={styles.nota}>{f.nota}</div>}
          </div>
          <div className={styles.pista}>
            <i
              className={styles[f.tono ?? "brand"]}
              style={{ width: `${Math.min(100, (f.valor / tope) * 100)}%` }}
            />
          </div>
          <div className={styles.texto}>{f.texto}</div>
        </li>
      ))}
    </ul>
  );
}

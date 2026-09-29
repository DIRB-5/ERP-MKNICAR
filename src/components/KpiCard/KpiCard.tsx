import type { ReactNode } from "react";
import { Surface } from "@/components/Surface/Surface";
import styles from "./KpiCard.module.css";

export interface KpiCardProps {
  etiqueta: string;
  /** La cifra. Una por tarjeta: dos del mismo tamaño significan que faltaba otra. */
  valor: ReactNode;
  unidad?: string;
  /** Siempre dice contra qué se compara. Un porcentaje sin referencia no informa. */
  contexto?: ReactNode;
  tonoContexto?: "neutro" | "bueno" | "malo" | "alerta";
  progreso?: { porcentaje: number; tono: "brand" | "ok" | "alerta" | "critico" };
}

export function KpiCard({
  etiqueta,
  valor,
  unidad,
  contexto,
  tonoContexto = "neutro",
  progreso,
}: KpiCardProps) {
  return (
    <Surface className={styles.card}>
      <div className={styles.etiqueta}>{etiqueta}</div>
      <div className={styles.valor}>
        {valor}
        {unidad && <small className={styles.unidad}>{unidad}</small>}
      </div>
      {contexto && (
        <div className={`${styles.contexto} ${styles[tonoContexto]}`}>{contexto}</div>
      )}
      {progreso && (
        <div className={styles.barra}>
          <i
            className={styles[`b_${progreso.tono}`]}
            style={{ width: `${Math.min(100, Math.max(0, progreso.porcentaje))}%` }}
          />
        </div>
      )}
    </Surface>
  );
}

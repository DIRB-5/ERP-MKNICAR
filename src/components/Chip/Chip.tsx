import type { ReactNode } from "react";
import styles from "./Chip.module.css";

/**
 * `alerta` (ámbar) no existe aquí a propósito: es el color de los puntos de
 * espera medibles y solo lo usa `Estado`.
 */
export type TonoChip = "neutro" | "brand" | "ok" | "critico";

export interface ChipProps {
  tono?: TonoChip;
  title?: string;
  children: ReactNode;
}

/** Etiqueta corta con texto. Nunca solo color. */
export function Chip({ tono = "neutro", title, children }: ChipProps) {
  return (
    <span className={`${styles.chip} ${styles[tono] ?? ""}`} title={title}>
      {children}
    </span>
  );
}

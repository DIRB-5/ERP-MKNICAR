import type { ReactNode } from "react";
import styles from "./Aviso.module.css";

export interface AvisoProps {
  /**
   * `info` para advertencias que no bloquean; `critico` para lo que requiere
   * atención antes de seguir. Sin ámbar: es de los puntos de espera.
   */
  tono?: "info" | "critico";
  titulo: string;
  children?: ReactNode;
}

export function Aviso({ tono = "info", titulo, children }: AvisoProps) {
  return (
    <div className={`${styles.aviso} ${styles[tono] ?? ""}`} role={tono === "critico" ? "alert" : "status"}>
      <span className={styles.icono} aria-hidden="true">
        {tono === "critico" ? "!" : "i"}
      </span>
      <div>
        <div className={styles.titulo}>{titulo}</div>
        {children && <div className={styles.cuerpo}>{children}</div>}
      </div>
    </div>
  );
}

import { useEffect, useRef, type ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import styles from "./Dialogo.module.css";

export interface DialogoProps {
  abierto: boolean;
  titulo: string;
  children: ReactNode;
  confirmar: string;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Confirmación modal sobre `<dialog>` nativo: foco atrapado y Escape gratis. */
export function Dialogo({ abierto, titulo, children, confirmar, onConfirmar, onCancelar }: DialogoProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={styles.dialogo}
      aria-labelledby="dialogo-titulo"
      onCancel={(e) => {
        e.preventDefault();
        onCancelar();
      }}
    >
      <h2 id="dialogo-titulo" className={styles.titulo}>
        {titulo}
      </h2>
      <div className={styles.cuerpo}>{children}</div>
      <div className={styles.acciones}>
        <Button onClick={onCancelar}>Revisar</Button>
        <Button variante="primario" onClick={onConfirmar}>
          {confirmar}
        </Button>
      </div>
    </dialog>
  );
}

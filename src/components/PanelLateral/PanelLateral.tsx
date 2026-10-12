import { useEffect, useId, useRef, type ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import styles from "./PanelLateral.module.css";

export interface PanelLateralProps {
  abierto: boolean;
  titulo: string;
  subtitulo?: string;
  /**
   * Se llama con Escape, con clic fuera y con el botón de cerrar. Quien abre el
   * panel decide si cierra de inmediato o pregunta antes de descartar cambios.
   */
  onCerrar: () => void;
  children: ReactNode;
  /** Botones al pie, siempre visibles aunque el contenido haga scroll. */
  pie?: ReactNode;
}

/**
 * Panel que entra por la derecha sobre la vista. `<dialog>` nativo: foco
 * atrapado, Escape y fondo inerte sin código extra. El contenido es dato, así
 * que el panel es sólido, nunca vidrio.
 */
export function PanelLateral({ abierto, titulo, subtitulo, onCerrar, children, pie }: PanelLateralProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitulo = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      className={styles.panel}
      aria-labelledby={idTitulo}
      onCancel={(e) => {
        e.preventDefault();
        onCerrar();
      }}
      // El dialog ocupa la pantalla; su contenido, solo el panel. Un clic que
      // cae en el propio dialog cayó en el fondo.
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar();
      }}
    >
      {abierto && (
        <div className={styles.contenido}>
          <header className={styles.encabezado}>
            <div>
              <h2 id={idTitulo} className={styles.titulo}>{titulo}</h2>
              {subtitulo && <p className={styles.subtitulo}>{subtitulo}</p>}
            </div>
            <Button variante="fantasma" onClick={onCerrar} aria-label="Cerrar panel">
              Cerrar
            </Button>
          </header>
          <div className={`${styles.cuerpo} scroll-y`}>{children}</div>
          {pie && <footer className={styles.pie}>{pie}</footer>}
        </div>
      )}
    </dialog>
  );
}

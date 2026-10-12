import type { KeyboardEvent } from "react";
import { Button } from "@/components/Button/Button";
import styles from "./ListaMotivos.module.css";

export interface ListaMotivosProps {
  motivos: readonly string[];
  /** Un solo aviso con la lista y el borrador: agregar cambia ambos a la vez. */
  onCambiar: (motivos: string[], borrador: string) => void;
  /**
   * Texto escrito y aún no agregado. Lo guarda el formulario para no perderlo
   * si se guarda sin pulsar "Agregar".
   */
  borrador: string;
  onBorrador: (texto: string) => void;
  /** id del input, para que la etiqueta y el error del `Campo` lo describan. */
  id?: string;
  invalido?: boolean;
  descritoPor?: string;
  placeholder?: string;
}

/** Motivos de ingreso uno por uno: cada cosa que reporta el cliente es un renglón. */
export function ListaMotivos({
  motivos,
  onCambiar,
  borrador,
  onBorrador,
  id,
  invalido,
  descritoPor,
  placeholder,
}: ListaMotivosProps) {
  const agregar = () => {
    const texto = borrador.trim();
    if (!texto) return;
    onCambiar([...motivos, texto], "");
  };

  const alTeclear = (e: KeyboardEvent<HTMLInputElement>) => {
    // Enter agrega el motivo en vez de enviar el formulario.
    if (e.key === "Enter") {
      e.preventDefault();
      agregar();
    }
  };

  return (
    <div className={styles.motivos}>
      {motivos.length > 0 && (
        <ol className={styles.lista}>
          {motivos.map((m, i) => (
            <li key={`${i}-${m}`} className={styles.motivo}>
              <span className={styles.numero}>{i + 1}</span>
              <span className={styles.texto}>{m}</span>
              <Button
                variante="fantasma"
                onClick={() => onCambiar(motivos.filter((_, j) => j !== i), borrador)}
                aria-label={`Quitar motivo ${i + 1}: ${m}`}
              >
                Quitar
              </Button>
            </li>
          ))}
        </ol>
      )}

      <div className={styles.nuevo}>
        <input
          id={id}
          className={styles.control}
          placeholder={placeholder}
          value={borrador}
          onChange={(e) => onBorrador(e.target.value)}
          onKeyDown={alTeclear}
          aria-invalid={invalido || undefined}
          aria-describedby={descritoPor}
        />
        <Button onClick={agregar} disabled={!borrador.trim()}>
          + Agregar motivo
        </Button>
      </div>
    </div>
  );
}

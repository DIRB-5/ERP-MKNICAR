import { useState } from "react";
import type { DanoPrevio, SeveridadDano } from "@/domain/tipos";
import { Button } from "@/components/Button/Button";
import styles from "./ListaDanos.module.css";

export interface ListaDanosProps {
  danos: readonly DanoPrevio[];
  onCambiar: (danos: DanoPrevio[]) => void;
}

const SEVERIDAD: Record<SeveridadDano, string> = { leve: "Leve", moderado: "Moderado", grave: "Grave" };

/**
 * Daños previos como lista. Aislado a propósito: se sustituye por el esquema
 * visual del vehículo sin tocar los formularios que lo usan.
 */
export function ListaDanos({ danos, onCambiar }: ListaDanosProps) {
  const [zona, setZona] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<SeveridadDano>("leve");

  const agregar = () => {
    if (!zona.trim() || !descripcion.trim()) return;
    onCambiar([...danos, { zona: zona.trim(), descripcion: descripcion.trim(), severidad }]);
    setZona("");
    setDescripcion("");
    setSeveridad("leve");
  };

  return (
    <div className={styles.danos}>
      {danos.length > 0 ? (
        <ul className={styles.lista}>
          {danos.map((d, i) => (
            <li key={`${d.zona}-${i}`} className={styles.dano}>
              <span className={styles.zona}>{d.zona}</span>
              <span className={styles.descripcion}>{d.descripcion}</span>
              <span className={`${styles.severidad} ${styles[d.severidad] ?? ""}`}>{SEVERIDAD[d.severidad]}</span>
              <Button variante="fantasma" onClick={() => onCambiar(danos.filter((_, j) => j !== i))} aria-label={`Quitar daño en ${d.zona}`}>
                Quitar
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.nota}>Sin daños registrados. Si la unidad llega sin daños visibles, déjalo así.</p>
      )}

      <div className={styles.nuevo} role="group" aria-label="Agregar daño previo">
        <input
          className={styles.control}
          placeholder="Zona (p. ej. defensa delantera)"
          aria-label="Zona del daño"
          value={zona}
          onChange={(e) => setZona(e.target.value)}
        />
        <input
          className={styles.control}
          placeholder="Qué se ve (rayón, abolladura, cristal estrellado)"
          aria-label="Descripción del daño"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
        />
        <select
          className={styles.control}
          aria-label="Severidad"
          value={severidad}
          onChange={(e) => setSeveridad(e.target.value as SeveridadDano)}
        >
          {(Object.keys(SEVERIDAD) as SeveridadDano[]).map((s) => (
            <option key={s} value={s}>{SEVERIDAD[s]}</option>
          ))}
        </select>
        <Button onClick={agregar} disabled={!zona.trim() || !descripcion.trim()}>
          + Agregar daño
        </Button>
      </div>
    </div>
  );
}

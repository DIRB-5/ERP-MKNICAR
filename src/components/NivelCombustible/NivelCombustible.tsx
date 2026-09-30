import styles from "./NivelCombustible.module.css";

export interface NivelCombustibleProps {
  /** 0 a 8, en octavos. null mientras no se captura. */
  valor: number | null;
  onCambiar: (octavos: number) => void;
  etiqueta?: string;
}

const texto = (n: number) => (n === 0 ? "Vacío" : n === 8 ? "Lleno" : `${n}/8`);

/** Nivel de tanque en octavos, como lo marca el tablero. Grupo de radios accesible. */
export function NivelCombustible({ valor, onCambiar, etiqueta = "Nivel de combustible" }: NivelCombustibleProps) {
  return (
    <fieldset className={styles.grupo}>
      <legend className={styles.leyenda}>
        {etiqueta} <span className={styles.lectura}>{valor == null ? "sin capturar" : texto(valor)}</span>
      </legend>
      <div className={styles.barra}>
        {Array.from({ length: 9 }, (_, n) => (
          <label key={n} className={`${styles.paso} ${valor != null && n <= valor && n > 0 ? styles.lleno : ""}`}>
            <input
              type="radio"
              name="nivel-combustible"
              value={n}
              checked={valor === n}
              onChange={() => onCambiar(n)}
              className={styles.radio}
            />
            <span className={styles.marca}>{n === 0 ? "V" : n === 8 ? "Ll" : n === 4 ? "½" : ""}</span>
            <span className={styles.oculto}>{texto(n)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

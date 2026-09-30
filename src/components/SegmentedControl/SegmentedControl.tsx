import styles from "./SegmentedControl.module.css";

export interface OpcionSegmento<T extends string> {
  id: T;
  etiqueta: string;
}

export interface SegmentedControlProps<T extends string> {
  opciones: readonly OpcionSegmento<T>[];
  valor: T;
  onCambiar: (id: T) => void;
  /** Nombre del grupo para lectores de pantalla. */
  etiqueta: string;
}

/** Selector de una opción entre pocas, p. ej. vistas de una misma lista. */
export function SegmentedControl<T extends string>({
  opciones,
  valor,
  onCambiar,
  etiqueta,
}: SegmentedControlProps<T>) {
  const { opcion = "", activa = "" } = styles;
  return (
    <div className={styles.grupo} role="group" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          className={`${opcion} ${o.id === valor ? activa : ""}`}
          aria-pressed={o.id === valor}
          onClick={() => onCambiar(o.id)}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}

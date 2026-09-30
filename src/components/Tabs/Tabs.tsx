import { useRef, type KeyboardEvent, type ReactNode } from "react";
import styles from "./Tabs.module.css";

export interface Pestana<T extends string> {
  id: T;
  etiqueta: string;
  /** Cifra junto a la etiqueta: número de contactos, de unidades. */
  conteo?: number;
}

export interface TabsProps<T extends string> {
  pestanas: readonly Pestana<T>[];
  activa: T;
  onCambiar: (id: T) => void;
  etiqueta: string;
  /** Prefijo de ids para enlazar pestaña y panel. */
  idBase: string;
  children: ReactNode;
}

/** Pestañas con el patrón ARIA tablist: flechas izquierda/derecha, Inicio y Fin. */
export function Tabs<T extends string>({ pestanas, activa, onCambiar, etiqueta, idBase, children }: TabsProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const mover = (e: KeyboardEvent, i: number) => {
    const n = pestanas.length;
    const destino =
      e.key === "ArrowRight" ? (i + 1) % n
      : e.key === "ArrowLeft" ? (i - 1 + n) % n
      : e.key === "Home" ? 0
      : e.key === "End" ? n - 1
      : null;
    if (destino == null) return;
    e.preventDefault();
    const p = pestanas[destino];
    if (!p) return;
    onCambiar(p.id);
    refs.current[destino]?.focus();
  };

  const { pestana = "", activa: activaClase = "" } = styles;

  return (
    <div>
      <div className={styles.lista} role="tablist" aria-label={etiqueta}>
        {pestanas.map((p, i) => {
          const sel = p.id === activa;
          return (
            <button
              key={p.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`${idBase}-tab-${p.id}`}
              aria-selected={sel}
              aria-controls={`${idBase}-panel`}
              tabIndex={sel ? 0 : -1}
              className={`${pestana} ${sel ? activaClase : ""}`}
              onClick={() => onCambiar(p.id)}
              onKeyDown={(e) => mover(e, i)}
            >
              {p.etiqueta}
              {p.conteo != null && <span className={styles.conteo}>{p.conteo}</span>}
            </button>
          );
        })}
      </div>
      <div
        className={styles.panel}
        role="tabpanel"
        id={`${idBase}-panel`}
        aria-labelledby={`${idBase}-tab-${activa}`}
        tabIndex={0}
      >
        {children}
      </div>
    </div>
  );
}

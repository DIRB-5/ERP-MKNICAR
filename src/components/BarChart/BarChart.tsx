import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "./BarChart.module.css";

export interface SerieBarras {
  nombre: string;
  /** Token de color, p. ej. `var(--data-1)`. */
  color: string;
}

export interface CategoriaBarras {
  etiqueta: string;
  /** Un valor por serie, en el orden de `series`; se apilan. */
  valores: readonly number[];
  /** Marca horizontal de referencia sobre la barra. */
  meta?: number;
}

export interface BarChartProps {
  series: readonly SerieBarras[];
  categorias?: readonly CategoriaBarras[];
  /** Nombre de la marca de referencia en la leyenda. */
  nombreMeta?: string;
  formato: (valor: number) => string;
  vacio?: string;
}

/**
 * Barras verticales apiladas con meta opcional. Cada barra lleva su total
 * escrito arriba: el color nunca es el único portador del valor.
 */
export function BarChart({ series, categorias, nombreMeta, formato, vacio }: BarChartProps) {
  const leyenda = (
    <div className={styles.leyenda}>
      {series.map((s) => (
        <span key={s.nombre} className={styles.item}>
          <i className={styles.muestra} style={{ background: s.color }} />
          {s.nombre}
        </span>
      ))}
      {nombreMeta && (
        <span className={styles.item}>
          <i className={styles.muestraMeta} />
          {nombreMeta}
        </span>
      )}
    </div>
  );

  if (!categorias || categorias.length === 0) {
    return (
      <div className={styles.chart}>
        {leyenda}
        <EmptyState titulo={vacio} />
      </div>
    );
  }

  const max = Math.max(
    1,
    ...categorias.map((c) => Math.max(c.valores.reduce((a, v) => a + v, 0), c.meta ?? 0))
  );

  return (
    <div className={styles.chart}>
      {leyenda}
      <div className={styles.plot} role="list">
        {categorias.map((c) => {
          const total = c.valores.reduce((a, v) => a + v, 0);
          const detalle = [
            ...series.map((s, i) => `${s.nombre}: ${formato(c.valores[i] ?? 0)}`),
            ...(c.meta != null && nombreMeta ? [`${nombreMeta}: ${formato(c.meta)}`] : []),
          ].join(" · ");
          return (
            <div key={c.etiqueta} className={styles.columna} role="listitem" title={`${c.etiqueta} · ${detalle}`}>
              <div className={styles.total}>{formato(total)}</div>
              <div className={styles.pista}>
                <div className={styles.pila} style={{ height: `${(total / max) * 100}%` }}>
                  {series.map((s, i) => {
                    const v = c.valores[i] ?? 0;
                    return total > 0 && v > 0 ? (
                      <div key={s.nombre} style={{ flexGrow: v, background: s.color }} />
                    ) : null;
                  })}
                </div>
                {c.meta != null && (
                  <div className={styles.meta} style={{ bottom: `${(c.meta / max) * 100}%` }} />
                )}
              </div>
              <div className={styles.etiqueta}>{c.etiqueta}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

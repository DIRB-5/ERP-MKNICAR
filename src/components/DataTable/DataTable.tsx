import type { ReactNode } from "react";
import { Surface } from "@/components/Surface/Surface";
import styles from "./DataTable.module.css";

export interface Columna<T> {
  id: string;
  encabezado: string;
  celda: (fila: T) => ReactNode;
  /** Las columnas numéricas van a la derecha, encabezado incluido. */
  numerica?: boolean;
  /** Las dos primeras columnas se fijan al hacer scroll horizontal. */
  fija?: boolean;
  ancho?: string;
}

export interface DataTableProps<T> {
  columnas: readonly Columna<T>[];
  filas: readonly T[];
  claveFila: (fila: T) => string;
  filaSeleccionada?: string;
  onSeleccionar?: (fila: T) => void;
  /** Alto de fila compacto en tablas de más de veinte renglones. */
  compacta?: boolean;
  /** Estado vacío: dice qué falta y ofrece la acción que lo llena. */
  vacio?: ReactNode;
  /** Sin superficie propia, para tablas que viven dentro de un `Panel`. */
  plano?: boolean;
}

export function DataTable<T>({
  columnas,
  filas,
  claveFila,
  filaSeleccionada,
  onSeleccionar,
  compacta = false,
  vacio,
  plano = false,
}: DataTableProps<T>) {
  if (filas.length === 0 && vacio) {
    return plano ? (
      <div className={styles.vacioPlano}>{vacio}</div>
    ) : (
      <Surface className={styles.vacio}>{vacio}</Surface>
    );
  }

  const tabla = (
    <div className={`${styles.scroll} scroll-x`}>
      <table className={`${styles.tabla} ${compacta ? styles.compacta : ""}`}>
        <thead>
          <tr>
            {columnas.map((c) => (
              <th
                key={c.id}
                style={{ width: c.ancho }}
                className={[c.numerica ? styles.der : "", c.fija ? styles.fija : ""]
                  .filter(Boolean)
                  .join(" ")}
                scope="col"
              >
                {c.encabezado}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => {
            const clave = claveFila(fila);
            return (
              <tr
                key={clave}
                className={clave === filaSeleccionada ? styles.sel : undefined}
                onClick={onSeleccionar ? () => onSeleccionar(fila) : undefined}
              >
                {columnas.map((c) => (
                  <td
                    key={c.id}
                    className={[c.numerica ? styles.der : "", c.fija ? styles.fija : ""]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {c.celda(fila)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  return plano ? (
    tabla
  ) : (
    <Surface className={styles.wrap} elevacion="card">
      {tabla}
    </Surface>
  );
}

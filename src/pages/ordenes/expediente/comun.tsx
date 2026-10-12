import type { ReactNode } from "react";
import { Surface } from "@/components/Surface/Surface";
import { fecha, fechaHora } from "@/domain/format";
import type { Expediente, SeccionExpediente } from "@/domain/expediente";
import { fechaLocal } from "@/app/fechas";
import s from "./Expediente.module.css";

/**
 * Lo que recibe el componente de cada sección. Cada sección vive en
 * `secciones/<clave>.tsx` y se exporta por defecto: la página la encuentra
 * sola a partir del registro de `domain/expediente.ts`.
 */
export interface PropsSeccion {
  exp: Expediente;
  seccion: SeccionExpediente;
  /** false: solo lectura (cerrada, alimentada por otro módulo o O.S. terminada). */
  abierta: boolean;
  /** ISO, para que los tiempos abiertos se calculen igual en toda la página. */
  ahora: string;
}

/** Resumen de una línea para el encabezado de la sección replegada. */
export type ResumenSeccion = (exp: Expediente, ahora: string) => string | null;

/** ISO con hora: "22 ago, 14:32". */
export const fh = (iso: string) => fechaHora(new Date(iso));
/** AAAA-MM-DD: "22 ago 2026". */
export const dia = (aaaammdd: string) => fecha(fechaLocal(aaaammdd), { anio: true });

/** Pares etiqueta-valor; lo vacío se muestra como guion, nunca se oculta. */
export function Datos({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className={s.datos}>
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta}>
          <dt>{etiqueta}</dt>
          <dd>{valor === "" || valor == null ? "—" : valor}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Tabla de dato: siempre sobre superficie sólida, nunca sobre vidrio. */
export function Tabla({ encabezados, children, pie, derecha = [] }: {
  encabezados: string[];
  children: ReactNode;
  pie?: ReactNode;
  /** Índices de las columnas numéricas, alineadas a la derecha. */
  derecha?: number[];
}) {
  return (
    <Surface variante="solid" elevacion="none" className={s.tablaWrap}>
      <div className="scroll-x">
        <table className={s.tabla}>
          <thead>
            <tr>
              {encabezados.map((e, i) => (
                <th key={`${i}-${e}`} className={derecha.includes(i) ? s.der : undefined} scope="col">
                  {e}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
          {pie && <tfoot>{pie}</tfoot>}
        </table>
      </div>
    </Surface>
  );
}

/** Lo que aún no hay, dicho en una línea: sin esqueletos falsos. */
export const Pendiente = ({ children }: { children: ReactNode }) => <p className={s.pendiente}>{children}</p>;

export const Subtitulo = ({ children }: { children: ReactNode }) => <h4 className={s.subtitulo}>{children}</h4>;

/** Acciones de captura de la sección, alineadas a la derecha. */
export const Acciones = ({ children }: { children: ReactNode }) => <div className={s.accionesSeccion}>{children}</div>;

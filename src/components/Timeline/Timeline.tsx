import { Surface } from "@/components/Surface/Surface";
import { AREA_LABEL, areaVar } from "@/domain/areas";
import { ESTADO, type EstadoOS } from "@/domain/estados";
import { dias as fmtDias, fechaHora } from "@/domain/format";
import styles from "./Timeline.module.css";

export interface Tramo {
  estado: EstadoOS;
  /** Ausente en los estados que todavía no ocurren. */
  desde?: Date;
  /** Días que duró el tramo. Ausente mientras no termine. */
  duracionDias?: number;
  responsable?: string;
}

export interface TimelineProps {
  tramos: readonly Tramo[];
  /** Índice del tramo actual. Los posteriores se muestran como futuros. */
  indiceActual: number;
  resumen: { transcurridoDias: number; productivoDias: number; esperaDias: number };
}

/**
 * Recorrido de la O.S. por la máquina de estados.
 *
 * El nodo de un estado completado toma el color del área que lo ejecutó: la
 * línea de tiempo es el diagrama de carriles leído en vertical.
 */
export function Timeline({ tramos, indiceActual, resumen }: TimelineProps) {
  const { transcurridoDias, productivoDias, esperaDias } = resumen;
  const pctEspera = transcurridoDias > 0 ? (esperaDias / transcurridoDias) * 100 : 0;

  return (
    <div>
      <Surface className={styles.lista} elevacion="card">
        {tramos.map((t, i) => {
          const def = ESTADO[t.estado];
          const fase = i < indiceActual ? "done" : i === indiceActual ? "now" : "next";
          const detenido = fase === "now" && def.espera;
          return (
            <div
              key={`${t.estado}-${i}`}
              className={[
                styles.nodo,
                styles[fase],
                detenido ? styles.detenido : "",
                i === tramos.length - 1 ? styles.ultimo : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{ ["--dom" as string]: areaVar(def.area) }}
            >
              <div className={styles.punto} />
              <div className={styles.cuerpo}>
                <b>{def.label}</b>
                <span>
                  {t.desde ? fechaHora(t.desde) : "Pendiente"} · {AREA_LABEL[def.area]}
                  {t.responsable ? ` · ${t.responsable}` : ""}
                </span>
              </div>
              <em className={detenido ? styles.malo : undefined}>
                {t.duracionDias != null ? `${fmtDias(t.duracionDias)} d` : "—"}
              </em>
            </div>
          );
        })}
      </Surface>

      {/* El resumen es obligatorio: es el dato que cambia la conversación. */}
      <Surface variante="strong" className={styles.resumen} elevacion="none">
        <span>
          Transcurrido <b>{fmtDias(transcurridoDias)} d</b>
        </span>
        <span>
          Productivo <b>{fmtDias(productivoDias)} d</b>
        </span>
        <span>
          En espera{" "}
          <b className={pctEspera > 50 ? styles.malo : undefined}>
            {fmtDias(esperaDias)} d · {Math.round(pctEspera)}%
          </b>
        </span>
      </Surface>
    </div>
  );
}

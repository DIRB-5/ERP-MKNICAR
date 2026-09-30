import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { PuntoArea } from "@/components/PuntoArea/PuntoArea";
import { Monto } from "@/components/Monto/Monto";
import { nivelAntiguedad } from "@/domain/estados";
import { areaVar, type Area } from "@/domain/areas";
import { dias as fmtDias, numero } from "@/domain/format";
import styles from "./AlertaFlujo.module.css";

export interface DatosFlujo {
  conteo: number;
  diasPromedio: number;
  /** Monto detenido: la cifra que hace que alguien actúe. */
  montoDetenido: number;
}

export interface AlertaFlujoProps {
  titulo: string;
  area: Area;
  /** Qué se cuenta: O.S., O.C. */
  unidadConteo: string;
  /** Sin datos la tarjeta conserva su lugar y muestra guiones. */
  datos?: DatosFlujo;
  /** Toda alerta enlaza a la lista filtrada por ese estado. */
  href: string;
}

const SEVERIDAD = {
  critico: { estado: "critico", chip: "Crítico" },
  alerta: { estado: "alerta", chip: "Alerta" },
  ok: { estado: "neutro", chip: "En tiempo" },
} as const;

/**
 * Tarjeta de un punto de espera medible. La severidad sale de la antigüedad
 * promedio contra los umbrales del dominio, no se decide en la pantalla.
 */
export function AlertaFlujo({ titulo, area, unidadConteo, datos, href }: AlertaFlujoProps) {
  const nivel = datos ? nivelAntiguedad(datos.diasPromedio) : null;
  const sev = nivel ? SEVERIDAD[nivel] : null;
  const { critico = "", alerta = "", ok = "" } = styles;
  const tono = nivel === "critico" ? critico : nivel === "alerta" ? alerta : nivel === "ok" ? ok : "";

  return (
    <Surface
      estado={sev?.estado ?? "neutro"}
      className={`${styles.tarjeta} ${tono}`}
      style={{ ["--dom" as string]: areaVar(area) }}
    >
      <div className={styles.head}>
        <div className={styles.titulo}>
          <PuntoArea area={area} />
          <span>{titulo}</span>
        </div>
        {sev && <span className={styles.chip}>{sev.chip}</span>}
      </div>

      <div className={styles.conteo}>
        <span className={styles.cifra}>{datos ? numero(datos.conteo) : "—"}</span>
        <span className={styles.unidad}>{unidadConteo}</span>
      </div>

      <div className={styles.metricas}>
        <div>
          <div className={styles.etiqueta}>Antigüedad promedio</div>
          <div className={`${styles.valor} ${styles.antiguedad}`}>
            {datos ? `${fmtDias(datos.diasPromedio)} días` : "—"}
          </div>
        </div>
        <div>
          <div className={styles.etiqueta}>Monto detenido</div>
          <div className={styles.valor}>
            {datos ? <Monto valor={datos.montoDetenido} escala="sm" /> : "—"}
          </div>
        </div>
      </div>

      <Link className={styles.link} to={href}>
        Ver detalle →
      </Link>
    </Surface>
  );
}

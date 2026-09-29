import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { PuntoArea } from "@/components/PuntoArea/PuntoArea";
import { Monto } from "@/components/Monto/Monto";
import { AREA_LABEL, areaVar, type Area } from "@/domain/areas";
import { dias as fmtDias } from "@/domain/format";
import styles from "./AlertaFlujo.module.css";

export interface AlertaFlujoProps {
  titulo: string;
  area: Area;
  /** Monto detenido: la cifra que hace que alguien actúe. */
  montoDetenido: number;
  conteo: number;
  unidadConteo: string;
  diasPromedio: number;
  /** Toda alerta enlaza al tablero filtrado por ese estado. */
  href: string;
  severidad?: "critico" | "alerta";
}

export function AlertaFlujo({
  titulo,
  area,
  montoDetenido,
  conteo,
  unidadConteo,
  diasPromedio,
  href,
  severidad = "alerta",
}: AlertaFlujoProps) {
  return (
    <Surface
      estado={severidad}
      className={styles.alerta}
      style={{ ["--dom" as string]: areaVar(area) }}
    >
      <div className={styles.head}>
        <PuntoArea area={area} />
        <span className={styles.titulo}>{titulo}</span>
      </div>
      <div className={severidad === "critico" ? styles.montoCritico : styles.montoAlerta}>
        <Monto valor={montoDetenido} escala="xl" entero />
      </div>
      <div className={styles.meta}>
        <b>
          {conteo} {unidadConteo}
        </b>{" "}
        · {fmtDias(diasPromedio)} días promedio · <em>{AREA_LABEL[area]}</em>
      </div>
      <Link className={styles.link} to={href}>
        Ver detalle →
      </Link>
    </Surface>
  );
}

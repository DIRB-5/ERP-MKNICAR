import { moneda, numero, porcentaje, puntos } from "@/domain/format";
import styles from "./Monto.module.css";

type Escala = "xl" | "md" | "sm" | "tabla" | "densa";

export interface MontoProps {
  valor: number;
  formato?: "moneda" | "numero" | "porcentaje" | "puntos";
  escala?: Escala;
  /**
   * Cómo colorear el valor. `desviacion` invierte el sentido: subir cuesta
   * más, así que un positivo va en crítico.
   */
  sentido?: "neutro" | "desviacion" | "desviacion-inversa";
  entero?: boolean;
}

function texto(p: MontoProps): string {
  switch (p.formato ?? "moneda") {
    case "numero": return numero(p.valor);
    case "porcentaje": return porcentaje(p.valor);
    case "puntos": return puntos(p.valor);
    default: return moneda(p.valor, { entero: p.entero });
  }
}

function tono(p: MontoProps): string {
  const { malo = "", bueno = "", plano = "" } = styles;
  if (p.sentido === "desviacion") {
    return p.valor > 0 ? malo : p.valor < 0 ? bueno : plano;
  }
  if (p.sentido === "desviacion-inversa") {
    return p.valor > 0 ? bueno : p.valor < 0 ? malo : plano;
  }
  return "";
}

/** Cifra con numeración tabular. Siempre alineada a la derecha en tablas. */
export function Monto(props: MontoProps) {
  const { escala = "tabla" } = props;
  return (
    <span className={`${styles.monto} ${styles[escala]} ${tono(props)}`}>
      {texto(props)}
    </span>
  );
}

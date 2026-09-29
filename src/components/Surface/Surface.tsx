import type { ElementType, HTMLAttributes, ReactNode } from "react";
import styles from "./Surface.module.css";

type Variante = "glass" | "strong" | "solid";
type Estado = "neutro" | "critico" | "alerta" | "ok";

export interface SurfaceProps extends HTMLAttributes<HTMLElement> {
  /**
   * `glass` (70%) para contenedores · `strong` (86%) para lectura prolongada ·
   * `solid` para lo que nunca debe ser traslúcido: el dato.
   */
  variante?: Variante;
  /** Tiñe la superficie completa y pone borde de color en los cuatro lados. */
  estado?: Estado;
  /** Sombra de elevación. Sobre vidrio, solo lo que flota se eleva. */
  elevacion?: "none" | "card" | "raised" | "float" | "modal";
  as?: ElementType;
  children?: ReactNode;
}

/**
 * Superficie del sistema. Aplica siempre las tres cosas juntas —fondo, blur y
 * borde—; sin las tres el vidrio se ve como blanco sucio.
 */
export function Surface({
  variante = "glass",
  estado = "neutro",
  elevacion = "card",
  as: Tag = "div",
  className,
  children,
  ...rest
}: SurfaceProps) {
  const clases = [
    styles.surface,
    styles[variante],
    estado !== "neutro" ? styles[estado] : "",
    styles[`elev_${elevacion}`],
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={clases} {...rest}>
      {children}
    </Tag>
  );
}

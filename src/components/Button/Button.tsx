import type { ButtonHTMLAttributes } from "react";
import styles from "./Button.module.css";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: "primario" | "secundario" | "fantasma";
}

export function Button({ variante = "secundario", className, type = "button", ...rest }: ButtonProps) {
  return <button type={type} className={`${styles.boton} ${styles[variante] ?? ""} ${className ?? ""}`} {...rest} />;
}

import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import styles from "./Campo.module.css";

export interface CampoProps {
  etiqueta: string;
  /** Texto de apoyo bajo el control. */
  ayuda?: ReactNode;
  /** Error que bloquea el guardado. */
  error?: string;
  obligatorio?: boolean;
  /** Recibe el id para enlazar etiqueta, ayuda y error con el control. */
  children: (control: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
  className?: string;
}

/** Etiqueta + control + ayuda + error, enlazados para lectores de pantalla. */
export function Campo({ etiqueta, ayuda, error, obligatorio, children, className }: CampoProps) {
  const id = useId();
  const idAyuda = `${id}-ayuda`;
  const idError = `${id}-error`;
  const describe = [ayuda ? idAyuda : "", error ? idError : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`${styles.campo} ${className ?? ""}`}>
      <label htmlFor={id} className={styles.etiqueta}>
        {etiqueta}
        {obligatorio && <span className={styles.obligatorio}> (obligatorio)</span>}
      </label>
      {children({ id, "aria-describedby": describe, "aria-invalid": error ? true : undefined })}
      {ayuda && (
        <div id={idAyuda} className={styles.ayuda}>
          {ayuda}
        </div>
      )}
      {error && (
        <div id={idError} className={styles.error} role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

/* Los controles son dato editable: siempre sólidos, nunca sobre vidrio. */

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={`${styles.control} ${className ?? ""}`} {...rest} />;
  }
);

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${styles.control} ${className ?? ""}`} {...rest} />;
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${styles.control} ${styles.textarea} ${className ?? ""}`} {...rest} />;
}

/** Valor mostrado como campo pero no editable: autocompletados y datos de sesión. */
export function SoloLectura({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className={styles.campo}>
      <span className={styles.etiqueta}>{etiqueta}</span>
      <div className={styles.lectura}>{children}</div>
    </div>
  );
}

import type { FotoRecepcion } from "@/domain/tipos";
import styles from "./CargaFotos.module.css";

export interface CargaFotosProps {
  /** Tomas que no pueden faltar, en orden. */
  requeridas: readonly string[];
  fotos: readonly FotoRecepcion[];
  onCambiar: (fotos: FotoRecepcion[]) => void;
  error?: string;
}

/**
 * Acepta archivos y guarda solo su referencia. La subida real llega con la
 * API: aquí nada sale del navegador.
 */
export function CargaFotos({ requeridas, fotos, onCambiar, error }: CargaFotosProps) {
  const poner = (etiqueta: string, archivo: File | undefined) => {
    const resto = fotos.filter((f) => f.etiqueta !== etiqueta);
    onCambiar(archivo ? [...resto, { etiqueta, referencia: `local:${archivo.name}` }] : resto);
  };

  const extras = fotos.filter((f) => !requeridas.includes(f.etiqueta));

  return (
    <div className={styles.fotos}>
      <ul className={styles.rejilla}>
        {requeridas.map((etiqueta) => {
          const foto = fotos.find((f) => f.etiqueta === etiqueta);
          return (
            <li key={etiqueta} className={`${styles.toma} ${foto ? styles.lista : ""}`}>
              <label className={styles.etiqueta}>
                <span>
                  {foto ? "✓ " : ""}
                  {etiqueta}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => poner(etiqueta, e.target.files?.[0])}
                />
              </label>
              <span className={styles.archivo}>{foto ? foto.referencia.replace(/^local:/, "") : "Falta"}</span>
            </li>
          );
        })}
      </ul>

      <label className={styles.extra}>
        + Fotos adicionales
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            const nuevas = Array.from(e.target.files ?? []).map((a, i) => ({
              etiqueta: `Adicional ${extras.length + i + 1}`,
              referencia: `local:${a.name}`,
            }));
            onCambiar([...fotos, ...nuevas]);
          }}
        />
      </label>
      {extras.length > 0 && (
        <p className={styles.nota}>
          {extras.length} {extras.length === 1 ? "foto adicional" : "fotos adicionales"}
        </p>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

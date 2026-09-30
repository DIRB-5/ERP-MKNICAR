import styles from "./MarcadorFirma.module.css";

/** Lugar de la firma de quien entrega. El capturador se construye después. */
export function MarcadorFirma({ nombre }: { nombre: string }) {
  return (
    <div className={styles.marcador}>
      <div className={styles.linea} aria-hidden="true" />
      <div className={styles.nombre}>{nombre.trim() || "Nombre de quien entrega"}</div>
      <div className={styles.nota}>Captura de firma pendiente: se agrega en una siguiente fase.</div>
    </div>
  );
}

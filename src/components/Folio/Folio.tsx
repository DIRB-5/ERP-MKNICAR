import { Link } from "react-router-dom";
import { RUTA_DOCUMENTO, type TipoDocumento } from "@/domain/folios";
import styles from "./Folio.module.css";

export interface FolioProps {
  folio: string;
  /** Omitirlo vuelve el folio no navegable (placas, VIN, número de parte). */
  tipo?: TipoDocumento;
}

/**
 * Identificador de documento. Todo folio de la cadena navega a su detalle:
 * es la promesa central del producto.
 */
export function Folio({ folio, tipo }: FolioProps) {
  if (!tipo) return <span className={styles.id}>{folio}</span>;
  return (
    <Link className={styles.folio} to={RUTA_DOCUMENTO[tipo](folio)}>
      {folio}
    </Link>
  );
}

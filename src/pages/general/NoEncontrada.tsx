import { Link, useLocation } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import styles from "@/pages/catalogos/Catalogo.module.css";

/**
 * Ruta sin pantalla. Hoy la alcanzan los folios de módulos que aún no existen
 * (O.C., facturas): el folio navega, pero su detalle se construye después.
 */
export function Component() {
  const { pathname } = useLocation();
  return (
    <div className={styles.vista}>
      <EmptyState titulo="Esta pantalla todavía no existe">
        <code>{pathname}</code> se construye en una siguiente fase.
        <div className={styles.acciones}>
          <Link to="/" className={styles.botonPrimario}>
            Ir al Dashboard
          </Link>
        </div>
      </EmptyState>
    </div>
  );
}

Component.displayName = "NoEncontrada";

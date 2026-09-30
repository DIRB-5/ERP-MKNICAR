import { NavLink } from "react-router-dom";
import styles from "./Tableros.module.css";

/** Cambio entre los dos tableros de la fase 1. */
export function TabsTableros() {
  const clase = ({ isActive }: { isActive: boolean }) =>
    `${styles.tab} ${isActive ? styles.tabActiva : ""}`;
  return (
    <nav className={styles.tabs} aria-label="Tableros">
      <NavLink to="/" end className={clase}>
        Dirección general
      </NavLink>
      <NavLink to="/operacion" className={clase}>
        Operación del taller
      </NavLink>
    </nav>
  );
}

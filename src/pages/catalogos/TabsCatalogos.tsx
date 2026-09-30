import { NavLink } from "react-router-dom";
import styles from "./Catalogo.module.css";

export function TabsCatalogos() {
  const clase = ({ isActive }: { isActive: boolean }) =>
    `${styles.tab} ${isActive ? styles.tabActiva : ""}`;
  return (
    <nav className={styles.tabs} aria-label="Catálogos">
      <NavLink to="/clientes" className={clase}>
        Clientes
      </NavLink>
      <NavLink to="/unidades" className={clase}>
        Unidades
      </NavLink>
    </nav>
  );
}

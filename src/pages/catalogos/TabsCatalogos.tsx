import { NavLink, useLocation } from "react-router-dom";
import styles from "./Catalogo.module.css";

export function TabsCatalogos() {
  const { pathname } = useLocation();
  const clase = (activa: boolean) => `${styles.tab} ${activa ? styles.tabActiva : ""}`;
  // Productos y proveedores son una sola pantalla con dos pestañas.
  const enCompras = pathname.startsWith("/productos") || pathname.startsWith("/proveedores");
  return (
    <nav className={styles.tabs} aria-label="Catálogos">
      <NavLink to="/clientes" className={({ isActive }) => clase(isActive)}>
        Clientes
      </NavLink>
      <NavLink to="/unidades" className={({ isActive }) => clase(isActive)}>
        Unidades
      </NavLink>
      <NavLink to="/productos" className={clase(enCompras)} aria-current={enCompras ? "page" : undefined}>
        Proveedores y productos
      </NavLink>
    </nav>
  );
}

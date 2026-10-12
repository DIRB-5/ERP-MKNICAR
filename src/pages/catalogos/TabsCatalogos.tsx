import { NavLink, useLocation } from "react-router-dom";
import styles from "./Catalogo.module.css";

export function TabsCatalogos() {
  const { pathname } = useLocation();
  const clase = (activa: boolean) => `${styles.tab} ${activa ? styles.tabActiva : ""}`;
  return (
    <nav className={styles.tabs} aria-label="Catálogos">
      <NavLink to="/clientes" className={({ isActive }) => clase(isActive)}>
        Clientes
      </NavLink>
      <NavLink to="/unidades" className={({ isActive }) => clase(isActive)}>
        Unidades
      </NavLink>
      {/* El padrón de proveedores vive en compras; aquí solo se enlaza. */}
      <NavLink to="/compras/proveedores" className={({ isActive }) => clase(isActive)}>
        Proveedores
      </NavLink>
      <NavLink to="/productos" className={clase(pathname.startsWith("/productos"))} aria-current={pathname.startsWith("/productos") ? "page" : undefined}>
        Productos
      </NavLink>
    </nav>
  );
}

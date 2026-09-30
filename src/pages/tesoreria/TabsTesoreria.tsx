import { NavLink } from "react-router-dom";
import styles from "@/pages/tableros/Tableros.module.css";

export function TabsTesoreria() {
  const clase = ({ isActive }: { isActive: boolean }) => `${styles.tab} ${isActive ? styles.tabActiva : ""}`;
  return (
    <nav className={styles.tabs} aria-label="Tesorería">
      <NavLink to="/tesoreria" end className={clase}>
        Dashboard financiero
      </NavLink>
      <NavLink to="/tesoreria/cuentas-por-pagar" className={clase}>
        Cuentas por pagar
      </NavLink>
      <NavLink to="/tesoreria/cuentas-por-cobrar" className={clase}>
        Cuentas por cobrar
      </NavLink>
    </nav>
  );
}

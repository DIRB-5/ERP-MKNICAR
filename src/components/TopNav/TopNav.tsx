import { NavLink } from "react-router-dom";
import styles from "./TopNav.module.css";

export interface ItemNav {
  etiqueta: string;
  to?: string;
  /** Un módulo que todavía no existe se muestra deshabilitado, no se oculta. */
  proximamente?: boolean;
  /** Solo donde el número implique trabajo pendiente. */
  contador?: number;
}

export interface TopNavProps {
  items: readonly ItemNav[];
  usuario: { nombre: string; rol: string; iniciales: string };
  notificaciones?: number;
  taller: string;
  periodo: string;
  onCambiarTaller?: () => void;
  onCambiarPeriodo?: () => void;
  onBuscar?: () => void;
}

/**
 * Header de dos filas. Es el armazón de la aplicación: no hay sidebar.
 *
 * Fila 1: marca, navegación horizontal y usuario.
 * Fila 2: alcance de la consulta — taller, periodo y buscador.
 *
 * Ambas filas se centran a `--content-max`.
 */
export function TopNav({
  items,
  usuario,
  notificaciones,
  taller,
  periodo,
  onCambiarTaller,
  onCambiarPeriodo,
  onBuscar,
}: TopNavProps) {
  return (
    <header className={styles.header}>
      <div className={styles.fila1}>
        <div className={styles.marca}>MKNICAR</div>
        <div className={styles.divisor} />

        <nav className={styles.nav} aria-label="Navegación principal">
          {items.map((it) =>
            it.proximamente || !it.to ? (
              <span
                key={it.etiqueta}
                className={`${styles.item} ${styles.off}`}
                aria-disabled="true"
              >
                {it.etiqueta}
                <span className={styles.tooltip}>Próximamente</span>
              </span>
            ) : (
              <NavLink
                key={it.etiqueta}
                to={it.to}
                end={it.to === "/"}
                className={({ isActive }) =>
                  `${styles.item} ${isActive ? styles.activo : ""}`
                }
              >
                {({ isActive }) => (
                  <>
                    {/* Punto naranja: marca dónde estás. No es estado ni área. */}
                    {isActive && <span className={styles.punto} />}
                    <span className={styles.label}>{it.etiqueta}</span>
                    {it.contador != null && (
                      <span className={styles.contador}>{it.contador}</span>
                    )}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className={styles.derecha}>
          <button type="button" className={styles.campana} aria-label="Notificaciones">
            <span aria-hidden="true">◔</span>
            {notificaciones != null && notificaciones > 0 && (
              <span className={styles.badge}>{notificaciones}</span>
            )}
          </button>
          <button
            type="button"
            className={styles.usuario}
            title={`${usuario.nombre} · ${usuario.rol}`}
          >
            <span className={styles.avatar}>{usuario.iniciales}</span>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </button>
        </div>
      </div>

      <div className={styles.fila2wrap}>
        <div className={styles.fila2}>
          <button type="button" className={styles.control} onClick={onCambiarTaller}>
            <span className={styles.controlEtiqueta}>Taller</span>
            <span className={styles.controlValor}>{taller}</span>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </button>

          <button type="button" className={styles.control} onClick={onCambiarPeriodo}>
            <span className={styles.controlEtiqueta}>Periodo</span>
            <span className={styles.controlValor}>{periodo}</span>
            <span className={styles.chevron} aria-hidden="true">▾</span>
          </button>

          <button type="button" className={styles.buscador} onClick={onBuscar}>
            <span aria-hidden="true">⌕</span>
            <span>Buscar O.S., unidad, cliente, factura…</span>
            <kbd className={styles.kbd}>⌘K</kbd>
          </button>

          <div className={styles.sesion}>
            <b>{usuario.nombre}</b>
            <span>· {usuario.rol}</span>
          </div>
        </div>
      </div>
    </header>
  );
}

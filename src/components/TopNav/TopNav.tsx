import { useEffect, useRef, useState, type ReactNode } from "react";
import { NavLink, matchPath, useLocation } from "react-router-dom";
import styles from "./TopNav.module.css";

export interface ItemNav {
  etiqueta: string;
  to?: string;
  /** Un módulo que todavía no existe se muestra deshabilitado, no se oculta. */
  proximamente?: boolean;
  /** Solo donde el número implique trabajo pendiente. */
  contador?: number;
  /** Otras rutas que pertenecen a este módulo, p. ej. `/operacion` bajo Dashboard. */
  tambienEn?: readonly string[];
  /** Opciones que se despliegan al pasar el mouse o al llegar con el teclado. */
  submenu?: readonly { etiqueta: string; to: string }[];
}

/**
 * Desplegable de un item del menú. Se posiciona respecto al encabezado y no
 * dentro de `.nav`, cuyo scroll horizontal lo recortaría. Cierra con un
 * pequeño retraso para que el mouse cruce el hueco entre item y menú.
 */
function ConSubmenu({ item, children }: { item: ItemNav; children: ReactNode }) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const abrir = () => {
    window.clearTimeout(timer.current);
    const r = ref.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + 4, left: r.left });
  };
  const cerrar = () => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPos(null), 150);
  };

  return (
    <div
      ref={ref}
      className={styles.conSubmenu}
      onMouseEnter={abrir}
      onMouseLeave={cerrar}
      onFocus={abrir}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) cerrar();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          setPos(null);
          ref.current?.querySelector("a")?.focus();
        }
      }}
    >
      {children}
      {pos && (
        <ul className={styles.submenu} style={{ top: pos.top, left: pos.left }} aria-label={item.etiqueta}>
          {item.submenu?.map((s) => (
            <li key={s.to}>
              <NavLink
                to={s.to}
                // "/tesoreria" no debe marcarse dentro de "/tesoreria/cuentas-por-pagar".
                end={item.submenu?.some((o) => o.to !== s.to && o.to.startsWith(`${s.to}/`))}
                className={({ isActive }) => `${styles.subitem} ${isActive ? styles.subitemActivo : ""}`}
                onClick={() => setPos(null)}
              >
                {s.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
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
  const { pathname } = useLocation();
  const activoExtra = (it: ItemNav) =>
    it.tambienEn?.some((ruta) => matchPath({ path: ruta, end: false }, pathname) != null) ?? false;

  const enlace = (it: ItemNav, to: string) => (
    <NavLink
      key={it.etiqueta}
      to={to}
      end={to === "/"}
      className={({ isActive }) => `${styles.item} ${isActive || activoExtra(it) ? styles.activo : ""}`}
    >
      {({ isActive: exacto }) => {
        const isActive = exacto || activoExtra(it);
        return (
          <>
            {/* Punto naranja: marca dónde estás. No es estado ni área. */}
            {isActive && <span className={styles.punto} />}
            <span className={styles.label}>{it.etiqueta}</span>
            {it.contador != null && <span className={styles.contador}>{it.contador}</span>}
          </>
        );
      }}
    </NavLink>
  );

  return (
    <header className={styles.header}>
      <div className={styles.fila1}>
        <img className={styles.marca} src="/mknicar-wordmark.png" alt="MKnicar" />
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
            ) : it.submenu ? (
              <ConSubmenu key={it.etiqueta} item={it}>
                {enlace(it, it.to)}
              </ConSubmenu>
            ) : (
              enlace(it, it.to)
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

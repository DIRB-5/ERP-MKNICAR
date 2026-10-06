import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, matchPath, useLocation } from "react-router-dom";
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
  /**
   * Opciones del módulo. Se despliegan al pasar el mouse y, dentro del módulo,
   * se muestran todas en la barra del módulo. `accion` las separa a la derecha.
   */
  submenu?: readonly OpcionModulo[];
}

export type OpcionModulo =
  | {
      etiqueta: string;
      to: string;
      /** Crea algo (alta, ingreso) en lugar de llevar a una consulta. */
      accion?: boolean;
      proximamente?: undefined;
    }
  /** Pantalla que todavía no existe: se ve deshabilitada, como en el menú principal. */
  | { etiqueta: string; proximamente: true; to?: undefined; accion?: undefined };

const coincide = (to: string, pathname: string) =>
  to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

/**
 * Opción vigente: la ruta más específica que contiene a la actual. Así
 * `/ordenes/nueva` marca "Nueva O.S." y no "Órdenes", y `/catalogos/servicios`
 * marca Servicios y no el índice.
 */
function opcionVigente(opciones: readonly OpcionModulo[], pathname: string): string | undefined {
  return opciones
    .flatMap((o) => (o.to != null && coincide(o.to, pathname) ? [o] : []))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to;
}

/**
 * Desplegable de un item del menú. Se posiciona respecto al encabezado y no
 * dentro de `.nav`, cuyo scroll horizontal lo recortaría. Cierra con un
 * pequeño retraso para que el mouse cruce el hueco entre item y menú.
 */
function ConSubmenu({ item, children }: { item: ItemNav; children: ReactNode }) {
  const { pathname } = useLocation();
  const vigente = opcionVigente(item.submenu ?? [], pathname);
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
          ref.current?.querySelector<HTMLElement>("a, button")?.focus();
        }
      }}
    >
      {children}
      {pos && (
        <ul className={styles.submenu} style={{ top: pos.top, left: pos.left }} aria-label={item.etiqueta}>
          {item.submenu?.map((s) => (
            <li key={s.etiqueta}>
              {s.to == null ? (
                <span className={`${styles.subitem} ${styles.subitemOff}`} aria-disabled="true">
                  {s.etiqueta}
                  <span className={styles.subitemNota}>Próximamente</span>
                </span>
              ) : (
                <NavLink
                  to={s.to}
                  className={`${styles.subitem} ${s.to === vigente ? styles.subitemActivo : ""}`}
                  aria-current={s.to === vigente ? "page" : undefined}
                  onClick={() => setPos(null)}
                >
                  {s.etiqueta}
                </NavLink>
              )}
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

/** Todas las opciones del módulo donde estás, a la vista y sin desplegar nada. */
function BarraModulo({ item, pathname }: { item: ItemNav; pathname: string }) {
  const opciones = item.submenu ?? [];
  const vigente = opcionVigente(opciones, pathname);
  const enlace = (o: OpcionModulo) =>
    o.to == null ? (
      <span key={o.etiqueta} className={`${styles.moduloItem} ${styles.moduloOff}`} aria-disabled="true" title="Próximamente">
        {o.etiqueta}
      </span>
    ) : (
      <Link
        key={o.to}
        to={o.to}
        className={`${o.accion ? styles.moduloAccion : styles.moduloItem} ${o.to === vigente ? styles.moduloActivo : ""}`}
        aria-current={o.to === vigente ? "page" : undefined}
      >
        {o.accion && <span aria-hidden="true">+</span>}
        {o.etiqueta}
      </Link>
    );
  const consultas = opciones.filter((o) => !o.accion);
  const acciones = opciones.filter((o) => o.accion);

  return (
    <div className={styles.filaModuloWrap}>
      <nav className={styles.filaModulo} aria-label={`Opciones de ${item.etiqueta}`}>
        <span className={styles.moduloNombre}>{item.etiqueta}</span>
        <div className={styles.moduloLista}>{consultas.map(enlace)}</div>
        {acciones.length > 0 && <div className={styles.moduloAcciones}>{acciones.map(enlace)}</div>}
      </nav>
    </div>
  );
}

/**
 * Header de dos filas. Es el armazón de la aplicación: no hay sidebar.
 *
 * Fila 1: marca, navegación horizontal y usuario.
 * Barra del módulo: todas sus opciones, cuando el módulo tiene submenú.
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
  const modulo = items.find(
    (it) => !it.proximamente && ((it.to != null && coincide(it.to, pathname)) || activoExtra(it))
  );

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
            // Agrupador sin pantalla propia: solo abre sus opciones.
            !it.to && it.submenu ? (
              <ConSubmenu key={it.etiqueta} item={it}>
                <button
                  type="button"
                  className={`${styles.item} ${styles.itemGrupo} ${activoExtra(it) ? styles.activo : ""}`}
                  aria-haspopup="true"
                >
                  {activoExtra(it) && <span className={styles.punto} />}
                  <span className={styles.label}>{it.etiqueta}</span>
                </button>
              </ConSubmenu>
            ) : it.proximamente || !it.to ? (
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

      {modulo?.submenu && <BarraModulo item={modulo} pathname={pathname} />}

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

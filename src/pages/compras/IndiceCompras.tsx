import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { NAVEGACION } from "@/app/navegacion";
import c from "@/pages/catalogos/Catalogo.module.css";
import g from "@/pages/catalogos/CatalogosGenericos.module.css";
import s from "./Proveedores.module.css";

/** Qué resuelve cada sección activa. Las pendientes solo dicen que vienen. */
const DESCRIPCION: Record<string, string> = {
  "/compras/proveedores": "Padrón, datos fiscales, documentos del SAT y condiciones de pago.",
  "/compras/comparativos": "Requisiciones con cotizaciones recibidas, listas para elegir proveedor.",
  "/tesoreria/cuentas-por-pagar": "Lo que se debe a cada proveedor y cuándo vence.",
};

/**
 * Raíz del módulo de compras. Las secciones salen del mismo submenú que el
 * menú principal, para que nunca digan cosas distintas.
 */
export function Component() {
  const modulo = NAVEGACION.find((it) => it.to === "/compras");
  const secciones = modulo?.submenu ?? [];

  return (
    <div className={c.vista}>
      <header className={c.encabezado}>
        <div>
          <h1 className={c.titulo}>{modulo?.etiqueta ?? "Compras"}</h1>
          <p className={s.subtitulo}>
            Del pedido a la factura: lo que se pide, lo que llega y lo que el proveedor cobra tienen que cuadrar.
          </p>
        </div>
      </header>

      <ul className={g.tarjetas}>
        {secciones.map((o) =>
          o.to == null ? (
            <li key={o.etiqueta}>
              <Surface className={`${g.tarjeta} ${s.pendiente}`} aria-disabled="true">
                <span className={g.nombre}>{o.etiqueta}</span>
                <span className={g.meta}>Próximamente</span>
              </Surface>
            </li>
          ) : (
            <li key={o.etiqueta}>
              <Link to={o.to} className={g.enlace}>
                <Surface className={g.tarjeta}>
                  <span className={g.nombre}>{o.etiqueta}</span>
                  {DESCRIPCION[o.to] && <span className={g.descripcion}>{DESCRIPCION[o.to]}</span>}
                </Surface>
              </Link>
            </li>
          )
        )}
      </ul>
    </div>
  );
}

Component.displayName = "IndiceCompras";

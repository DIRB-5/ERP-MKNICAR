import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { PuntoArea } from "@/components/PuntoArea/PuntoArea";
import { FAMILIAS, FAMILIA_LABEL, catalogosDeFamilia } from "@/domain/catalogos";
import c from "./Catalogo.module.css";
import s from "./CatalogosGenericos.module.css";

/** Pantallas con expediente propio: no son solo listas, así que no viven en el registro. */
const ESPECIALIZADAS = [
  { to: "/clientes", nombre: "Clientes", descripcion: "Cartera, contactos de autorización y convenio." },
  { to: "/unidades", nombre: "Unidades", descripcion: "Padrón de vehículos, ficha técnica e historial de O.S." },
  { to: "/productos", nombre: "Proveedores y productos", descripcion: "Refacciones, precios por proveedor y padrón de proveedores." },
] as const;

export function Component() {
  return (
    <div className={c.vista}>
      <header className={c.encabezado}>
        <div>
          <h1 className={c.titulo}>Catálogos</h1>
          <p className={s.subtitulo}>Lo que el sistema necesita saber de antemano para cotizar, comprar y medir.</p>
        </div>
      </header>

      <section aria-labelledby="fam-padron">
        <h2 id="fam-padron" className={s.familia}>Padrón</h2>
        <p className={s.familiaDesc}>Clientes, unidades y proveedores, cada uno con su expediente.</p>
        <ul className={s.tarjetas}>
          {ESPECIALIZADAS.map((e) => (
            <li key={e.to}>
              <Link to={e.to} className={s.enlace}>
                <Surface className={s.tarjeta}>
                  <span className={s.nombre}>{e.nombre}</span>
                  <span className={s.descripcion}>{e.descripcion}</span>
                </Surface>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {FAMILIAS.map((f) => (
        <section key={f} aria-labelledby={`fam-${f}`}>
          <h2 id={`fam-${f}`} className={s.familia}>{FAMILIA_LABEL[f].nombre}</h2>
          <p className={s.familiaDesc}>{FAMILIA_LABEL[f].descripcion}</p>
          <ul className={s.tarjetas}>
            {catalogosDeFamilia(f).map((def) => (
              <li key={def.clave}>
                <Link to={`/catalogos/${def.clave}`} className={s.enlace}>
                  <Surface className={s.tarjeta}>
                    <span className={s.nombre}>
                      {def.area && <PuntoArea area={def.area} />}
                      {def.nombre}
                    </span>
                    <span className={s.descripcion}>{def.descripcion}</span>
                    {def.porTaller && <span className={s.meta}>Por taller</span>}
                  </Surface>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

Component.displayName = "IndiceCatalogos";

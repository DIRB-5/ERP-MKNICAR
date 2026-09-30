import { Link, useSearchParams } from "react-router-dom";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { ColaIngresos } from "./Recepcion";
import { KanbanOrdenes } from "./KanbanOrdenes";
import { TablaOrdenes } from "./TablaOrdenes";
import { CalendarioEntregas } from "./CalendarioEntregas";
import styles from "./Ordenes.module.css";

// "Ingresos de hoy" es la vista por defecto; más adelante dependerá del rol.
const VISTAS = [
  { id: "ingresos", etiqueta: "Ingresos de hoy" },
  { id: "kanban", etiqueta: "Kanban" },
  { id: "tabla", etiqueta: "Tabla" },
  { id: "calendario", etiqueta: "Calendario" },
] as const;

type Vista = (typeof VISTAS)[number]["id"];

const esVista = (v: string | null): v is Vista => VISTAS.some((o) => o.id === v);

export function Component() {
  // La vista vive en la URL para que un enlace compartido abra la misma.
  const [params, setParams] = useSearchParams();
  const crudo = params.get("vista");
  // "tablero" fue su nombre un tiempo: los enlaces viejos siguen sirviendo.
  const vista: Vista = crudo === "tablero" ? "kanban" : esVista(crudo) ? crudo : "ingresos";

  const cambiarVista = (v: Vista) => {
    const siguiente = new URLSearchParams(params);
    siguiente.set("vista", v);
    siguiente.delete("recibida");
    siguiente.delete("programada");
    setParams(siguiente, { replace: true });
  };

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <h1 className={styles.titulo}>Órdenes de Servicio</h1>
        <SegmentedControl etiqueta="Vista" opciones={VISTAS} valor={vista} onCambiar={cambiarVista} />
        <Link to="/ordenes/nueva" className={`${styles.botonPrimario} ${styles.alFinal}`}>
          + Crear O.S.
        </Link>
      </header>
      {vista === "ingresos" && <ColaIngresos />}
      {vista === "kanban" && <KanbanOrdenes />}
      {vista === "tabla" && <TablaOrdenes />}
      {vista === "calendario" && <CalendarioEntregas />}
    </div>
  );
}

Component.displayName = "ListaOrdenes";

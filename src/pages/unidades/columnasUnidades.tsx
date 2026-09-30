import { Link } from "react-router-dom";
import type { Columna } from "@/components/DataTable/DataTable";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { fecha, numero } from "@/domain/format";
import type { UnidadResumen } from "@/domain/tipos";
import { fechaLocal } from "@/app/fechas";
import { ChipEstadoUnidad, ChipFueraDeBase, TIPO_UNIDAD } from "@/pages/catalogos/etiquetas";
import styles from "@/pages/catalogos/Catalogo.module.css";

export const rutaUnidad = (placas: string) => `/unidades/${encodeURIComponent(placas)}`;

/**
 * Dónde está la unidad sale de su O.S. abierta, nunca de un campo propio.
 * Si está en un taller distinto de su base, se marca.
 */
export function Ubicacion({ u }: { u: UnidadResumen }) {
  if (!u.osAbierta) return <span>En operación</span>;
  const fuera = u.osAbierta.taller.id !== u.tallerBase.id;
  return (
    <span className={styles.ubicacion}>
      <span className={styles.celdaFuerte}>En piso · {u.osAbierta.taller.nombre}</span>
      <Folio folio={u.osAbierta.folio} tipo="os" />
      {fuera && <ChipFueraDeBase base={u.tallerBase.nombre} />}
    </span>
  );
}

const TODAS: readonly Columna<UnidadResumen>[] = [
  {
    id: "placas",
    encabezado: "Placas",
    fija: true,
    celda: (u) => (
      <Link to={rutaUnidad(u.unidad.placas)} className={styles.enlace}>
        <Folio folio={u.unidad.placas} />
      </Link>
    ),
  },
  {
    id: "unidad",
    encabezado: "Unidad",
    celda: (u) => (
      <span className={styles.ubicacion}>
        <span className={styles.celdaFuerte}>
          {u.unidad.marca} {u.unidad.modelo} {u.unidad.anio}
        </span>
        <Chip>{TIPO_UNIDAD[u.unidad.tipo]}</Chip>
      </span>
    ),
  },
  {
    id: "cliente",
    encabezado: "Cliente",
    celda: (u) => (
      <Link to={`/clientes/${encodeURIComponent(u.cliente.id)}`} className={styles.enlace}>
        {u.cliente.razonSocial}
      </Link>
    ),
  },
  { id: "base", encabezado: "Taller base", celda: (u) => u.tallerBase.nombre },
  { id: "ubicacion", encabezado: "Ubicación", celda: (u) => <Ubicacion u={u} /> },
  {
    id: "km",
    encabezado: "Kilometraje",
    numerica: true,
    celda: (u) => (
      <div>
        {numero(u.unidad.kilometrajeUltimo)} km
        <div className={styles.secundario}>{fecha(fechaLocal(u.unidad.fechaKilometraje), { anio: true })}</div>
      </div>
    ),
  },
  {
    id: "servicio",
    encabezado: "Último servicio",
    numerica: true,
    celda: (u) => (u.ultimoServicio ? fecha(fechaLocal(u.ultimoServicio), { anio: true }) : "—"),
  },
  { id: "abiertas", encabezado: "O.S. abiertas", numerica: true, celda: (u) => numero(u.osAbiertas) },
  { id: "estado", encabezado: "Estado", celda: (u) => <ChipEstadoUnidad estado={u.unidad.estado} /> },
];

export const COLUMNAS_UNIDADES = TODAS;

/** Dentro del expediente de un cliente la columna Cliente sobra. */
export const COLUMNAS_UNIDADES_DE_CLIENTE = TODAS.filter((c) => c.id !== "cliente");

import type { Area } from "./areas";

/**
 * Registro declarativo de los catálogos del negocio. Todos tienen la misma
 * forma —lista con búsqueda, alta, edición y baja lógica—, así que una sola
 * pantalla genérica los consume. Un catálogo nuevo se agrega aquí, no con
 * una pantalla nueva.
 *
 * Las pantallas especializadas (Clientes, Unidades, Proveedores y productos)
 * conviven con este registro: tienen expediente propio y no son solo listas.
 */

export type TipoCampo =
  | "texto"
  | "numero"
  | "moneda"
  | "porcentaje"
  | "booleano"
  | "seleccion"
  | "referencia"
  | "textoLargo";

export type CampoCatalogo = {
  clave: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  /** Se muestra bajo el campo, no como tooltip. */
  ayuda?: string;
  /** Solo tipo "seleccion". */
  opciones?: readonly string[];
  /** Solo tipo "referencia". */
  catalogoRef?: ClaveCatalogo;
  /** Calculado por el backend. */
  soloLectura?: boolean;
};

export type ColumnaCatalogo = {
  /** Clave de un campo o una columna derivada ("activo"). */
  clave: string;
  etiqueta: string;
  alineacion?: "izquierda" | "derecha";
  ancho?: string;
};

export const FAMILIAS = ["conceptos"] as const;
export type FamiliaCatalogo = (typeof FAMILIAS)[number];

export const FAMILIA_LABEL: Record<FamiliaCatalogo, { nombre: string; descripcion: string }> = {
  conceptos: {
    nombre: "Conceptos",
    descripcion: "Servicios y productos: todo lo que se cotiza y se cobra en una O.S.",
  },
};

export type ClaveCatalogo = "servicios";

export type CatalogoDef = {
  clave: ClaveCatalogo;
  /** Plural, como lo dice el negocio. */
  nombre: string;
  /** Para "Nuevo <singular>". */
  nombreSingular: string;
  familia: FamiliaCatalogo;
  /** Una línea: qué controla y por qué existe. */
  descripcion: string;
  /** Color del dato (--dom). */
  area?: Area;
  columnas: readonly ColumnaCatalogo[];
  campos: readonly CampoCatalogo[];
  /** true = el registro pertenece a una sucursal. */
  porTaller: boolean;
};

export const CATALOGOS: Record<ClaveCatalogo, CatalogoDef> = {
  /*
   * PROVISIONAL: campos propuestos a partir de la ventana de O.S. del sistema
   * anterior (clave, descripción, unidad, precio). Se ajustan con la
   * especificación completa del cliente.
   */
  servicios: {
    clave: "servicios",
    nombre: "Servicios",
    nombreSingular: "servicio",
    familia: "conceptos",
    descripcion: "Mano de obra que se cotiza en el presupuesto, con su tiempo estándar para medir al técnico.",
    area: "operacion",
    porTaller: false,
    columnas: [
      { clave: "clave", etiqueta: "Clave", ancho: "9rem" },
      { clave: "descripcion", etiqueta: "Descripción" },
      { clave: "unidad", etiqueta: "Unidad" },
      { clave: "horasEstandar", etiqueta: "Horas estándar", alineacion: "derecha" },
      { clave: "precio", etiqueta: "Precio", alineacion: "derecha" },
      { clave: "activo", etiqueta: "Estado" },
    ],
    campos: [
      { clave: "clave", etiqueta: "Clave", tipo: "texto", requerido: true, ayuda: "Como aparece en el presupuesto, p. ej. MO-FRE." },
      { clave: "descripcion", etiqueta: "Descripción", tipo: "texto", requerido: true },
      { clave: "unidad", etiqueta: "Unidad", tipo: "seleccion", requerido: true, opciones: ["Servicio", "Hora"] },
      {
        clave: "horasEstandar",
        etiqueta: "Horas estándar",
        tipo: "numero",
        ayuda: "Tiempo que debería tomar. Se compara con las horas reales del técnico.",
      },
      { clave: "precio", etiqueta: "Precio de lista", tipo: "moneda", requerido: true, ayuda: "Sin IVA." },
      { clave: "aplicaIva", etiqueta: "Causa IVA", tipo: "booleano" },
      { clave: "notas", etiqueta: "Notas", tipo: "textoLargo" },
    ],
  },
};

export const catalogosDeFamilia = (f: FamiliaCatalogo): CatalogoDef[] =>
  Object.values(CATALOGOS).filter((c) => c.familia === f);

export const esClaveCatalogo = (v: string | undefined): v is ClaveCatalogo => v != null && v in CATALOGOS;

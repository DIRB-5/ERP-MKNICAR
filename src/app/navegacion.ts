import type { ItemNav } from "@/components/TopNav/TopNav";

/**
 * Menú horizontal. Los módulos que aún no existen se muestran
 * deshabilitados: el usuario necesita saber que vienen.
 */
export const NAVEGACION: readonly ItemNav[] = [
  { etiqueta: "Dashboard", to: "/", tambienEn: ["/operacion"] },
  { etiqueta: "Órdenes de Servicio", to: "/ordenes" },
  { etiqueta: "Cotizaciones", proximamente: true },
  { etiqueta: "Compras", proximamente: true },
  {
    etiqueta: "Tesorería",
    to: "/tesoreria",
    submenu: [
      { etiqueta: "Dashboard financiero", to: "/tesoreria" },
      { etiqueta: "Cuentas por pagar", to: "/tesoreria/cuentas-por-pagar" },
      { etiqueta: "Cuentas por cobrar", to: "/tesoreria/cuentas-por-cobrar" },
    ],
  },
  { etiqueta: "Almacén", proximamente: true },
  { etiqueta: "Facturación", proximamente: true },
  {
    etiqueta: "Personal",
    to: "/personal",
    submenu: [
      { etiqueta: "Dashboard personal y mano de obra", to: "/personal" },
      { etiqueta: "Nuevo técnico", to: "/personal/tecnicos/nuevo" },
    ],
  },
  { etiqueta: "Reportes", proximamente: true },
  {
    etiqueta: "Catálogos",
    to: "/clientes",
    tambienEn: ["/unidades", "/productos", "/proveedores"],
    submenu: [
      { etiqueta: "Clientes", to: "/clientes" },
      { etiqueta: "Unidades", to: "/unidades" },
      { etiqueta: "Proveedores y productos", to: "/productos" },
    ],
  },
  { etiqueta: "Administración", proximamente: true },
];

/** Alcance de la consulta. El taller activo filtra en el repositorio. */
export const TALLERES = [
  "Todos los talleres",
  "Toluca",
  "CDMX",
  "Querétaro",
  "Monterrey",
  "Guadalajara",
  "Puebla",
] as const;

export const RANGOS = [
  "Este mes",
  "Mes anterior",
  "Trimestre en curso",
  "Año a la fecha",
] as const;

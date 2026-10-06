import type { ItemNav } from "@/components/TopNav/TopNav";
import { CATALOGOS } from "@/domain/catalogos";

/**
 * Menú horizontal. Los módulos que aún no existen se muestran
 * deshabilitados: el usuario necesita saber que vienen.
 */
export const NAVEGACION: readonly ItemNav[] = [
  {
    etiqueta: "Dashboard",
    to: "/",
    tambienEn: ["/operacion"],
    submenu: [
      { etiqueta: "Dirección general", to: "/" },
      { etiqueta: "Operación", to: "/operacion" },
    ],
  },
  {
    etiqueta: "Órdenes de Servicio",
    to: "/ordenes",
    submenu: [
      { etiqueta: "Órdenes de servicio", to: "/ordenes" },
      { etiqueta: "Recepción de unidades", to: "/ordenes/recepcion" },
      { etiqueta: "Nueva O.S.", to: "/ordenes/nueva", accion: true },
      { etiqueta: "Ingreso directo", to: "/ordenes/ingreso-directo", accion: true },
    ],
  },
  {
    // Agrupa el trabajo comercial y operativo alrededor de la O.S.
    etiqueta: "Operaciones",
    submenu: [
      { etiqueta: "Cotizaciones", proximamente: true },
      { etiqueta: "Comprobantes", proximamente: true },
      // Misma pantalla que en Tesorería: un solo lugar donde vive el dato.
      { etiqueta: "Cuentas por cobrar", to: "/tesoreria/cuentas-por-cobrar" },
      { etiqueta: "Estados de cuenta", proximamente: true },
      { etiqueta: "Ingresos", proximamente: true },
      { etiqueta: "Banco / Caja", proximamente: true },
      { etiqueta: "Registro", proximamente: true },
      { etiqueta: "Consultar movimientos", proximamente: true },
      { etiqueta: "Consultar saldos", proximamente: true },
      { etiqueta: "Citas", proximamente: true },
    ],
  },
  {
    etiqueta: "Proveedores",
    // Compras vive aquí: la requisición y su comparativo son parte del ciclo con el proveedor.
    tambienEn: ["/compras", "/requisiciones"],
    submenu: [
      { etiqueta: "Órdenes de Compra", proximamente: true },
      { etiqueta: "Conceptos de Órdenes de Compra", proximamente: true },
      { etiqueta: "Comprobantes de Órdenes de Compra", proximamente: true },
      { etiqueta: "Requisiciones", proximamente: true },
      { etiqueta: "Comparativo de cotizaciones", to: "/compras/comparativos" },
      // Misma pantalla que en Tesorería: un solo lugar donde vive el dato.
      { etiqueta: "Cuentas por pagar", to: "/tesoreria/cuentas-por-pagar" },
      { etiqueta: "Egresos", proximamente: true },
      { etiqueta: "Configuración", proximamente: true },
    ],
  },
  { etiqueta: "Inventarios", proximamente: true },
  {
    etiqueta: "Tesorería",
    to: "/tesoreria",
    submenu: [
      { etiqueta: "Dashboard financiero", to: "/tesoreria" },
      { etiqueta: "Cuentas por pagar", to: "/tesoreria/cuentas-por-pagar" },
      { etiqueta: "Cuentas por cobrar", to: "/tesoreria/cuentas-por-cobrar" },
    ],
  },
  // Antes "Almacén": la unidad de negocio a la que se dirige gasto o utilidad. No es el inventario.
  { etiqueta: "Unidades de Negocio", proximamente: true },
  { etiqueta: "Facturación", proximamente: true },
  {
    etiqueta: "Personal",
    to: "/personal",
    submenu: [
      { etiqueta: "Dashboard personal y mano de obra", to: "/personal" },
      { etiqueta: "Nuevo técnico", to: "/personal/tecnicos/nuevo", accion: true },
    ],
  },
  { etiqueta: "Reportes", proximamente: true },
  {
    etiqueta: "Catálogos",
    to: "/catalogos",
    tambienEn: ["/clientes", "/unidades", "/productos", "/proveedores"],
    submenu: [
      // Las altas no van aquí: cada catálogo tiene su "+ Nuevo" en su pantalla.
      { etiqueta: "Clientes", to: "/clientes" },
      { etiqueta: "Unidades", to: "/unidades" },
      { etiqueta: "Proveedores", to: "/proveedores" },
      { etiqueta: "Productos", to: "/productos" },
      // Cada catálogo del registro aparece solo: no se da de alta aquí a mano.
      ...Object.values(CATALOGOS).map((c) => ({ etiqueta: c.nombre, to: `/catalogos/${c.clave}` })),
      // Pendientes de definir sus campos con el cliente.
      { etiqueta: "Conceptos", proximamente: true },
      { etiqueta: "Lista de precios", proximamente: true },
      { etiqueta: "Configuración de comisiones", proximamente: true },
      { etiqueta: "Comisiones Presupuestos Jerarquías", proximamente: true },
      { etiqueta: "Presupuestos", proximamente: true },
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

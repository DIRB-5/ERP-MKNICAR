import { createBrowserRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

/**
 * Rutas de la fase 1. Cada módulo se agrega aquí conforme se construye;
 * las páginas viven en src/pages/<modulo>/.
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, lazy: () => import("@/pages/tableros/DireccionGeneral") },
      { path: "operacion", lazy: () => import("@/pages/tableros/Operacion") },
      { path: "ordenes", lazy: () => import("@/pages/ordenes/ListaOrdenes") },
      { path: "ordenes/nueva", lazy: () => import("@/pages/ordenes/CrearOrden") },
      { path: "ordenes/recepcion", lazy: () => import("@/pages/ordenes/Recepcion") },
      { path: "ordenes/recepcion/:folio", lazy: () => import("@/pages/ordenes/RecepcionOS") },
      { path: "ordenes/ingreso-directo", lazy: () => import("@/pages/ordenes/IngresoDirecto") },
      { path: "ordenes/:folio", lazy: () => import("@/pages/ordenes/DetalleOrden") },
      { path: "clientes", lazy: () => import("@/pages/clientes/ListaClientes") },
      { path: "clientes/nuevo", lazy: () => import("@/pages/clientes/NuevoCliente") },
      { path: "clientes/:id", lazy: () => import("@/pages/clientes/DetalleCliente") },
      { path: "unidades", lazy: () => import("@/pages/unidades/ListaUnidades") },
      { path: "unidades/nueva", lazy: () => import("@/pages/unidades/NuevaUnidad") },
      { path: "unidades/:placas", lazy: () => import("@/pages/unidades/DetalleUnidad") },
      { path: "catalogos", lazy: () => import("@/pages/catalogos/IndiceCatalogos") },
      { path: "catalogos/:clave", lazy: () => import("@/pages/catalogos/ListaCatalogo") },
      { path: "catalogos/:clave/:id", lazy: () => import("@/pages/catalogos/FormCatalogo") },
      { path: "productos", lazy: () => import("@/pages/proveedores/ProveedoresProductos") },
      { path: "productos/nuevo", lazy: () => import("@/pages/proveedores/NuevoProducto") },
      { path: "proveedores", lazy: () => import("@/pages/proveedores/ProveedoresProductos") },
      { path: "proveedores/nuevo", lazy: () => import("@/pages/proveedores/NuevoProveedor") },
      { path: "tesoreria", lazy: () => import("@/pages/tesoreria/DashboardFinanciero") },
      { path: "tesoreria/cuentas-por-pagar", lazy: () => import("@/pages/tesoreria/CuentasPorPagar") },
      { path: "tesoreria/cuentas-por-cobrar", lazy: () => import("@/pages/tesoreria/CuentasPorCobrar") },
      { path: "compras/comparativos", lazy: () => import("@/pages/compras/Comparativos") },
      { path: "requisiciones/:folio", lazy: () => import("@/pages/compras/ComparativoCotizaciones") },
      { path: "personal", lazy: () => import("@/pages/personal/DashboardPersonal") },
      { path: "personal/tecnicos/nuevo", lazy: () => import("@/pages/personal/NuevoTecnico") },
      { path: "personal/tecnicos/:id/evaluacion", lazy: () => import("@/pages/personal/EvaluacionHabilidades") },
      { path: "personal/tecnicos/:id", lazy: () => import("@/pages/personal/PerfilTecnico") },
      { path: "*", lazy: () => import("@/pages/general/NoEncontrada") },
    ],
  },
]);

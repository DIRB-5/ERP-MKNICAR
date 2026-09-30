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
    ],
  },
]);

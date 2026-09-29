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
      { path: "ordenes/:folio", lazy: () => import("@/pages/ordenes/DetalleOrden") },
    ],
  },
]);

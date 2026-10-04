import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { router } from "./app/router";
import { marcarMuestra, quiereMuestra } from "./app/muestra";
import "./styles/index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
});

async function arrancar() {
  // Solo en desarrollo: en producción import.meta.env.DEV es false y Vite elimina
  // este bloque, así que dev/muestra.ts nunca llega al build.
  if (import.meta.env.DEV && quiereMuestra()) {
    const { cargarMuestra } = await import("../dev/muestra");
    cargarMuestra();
    marcarMuestra();
  }

  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </StrictMode>
  );
}

void arrancar();

import { useOutletContext } from "react-router-dom";

export interface ContextoShell {
  taller: string;
  setTaller: (taller: string) => void;
}

/** Taller activo del header. Provisional hasta que exista el contexto de sesión. */
export const useTaller = (): string => useOutletContext<ContextoShell>().taller;

export const useSetTaller = (): ((taller: string) => void) =>
  useOutletContext<ContextoShell>().setTaller;

import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "@/components/TopNav/TopNav";
import { NAVEGACION, TALLERES } from "./navegacion";
import { useConteoOrdenes } from "./useConteoOrdenes";
import type { ContextoShell } from "./useTaller";
import styles from "./AppShell.module.css";

export function AppShell() {
  // Provisional: sale del contexto de sesión cuando exista.
  const [taller, setTaller] = useState<string>(TALLERES[0]);
  const conteoOrdenes = useConteoOrdenes(taller);

  const items = useMemo(
    () =>
      NAVEGACION.map((it) =>
        it.to === "/ordenes" ? { ...it, contador: conteoOrdenes } : it
      ),
    [conteoOrdenes]
  );

  return (
    <div className={styles.shell}>
      <TopNav
        items={items}
        usuario={{ nombre: "—", rol: "—", iniciales: "—" }}
        taller={taller}
        periodo="Este mes"
        onCambiarTaller={() => setTaller(TALLERES[0])}
      />
      <main className={`${styles.contenido} scroll-y`}>
        <div className={styles.centro}>
          <Outlet context={{ taller, setTaller } satisfies ContextoShell} />
        </div>
      </main>
    </div>
  );
}

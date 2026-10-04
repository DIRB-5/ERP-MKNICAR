import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { TopNav } from "@/components/TopNav/TopNav";
import { NAVEGACION, TALLERES } from "./navegacion";
import { useConteoOrdenes } from "./useConteoOrdenes";
import type { ContextoShell } from "./useTaller";
import { muestraActiva } from "./muestra";
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
      {muestraActiva() && (
        <div className={styles.muestra} role="status">
          Estás viendo <b>datos de muestra</b> (solo desarrollo). <a href="/?muestra=0">Quitar muestra</a>
        </div>
      )}
      <main className={`${styles.contenido} scroll-y`}>
        <div className={styles.centro}>
          <Outlet context={{ taller, setTaller } satisfies ContextoShell} />
        </div>
      </main>
    </div>
  );
}

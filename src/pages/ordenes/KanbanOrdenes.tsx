import { Link } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { TarjetaOS } from "@/components/TarjetaOS/TarjetaOS";
import { moneda, numero } from "@/domain/format";
import { ETAPAS, ETAPA_LABEL, type Etapa } from "@/app/etapas";
import { useKanbanOrdenes } from "@/app/useKanbanOrdenes";
import { useTaller } from "@/app/useTaller";
import styles from "./KanbanOrdenes.module.css";

const NOTA: Record<Etapa, string> = {
  diagnostico: "monto estimado",
  cotizacion: "en captura y revisión",
  autorizacion: "detenidas con el cliente",
  compra_pago: "O.C. y tesorería",
  reparacion: "en piso de taller",
  entrega: "por remisionar",
};

/** Autorización del cliente es punto de espera medible: se marca en ámbar. */
const ES_ESPERA: Record<Etapa, boolean> = {
  diagnostico: false,
  cotizacion: false,
  autorizacion: true,
  compra_pago: false,
  reparacion: false,
  entrega: false,
};

export function KanbanOrdenes() {
  const taller = useTaller();
  const kanban = useKanbanOrdenes(taller);

  return (
    <div className={styles.kanban}>
      <div className={styles.leyenda} aria-label="Prioridad">
        <span><i className={styles.lCritica} />Prioridad crítica</span>
        <span><i className={styles.lAlta} />Alta</span>
        <span><i className={styles.lNormal} />Normal</span>
      </div>

      <div className={`${styles.tablero} scroll-x`}>
        {ETAPAS.map((etapa) => {
          const col = kanban?.[etapa];
          const titulo = ETAPA_LABEL[etapa];
          const espera = ES_ESPERA[etapa];
          const restantes = col ? col.conteo - col.tarjetas.length : 0;
          return (
            <Surface
              key={etapa}
              as="section"
              className={styles.columna}
              aria-label={titulo}
            >
              <header className={`${styles.head} ${espera ? styles.headEspera : ""}`}>
                <div className={styles.headFila}>
                  {espera && (
                    <span className={styles.aviso} aria-hidden="true">
                      ⚠
                    </span>
                  )}
                  <h2 className={styles.titulo}>{titulo}</h2>
                  <span className={`${styles.conteo} ${espera ? styles.conteoEspera : ""}`}>
                    {col ? numero(col.conteo) : "—"}
                  </span>
                </div>
                <div className={styles.headFila}>
                  <span className={styles.monto}>{col ? moneda(col.monto) : "—"}</span>
                  <span className={styles.nota}>{NOTA[etapa]}</span>
                </div>
              </header>

              <div className={`${styles.cuerpo} scroll-y`}>
                {col ? (
                  <>
                    {col.tarjetas.map((t) => (
                      <TarjetaOS key={t.folio} orden={t} />
                    ))}
                    {restantes > 0 && (
                      <Link to={`/ordenes?vista=tabla&etapa=${etapa}`} className={styles.mas}>
                        + {numero(restantes)} O.S. más
                      </Link>
                    )}
                  </>
                ) : (
                  <div className={styles.vacio}>Sin datos todavía</div>
                )}
              </div>
            </Surface>
          );
        })}
      </div>
    </div>
  );
}

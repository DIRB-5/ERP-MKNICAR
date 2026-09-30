import { Link, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { DataTable } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Chip } from "@/components/Chip/Chip";
import { fecha, numero } from "@/domain/format";
import { useExpedienteUnidad, useHistorialUnidad } from "@/data/consultas";
import { fechaLocal } from "@/app/fechas";
import { ChipEstadoUnidad, TIPO_UNIDAD } from "@/pages/catalogos/etiquetas";
import styles from "@/pages/catalogos/Catalogo.module.css";
import { Ubicacion } from "./columnasUnidades";
import { columnasHistorial } from "./columnasHistorial";

export function Component() {
  const { placas = "" } = useParams();
  const { data: expediente, isPending } = useExpedienteUnidad(placas);
  const { data: historial } = useHistorialUnidad(placas);

  if (isPending) {
    return <EmptyState titulo="Cargando expediente…" />;
  }

  if (!expediente) {
    return (
      <div className={styles.vista}>
        <div className={styles.migas}>
          <Link to="/unidades">Unidades</Link> / {placas}
        </div>
        <EmptyState titulo={`No encontramos la unidad con placas ${placas}`}>
          Revisa las placas o búscala en el padrón.
          <div className={styles.acciones}>
            <Link to="/unidades" className={styles.botonPrimario}>
              Ir al padrón de unidades
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  const { resumen } = expediente;
  const { unidad, cliente, tallerBase } = resumen;

  return (
    <div className={styles.vista}>
      <div className={styles.migas}>
        <Link to="/unidades">Unidades</Link> / {unidad.placas}
      </div>

      <Surface as="header" className={styles.ficha}>
        <div className={styles.fichaPrincipal}>
          <h1 className={styles.fichaTitulo}>
            {unidad.placas} <ChipEstadoUnidad estado={unidad.estado} />
          </h1>
          <div className={styles.fichaSub}>
            {unidad.marca} {unidad.modelo} {unidad.anio} · <Chip>{TIPO_UNIDAD[unidad.tipo]}</Chip>
          </div>
          {unidad.numeroEconomico && (
            <div className={styles.secundario}>Núm. económico {unidad.numeroEconomico}</div>
          )}
        </div>
        <dl className={styles.datos}>
          <div>
            <dt>VIN</dt>
            <dd>{unidad.vin}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>
              <Link to={`/clientes/${encodeURIComponent(cliente.id)}`}>{cliente.razonSocial}</Link>
            </dd>
          </div>
          <div>
            <dt>Taller base</dt>
            <dd>{tallerBase.nombre}</dd>
          </div>
          <div>
            <dt>Kilometraje actual</dt>
            <dd>
              {numero(unidad.kilometrajeUltimo)} km
              <div className={styles.secundario}>
                al {fecha(fechaLocal(unidad.fechaKilometraje), { anio: true })}
              </div>
            </dd>
          </div>
          <div>
            <dt>Ubicación</dt>
            <dd>
              <Ubicacion u={resumen} />
            </dd>
          </div>
        </dl>
      </Surface>

      <section className={styles.filaKpis} aria-label="Indicadores de la unidad">
        <KpiCard
          etiqueta="Costo acumulado de mantenimiento"
          valor={<Monto valor={expediente.costoAcumulado} escala="md" />}
        />
        <KpiCard etiqueta="O.S. históricas" valor={numero(expediente.osHistoricas)} />
        <KpiCard
          etiqueta="Costo por kilómetro"
          valor={expediente.costoPorKm == null ? "—" : <Monto valor={expediente.costoPorKm} escala="md" />}
          contexto={expediente.costoPorKm == null ? "Sin kilometraje suficiente" : undefined}
        />
        <KpiCard
          etiqueta="Días fuera de operación"
          valor={numero(expediente.diasFueraOperacionAnio)}
          unidad="días"
          contexto={`en ${new Date().getFullYear()}`}
        />
      </section>

      <Panel titulo="Historial de O.S." subtitulo="Las atendidas fuera de su taller base van marcadas" alBorde>
        <DataTable
          plano
          columnas={columnasHistorial(tallerBase)}
          filas={historial ?? []}
          claveFila={(o) => o.folio}
          vacio={
            <EmptyState titulo="Esta unidad aún no tiene O.S.">
              <div className={styles.acciones}>
                <Link to="/ordenes/nueva" className={styles.botonPrimario}>
                  + Crear O.S.
                </Link>
              </div>
            </EmptyState>
          }
        />
      </Panel>
    </div>
  );
}

Component.displayName = "DetalleUnidad";

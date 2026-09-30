import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { BarChart } from "@/components/BarChart/BarChart";
import { BarList } from "@/components/BarList/BarList";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { fecha, numero, porcentaje, puntos } from "@/domain/format";
import type { FlujoTaller, GastoProveedor, PorFacturar, VencimientoPago } from "@/domain/tipos";
import { useDashboardFinanciero } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { fechaLocal } from "@/app/fechas";
import { TabsTesoreria } from "./TabsTesoreria";
import { abreviado, nombreMes, pct } from "./formato";
import styles from "@/pages/tableros/Tableros.module.css";
import t from "./Tesoreria.module.css";

/** Mientras el encabezado no tenga selector de periodo real, el alcance temporal es este. */
const PERIODO = "Este mes";

const margen = (f: FlujoTaller) => f.facturado - f.costoRefacciones - f.costoManoObra;

const COLUMNAS_FLUJO: readonly Columna<FlujoTaller>[] = [
  { id: "taller", encabezado: "Taller", fija: true, celda: (f) => <span className={styles.celdaFuerte}>{f.taller.nombre}</span> },
  { id: "os", encabezado: "O.S. facturadas", numerica: true, celda: (f) => numero(f.osFacturadas) },
  { id: "pres", encabezado: "Presupuestado", numerica: true, celda: (f) => <Monto valor={f.presupuestado} /> },
  { id: "fact", encabezado: "Facturado", numerica: true, celda: (f) => <Monto valor={f.facturado} /> },
  { id: "ref", encabezado: "Costo refacciones", numerica: true, celda: (f) => <Monto valor={f.costoRefacciones} /> },
  { id: "mo", encabezado: "Costo mano de obra", numerica: true, celda: (f) => <Monto valor={f.costoManoObra} /> },
  { id: "margen", encabezado: "Margen $", numerica: true, celda: (f) => <Monto valor={margen(f)} /> },
  {
    id: "margenPct",
    encabezado: "Margen %",
    numerica: true,
    celda: (f) => (f.facturado > 0 ? `${((margen(f) / f.facturado) * 100).toFixed(1)}%` : "—"),
  },
  { id: "cxc", encabezado: "Por cobrar", numerica: true, celda: (f) => <Monto valor={f.porCobrar} /> },
  {
    id: "venc",
    encabezado: "Vencido",
    numerica: true,
    celda: (f) => (
      <span className={f.vencido > 0 ? styles.malo : undefined}>
        <Monto valor={f.vencido} />
      </span>
    ),
  },
];

const COLUMNAS_POR_FACTURAR: readonly Columna<PorFacturar>[] = [
  { id: "folio", encabezado: "O.S.", celda: (p) => <Folio folio={p.folioOs} tipo="os" /> },
  { id: "cliente", encabezado: "Cliente", celda: (p) => p.cliente },
  { id: "monto", encabezado: "Monto", numerica: true, celda: (p) => <Monto valor={p.monto} /> },
  { id: "dias", encabezado: "Días", numerica: true, celda: (p) => numero(p.diasDesdeRemision) },
];

const COLUMNAS_VENCIMIENTOS: readonly Columna<VencimientoPago>[] = [
  { id: "prov", encabezado: "Proveedor", celda: (v) => v.proveedor },
  { id: "oc", encabezado: "O.C.", celda: (v) => <Folio folio={v.folioOc} tipo="ordenCompra" /> },
  { id: "monto", encabezado: "Monto", numerica: true, celda: (v) => <Monto valor={v.monto} /> },
  { id: "vence", encabezado: "Vence", numerica: true, celda: (v) => fecha(fechaLocal(v.vence)) },
];

const COLUMNAS_PROVEEDORES: readonly Columna<GastoProveedor>[] = [
  { id: "prov", encabezado: "Proveedor", celda: (p) => <span className={styles.celdaFuerte}>{p.proveedor}</span> },
  { id: "oc", encabezado: "O.C.", numerica: true, celda: (p) => numero(p.ordenesCompra) },
  { id: "monto", encabezado: "Gasto", numerica: true, celda: (p) => <Monto valor={p.monto} /> },
  { id: "var", encabezado: "Variación", numerica: true, celda: (p) => <Monto valor={p.variacion} formato="porcentaje" sentido="desviacion" /> },
];

export function Component() {
  const taller = useTaller();
  const { data: d } = useDashboardFinanciero(taller, PERIODO);
  const r = d?.resumen ?? null;
  const c = d?.cartera ?? null;
  const totalCartera = c ? c.porVencer + c.d1a30 + c.d31a60 + c.mas60 : 0;
  const totalVencimientos = (d?.vencimientos ?? []).reduce((a, v) => a + v.monto, 0);
  const avance = r && r.metaMes > 0 ? (r.facturadoMes / r.metaMes) * 100 : 0;

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Dashboard financiero</h1>
          <p className={styles.subtitulo}>
            {taller} · {PERIODO.toLowerCase()}
          </p>
        </div>
        <div className={styles.acciones}>
          <TabsTesoreria />
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Exportar
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
            Cierre del mes
          </button>
        </div>
      </header>

      {/* Fila 1 · posición financiera */}
      <section className={styles.filaKpis} aria-label="Posición financiera">
        <KpiCard
          etiqueta="Facturado del mes"
          valor={r ? <Monto valor={r.facturadoMes} escala="md" /> : "—"}
          contexto={r && `Meta ${abreviado(r.metaMes)} · ${avance.toFixed(1)}%`}
          progreso={r ? { porcentaje: avance, tono: avance >= 100 ? "ok" : "brand" } : undefined}
        />
        <KpiCard
          etiqueta="Por cobrar (CxC)"
          valor={r ? <Monto valor={r.porCobrar} escala="md" /> : "—"}
          contexto={
            r && (
              <>
                ▲ {abreviado(r.vencidoPorCobrar)} vencido ({pct(r.vencidoPorCobrar, r.porCobrar)})
                <div className={t.nota}>
                  DSO {r.diasCartera.toFixed(1)} días · {numero(r.facturasAbiertas)} facturas abiertas
                </div>
              </>
            )
          }
          tonoContexto={r && r.vencidoPorCobrar > 0 ? "malo" : "neutro"}
        />
        <KpiCard
          etiqueta="Por pagar (CxP)"
          valor={r ? <Monto valor={r.porPagar} escala="md" /> : "—"}
          contexto={
            r && (
              <>
                {abreviado(r.venceEstaSemana)} vence esta semana
                <div className={t.nota}>
                  {numero(r.ocPorLiquidar)} O.C. por liquidar · {numero(r.proveedores)} proveedores
                </div>
              </>
            )
          }
        />
        <KpiCard
          etiqueta="Margen bruto del mes"
          valor={r ? `${r.margenBruto.toFixed(1)}%` : "—"}
          contexto={
            r && (
              <>
                {r.margenVariacionPts >= 0 ? "▲" : "▼"} {puntos(r.margenVariacionPts)} vs. mes anterior
                <div className={t.nota}>
                  Utilidad bruta <Monto valor={r.utilidadBruta} />
                </div>
              </>
            )
          }
          tonoContexto={r ? (r.margenVariacionPts >= 0 ? "bueno" : "malo") : "neutro"}
        />
      </section>

      {/* Fila 2 */}
      <section className={styles.fila2}>
        <Panel titulo="Presupuestado vs. facturado vs. costo real" subtitulo="Últimos 6 meses · MXN">
          <BarChart
            modo="agrupado"
            series={[
              { nombre: "Presupuestado", color: "var(--data-4)" },
              { nombre: "Facturado", color: "var(--data-1)" },
              { nombre: "Costo real", color: "var(--data-2)" },
            ]}
            categorias={d?.meses.map((m) => ({
              etiqueta: nombreMes(m.mes),
              valores: [m.presupuestado, m.facturado, m.costoReal],
            }))}
            formato={abreviado}
          />
          <div className={styles.metricas}>
            <div>
              <div className={styles.etiqueta}>Desviación promedio presupuesto-factura</div>
              <div className={styles.cifra}>{d?.indicadores ? porcentaje(d.indicadores.desviacionPromedio) : "—"}</div>
            </div>
            <div>
              <div className={styles.etiqueta}>Facturadas por debajo del presupuesto</div>
              <div className={styles.cifra}>
                {d?.indicadores ? `${numero(d.indicadores.facturadasDebajoDelPresupuesto)} O.S.` : "—"}
              </div>
            </div>
            <div>
              <div className={styles.etiqueta}>Sin facturar tras remisión</div>
              <div className={styles.cifra}>
                {d?.indicadores ? `${numero(d.indicadores.sinFacturarTrasRemision)} O.S.` : "—"}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          titulo="Antigüedad de cuentas por cobrar"
          subtitulo={c ? `Cartera total ${abreviado(totalCartera)}` : "Cartera total"}
          accion={{ etiqueta: "Ver cartera", to: "/tesoreria/cuentas-por-cobrar" }}
        >
          <BarList
            filas={
              c
                ? [
                    { id: "pv", etiqueta: "Por vencer", valor: c.porVencer, tono: "ok" as const },
                    { id: "30", etiqueta: "1 – 30 días", valor: c.d1a30, tono: "brand" as const },
                    { id: "60", etiqueta: "31 – 60 días", valor: c.d31a60, tono: "brand" as const },
                    { id: "m60", etiqueta: "+60 días", valor: c.mas60, tono: "critico" as const },
                  ].map((x) => ({
                    ...x,
                    texto: (
                      <>
                        <Monto valor={x.valor} /> <span className={styles.cifraNota}>{pct(x.valor, totalCartera)}</span>
                      </>
                    ),
                  }))
                : undefined
            }
          />
          <div className={styles.metricas}>
            <div>
              <div className={styles.etiqueta}>Vencido a más de 60 días</div>
              <div className={`${styles.cifra} ${c && c.mas60 > 0 ? styles.cifraCritica : ""}`}>
                {c ? <Monto valor={c.mas60} /> : "—"}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* Fila 3 · flujo por taller */}
      <Panel
        titulo="Flujo por taller"
        subtitulo={`${PERIODO} · montos en MXN`}
        accion={{ etiqueta: "Ver detalle por cliente", to: "/tesoreria/cuentas-por-cobrar" }}
        alBorde
      >
        <DataTable plano columnas={COLUMNAS_FLUJO} filas={d?.flujo ?? []} claveFila={(f) => f.taller.id} vacio={<EmptyState />} />
      </Panel>

      {/* Fila 4 */}
      <section className={styles.fila3}>
        <Panel
          titulo="Facturas por emitir"
          subtitulo={d && d.porFacturar.length > 0 ? `${numero(d.porFacturar.length)} O.S. remisionadas sin factura` : "O.S. remisionadas sin factura"}
          alBorde
        >
          <DataTable plano columnas={COLUMNAS_POR_FACTURAR} filas={d?.porFacturar ?? []} claveFila={(p) => p.folioOs} vacio={<EmptyState />} />
        </Panel>
        <Panel
          titulo="Vencimientos de la semana (CxP)"
          subtitulo={totalVencimientos > 0 ? <><Monto valor={totalVencimientos} /> por liquidar</> : "Pagos a proveedores"}
          accion={{ etiqueta: "Ver", to: "/tesoreria/cuentas-por-pagar" }}
          alBorde
        >
          <DataTable
            plano
            columnas={COLUMNAS_VENCIMIENTOS}
            filas={d?.vencimientos ?? []}
            claveFila={(v) => `${v.folioOc}-${v.vence}`}
            vacio={<EmptyState />}
          />
        </Panel>
        <Panel titulo="Top proveedores por gasto del mes" subtitulo="Abastecimiento consolidado" alBorde>
          <DataTable
            plano
            columnas={COLUMNAS_PROVEEDORES}
            filas={(d?.proveedores ?? []).slice(0, 5)}
            claveFila={(p) => p.proveedor}
            vacio={<EmptyState />}
          />
        </Panel>
      </section>
    </div>
  );
}

Component.displayName = "DashboardFinanciero";

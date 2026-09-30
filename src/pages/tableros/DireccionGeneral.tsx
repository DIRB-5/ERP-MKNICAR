import { useNavigate } from "react-router-dom";
import { AlertaFlujo } from "@/components/AlertaFlujo/AlertaFlujo";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { BarChart } from "@/components/BarChart/BarChart";
import { BarList } from "@/components/BarList/BarList";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import type { Area } from "@/domain/areas";
import { dias as fmtDias, moneda, numero, porcentaje, puntos } from "@/domain/format";
import { useFlujoDetenido, type FlujoDetenido } from "@/app/useFlujoDetenido";
import {
  ETAPAS,
  useTableroDireccion,
  type Etapa,
  type FilaClienteTop,
  type FilaRankingTaller,
  type KpisDireccion,
} from "@/app/useTableroDireccion";
import { useSetTaller, useTaller } from "@/app/useTaller";
import { TabsTableros } from "./TabsTableros";
import styles from "./Tableros.module.css";

/** Los tres puntos de espera medibles, en el orden del flujo. */
const PUNTOS_ESPERA: readonly {
  estado: keyof FlujoDetenido;
  titulo: string;
  area: Area;
  unidad: string;
}[] = [
  { estado: "pendiente_autorizacion", titulo: "Pendiente de autorización del cliente", area: "cliente", unidad: "O.S." },
  { estado: "autorizacion_oc", titulo: "O.C. pendiente de autorización de Dirección", area: "direccion", unidad: "O.C." },
  { estado: "en_proceso_pago", titulo: "En proceso de pago (Tesorería)", area: "tesoreria", unidad: "O.C." },
];

const ETAPA_LABEL: Record<Etapa, string> = {
  diagnostico: "Diagnóstico",
  cotizacion: "Cotización",
  autorizacion: "Autorización",
  compra_pago: "Compra y pago",
  reparacion: "En reparación",
  entrega: "Entrega y facturación",
};

/** Millones y miles abreviados para etiquetas de gráfica: $2.15 M · $987 K. */
const abreviado = (v: number): string =>
  v >= 1_000_000
    ? `$${(v / 1_000_000).toFixed(2)} M`
    : v >= 1_000
      ? `$${Math.round(v / 1_000)} K`
      : moneda(v, { entero: true });

/** Flecha y signo: el color refuerza, no sustituye. */
const flecha = (v: number) => (v > 0 ? "▲" : v < 0 ? "▼" : "●");

/** `subirEsMalo` para ciclo: más días es peor. */
function tonoVariacion(v: number, subirEsMalo = false): "bueno" | "malo" | "neutro" {
  if (v === 0) return "neutro";
  return (v > 0) !== subirEsMalo ? "bueno" : "malo";
}

function Kpis({ k }: { k: KpisDireccion | undefined }) {
  const vs = "vs. mes anterior";
  return (
    <section className={styles.filaKpis} aria-label="Indicadores del mes">
      <KpiCard
        etiqueta="Ingreso del mes"
        valor={k ? <Monto valor={k.ingresoMes} escala="md" /> : "—"}
        contexto={k && `${flecha(k.ingresoVariacion)} ${porcentaje(k.ingresoVariacion)} ${vs}`}
        tonoContexto={k ? tonoVariacion(k.ingresoVariacion) : "neutro"}
      />
      <KpiCard
        etiqueta="Margen bruto"
        valor={k ? `${k.margenBruto.toFixed(1)}%` : "—"}
        contexto={k && `${flecha(k.margenVariacionPts)} ${puntos(k.margenVariacionPts)} ${vs}`}
        tonoContexto={k ? tonoVariacion(k.margenVariacionPts) : "neutro"}
      />
      <KpiCard
        etiqueta="Ticket promedio"
        valor={k ? <Monto valor={k.ticketPromedio} escala="md" /> : "—"}
        contexto={k && `${flecha(k.ticketVariacion)} ${porcentaje(k.ticketVariacion)} ${vs}`}
        tonoContexto={k ? tonoVariacion(k.ticketVariacion) : "neutro"}
      />
      <KpiCard
        etiqueta="Ciclo promedio O.S."
        valor={k ? fmtDias(k.cicloPromedioDias) : "—"}
        unidad="días"
        contexto={
          k &&
          `${flecha(k.cicloVariacionDias)} ${puntos(k.cicloVariacionDias).replace("pts", "días")} ${vs}`
        }
        tonoContexto={k ? tonoVariacion(k.cicloVariacionDias, true) : "neutro"}
      />
      <KpiCard
        etiqueta="Unidades atendidas"
        valor={k ? numero(k.unidadesAtendidas) : "—"}
        contexto={k && `${flecha(k.unidadesVariacion)} ${porcentaje(k.unidadesVariacion)} ${vs}`}
        tonoContexto={k ? tonoVariacion(k.unidadesVariacion) : "neutro"}
      />
    </section>
  );
}

const COLUMNAS_RANKING: readonly Columna<FilaRankingTaller>[] = [
  { id: "taller", encabezado: "Taller", celda: (f) => <span className={styles.celdaFuerte}>{f.taller}</span> },
  { id: "os", encabezado: "O.S. activas", numerica: true, celda: (f) => numero(f.osActivas) },
  { id: "ingreso", encabezado: "Ingreso del mes", numerica: true, celda: (f) => <Monto valor={f.ingresoMes} /> },
  { id: "margen", encabezado: "Margen %", numerica: true, celda: (f) => `${f.margen.toFixed(1)}%` },
  { id: "ciclo", encabezado: "Ciclo prom.", numerica: true, celda: (f) => `${fmtDias(f.cicloPromedioDias)} d` },
  {
    id: "meta",
    encabezado: "Cumplimiento de meta",
    numerica: true,
    celda: (f) => (
      <span className={f.cumplimientoMeta < 100 ? styles.malo : undefined}>
        {f.cumplimientoMeta.toFixed(0)}%
      </span>
    ),
  },
];

const COLUMNAS_CLIENTES: readonly Columna<FilaClienteTop>[] = [
  { id: "cliente", encabezado: "Cliente", celda: (f) => <span className={styles.celdaFuerte}>{f.cliente}</span> },
  { id: "unidades", encabezado: "Unidades en admón.", numerica: true, celda: (f) => numero(f.unidadesEnAdministracion) },
  { id: "os", encabezado: "O.S. del mes", numerica: true, celda: (f) => numero(f.osDelMes) },
  { id: "facturado", encabezado: "Facturado", numerica: true, celda: (f) => <Monto valor={f.facturado} /> },
  {
    id: "vencido",
    encabezado: "Saldo vencido",
    numerica: true,
    celda: (f) => (
      <span className={f.saldoVencido > 0 ? styles.malo : undefined}>
        <Monto valor={f.saldoVencido} />
      </span>
    ),
  },
];

export function Component() {
  const taller = useTaller();
  const setTaller = useSetTaller();
  const navigate = useNavigate();
  const flujo = useFlujoDetenido(taller);
  const tablero = useTableroDireccion(taller);

  const resumenFlujo = flujo
    ? PUNTOS_ESPERA.reduce(
        (acc, p) => ({
          documentos: acc.documentos + flujo[p.estado].conteo,
          monto: acc.monto + flujo[p.estado].montoDetenido,
        }),
        { documentos: 0, monto: 0 }
      )
    : null;

  const etapas = tablero?.osPorEtapa;
  const totalAbiertas = etapas ? ETAPAS.reduce((a, e) => a + etapas.conteo[e], 0) : null;
  const pct = (n: number) =>
    totalAbiertas ? `${((n / totalAbiertas) * 100).toFixed(1)}%` : "0.0%";

  const ranking = tablero?.ranking
    ? [...tablero.ranking].sort((a, b) => b.cumplimientoMeta - a.cumplimientoMeta)
    : [];

  const cxc = tablero?.cuentasPorCobrar;
  const tramosCxc = cxc
    ? [
        { id: "d0a30", etiqueta: "0 – 30 días", valor: cxc.tramos.d0a30, tono: "brand" as const },
        { id: "d31a60", etiqueta: "31 – 60 días", valor: cxc.tramos.d31a60, tono: "brand" as const },
        { id: "d61a90", etiqueta: "61 – 90 días", valor: cxc.tramos.d61a90, tono: "alerta" as const },
        { id: "mas90", etiqueta: "+90 días", valor: cxc.tramos.mas90, tono: "critico" as const },
      ]
    : undefined;

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Dashboard de Dirección General</h1>
          <p className={styles.subtitulo}>{taller}</p>
        </div>
        <TabsTableros />
      </header>

      {/* Fila 1 · flujo detenido en los tres puntos de espera */}
      <section aria-labelledby="flujo-detenido">
        <div className={styles.seccionHead}>
          <h2 id="flujo-detenido" className={styles.seccionTitulo}>
            Flujo detenido
          </h2>
          {resumenFlujo && (
            <span className={styles.seccionResumen}>
              {numero(resumenFlujo.documentos)} documentos ·{" "}
              {moneda(resumenFlujo.monto, { entero: true })} MXN sin avanzar
            </span>
          )}
        </div>
        <div className={styles.fila3}>
          {PUNTOS_ESPERA.map((p) => (
            <AlertaFlujo
              key={p.estado}
              titulo={p.titulo}
              area={p.area}
              unidadConteo={p.unidad}
              datos={flujo?.[p.estado]}
              href={`/ordenes?vista=tabla&estado=${p.estado}`}
            />
          ))}
        </div>
      </section>

      {/* Fila 2 · indicadores del mes */}
      <Kpis k={tablero?.kpis} />

      {/* Fila 3 */}
      <section className={styles.fila2}>
        <Panel titulo="Ingreso por taller vs. meta mensual" subtitulo="Mes en curso · MXN">
          <BarChart
            series={[
              { nombre: "Facturado", color: "var(--data-1)" },
              { nombre: "Por facturar", color: "var(--data-3)" },
            ]}
            nombreMeta="Meta"
            categorias={tablero?.ingresoPorTaller?.map((t) => ({
              etiqueta: t.taller,
              valores: [t.facturado, t.porFacturar],
              meta: t.meta,
            }))}
            formato={abreviado}
          />
        </Panel>

        <Panel
          titulo="O.S. abiertas por estado"
          subtitulo={
            totalAbiertas != null
              ? `Estados agrupados en 6 etapas · ${numero(totalAbiertas)} O.S. abiertas`
              : "Estados agrupados en 6 etapas"
          }
          accion={{ etiqueta: "Ver todos los estados", to: "/ordenes" }}
        >
          <BarList
            filas={
              etapas &&
              ETAPAS.map((e) => ({
                id: e,
                etiqueta: ETAPA_LABEL[e],
                nota: e === "autorizacion" ? "detenidas con el cliente" : undefined,
                valor: etapas.conteo[e],
                tono: e === "autorizacion" ? ("alerta" as const) : ("brand" as const),
                texto: (
                  <>
                    {numero(etapas.conteo[e])} <span className={styles.cifraNota}>{pct(etapas.conteo[e])}</span>
                  </>
                ),
              }))
            }
          />
          <div className={styles.metricas}>
            <div>
              <div className={styles.etiqueta}>Detenidas por terceros</div>
              <div className={styles.cifra}>
                {etapas ? (
                  <>
                    {numero(etapas.detenidasPorTerceros)} O.S.{" "}
                    <span className={styles.cifraNota}>({pct(etapas.detenidasPorTerceros)})</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
            <div>
              <div className={styles.etiqueta}>En piso de taller</div>
              <div className={styles.cifra}>
                {etapas ? (
                  <>
                    {numero(etapas.enPisoDeTaller)} O.S.{" "}
                    <span className={styles.cifraNota}>({pct(etapas.enPisoDeTaller)})</span>
                  </>
                ) : (
                  "—"
                )}
              </div>
            </div>
          </div>
        </Panel>
      </section>

      {/* Fila 4 */}
      <section className={styles.fila2}>
        <Panel
          titulo="Ranking de talleres"
          subtitulo="Ordenado por cumplimiento de meta"
          alBorde
        >
          <DataTable
            plano
            columnas={COLUMNAS_RANKING}
            filas={ranking}
            claveFila={(f) => f.taller}
            onSeleccionar={(f) => {
              setTaller(f.taller);
              navigate("/operacion");
            }}
            vacio={<EmptyState />}
          />
        </Panel>

        <Panel
          titulo="Top 5 clientes por facturación"
          subtitulo="Mes en curso · flotillas en administración"
          alBorde
        >
          <DataTable
            plano
            columnas={COLUMNAS_CLIENTES}
            filas={tablero?.topClientes?.slice(0, 5) ?? []}
            claveFila={(f) => f.id}
            vacio={<EmptyState />}
          />
        </Panel>
      </section>

      {/* Fila 5 · cuentas por cobrar (módulo aún sin datos en la fase 1) */}
      <Panel
        titulo="Antigüedad de cuentas por cobrar"
        subtitulo={
          cxc ? `Cartera consolidada · ${moneda(cxc.total)} MXN` : "Cartera consolidada"
        }
        extra={
          <div className={styles.metricasEncabezado}>
            <div>
              <div className={styles.etiqueta}>Vencido +60 días</div>
              <div className={`${styles.cifra} ${cxc ? styles.cifraCritica : ""}`}>
                {cxc ? moneda(cxc.vencidoMas60) : "—"}
              </div>
            </div>
            <div>
              <div className={styles.etiqueta}>Días cartera (DSO)</div>
              <div className={styles.cifra}>{cxc ? cxc.diasCartera.toFixed(1) : "—"}</div>
            </div>
          </div>
        }
      >
        <BarList
          filas={tramosCxc?.map((t) => ({
            ...t,
            texto: (
              <>
                {moneda(t.valor)}{" "}
                <span className={styles.cifraNota}>
                  {cxc && cxc.total > 0 ? `${((t.valor / cxc.total) * 100).toFixed(1)}%` : "0.0%"}
                </span>
              </>
            ),
          }))}
        />
      </Panel>
    </div>
  );
}

Component.displayName = "DireccionGeneral";

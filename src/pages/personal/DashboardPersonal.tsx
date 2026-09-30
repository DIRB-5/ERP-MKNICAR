import { useState } from "react";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { BarChart } from "@/components/BarChart/BarChart";
import { BarList } from "@/components/BarList/BarList";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Chip, type TonoChip } from "@/components/Chip/Chip";
import { Aviso } from "@/components/Aviso/Aviso";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { fecha, numero, puntos } from "@/domain/format";
import type { Certificacion, EstadoCertificacion, PersonalTaller, ProductividadTecnico } from "@/domain/tipos";
import { useDashboardPersonal } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { fechaLocal } from "@/app/fechas";
import styles from "@/pages/tableros/Tableros.module.css";
import p from "./Personal.module.css";

const PERIODO = "Este mes";
const TOP = 12;

const porcentaje = (parte: number, total: number) => (total > 0 ? (parte / total) * 100 : 0);

const CERTIFICACION: Record<EstadoCertificacion, { label: string; tono: TonoChip }> = {
  vigente: { label: "Vigente", tono: "ok" },
  por_vencer: { label: "Por vencer", tono: "neutro" },
  vencida: { label: "Vencida", tono: "critico" },
};

const recuperacion = (disp: number, aplic: number) => porcentaje(aplic, disp);

const COLUMNAS_TALLERES: readonly Columna<PersonalTaller>[] = [
  { id: "taller", encabezado: "Taller", fija: true, celda: (t) => <span className={styles.celdaFuerte}>{t.taller.nombre}</span> },
  { id: "tec", encabezado: "Téc.", numerica: true, celda: (t) => numero(t.tecnicos) },
  { id: "ases", encabezado: "Ases.", numerica: true, celda: (t) => numero(t.asesores) },
  { id: "admin", encabezado: "Admin.", numerica: true, celda: (t) => numero(t.administrativos) },
  { id: "total", encabezado: "Total", numerica: true, celda: (t) => numero(t.tecnicos + t.asesores + t.administrativos) },
  { id: "costo", encabezado: "Costo mensual", numerica: true, celda: (t) => <Monto valor={t.costoMensual} /> },
  {
    id: "hora",
    encabezado: "Costo/hora",
    numerica: true,
    celda: (t) => (t.horasDisponibles > 0 ? <Monto valor={t.costoMensual / t.horasDisponibles} /> : "—"),
  },
  { id: "disp", encabezado: "Hrs. disp.", numerica: true, celda: (t) => numero(t.horasDisponibles) },
  { id: "aplic", encabezado: "Hrs. aplic.", numerica: true, celda: (t) => numero(t.horasAplicadas) },
  {
    id: "recup",
    encabezado: "Recup. %",
    numerica: true,
    celda: (t) => `${recuperacion(t.horasDisponibles, t.horasAplicadas).toFixed(1)}%`,
  },
  {
    id: "nomina",
    encabezado: "Nómina/Ing.",
    numerica: true,
    celda: (t) => (t.ingreso > 0 ? `${porcentaje(t.costoMensual, t.ingreso).toFixed(1)}%` : "—"),
  },
];

const COLUMNAS_CERT: readonly Columna<Certificacion>[] = [
  { id: "nombre", encabezado: "Certificación", celda: (c) => <span className={styles.celdaFuerte}>{c.nombre}</span> },
  { id: "personas", encabezado: "Personas", numerica: true, celda: (c) => numero(c.personas) },
  {
    id: "cobertura",
    encabezado: "Cobertura",
    numerica: true,
    celda: (c) => (
      <span className={c.talleresCubiertos < c.talleresTotales ? styles.malo : undefined}>
        {numero(c.talleresCubiertos)} de {numero(c.talleresTotales)} talleres
      </span>
    ),
  },
  { id: "vence", encabezado: "Vence", numerica: true, celda: (c) => (c.vence ? fecha(fechaLocal(c.vence), { anio: true }) : "—") },
  { id: "estado", encabezado: "Estado", celda: (c) => <Chip tono={CERTIFICACION[c.estado].tono}>{CERTIFICACION[c.estado].label}</Chip> },
];

type Orden = "recuperacion" | "facturadas" | "ordenes" | "retrabajos";

const ORDENES: readonly { id: Orden; etiqueta: string }[] = [
  { id: "recuperacion", etiqueta: "Recuperación" },
  { id: "facturadas", etiqueta: "Hrs. facturadas" },
  { id: "ordenes", etiqueta: "O.S." },
  { id: "retrabajos", etiqueta: "Retrabajos" },
];

const clave: Record<Orden, (t: ProductividadTecnico) => number> = {
  recuperacion: (t) => recuperacion(t.horasDisponibles, t.horasAplicadas),
  facturadas: (t) => t.horasFacturadas,
  ordenes: (t) => t.ordenes,
  retrabajos: (t) => t.retrabajos,
};

const iniciales = (n: string) =>
  n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase();

const COLUMNAS_TECNICOS: readonly Columna<ProductividadTecnico>[] = [
  {
    id: "nombre",
    encabezado: "Técnico",
    fija: true,
    celda: (t) => (
      <span className={p.tecnico}>
        <span className={p.avatar} aria-hidden="true">{iniciales(t.nombre)}</span>
        <span className={styles.celdaFuerte}>{t.nombre}</span>
      </span>
    ),
  },
  { id: "taller", encabezado: "Taller", celda: (t) => t.taller },
  { id: "puesto", encabezado: "Puesto", celda: (t) => t.puesto },
  { id: "disp", encabezado: "Hrs. disp.", numerica: true, celda: (t) => numero(t.horasDisponibles) },
  { id: "aplic", encabezado: "Hrs. aplic.", numerica: true, celda: (t) => numero(t.horasAplicadas) },
  { id: "fact", encabezado: "Hrs. fact.", numerica: true, celda: (t) => numero(t.horasFacturadas) },
  {
    id: "recup",
    encabezado: "Recup. %",
    numerica: true,
    celda: (t) => `${recuperacion(t.horasDisponibles, t.horasAplicadas).toFixed(1)}%`,
  },
  { id: "os", encabezado: "O.S.", numerica: true, celda: (t) => numero(t.ordenes) },
  {
    id: "retrab",
    encabezado: "Retrab.",
    numerica: true,
    celda: (t) => <span className={t.retrabajos > 0 ? styles.malo : undefined}>{numero(t.retrabajos)}</span>,
  },
  { id: "hora", encabezado: "Costo/hora", numerica: true, celda: (t) => <Monto valor={t.costoHora} /> },
];

export function Component() {
  const taller = useTaller();
  const { data: d } = useDashboardPersonal(taller, PERIODO);
  const [orden, setOrden] = useState<Orden>("recuperacion");
  const r = d?.resumen ?? null;

  const talleres = d?.talleres ?? [];
  const tot = talleres.reduce(
    (a, t) => ({
      tec: a.tec + t.tecnicos,
      ases: a.ases + t.asesores,
      admin: a.admin + t.administrativos,
      costo: a.costo + t.costoMensual,
      disp: a.disp + t.horasDisponibles,
      aplic: a.aplic + t.horasAplicadas,
    }),
    { tec: 0, ases: 0, admin: 0, costo: 0, disp: 0, aplic: 0 }
  );

  const saturados = (d?.capacidad ?? [])
    .map((c) => ({ nombre: c.taller.nombre, pct: porcentaje(c.horasDemandadas, c.horasDisponibles) }))
    .filter((c) => c.pct > 100)
    .sort((a, b) => b.pct - a.pct);
  const sinCobertura = [...new Set((d?.certificaciones ?? []).flatMap((c) => c.talleresSinCobertura))];

  // Retrabajos: menos es mejor, así que ordena ascendente.
  const tecnicos = [...(d?.tecnicos ?? [])].sort((a, b) =>
    orden === "retrabajos" ? clave[orden](a) - clave[orden](b) : clave[orden](b) - clave[orden](a)
  );
  const personas = (d?.puestos ?? []).reduce((a, x) => a + x.personas, 0);

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Personal y costo de mano de obra</h1>
          <p className={styles.subtitulo}>
            {taller} · {PERIODO.toLowerCase()}
          </p>
        </div>
        <div className={styles.acciones}>
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Exportar
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
            Reporte de nómina
          </button>
        </div>
      </header>

      {/* Fila 1 · indicadores */}
      <section className={styles.filaKpis} aria-label="Indicadores de personal">
        <KpiCard
          etiqueta="Plantilla total"
          valor={r ? numero(r.plantilla) : "—"}
          unidad="personas"
          contexto={r && `${numero(r.talleres)} talleres · ${numero(r.turnos)} turnos`}
        />
        <KpiCard
          etiqueta="Técnicos productivos"
          valor={r ? numero(r.tecnicosProductivos) : "—"}
          unidad={r ? `de ${numero(r.plantilla)}` : undefined}
          contexto={r && `${porcentaje(r.tecnicosProductivos, r.plantilla).toFixed(1)}% de la plantilla`}
        />
        <KpiCard
          etiqueta="Costo de nómina del mes"
          valor={r ? <Monto valor={r.costoNomina} escala="md" /> : "—"}
          contexto={r && "Costo integrado con prestaciones"}
        />
        <KpiCard
          etiqueta="Nómina / Ingreso"
          valor={r ? `${r.nominaSobreIngreso.toFixed(1)}%` : "—"}
          contexto={
            r &&
            `meta ${r.metaNominaSobreIngreso.toFixed(0)}% · ${puntos(r.nominaSobreIngreso - r.metaNominaSobreIngreso)}`
          }
          tonoContexto={r ? (r.nominaSobreIngreso > r.metaNominaSobreIngreso ? "malo" : "bueno") : "neutro"}
        />
        <KpiCard
          etiqueta="Recuperación de horas"
          valor={r ? `${r.recuperacionHoras.toFixed(1)}%` : "—"}
          contexto={
            r &&
            `objetivo ${r.objetivoRecuperacion.toFixed(0)}% · ${puntos(r.recuperacionHoras - r.objetivoRecuperacion)}`
          }
          tonoContexto={r ? (r.recuperacionHoras < r.objetivoRecuperacion ? "malo" : "bueno") : "neutro"}
          progreso={
            r ? { porcentaje: r.recuperacionHoras, tono: r.recuperacionHoras < r.objetivoRecuperacion ? "critico" : "ok" } : undefined
          }
        />
      </section>

      {/* Fila 2 */}
      <section className={p.fila21}>
        <Panel titulo="Plantilla y costo por taller" subtitulo="Costo integrado del mes y aprovechamiento de horas" alBorde>
          <DataTable plano columnas={COLUMNAS_TALLERES} filas={talleres} claveFila={(t) => t.taller.id} vacio={<EmptyState />} />
          {talleres.length > 0 && (
            <div className={p.totales}>
              <span>Total nacional</span>
              <span>{numero(tot.tec)} téc. · {numero(tot.ases)} ases. · {numero(tot.admin)} admin.</span>
              <Monto valor={tot.costo} />
              <span>{tot.disp > 0 ? <Monto valor={tot.costo / tot.disp} /> : "—"} por hora</span>
              <span>Recuperación {recuperacion(tot.disp, tot.aplic).toFixed(1)}%</span>
            </div>
          )}
        </Panel>

        <Panel titulo="Composición de la plantilla" subtitulo={personas > 0 ? `${numero(personas)} personas por puesto` : "Personas por puesto"}>
          <BarList
            filas={d?.puestos.map((x) => ({
              id: x.puesto,
              etiqueta: x.puesto,
              valor: x.personas,
              texto: numero(x.personas),
            }))}
          />
          <div className={styles.metricas}>
            <div>
              <div className={styles.etiqueta}>Antigüedad promedio</div>
              <div className={styles.cifra}>{d?.antiguedadPromedioAnios != null ? `${d.antiguedadPromedioAnios.toFixed(1)} años` : "—"}</div>
            </div>
            <div>
              <div className={styles.etiqueta}>Rotación anual</div>
              <div className={styles.cifra}>{d?.rotacionAnual != null ? `${d.rotacionAnual.toFixed(1)}%` : "—"}</div>
            </div>
          </div>
        </Panel>
      </section>

      {/* Fila 3 */}
      <section className={styles.fila2}>
        <Panel titulo="Brecha de capacidad por taller" subtitulo="Horas disponibles vs. horas que demandan las O.S. abiertas">
          <BarChart
            modo="agrupado"
            series={[
              { nombre: "Disponibles", color: "var(--data-3)" },
              { nombre: "Demandadas", color: "var(--data-1)" },
            ]}
            categorias={d?.capacidad.map((c) => ({
              etiqueta: c.taller.nombre,
              valores: [c.horasDisponibles, c.horasDemandadas],
            }))}
            formato={(v) => `${numero(Math.round(v))} h`}
          />
          {saturados.length > 0 && (
            <div className={p.avisoInterno}>
              <Aviso tono="critico" titulo="Talleres por encima de su capacidad">
                {saturados.map((s) => `${s.nombre} al ${s.pct.toFixed(0)}%`).join(" · ")}
              </Aviso>
            </div>
          )}
        </Panel>

        <Panel titulo="Certificaciones vigentes" subtitulo="Cobertura por taller y próximos vencimientos" alBorde>
          <DataTable plano columnas={COLUMNAS_CERT} filas={d?.certificaciones ?? []} claveFila={(c) => c.nombre} vacio={<EmptyState />} />
          {sinCobertura.length > 0 && (
            <div className={p.aviso}>
              <Aviso tono="critico" titulo={`Sin cobertura en ${sinCobertura.length === 1 ? "un taller" : `${sinCobertura.length} talleres`}`}>
                {sinCobertura.join(", ")}
              </Aviso>
            </div>
          )}
        </Panel>
      </section>

      {/* Fila 4 · productividad */}
      <Panel
        titulo="Productividad por técnico"
        subtitulo={`Top ${TOP} · sin datos de sueldo individual: el costo por hora es el de su puesto`}
        extra={<SegmentedControl etiqueta="Ordenar por" opciones={ORDENES} valor={orden} onCambiar={setOrden} />}
        alBorde
      >
        <DataTable plano columnas={COLUMNAS_TECNICOS} filas={tecnicos.slice(0, TOP)} claveFila={(t) => t.id} vacio={<EmptyState />} />
        {tecnicos.length > 0 && (
          <div className={styles.pie}>
            <span>
              Mostrando {numero(Math.min(TOP, tecnicos.length))} de {numero(tecnicos.length)} técnicos productivos
            </span>
          </div>
        )}
      </Panel>
    </div>
  );
}

Component.displayName = "DashboardPersonal";

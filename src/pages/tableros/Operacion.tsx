import { useState } from "react";
import { Link } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { BarList } from "@/components/BarList/BarList";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Surface } from "@/components/Surface/Surface";
import { Folio } from "@/components/Folio/Folio";
import { Estado } from "@/components/Estado/Estado";
import { Antiguedad } from "@/components/Antiguedad/Antiguedad";
import { fecha, numero } from "@/domain/format";
import {
  useTableroOperacion,
  type RefaccionCritica,
  type UnidadEnPiso,
} from "@/app/useTableroOperacion";
import { useTaller } from "@/app/useTaller";
import { TabsTableros } from "./TabsTableros";
import styles from "./Tableros.module.css";
import op from "./Operacion.module.css";

type Filtro = "todas" | "bloqueadas" | "hoy";

const esHoy = (iso: string | null): boolean =>
  iso != null && new Date(iso).toDateString() === new Date().toDateString();

const fechaCorta = (iso: string | null): string =>
  iso == null ? "—" : esHoy(iso) ? "Hoy" : fecha(new Date(iso));

const iniciales = (nombre: string): string =>
  nombre
    .split(/\s+/)
    .map((p) => p[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();

const COLUMNAS_UNIDADES: readonly Columna<UnidadEnPiso>[] = [
  { id: "folio", encabezado: "Folio O.S.", fija: true, celda: (u) => <Folio folio={u.folio} tipo="os" /> },
  {
    id: "unidad",
    encabezado: "Unidad",
    celda: (u) => (
      <div>
        <Folio folio={u.placa} />
        <div className={op.secundario}>{u.modelo}</div>
      </div>
    ),
  },
  { id: "cliente", encabezado: "Cliente", celda: (u) => u.cliente },
  { id: "estado", encabezado: "Estado actual", celda: (u) => <Estado estado={u.estado} /> },
  { id: "estadia", encabezado: "Estadía", numerica: true, celda: (u) => <Antiguedad dias={u.estadiaDias} /> },
  {
    id: "bloqueo",
    encabezado: "Bloqueo",
    celda: (u) => (u.bloqueo ? <span className={styles.malo}>{u.bloqueo}</span> : "Sin bloqueo"),
  },
  { id: "tecnico", encabezado: "Técnico", celda: (u) => u.tecnico ?? "—" },
  { id: "entrega", encabezado: "Entrega", numerica: true, celda: (u) => fechaCorta(u.entrega) },
];

const COLUMNAS_REFACCIONES: readonly Columna<RefaccionCritica>[] = [
  {
    id: "refaccion",
    encabezado: "Refacción",
    celda: (r) => (
      <div>
        <span className={styles.celdaFuerte}>{r.descripcion}</span>
        <div className={op.secundario}>Núm. parte {r.numeroParte}</div>
      </div>
    ),
  },
  { id: "os", encabezado: "O.S.", celda: (r) => <Folio folio={r.folioOs} tipo="os" /> },
  { id: "proveedor", encabezado: "Proveedor", celda: (r) => r.proveedor },
  { id: "espera", encabezado: "Espera", numerica: true, celda: (r) => <Antiguedad dias={r.esperaDias} /> },
  { id: "llegada", encabezado: "Llegada est.", numerica: true, celda: (r) => fechaCorta(r.llegadaEstimada) },
];

export function Component() {
  const taller = useTaller();
  const t = useTableroOperacion(taller);
  const [filtro, setFiltro] = useState<Filtro>("todas");

  const piso = t?.piso;
  const unidades = t?.unidades ?? [];
  const bloqueadas = unidades.filter((u) => u.bloqueo != null);
  const entregaHoy = unidades.filter((u) => esHoy(u.entrega));
  const visibles = filtro === "bloqueadas" ? bloqueadas : filtro === "hoy" ? entregaHoy : unidades;
  const ordenadas = [...visibles].sort((a, b) => b.estadiaDias - a.estadiaDias);

  const ocupacion = piso && piso.bahiasTotales > 0 ? (piso.bahiasOcupadas / piso.bahiasTotales) * 100 : 0;
  const calidad = t?.calidad;
  const acciones = t?.acciones ?? [];
  const turno = t?.turno;

  const filtros: { id: Filtro; etiqueta: string }[] = [
    { id: "todas", etiqueta: "Todas" },
    { id: "bloqueadas", etiqueta: t?.unidades ? `Bloqueadas (${numero(bloqueadas.length)})` : "Bloqueadas" },
    { id: "hoy", etiqueta: t?.unidades ? `Entrega hoy (${numero(entregaHoy.length)})` : "Entrega hoy" },
  ];

  return (
    <div className={op.layout}>
      <div className={styles.vista}>
        <header className={styles.encabezado}>
          <div>
            <h1 className={styles.titulo}>Operación del taller</h1>
            <p className={styles.subtitulo}>
              {taller} · {fecha(new Date(), { anio: true })}
            </p>
          </div>
          <div className={styles.acciones}>
            <TabsTableros />
            <button type="button" className={styles.boton} disabled title="Próximamente">
              Recepción de unidad
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
              Nueva O.S.
            </button>
          </div>
        </header>

        {/* Fila 1 · estado del piso hoy */}
        <section className={styles.filaKpis} aria-label="Estado del piso hoy">
          <KpiCard
            etiqueta="Unidades en piso"
            valor={piso ? numero(piso.unidadesEnPiso) : "—"}
            unidad="unidades"
            contexto={piso && `${numero(piso.ingresaronHoy)} ingresaron hoy · ${numero(piso.sinDiagnostico)} sin diagnóstico`}
          />
          <KpiCard
            etiqueta="Capacidad de bahías"
            valor={piso ? `${numero(piso.bahiasOcupadas)}/${numero(piso.bahiasTotales)}` : "—"}
            contexto={piso && `${ocupacion.toFixed(0)}% ocupada`}
            tonoContexto={ocupacion >= 90 ? "alerta" : "neutro"}
            progreso={piso && { porcentaje: ocupacion, tono: ocupacion >= 90 ? "alerta" : "brand" }}
          />
          <KpiCard
            etiqueta="O.S. abiertas"
            valor={piso ? numero(piso.osAbiertas) : "—"}
            unidad="O.S."
            contexto={piso && `${numero(piso.osBloqueadas)} bloqueadas · ${numero(piso.osMasDe5Dias)} con más de 5 días`}
            tonoContexto={piso && piso.osBloqueadas > 0 ? "malo" : "neutro"}
          />
          <KpiCard
            etiqueta="Entregas comprometidas hoy"
            valor={piso ? numero(piso.entregasHoy) : "—"}
            contexto={piso && `${numero(piso.entregasListas)} listas · ${numero(piso.entregasEnRiesgo)} en riesgo`}
            tonoContexto={piso && piso.entregasEnRiesgo > 0 ? "malo" : "neutro"}
          />
        </section>

        {/* Fila 2 · unidades en piso */}
        <Panel
          titulo="Unidades en piso"
          subtitulo={
            t?.unidades
              ? `${numero(unidades.length)} unidades · ordenadas por días de estadía`
              : "Ordenadas por días de estadía"
          }
          extra={
            <div className={op.filtros} role="group" aria-label="Filtrar unidades">
              {filtros.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={`${op.filtro} ${filtro === f.id ? op.filtroActivo : ""}`}
                  aria-pressed={filtro === f.id}
                  onClick={() => setFiltro(f.id)}
                >
                  {f.etiqueta}
                </button>
              ))}
            </div>
          }
          alBorde
        >
          <DataTable
            plano
            columnas={COLUMNAS_UNIDADES}
            filas={ordenadas.slice(0, 12)}
            claveFila={(u) => u.folio}
            vacio={<EmptyState />}
          />
          {ordenadas.length > 0 && (
            <div className={styles.pie}>
              <span>
                Mostrando {numero(Math.min(12, ordenadas.length))} de {numero(ordenadas.length)} unidades en piso
              </span>
              <Link to="/ordenes">Ver todas las unidades →</Link>
            </div>
          )}
        </Panel>

        {/* Fila 3 */}
        <section className={styles.fila2}>
          <Panel titulo="Carga por técnico" subtitulo="Horas comprometidas vs. disponibles · semana en curso">
            <BarList
              filas={t?.cargaTecnicos?.map((c) => {
                const uso = c.horasDisponibles > 0 ? c.horasComprometidas / c.horasDisponibles : 0;
                return {
                  id: c.id,
                  etiqueta: (
                    <span className={op.tecnico}>
                      <span className={op.avatar} aria-hidden="true">
                        {iniciales(c.nombre)}
                      </span>
                      {c.nombre}
                    </span>
                  ),
                  nota: `${numero(c.osAsignadas)} O.S. asignadas`,
                  valor: c.horasComprometidas,
                  tono: uso > 1 ? ("critico" as const) : uso >= 0.9 ? ("alerta" as const) : ("brand" as const),
                  texto: `${numero(c.horasComprometidas)} / ${numero(c.horasDisponibles)} hrs`,
                };
              })}
              max={t?.cargaTecnicos ? Math.max(...t.cargaTecnicos.map((c) => Math.max(c.horasComprometidas, c.horasDisponibles))) : undefined}
            />
          </Panel>

          <Panel
            titulo="Refacciones críticas"
            subtitulo={
              t?.refacciones
                ? `Abastecimiento detenido · ${numero(t.refacciones.length)} partidas`
                : "Abastecimiento detenido"
            }
            alBorde
          >
            <DataTable
              plano
              columnas={COLUMNAS_REFACCIONES}
              filas={t?.refacciones ?? []}
              claveFila={(r) => r.id}
              vacio={<EmptyState />}
            />
          </Panel>
        </section>

        {/* Fila 4 · calidad */}
        <section className={styles.fila3} aria-label="Calidad">
          <KpiCard
            etiqueta="Retrabajos de la semana"
            valor={calidad ? numero(calidad.retrabajosSemana) : "—"}
            unidad="O.S. reabiertas"
            tonoContexto={calidad && calidad.retrabajosSemana > 0 ? "malo" : "neutro"}
          />
          <KpiCard
            etiqueta="Cumplimiento de fecha de entrega"
            valor={calidad ? `${calidad.cumplimientoEntrega.toFixed(0)}%` : "—"}
            contexto={calidad && `meta ${calidad.metaCumplimientoEntrega.toFixed(0)}%`}
            tonoContexto={calidad && calidad.cumplimientoEntrega < calidad.metaCumplimientoEntrega ? "malo" : "bueno"}
            progreso={
              calidad && {
                porcentaje: calidad.cumplimientoEntrega,
                tono: calidad.cumplimientoEntrega < calidad.metaCumplimientoEntrega ? "critico" : "ok",
              }
            }
          />
          <KpiCard
            etiqueta="Tiempo promedio de diagnóstico"
            valor={calidad ? calidad.diagnosticoPromedioHoras.toFixed(1) : "—"}
            unidad="hrs"
            contexto={
              calidad &&
              `${calidad.diagnosticoVariacionHoras <= 0 ? "▼" : "▲"} ${Math.abs(calidad.diagnosticoVariacionHoras).toFixed(1)} hrs · últimos 7 días · ${numero(calidad.diagnosticosUltimos7Dias)} diagnósticos`
            }
            tonoContexto={calidad && calidad.diagnosticoVariacionHoras > 0 ? "malo" : "bueno"}
          />
        </section>
      </div>

      {/* Barra lateral: lo que necesita a esta persona hoy */}
      <Surface as="aside" variante="strong" className={op.lateral}>
        <div>
          <div className={op.lateralHead}>
            <h2 className={op.lateralTitulo}>Requieren tu acción</h2>
            {t?.acciones && <span className={op.contador}>{numero(acciones.length)}</span>}
          </div>
          <div className={op.lateralSub}>Ordenados por antigüedad</div>
        </div>

        {acciones.length > 0 ? (
          <ul className={op.acciones}>
            {acciones.map((a) => (
              <li key={a.id} className={op.accion}>
                <div className={op.accionTexto}>{a.texto}</div>
                <div className={op.accionPie}>
                  <span className={op.secundario}>{a.contexto}</span>
                  <Link to={a.to} className={op.accionLink}>
                    {a.accion}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState />
        )}

        <div className={op.turno}>
          <h3 className={op.lateralTitulo}>Turno de hoy</h3>
          <dl className={op.turnoLista}>
            <dt>Técnicos presentes</dt>
            <dd>{turno ? `${numero(turno.tecnicosPresentes)} / ${numero(turno.tecnicosTotales)}` : "—"}</dd>
            <dt>Horas disponibles</dt>
            <dd>{turno ? `${numero(turno.horasDisponibles)} hrs` : "—"}</dd>
            <dt>Citas de recepción</dt>
            <dd>{turno ? numero(turno.citasRecepcion) : "—"}</dd>
          </dl>
        </div>
      </Surface>
    </div>
  );
}

Component.displayName = "Operacion";

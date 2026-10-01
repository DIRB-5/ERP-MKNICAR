import { Link, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { BarChart } from "@/components/BarChart/BarChart";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip, type TonoChip } from "@/components/Chip/Chip";
import { Estado } from "@/components/Estado/Estado";
import { Aviso } from "@/components/Aviso/Aviso";
import { fecha, numero, puntos } from "@/domain/format";
import type { CertificacionTecnico, NivelHabilidad, OrdenTecnico } from "@/domain/tipos";
import { usePerfilTecnico } from "@/data/consultas";
import { diasEntre, fechaLocal } from "@/app/fechas";
import { nombreMes } from "@/pages/tesoreria/formato";
import { NIVEL_LABEL, UMBRAL_BRECHA } from "@/app/habilidades";
import styles from "@/pages/tableros/Tableros.module.css";
import p from "./Personal.module.css";

/** Con menos de estos días para vencer, la certificación se marca. Propuesta: confirmar con RRHH. */
const DIAS_AVISO_CERTIFICACION = 60;

const TONO_NIVEL: Record<NivelHabilidad, TonoChip> = {
  experto: "brand",
  avanzado: "brand",
  intermedio: "neutro",
  basico: "neutro",
};

type EstadoCert = { label: string; tono: TonoChip; dias: number | null };

function estadoCertificacion(c: CertificacionTecnico, hoy: Date): EstadoCert {
  if (!c.vence) return { label: "Sin vencimiento", tono: "ok", dias: null };
  const dias = diasEntre(hoy, fechaLocal(c.vence));
  if (dias < 0) return { label: "Vencida", tono: "critico", dias };
  if (dias <= DIAS_AVISO_CERTIFICACION) return { label: `Vence en ${numero(dias)} días`, tono: "critico", dias };
  return { label: "Vigente", tono: "ok", dias };
}

function antiguedad(desde: Date, hoy: Date): string {
  let meses = (hoy.getFullYear() - desde.getFullYear()) * 12 + (hoy.getMonth() - desde.getMonth());
  if (hoy.getDate() < desde.getDate()) meses -= 1;
  const a = Math.floor(meses / 12);
  const m = meses % 12;
  const partes = [a > 0 ? `${a} ${a === 1 ? "año" : "años"}` : "", m > 0 ? `${m} ${m === 1 ? "mes" : "meses"}` : ""];
  return partes.filter(Boolean).join(" ") || "Menos de un mes";
}

const iniciales = (n: string) =>
  n.split(/\s+/).map((x) => x[0] ?? "").join("").slice(0, 2).toUpperCase();

const desviacion = (o: OrdenTecnico) =>
  o.horasEstandar > 0 ? ((o.horasReales - o.horasEstandar) / o.horasEstandar) * 100 : 0;

const COLUMNAS_OS: readonly Columna<OrdenTecnico>[] = [
  { id: "folio", encabezado: "O.S.", fija: true, celda: (o) => <Folio folio={o.folio} tipo="os" /> },
  { id: "unidad", encabezado: "Unidad", celda: (o) => <Folio folio={o.placas} /> },
  { id: "cliente", encabezado: "Cliente", celda: (o) => o.cliente },
  { id: "servicio", encabezado: "Servicio", celda: (o) => o.servicio },
  { id: "est", encabezado: "Hrs. est.", numerica: true, celda: (o) => o.horasEstandar.toFixed(1) },
  { id: "real", encabezado: "Hrs. real", numerica: true, celda: (o) => o.horasReales.toFixed(1) },
  {
    id: "desv",
    encabezado: "Desv.",
    numerica: true,
    celda: (o) => <Monto valor={desviacion(o)} formato="porcentaje" sentido="desviacion" />,
  },
  { id: "costo", encabezado: "Costo M.O.", numerica: true, celda: (o) => <Monto valor={o.costoManoObra} /> },
  { id: "fact", encabezado: "M.O. facturada", numerica: true, celda: (o) => <Monto valor={o.manoObraFacturada} /> },
  { id: "estado", encabezado: "Estado", celda: (o) => <Estado estado={o.estado} /> },
];

export function Component() {
  const { id = "" } = useParams();
  const { data: t, isPending } = usePerfilTecnico(id);
  const hoy = new Date();

  const certs = (t?.certificaciones ?? []).map((c) => ({ c, e: estadoCertificacion(c, hoy) }));
  const vencidas = certs.filter((x) => x.e.dias != null && x.e.dias < 0);
  const porVencer = certs.filter((x) => x.e.dias != null && x.e.dias >= 0 && x.e.dias <= DIAS_AVISO_CERTIFICACION);
  const brechas = (t?.habilidades ?? []).filter((h) => h.valor < UMBRAL_BRECHA);
  const promedio12 =
    t && t.meses.length > 0
      ? (t.meses.reduce((a, m) => a + (m.horasDisponibles > 0 ? m.horasAplicadas / m.horasDisponibles : 0), 0) / t.meses.length) * 100
      : null;
  const relacion = t && t.costoMensual > 0 ? t.valorGenerado / t.costoMensual : null;

  return (
    <div className={styles.vista}>
      <div className={p.migas}>
        <Link to="/personal">Personal</Link> / Plantilla y costos
        {t && ` / ${t.taller.nombre}`} / <b>{t?.nombre ?? id}</b>
      </div>

      {!isPending && !t && (
        <Aviso titulo={`No encontramos al técnico "${id}".`}>
          La pantalla se muestra sin datos mientras no exista el módulo de personal.
        </Aviso>
      )}

      {/* Fila 1 · ficha e indicadores */}
      <section className={p.fila1}>
        <Surface className={p.ficha}>
          <div className={p.fichaHead}>
            <span className={p.avatarGrande} aria-hidden="true">{t ? iniciales(t.nombre) : "—"}</span>
            {t && <Chip tono={t.activo ? "ok" : "neutro"}>{t.activo ? "Activo" : "Inactivo"}</Chip>}
          </div>
          <h1 className={p.nombre}>{t?.nombre ?? "Técnico"}</h1>
          <div className={p.puesto}>{t ? `${t.puesto} · ${t.nivel}` : "—"}</div>
          <div className={p.secundario}>
            {t ? `N.º empleado ${t.numeroEmpleado} · Taller ${t.taller.nombre} · Turno ${t.turno.toLowerCase()}` : "—"}
          </div>
          {t && t.especialidades.length > 0 && (
            <div className={p.chips}>
              {t.especialidades.map((e) => (
                <Chip key={e}>{e}</Chip>
              ))}
            </div>
          )}
          <div className={p.accionesFicha}>
            <button type="button" className={styles.boton} disabled title="Próximamente">
              Historial completo
            </button>
            <button type="button" className={styles.boton} disabled title="Próximamente">
              Exportar perfil
            </button>
            <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
              Asignar O.S.
            </button>
          </div>
        </Surface>

        <div className={p.kpis}>
          <KpiCard
            etiqueta="Antigüedad"
            valor={t ? antiguedad(fechaLocal(t.fechaIngreso), hoy) : "—"}
            contexto={t && `Ingreso: ${fecha(fechaLocal(t.fechaIngreso), { anio: true })}`}
          />
          <KpiCard
            etiqueta="Recuperación de horas"
            valor={t ? `${t.recuperacion.toFixed(1)}%` : "—"}
            contexto={t && `${t.recuperacionVariacionPts >= 0 ? "▲" : "▼"} ${puntos(t.recuperacionVariacionPts)} vs. mes anterior`}
            tonoContexto={t ? (t.recuperacionVariacionPts >= 0 ? "bueno" : "malo") : "neutro"}
          />
          <KpiCard
            etiqueta="O.S. del mes"
            valor={t ? numero(t.ordenesMes) : "—"}
            contexto={t && `${t.horasAplicadasMes.toFixed(1)} hrs aplicadas de ${numero(t.horasDisponiblesMes)} disponibles`}
          />
          <KpiCard
            etiqueta="Retrabajos (90 días)"
            valor={t ? numero(t.retrabajos90Dias) : "—"}
            contexto={t && `Tasa ${t.tasaRetrabajo.toFixed(1)}% · promedio del taller ${t.tasaRetrabajoTaller.toFixed(1)}%`}
            tonoContexto={t ? (t.tasaRetrabajo > t.tasaRetrabajoTaller ? "malo" : "bueno") : "neutro"}
          />
          <KpiCard
            etiqueta="Costo por hora integrado"
            valor={t ? <Monto valor={t.costoHora} escala="md" /> : "—"}
            unidad={t ? "/hr" : undefined}
            contexto={t && "Sueldo + prestaciones + carga social"}
          />
          <KpiCard
            etiqueta="Costo mensual"
            valor={t ? <Monto valor={t.costoMensual} escala="md" /> : "—"}
            contexto={t && `${t.participacionNominaTaller.toFixed(1)}% de la nómina de ${t.taller.nombre}`}
          />
          <KpiCard
            etiqueta="Valor generado (mes)"
            valor={t ? <Monto valor={t.valorGenerado} escala="md" /> : "—"}
            contexto={t && "Mano de obra facturada en sus O.S."}
          />
          <KpiCard
            etiqueta="Relación valor/costo"
            valor={relacion != null ? `${relacion.toFixed(2)}x` : "—"}
            contexto={t && `Promedio del taller ${t.relacionValorCostoTaller.toFixed(2)}x`}
            tonoContexto={t && relacion != null ? (relacion >= t.relacionValorCostoTaller ? "bueno" : "malo") : "neutro"}
          />
        </div>
      </section>

      {/* Fila 2 · habilidades y certificaciones */}
      <section className={styles.fila3}>
        <Panel
          titulo="Habilidades evaluadas"
          subtitulo={t?.ultimaEvaluacion ? `Últ. evaluación: ${fecha(fechaLocal(t.ultimaEvaluacion), { anio: true })}` : "Sin evaluación"}
          accion={t ? { etiqueta: t.ultimaEvaluacion ? "Nueva evaluación" : "Evaluar habilidades", to: `/personal/tecnicos/${encodeURIComponent(t.id)}/evaluacion` } : undefined}
        >
          {t && t.habilidades.length > 0 ? (
            <ul className={p.habilidades}>
              {t.habilidades.map((h) => (
                <li key={h.nombre}>
                  <div className={p.habilidadHead}>
                    <span>{h.nombre}</span>
                    <Chip tono={TONO_NIVEL[h.nivel]}>{NIVEL_LABEL[h.nivel]}</Chip>
                    <b>{numero(h.valor)}</b>
                  </div>
                  <div className={p.pista}>
                    <i className={h.valor < UMBRAL_BRECHA ? p.barraBrecha : p.barra} style={{ width: `${h.valor}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState />
          )}
          {brechas.length > 0 && (
            <div className={p.avisoInterno}>
              <Aviso tono="critico" titulo="Brecha detectada">
                {brechas.map((h) => `${h.nombre} en ${h.valor}`).join(" · ")}: limita su asignación a esas O.S.
              </Aviso>
            </div>
          )}
        </Panel>

        <Panel titulo="Perfil de competencias" subtitulo={t ? `vs. promedio de ${t.taller.nombre}` : "vs. promedio del taller"}>
          {t && t.habilidades.length > 0 ? (
            <>
              <div className={p.leyenda} aria-hidden="true">
                <span><i className={p.muestraTecnico} />{t.nombre.split(" ")[0]}</span>
                <span><i className={p.muestraPromedio} />Promedio del taller</span>
              </div>
              <ul className={p.comparativo}>
                {t.habilidades.map((h) => (
                  <li key={h.nombre} title={`${h.nombre}: ${h.valor} · promedio ${h.promedioTaller}`}>
                    <span className={p.comparativoNombre}>{h.nombre}</span>
                    <span className={p.pista}>
                      <i className={p.barra} style={{ width: `${h.valor}%` }} />
                      <i className={p.marcaPromedio} style={{ left: `${h.promedioTaller}%` }} />
                    </span>
                    <span className={p.comparativoValor}>
                      {numero(h.valor)} <span className={p.secundario}>/ {numero(h.promedioTaller)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <EmptyState />
          )}
        </Panel>

        <Panel
          titulo="Certificaciones y vigencias"
          subtitulo={t ? `${numero(t.certificaciones.length)} certificaciones registradas` : "Certificaciones registradas"}
        >
          {certs.length > 0 ? (
            <table className={p.mini}>
              <thead>
                <tr>
                  <th scope="col">Certificación</th>
                  <th scope="col" className={p.der}>Obtenida</th>
                  <th scope="col" className={p.der}>Vence</th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {certs.map(({ c, e }) => (
                  <tr key={c.nombre}>
                    <td>{c.nombre}</td>
                    <td className={p.der}>{fecha(fechaLocal(c.obtenida), { anio: true })}</td>
                    <td className={p.der}>{c.vence ? fecha(fechaLocal(c.vence), { anio: true }) : "—"}</td>
                    <td><Chip tono={e.tono}>{e.label}</Chip></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState />
          )}
          {(vencidas.length > 0 || porVencer.length > 0) && (
            <div className={p.avisoInterno}>
              <Aviso tono="critico" titulo="Acción requerida">
                {[
                  ...vencidas.map(({ c, e }) => `${c.nombre} vencida hace ${numero(-(e.dias ?? 0))} días`),
                  ...porVencer.map(({ c, e }) => `${c.nombre} vence en ${numero(e.dias ?? 0)} días`),
                ].join(" · ")}
              </Aviso>
            </div>
          )}
        </Panel>
      </section>

      {/* Fila 3 · horas y expediente */}
      <section className={p.fila21}>
        <Panel
          titulo="Horas aplicadas vs. disponibles"
          subtitulo={promedio12 != null ? `Últimos 12 meses · promedio ${promedio12.toFixed(1)}%` : "Últimos 12 meses"}
        >
          <BarChart
            modo="agrupado"
            series={[
              { nombre: "Horas aplicadas", color: "var(--data-1)" },
              { nombre: "Horas disponibles", color: "var(--data-3)" },
            ]}
            categorias={t?.meses.map((m) => ({
              etiqueta: nombreMes(m.mes).slice(0, 3),
              valores: [m.horasAplicadas, m.horasDisponibles],
            }))}
            formato={(v) => `${numero(Math.round(v))} h`}
          />
        </Panel>

        <Panel titulo="Expediente laboral" subtitulo="Visible solo para RRHH y Dirección">
          {t?.expediente ? (
            <dl className={p.expediente}>
              {t.expediente.map((x) => (
                <div key={x.etiqueta}>
                  <dt>{x.etiqueta}</dt>
                  <dd>{x.valor}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <EmptyState titulo={t ? "Tu rol no tiene acceso al expediente" : undefined} />
          )}
        </Panel>
      </section>

      {/* Fila 4 · O.S. recientes */}
      <Panel titulo="Órdenes de servicio recientes" subtitulo="Últimas del mes" alBorde>
        <DataTable plano columnas={COLUMNAS_OS} filas={t?.ordenesRecientes ?? []} claveFila={(o) => o.folio} vacio={<EmptyState />} />
      </Panel>
    </div>
  );
}

Component.displayName = "PerfilTecnico";

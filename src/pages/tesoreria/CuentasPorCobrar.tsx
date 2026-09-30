import { Fragment, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { Surface } from "@/components/Surface/Surface";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { fecha, numero } from "@/domain/format";
import type { CarteraCliente, EstadoFacturaCliente, FacturaCliente, TramosCartera } from "@/domain/tipos";
import { useCuentasPorCobrar } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { fechaLocal } from "@/app/fechas";
import { TabsTesoreria } from "./TabsTesoreria";
import { pct } from "./formato";
import { ESTADO_FACTURA_CLIENTE } from "./etiquetas";
import styles from "@/pages/tableros/Tableros.module.css";
import t from "./Tesoreria.module.css";

type Tramo = keyof TramosCartera;

const TRAMOS: readonly { id: Tramo; etiqueta: string; clase: keyof typeof t }[] = [
  { id: "porVencer", etiqueta: "Por vencer", clase: "tPorVencer" },
  { id: "d1a30", etiqueta: "1 – 30", clase: "t30" },
  { id: "d31a60", etiqueta: "31 – 60", clase: "t60" },
  { id: "mas60", etiqueta: "+60", clase: "tMas60" },
];

const ESTADOS = Object.keys(ESTADO_FACTURA_CLIENTE) as EstadoFacturaCliente[];

const tramoDe = (f: FacturaCliente): Tramo =>
  f.diasVencida <= 0 ? "porVencer" : f.diasVencida <= 30 ? "d1a30" : f.diasVencida <= 60 ? "d31a60" : "mas60";

const totalDe = (x: TramosCartera) => x.porVencer + x.d1a30 + x.d31a60 + x.mas60;
const vencidoDe = (x: TramosCartera) => x.d1a30 + x.d31a60 + x.mas60;

function BarraAntiguedad({ tramos }: { tramos: TramosCartera }) {
  const total = totalDe(tramos);
  const titulo = TRAMOS.map((x) => `${x.etiqueta}: ${pct(tramos[x.id], total)}`).join(" · ");
  return (
    <span className={t.antiguedad} role="img" aria-label={`Antigüedad. ${titulo}`} title={titulo}>
      {TRAMOS.map((x) =>
        tramos[x.id] > 0 ? (
          <i key={x.id} className={t[x.clase]} style={{ width: `${(tramos[x.id] / total) * 100}%` }} />
        ) : null
      )}
    </span>
  );
}

export function Component() {
  const taller = useTaller();
  const [params, setParams] = useSearchParams();
  const { data, isPending } = useCuentasPorCobrar(taller);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const clientes = data?.clientes ?? [];
  const filtroCliente = params.get("cliente") ?? "";
  const filtroTramo = TRAMOS.find((x) => x.id === params.get("antiguedad"))?.id;
  const filtroEstado = ESTADOS.find((e) => e === params.get("estado"));
  const hayFiltros = Boolean(filtroCliente || filtroTramo || filtroEstado);

  const poner = (clave: string, valor: string) => {
    const s = new URLSearchParams(params);
    if (valor) s.set(clave, valor);
    else s.delete(clave);
    setParams(s, { replace: true });
  };

  const limpiar = () => {
    const s = new URLSearchParams(params);
    ["cliente", "antiguedad", "estado"].forEach((c) => s.delete(c));
    setParams(s, { replace: true });
  };

  const visibles: CarteraCliente[] = clientes
    .filter((c) => !filtroCliente || c.cliente.id === filtroCliente)
    .map((c) => ({
      ...c,
      facturas: c.facturas.filter(
        (f) => (!filtroTramo || tramoDe(f) === filtroTramo) && (!filtroEstado || f.estado === filtroEstado)
      ),
    }))
    .filter((c) => !hayFiltros || c.facturas.length > 0)
    .sort((a, b) => totalDe(b.tramos) - totalDe(a.tramos));

  const cartera = clientes.reduce<TramosCartera>(
    (a, c) => ({
      porVencer: a.porVencer + c.tramos.porVencer,
      d1a30: a.d1a30 + c.tramos.d1a30,
      d31a60: a.d31a60 + c.tramos.d31a60,
      mas60: a.mas60 + c.tramos.mas60,
    }),
    { porVencer: 0, d1a30: 0, d31a60: 0, mas60: 0 }
  );
  const total = totalDe(cartera);
  const facturas = clientes.reduce((a, c) => a + c.facturas.length, 0);
  const hayDatos = clientes.length > 0;
  const concentran = clientes.filter((c) => c.tramos.mas60 > 0).length;

  const kpi = (etiqueta: string, valor: number, contexto: string, malo = false) => (
    <KpiCard
      etiqueta={etiqueta}
      valor={hayDatos ? <Monto valor={valor} escala="md" /> : "—"}
      contexto={hayDatos ? contexto : undefined}
      tonoContexto={malo && valor > 0 ? "malo" : "neutro"}
    />
  );

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Cuentas por cobrar</h1>
          <p className={styles.subtitulo}>
            {taller}
            {hayDatos && ` · ${numero(facturas)} facturas abiertas · ${numero(clientes.length)} clientes`}
          </p>
        </div>
        <div className={styles.acciones}>
          <TabsTesoreria />
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Exportar
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
            Generar estado de cuenta
          </button>
        </div>
      </header>

      <section className={styles.filaKpis} aria-label="Resumen de cartera">
        {kpi("Total por cobrar", total, `${numero(facturas)} facturas`)}
        {kpi("Por vencer", cartera.porVencer, `${pct(cartera.porVencer, total)} de la cartera`)}
        {kpi("Vencido 1 – 30 días", cartera.d1a30, `${pct(cartera.d1a30, total)} de la cartera`, true)}
        {kpi("Vencido 31 – 60 días", cartera.d31a60, `${pct(cartera.d31a60, total)} de la cartera`, true)}
        {kpi(
          "Vencido +60 días",
          cartera.mas60,
          `${pct(cartera.mas60, total)} · ${numero(concentran)} ${concentran === 1 ? "cliente concentra" : "clientes concentran"} el total`,
          true
        )}
      </section>

      <div className={t.layout}>
        <div className={t.principal}>
          <div className={t.filtros} role="search" aria-label="Filtrar cartera">
            <label className={t.campo}>
              <span>Cliente</span>
              <select value={filtroCliente} onChange={(e) => poner("cliente", e.target.value)}>
                <option value="">Todos</option>
                {clientes.map((c) => (
                  <option key={c.cliente.id} value={c.cliente.id}>{c.cliente.razonSocial}</option>
                ))}
              </select>
            </label>
            <label className={t.campo}>
              <span>Antigüedad</span>
              <select value={filtroTramo ?? ""} onChange={(e) => poner("antiguedad", e.target.value)}>
                <option value="">Toda</option>
                {TRAMOS.map((x) => (
                  <option key={x.id} value={x.id}>{x.id === "porVencer" ? x.etiqueta : `${x.etiqueta} días`}</option>
                ))}
              </select>
            </label>
            <label className={t.campo}>
              <span>Estado</span>
              <select value={filtroEstado ?? ""} onChange={(e) => poner("estado", e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS.map((e) => (
                  <option key={e} value={e}>{ESTADO_FACTURA_CLIENTE[e].label}</option>
                ))}
              </select>
            </label>
            {hayFiltros && (
              <button type="button" className={t.limpiar} onClick={limpiar}>
                Limpiar filtros
              </button>
            )}
          </div>

          <Panel
            titulo="Cartera por cliente"
            subtitulo="Abre un cliente para ver sus facturas"
            extra={
              <div className={t.leyenda} aria-hidden="true">
                <span><i className={t.lPorVencer} />Por vencer</span>
                <span><i className={t.l30} />1 – 30</span>
                <span><i className={t.l60} />31 – 60</span>
                <span><i className={t.lMas60} />+60</span>
              </div>
            }
            alBorde
          >
            {visibles.length === 0 ? (
              <div className={t.vacioPanel}>
                <EmptyState titulo={isPending ? "Cargando…" : hayFiltros ? "Ninguna factura coincide con los filtros" : undefined} />
              </div>
            ) : (
              <div className={`${t.scroll} scroll-x`}>
                <table className={t.tabla}>
                  <thead>
                    <tr>
                      <th scope="col">Cliente / factura</th>
                      <th scope="col" className={t.der}>Unidades · O.S.</th>
                      <th scope="col" className={t.der}>Facturas / vence</th>
                      <th scope="col" className={t.der}>Por cobrar</th>
                      <th scope="col" className={t.der}>Vencido</th>
                      <th scope="col" className={t.der}>Días prom. de pago</th>
                      <th scope="col">Antigüedad · estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((c) => {
                      const abierto = abiertos.has(c.cliente.id);
                      return (
                        <Fragment key={c.cliente.id}>
                          <tr className={t.grupo}>
                            <td>
                              <button
                                type="button"
                                className={t.toggle}
                                aria-expanded={abierto}
                                onClick={() => {
                                  const n = new Set(abiertos);
                                  if (n.has(c.cliente.id)) n.delete(c.cliente.id);
                                  else n.add(c.cliente.id);
                                  setAbiertos(n);
                                }}
                              >
                                <span className={t.flecha} aria-hidden="true">{abierto ? "▾" : "▸"}</span>
                                {c.cliente.razonSocial}
                              </button>
                              <Link to={`/clientes/${encodeURIComponent(c.cliente.id)}`} className={t.secundario}>
                                Ver expediente
                              </Link>
                            </td>
                            <td className={t.der}>{numero(c.unidades)}</td>
                            <td className={t.der}>{numero(c.facturas.length)}</td>
                            <td className={t.der}><Monto valor={totalDe(c.tramos)} /></td>
                            <td className={`${t.der} ${vencidoDe(c.tramos) > 0 ? t.malo : ""}`}><Monto valor={vencidoDe(c.tramos)} /></td>
                            <td className={t.der}>{numero(c.diasPromedioPago)} d</td>
                            <td><BarraAntiguedad tramos={c.tramos} /></td>
                          </tr>
                          {abierto &&
                            c.facturas.map((f) => (
                              <tr key={f.folio} className={t.detalle}>
                                <td>
                                  <Folio folio={f.folio} tipo="factura" />
                                  <span className={t.secundario}>Emitida {fecha(fechaLocal(f.emision))}</span>
                                </td>
                                <td className={t.der}>
                                  {f.foliosOs.map((os) => (
                                    <span key={os} className={t.secundario}>
                                      <Folio folio={os} tipo="os" />
                                    </span>
                                  ))}
                                </td>
                                <td className={t.der}>{fecha(fechaLocal(f.vence), { anio: true })}</td>
                                <td className={t.der}>
                                  <Monto valor={f.saldo} />
                                  {f.saldo !== f.monto && <span className={t.secundario}>de <Monto valor={f.monto} /></span>}
                                </td>
                                <td className={`${t.der} ${f.diasVencida > 0 ? t.malo : ""}`}>
                                  {f.diasVencida > 0 ? `${numero(f.diasVencida)} d` : "—"}
                                </td>
                                <td />
                                <td>
                                  <Chip tono={ESTADO_FACTURA_CLIENTE[f.estado].tono}>{ESTADO_FACTURA_CLIENTE[f.estado].label}</Chip>
                                </td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={t.pie}>
                      <td colSpan={3}>
                        {numero(visibles.length)} clientes · {numero(visibles.reduce((a, c) => a + c.facturas.length, 0))} facturas
                      </td>
                      <td className={t.der}><Monto valor={visibles.reduce((a, c) => a + totalDe(c.tramos), 0)} /></td>
                      <td className={t.der}><Monto valor={visibles.reduce((a, c) => a + vencidoDe(c.tramos), 0)} /></td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Surface as="aside" variante="strong" className={t.lateral} aria-labelledby="cobranza">
          <div>
            <h2 id="cobranza" className={t.lateralTitulo}>Gestión de cobranza</h2>
            <div className={t.lateralSub}>Acciones sugeridas por antigüedad</div>
          </div>
          {data && data.acciones.length > 0 ? (
            <ul className={t.lista}>
              {data.acciones.map((a) => (
                <li key={a.id} className={t.itemLista}>
                  <b>{a.texto}</b>
                  <span className={t.secundario}>{a.detalle}</span>
                  <button type="button" className={t.limpiar} disabled title="Próximamente">
                    {a.accion}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className={t.vacioLateral}>Sin datos todavía</div>
          )}

          <div className={t.seccionLateral}>
            <h3 className={t.lateralTitulo}>Gestiones recientes</h3>
            {data && data.gestiones.length > 0 ? (
              <ul className={t.lista}>
                {data.gestiones.map((g) => (
                  <li key={g.id} className={t.itemLista}>
                    <b>{g.cliente}</b>
                    <span className={t.secundario}>
                      {fecha(fechaLocal(g.fecha))} · {g.tipo}
                    </span>
                    {g.resultado}
                  </li>
                ))}
              </ul>
            ) : (
              <div className={t.vacioLateral}>Sin datos todavía</div>
            )}
          </div>
        </Surface>
      </div>
    </div>
  );
}

Component.displayName = "CuentasPorCobrar";

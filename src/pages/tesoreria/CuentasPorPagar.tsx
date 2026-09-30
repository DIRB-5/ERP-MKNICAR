import { Fragment, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { KpiCard } from "@/components/KpiCard/KpiCard";
import { Panel } from "@/components/Panel/Panel";
import { Surface } from "@/components/Surface/Surface";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { Button } from "@/components/Button/Button";
import { fecha, numero } from "@/domain/format";
import type { EstadoPago, FacturaProveedor, SaldoProveedor } from "@/domain/tipos";
import { useCuentasPorPagar } from "@/data/consultas";
import { useTaller } from "@/app/useTaller";
import { diasEntre, fechaLocal } from "@/app/fechas";
import { TabsTesoreria } from "./TabsTesoreria";
import { abreviado, pct } from "./formato";
import { AUTORIZACION, PAGO } from "./etiquetas";
import styles from "@/pages/tableros/Tableros.module.css";
import t from "./Tesoreria.module.css";

const ESTADOS_PAGO = Object.keys(PAGO) as EstadoPago[];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const abierta = (f: FacturaProveedor) => f.pago !== "pagada";
const saldoDe = (p: SaldoProveedor) => p.facturas.filter(abierta).reduce((a, f) => a + f.saldo, 0);
const vencidoDe = (p: SaldoProveedor) =>
  p.facturas.filter((f) => abierta(f) && f.diasVencida > 0).reduce((a, f) => a + f.saldo, 0);

/** Vence en los próximos siete días, sin contar lo ya vencido. */
const venceEstaSemana = (f: FacturaProveedor, hoy: Date) => {
  const d = diasEntre(hoy, fechaLocal(f.vence));
  return abierta(f) && d >= 0 && d <= 7;
};

function Calendario({ facturas, hoy }: { facturas: FacturaProveedor[]; hoy: Date }) {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const desfase = (inicio.getDay() + 6) % 7;
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate();
  const total = Math.ceil((desfase + diasMes) / 7) * 7;
  const porDia = new Map<number, number>();
  for (const f of facturas) {
    const v = fechaLocal(f.vence);
    if (abierta(f) && v.getMonth() === hoy.getMonth() && v.getFullYear() === hoy.getFullYear()) {
      porDia.set(v.getDate(), (porDia.get(v.getDate()) ?? 0) + f.saldo);
    }
  }
  return (
    <div className={t.calendario} role="grid" aria-label="Vencimientos del mes por día">
      {DIAS.map((d, i) => (
        <div key={i} className={t.calCabeza} role="columnheader">
          {d}
        </div>
      ))}
      {Array.from({ length: total }, (_, i) => {
        const dia = i - desfase + 1;
        const dentro = dia >= 1 && dia <= diasMes;
        const fechaDia = new Date(hoy.getFullYear(), hoy.getMonth(), dia);
        const distancia = diasEntre(hoy, fechaDia);
        const monto = dentro ? porDia.get(dia) : undefined;
        return (
          <div
            key={i}
            role="gridcell"
            aria-current={distancia === 0 ? "date" : undefined}
            className={[
              t.calDia,
              !dentro ? t.calFuera : "",
              dentro && distancia >= 0 && distancia <= 7 ? t.calSemana : "",
              distancia === 0 ? t.calHoy : "",
            ].join(" ")}
          >
            {dentro ? dia : ""}
            {monto != null && <span className={t.calMonto}>{abreviado(monto)}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function Component() {
  const taller = useTaller();
  const [params, setParams] = useSearchParams();
  const { data: proveedores = [], isPending } = useCuentasPorPagar(taller);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());
  const hoy = new Date();

  const filtroProveedor = params.get("proveedor") ?? "";
  const filtroPago = ESTADOS_PAGO.find((e) => e === params.get("pago"));
  const hayFiltros = Boolean(filtroProveedor || filtroPago);

  const poner = (clave: string, valor: string) => {
    const s = new URLSearchParams(params);
    if (valor) s.set(clave, valor);
    else s.delete(clave);
    setParams(s, { replace: true });
  };

  const visibles = proveedores
    .filter((p) => !filtroProveedor || p.id === filtroProveedor)
    .map((p) => ({ ...p, facturas: p.facturas.filter((f) => !filtroPago || f.pago === filtroPago) }))
    .filter((p) => p.facturas.length > 0)
    .sort((a, b) => saldoDe(b) - saldoDe(a));

  const todas = proveedores.flatMap((p) => p.facturas.filter(abierta).map((f) => ({ f, p })));
  const total = todas.reduce((a, x) => a + x.f.saldo, 0);
  const semana = todas.filter((x) => venceEstaSemana(x.f, hoy));
  const vencidas = todas.filter((x) => x.f.diasVencida > 0);
  const programadas = todas.filter((x) => x.f.pago === "programada");
  const suma = (xs: typeof todas) => xs.reduce((a, x) => a + x.f.saldo, 0);
  const hayDatos = proveedores.length > 0;

  // Candidatas a la propuesta semanal: lo vencido y lo que vence en siete días, aún sin programar.
  const candidatas = todas.filter((x) => x.f.pago === "por_programar" && (x.f.diasVencida > 0 || venceEstaSemana(x.f, hoy)));
  const totalSeleccion = candidatas.filter((x) => seleccion.has(x.f.folio)).reduce((a, x) => a + x.f.saldo, 0);

  const alternar = (set: Set<string>, id: string) => {
    const n = new Set(set);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  };

  return (
    <div className={styles.vista}>
      <header className={styles.encabezado}>
        <div>
          <h1 className={styles.titulo}>Cuentas por pagar</h1>
          <p className={styles.subtitulo}>
            {taller}
            {hayDatos && ` · ${numero(todas.length)} facturas abiertas · ${numero(proveedores.length)} proveedores`}
          </p>
        </div>
        <div className={styles.acciones}>
          <TabsTesoreria />
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Exportar
          </button>
          <button type="button" className={`${styles.boton} ${styles.botonPrimario}`} disabled title="Próximamente">
            Registrar factura
          </button>
        </div>
      </header>

      <section className={styles.filaKpis} aria-label="Resumen de cuentas por pagar">
        <KpiCard
          etiqueta="Total por pagar"
          valor={hayDatos ? <Monto valor={total} escala="md" /> : "—"}
          contexto={hayDatos && `${numero(todas.length)} facturas de proveedor`}
        />
        <KpiCard
          etiqueta="Vence esta semana"
          valor={hayDatos ? <Monto valor={suma(semana)} escala="md" /> : "—"}
          contexto={hayDatos && `${numero(semana.length)} facturas en los próximos 7 días`}
        />
        <KpiCard
          etiqueta="Vencido"
          valor={hayDatos ? <Monto valor={suma(vencidas)} escala="md" /> : "—"}
          contexto={
            hayDatos &&
            `${numero(vencidas.length)} facturas${vencidas.length > 0 ? ` · máx. ${numero(Math.max(...vencidas.map((x) => x.f.diasVencida)))} días de atraso` : ""}`
          }
          tonoContexto={vencidas.length > 0 ? "malo" : "neutro"}
        />
        <KpiCard
          etiqueta="Programado para pago"
          valor={hayDatos ? <Monto valor={suma(programadas)} escala="md" /> : "—"}
          contexto={hayDatos && `${pct(suma(programadas), total)} del saldo · ${numero(programadas.length)} facturas`}
        />
      </section>

      <div className={t.layout}>
        <div className={t.principal}>
          <div className={t.filtros} role="search" aria-label="Filtrar cuentas por pagar">
            <label className={t.campo}>
              <span>Proveedor</span>
              <select value={filtroProveedor} onChange={(e) => poner("proveedor", e.target.value)}>
                <option value="">Todos</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </label>
            <label className={t.campo}>
              <span>Estado de pago</span>
              <select value={filtroPago ?? ""} onChange={(e) => poner("pago", e.target.value)}>
                <option value="">Todos</option>
                {ESTADOS_PAGO.map((e) => (
                  <option key={e} value={e}>{PAGO[e].label}</option>
                ))}
              </select>
            </label>
            {hayFiltros && (
              <button
                type="button"
                className={t.limpiar}
                onClick={() => {
                  const s = new URLSearchParams(params);
                  s.delete("proveedor");
                  s.delete("pago");
                  setParams(s, { replace: true });
                }}
              >
                Limpiar filtros
              </button>
            )}
          </div>

          <Panel
            titulo="Saldo por proveedor"
            subtitulo="Abre un proveedor para ver sus facturas y la O.S. que originó el gasto"
            alBorde
          >
            {visibles.length === 0 ? (
              <div className={t.vacioPanel}>
                <EmptyState
                  titulo={isPending ? "Cargando…" : hayFiltros ? "Ninguna factura coincide con los filtros" : undefined}
                />
              </div>
            ) : (
              <div className={`${t.scroll} scroll-x`}>
                <table className={t.tabla}>
                  <thead>
                    <tr>
                      <th scope="col">Proveedor / factura</th>
                      <th scope="col">Categoría · O.C. · O.S.</th>
                      <th scope="col" className={t.der}>O.C. abiertas / vence</th>
                      <th scope="col" className={t.der}>Por pagar</th>
                      <th scope="col" className={t.der}>Vencido</th>
                      <th scope="col">Crédito · autorización</th>
                      <th scope="col">Cumplimiento · pago</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibles.map((p) => {
                      const abierto = abiertos.has(p.id);
                      return (
                        <Fragment key={p.id}>
                          <tr className={t.grupo}>
                            <td>
                              <button
                                type="button"
                                className={t.toggle}
                                aria-expanded={abierto}
                                onClick={() => setAbiertos(alternar(abiertos, p.id))}
                              >
                                <span className={t.flecha} aria-hidden="true">{abierto ? "▾" : "▸"}</span>
                                {p.nombre}
                              </button>
                            </td>
                            <td>{p.categoria}</td>
                            <td className={t.der}>{numero(p.ocAbiertas)}</td>
                            <td className={t.der}><Monto valor={saldoDe(p)} /></td>
                            <td className={`${t.der} ${vencidoDe(p) > 0 ? t.malo : ""}`}><Monto valor={vencidoDe(p)} /></td>
                            <td>{numero(p.creditoDias)} días</td>
                            <td>{p.cumplimiento.toFixed(0)}% a tiempo</td>
                          </tr>
                          {abierto &&
                            p.facturas.map((f) => (
                              <tr key={f.folio} className={t.detalle}>
                                <td>
                                  <Folio folio={f.folio} />
                                  <span className={t.secundario}>Emitida {fecha(fechaLocal(f.emision))}</span>
                                </td>
                                <td>
                                  <Folio folio={f.folioOc} tipo="ordenCompra" />
                                  {f.folioOs && (
                                    <span className={t.secundario}>
                                      O.S. <Folio folio={f.folioOs} tipo="os" />
                                    </span>
                                  )}
                                </td>
                                <td className={t.der}>{fecha(fechaLocal(f.vence), { anio: true })}</td>
                                <td className={t.der}><Monto valor={f.saldo} /></td>
                                <td className={`${t.der} ${f.diasVencida > 0 ? t.malo : ""}`}>
                                  {f.diasVencida > 0 ? `${numero(f.diasVencida)} d` : "—"}
                                </td>
                                <td><Chip tono={AUTORIZACION[f.autorizacion].tono}>{AUTORIZACION[f.autorizacion].label}</Chip></td>
                                <td><Chip tono={PAGO[f.pago].tono}>{PAGO[f.pago].label}</Chip></td>
                              </tr>
                            ))}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className={t.pie}>
                      <td colSpan={3}>
                        {numero(visibles.length)} proveedores · {numero(visibles.reduce((a, p) => a + p.facturas.length, 0))} facturas
                      </td>
                      <td className={t.der}><Monto valor={visibles.reduce((a, p) => a + saldoDe(p), 0)} /></td>
                      <td className={t.der}><Monto valor={visibles.reduce((a, p) => a + vencidoDe(p), 0)} /></td>
                      <td colSpan={2} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </Panel>
        </div>

        <Surface as="aside" variante="strong" className={t.lateral} aria-labelledby="programacion">
          <div>
            <h2 id="programacion" className={t.lateralTitulo}>Programación de pagos</h2>
            <div className={t.lateralSub}>Vencimientos del mes por día · la semana en curso va sombreada</div>
          </div>
          <Calendario facturas={todas.map((x) => x.f)} hoy={hoy} />

          <div className={t.seccionLateral}>
            <h3 className={t.lateralTitulo}>Propuesta de pago semanal</h3>
            {candidatas.length === 0 ? (
              <div className={t.vacioLateral}>{hayDatos ? "Nada vencido ni por vencer esta semana." : "Sin datos todavía"}</div>
            ) : (
              <ul className={t.lista}>
                {candidatas.map(({ f, p }) => (
                  <li key={f.folio} className={t.itemLista}>
                    <label className={t.propuesta}>
                      <input
                        type="checkbox"
                        checked={seleccion.has(f.folio)}
                        onChange={() => setSeleccion(alternar(seleccion, f.folio))}
                      />
                      <span>
                        <b>{p.nombre}</b>
                        <span className={t.secundario}>
                          {f.folio} · {f.diasVencida > 0 ? `vencida ${numero(f.diasVencida)} d` : `vence ${fecha(fechaLocal(f.vence))}`}
                        </span>
                      </span>
                      <Monto valor={f.saldo} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <div className={t.total}>
              <span>Total seleccionado</span>
              <Monto valor={totalSeleccion} />
            </div>
            <Button variante="primario" disabled title="Se conecta con el motor de autorizaciones del backend">
              Generar propuesta de pago
            </Button>
            <div className={t.aviso}>Requiere autorización de Dirección.</div>
          </div>
        </Surface>
      </div>
    </div>
  );
}

Component.displayName = "CuentasPorPagar";

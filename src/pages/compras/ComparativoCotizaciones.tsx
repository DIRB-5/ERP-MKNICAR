import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Panel } from "@/components/Panel/Panel";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Chip } from "@/components/Chip/Chip";
import { Aviso } from "@/components/Aviso/Aviso";
import { Button } from "@/components/Button/Button";
import { SegmentedControl } from "@/components/SegmentedControl/SegmentedControl";
import { fecha, fechaHora, numero } from "@/domain/format";
import type { ComparativoCotizacion, ConceptoRequisicion, Oferta } from "@/domain/tipos";
import { useComparativo } from "@/data/consultas";
import { fechaLocal } from "@/app/fechas";
import { TASA_IVA } from "@/app/sat";
import { DISPONIBILIDAD } from "@/pages/proveedores/etiquetas";
import styles from "@/pages/tableros/Tableros.module.css";
import c from "./Compras.module.css";

type Modo = "optimo" | "bloque" | "manual";
type Seleccion = Record<string, string>;

const ofertaDe = (k: ConceptoRequisicion, proveedorId: string): Oferta | undefined =>
  k.ofertas.find((o) => o.proveedorId === proveedorId);

/** La más barata; a igual precio, la que surte antes. */
function mejorOferta(k: ConceptoRequisicion): Oferta | undefined {
  return [...k.ofertas].sort(
    (a, b) => a.precioUnitario - b.precioUnitario || (a.diasEntrega ?? 0) - (b.diasEntrega ?? 0)
  )[0];
}

function seleccionOptima(d: ComparativoCotizacion): Seleccion {
  const s: Seleccion = {};
  for (const k of d.conceptos) {
    const m = mejorOferta(k);
    if (m) s[k.id] = m.proveedorId;
  }
  return s;
}

/** Proveedor que cotizó todo y sale más barato comprándole el bloque completo. */
function mejorBloque(d: ComparativoCotizacion): { proveedorId: string; subtotal: number } | null {
  const candidatos = d.proveedores
    .filter((p) => p.respondio && d.conceptos.every((k) => ofertaDe(k, p.proveedor.id)))
    .map((p) => ({
      proveedorId: p.proveedor.id,
      subtotal: d.conceptos.reduce((a, k) => a + (ofertaDe(k, p.proveedor.id)?.precioUnitario ?? 0) * k.cantidad, 0),
    }))
    .sort((a, b) => a.subtotal - b.subtotal);
  return candidatos[0] ?? null;
}

const disponibilidad = (o: Oferta) =>
  o.disponibilidad === "sobre_pedido" && o.diasEntrega ? `${numero(o.diasEntrega)} días` : DISPONIBILIDAD[o.disponibilidad].label;

function Comparativo({ d }: { d: ComparativoCotizacion }) {
  const bloque = mejorBloque(d);
  const [modo, setModo] = useState<Modo>("optimo");
  const [seleccion, setSeleccion] = useState<Seleccion>(() => seleccionOptima(d));

  const respondieron = d.proveedores.filter((p) => p.respondio);
  const nombre = new Map(d.proveedores.map((p) => [p.proveedor.id, p.proveedor.nombre]));

  const cambiarModo = (m: Modo) => {
    if (m === "bloque" && !bloque) return;
    setModo(m);
    if (m === "optimo") setSeleccion(seleccionOptima(d));
    if (m === "bloque" && bloque) setSeleccion(Object.fromEntries(d.conceptos.map((k) => [k.id, bloque.proveedorId])));
  };

  const elegir = (conceptoId: string, proveedorId: string) => {
    setSeleccion((s) => ({ ...s, [conceptoId]: proveedorId }));
    setModo("manual");
  };

  const importe = (k: ConceptoRequisicion) => {
    const o = seleccion[k.id] ? ofertaDe(k, seleccion[k.id] ?? "") : undefined;
    return o ? o.precioUnitario * k.cantidad : 0;
  };
  const total = d.conceptos.reduce((a, k) => a + importe(k), 0);
  const sinCotizar = d.conceptos.filter((k) => k.ofertas.length === 0);
  const usados = [...new Set(Object.values(seleccion))];
  const ahorro = bloque ? bloque.subtotal - total : null;
  const desviacion = d.estimadoInicial > 0 ? ((total - d.estimadoInicial) / d.estimadoInicial) * 100 : null;

  const subtotalDe = (pid: string) => d.conceptos.reduce((a, k) => a + (ofertaDe(k, pid)?.precioUnitario ?? 0) * k.cantidad, 0);
  const cotizados = (pid: string) => d.conceptos.filter((k) => ofertaDe(k, pid)).length;

  return (
    <div className={c.layout}>
      <div className={c.principal}>
        <Panel
          titulo="Comparativo por concepto"
          subtitulo="Elige la oferta de cada concepto o usa una de las dos reglas"
          extra={
            // En selección manual ninguna de las dos reglas queda marcada.
            <SegmentedControl<Modo>
              etiqueta="Selección"
              opciones={[
                { id: "bloque", etiqueta: "Todo a un solo proveedor" },
                { id: "optimo", etiqueta: "Optimizar por concepto" },
              ]}
              valor={modo}
              onCambiar={cambiarModo}
            />
          }
          alBorde
        >
          {!bloque && respondieron.length > 0 && (
            <div className={c.aviso}>
              <Aviso titulo="Ningún proveedor cotizó todos los conceptos: la compra en bloque no aplica." />
            </div>
          )}
          <div className={`${c.scroll} scroll-x`}>
            <table className={c.tabla}>
              <thead>
                <tr>
                  <th scope="col">Concepto</th>
                  <th scope="col">Núm. de parte</th>
                  <th scope="col" className={c.der}>Cant.</th>
                  <th scope="col" className={c.der}>Último costo</th>
                  {respondieron.map((p) => (
                    <th key={p.proveedor.id} scope="col" className={c.proveedor}>
                      {p.proveedor.nombre}
                      <span className={c.meta}>Respondió {p.respondio ? fechaHora(new Date(p.respondio)) : "—"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.conceptos.map((k) => {
                  const mejor = mejorOferta(k);
                  return (
                    <tr key={k.id}>
                      <td>
                        <span className={c.fuerte}>{k.descripcion}</span>
                        <span className={c.meta}>{k.sistema}</span>
                      </td>
                      <td><Folio folio={k.numeroParte} /></td>
                      <td className={c.der}>{numero(k.cantidad)}</td>
                      <td className={c.der}>{k.ultimoCosto != null ? <Monto valor={k.ultimoCosto} /> : "—"}</td>
                      {respondieron.map((p) => {
                        const o = ofertaDe(k, p.proveedor.id);
                        if (!o) return <td key={p.proveedor.id} className={c.sinOferta}>No cotizó</td>;
                        const elegida = seleccion[k.id] === p.proveedor.id;
                        const esMejor = mejor?.proveedorId === p.proveedor.id && k.ofertas.length > 1;
                        const alza = k.ultimoCosto ? ((o.precioUnitario - k.ultimoCosto) / k.ultimoCosto) * 100 : null;
                        return (
                          <td key={p.proveedor.id} className={`${c.oferta} ${elegida ? c.elegida : ""}`}>
                            <button
                              type="button"
                              className={c.celda}
                              aria-pressed={elegida}
                              aria-label={`Elegir ${p.proveedor.nombre} para ${k.descripcion}`}
                              onClick={() => elegir(k.id, p.proveedor.id)}
                            >
                              <span className={c.check} aria-hidden="true">{elegida ? "✓" : ""}</span>
                              <span className={c.precio}>
                                <Monto valor={o.precioUnitario} />
                                {alza != null && alza > 0.5 && <span className={c.alza}>▲ {alza.toFixed(1)}%</span>}
                              </span>
                              <span className={c.meta}>Importe <Monto valor={o.precioUnitario * k.cantidad} /></span>
                              <span className={c.etiquetas}>
                                <Chip tono={DISPONIBILIDAD[o.disponibilidad].tono}>{disponibilidad(o)}</Chip>
                                {esMejor && <Chip tono="ok">Mejor precio</Chip>}
                              </span>
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>
                    <span className={c.fuerte}>Totales por proveedor</span>
                    <span className={c.meta}>Estimado inicial <Monto valor={d.estimadoInicial} /></span>
                  </td>
                  {respondieron.map((p) => {
                    const sub = subtotalDe(p.proveedor.id);
                    const completos = cotizados(p.proveedor.id) === d.conceptos.length;
                    return (
                      <td key={p.proveedor.id} className={`${c.totales} ${bloque?.proveedorId === p.proveedor.id ? c.mejorBloque : ""}`}>
                        {!completos && (
                          <span className={c.meta}>
                            Cotizó {numero(cotizados(p.proveedor.id))} de {numero(d.conceptos.length)}
                          </span>
                        )}
                        <span className={c.linea}>Subtotal <Monto valor={sub} /></span>
                        <span className={c.linea}>IVA {Math.round(TASA_IVA * 100)}% <Monto valor={sub * TASA_IVA} /></span>
                        <span className={`${c.linea} ${c.fuerte}`}>Total <Monto valor={sub * (1 + TASA_IVA)} /></span>
                        <span className={c.meta}>
                          Entrega {p.entregaDias != null ? `${numero(p.entregaDias)} días` : "—"} · Crédito{" "}
                          {p.creditoDias != null ? `${numero(p.creditoDias)} días` : "—"}
                        </span>
                        {bloque?.proveedorId === p.proveedor.id && <Chip tono="ok">Más económico en bloque</Chip>}
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>
          {sinCotizar.length > 0 && (
            <div className={c.aviso}>
              <Aviso tono="critico" titulo="Conceptos sin ninguna cotización">
                {sinCotizar.map((k) => k.descripcion).join(" · ")}
              </Aviso>
            </div>
          )}
        </Panel>
      </div>

      <Surface as="aside" variante="strong" className={c.lateral} aria-labelledby="resumen">
        <div>
          <h2 id="resumen" className={c.lateralTitulo}>Resumen de la selección</h2>
          <div className={c.meta}>
            {modo === "bloque"
              ? `Compra en bloque · 1 O.C.`
              : `${modo === "optimo" ? "Optimizado por concepto" : "Selección manual"} · ${numero(usados.length)} O.C. por generar`}
          </div>
        </div>

        <div className={c.total}>
          <span>Selección</span>
          <Monto valor={total} escala="md" />
          {ahorro != null && modo !== "bloque" && (
            <span className={c.meta}>
              {ahorro > 0 ? <>Ahorro de <Monto valor={ahorro} /> vs. el más económico en bloque</> : "Sin ahorro contra la compra en bloque"}
            </span>
          )}
        </div>

        {usados.length > 1 && (
          <Aviso titulo={`Implica ${numero(usados.length)} órdenes de compra y ${numero(usados.length)} recepciones.`} />
        )}

        <ul className={c.bloques}>
          {usados.map((pid) => {
            const conceptos = d.conceptos.filter((k) => seleccion[k.id] === pid);
            return (
              <li key={pid}>
                <div className={c.bloqueHead}>
                  <b>{nombre.get(pid)}</b>
                  <span className={c.meta}>{numero(conceptos.length)} de {numero(d.conceptos.length)} conceptos</span>
                </div>
                <ul className={c.conceptos}>
                  {conceptos.map((k) => (
                    <li key={k.id}>
                      <span>{k.descripcion}</span>
                      <Monto valor={importe(k)} />
                    </li>
                  ))}
                </ul>
                <div className={c.bloqueHead}>
                  <span className={c.meta}>1 orden de compra</span>
                  <b><Monto valor={conceptos.reduce((a, k) => a + importe(k), 0)} /></b>
                </div>
              </li>
            );
          })}
        </ul>

        <div className={c.seccion}>
          <div className={c.lateralTitulo}>Contra el presupuesto estimado</div>
          <dl className={c.contra}>
            <dt>Estimado inicial</dt>
            <dd><Monto valor={d.estimadoInicial} /></dd>
            <dt>Selección actual</dt>
            <dd><Monto valor={total} /></dd>
            <dt>Desviación</dt>
            <dd>
              {desviacion != null ? (
                <>
                  <Monto valor={desviacion} formato="porcentaje" sentido="desviacion" /> · <Monto valor={Math.abs(total - d.estimadoInicial)} />
                </>
              ) : (
                "—"
              )}
            </dd>
          </dl>
          {desviacion != null && desviacion > 0 && (
            <span className={c.meta}>Por encima de lo estimado: el presupuesto al cliente debe reflejarlo.</span>
          )}
        </div>

        <Button variante="primario" disabled title="Se conecta con el backend">
          Generar presupuesto al cliente
        </Button>
        <Button disabled title="Se conecta con el motor de autorizaciones del backend">
          Generar {numero(usados.length)} {usados.length === 1 ? "orden de compra" : "órdenes de compra"}
        </Button>
        <span className={c.meta}>La O.C. requiere autorización de Dirección.</span>
      </Surface>
    </div>
  );
}

export function Component() {
  const { folio = "" } = useParams();
  const { data: d, isPending } = useComparativo(folio);

  return (
    <div className={styles.vista}>
      <div className={c.migas}>
        <Link to="/compras/comparativos">Compras</Link> / Comparativo de cotizaciones / <b>{folio}</b>
      </div>

      <Surface as="header" className={c.ficha}>
        <div className={c.fichaPrincipal}>
          <h1 className={c.folio}>
            {d?.folio ?? folio} {d && <Chip tono="brand">{d.estado}</Chip>}
          </h1>
          <div className={c.meta}>
            {d ? (
              <>
                O.S. <Folio folio={d.folioOs} tipo="os" /> · {d.servicio}
              </>
            ) : (
              "—"
            )}
          </div>
        </div>
        <dl className={c.datos}>
          <div><dt>Unidad</dt><dd>{d ? `${d.unidad.placas} · ${d.unidad.marca} ${d.unidad.modelo}` : "—"}</dd></div>
          <div><dt>Cliente</dt><dd>{d?.cliente ?? "—"}</dd></div>
          <div><dt>Taller</dt><dd>{d?.taller ?? "—"}</dd></div>
          <div><dt>Conceptos</dt><dd>{d ? numero(d.conceptos.length) : "—"}</dd></div>
          <div><dt>Solicitada</dt><dd>{d ? fecha(fechaLocal(d.solicitada), { anio: true }) : "—"}</dd></div>
          <div>
            <dt>Respuestas</dt>
            <dd>
              {d
                ? `${numero(d.proveedores.filter((p) => p.respondio).length)} de ${numero(d.proveedores.length)} proveedores`
                : "—"}
            </dd>
          </div>
        </dl>
        <div className={c.accionesFicha}>
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Solicitar cotización faltante
          </button>
          <button type="button" className={styles.boton} disabled title="Próximamente">
            Exportar comparativo
          </button>
        </div>
      </Surface>

      {isPending ? (
        <EmptyState titulo="Cargando comparativo…" />
      ) : d ? (
        d.proveedores.some((p) => p.respondio) ? (
          <Comparativo d={d} />
        ) : (
          <EmptyState titulo="Ningún proveedor ha respondido">
            Las ofertas aparecerán aquí conforme lleguen las cotizaciones. Invitados: {d.proveedores.map((p) => p.proveedor.nombre).join(", ")}.
          </EmptyState>
        )
      ) : (
        <>
          <Aviso titulo={`No encontramos la requisición ${folio}.`}>
            La pantalla se muestra sin datos mientras no exista el módulo de compras.
          </Aviso>
          <div className={c.layout}>
            <Panel titulo="Comparativo por concepto" subtitulo="Ofertas de cada proveedor, concepto por concepto">
              <EmptyState />
            </Panel>
            <Surface as="aside" variante="strong" className={c.lateral}>
              <h2 className={c.lateralTitulo}>Resumen de la selección</h2>
              <div className={c.vacio}>Sin datos todavía</div>
            </Surface>
          </div>
        </>
      )}
    </div>
  );
}

Component.displayName = "ComparativoCotizaciones";

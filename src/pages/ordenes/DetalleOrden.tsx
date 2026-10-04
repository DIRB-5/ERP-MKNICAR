import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Tabs } from "@/components/Tabs/Tabs";
import { Button } from "@/components/Button/Button";
import { Timeline, type Tramo } from "@/components/Timeline/Timeline";
import { Estado } from "@/components/Estado/Estado";
import { Antiguedad } from "@/components/Antiguedad/Antiguedad";
import { Folio } from "@/components/Folio/Folio";
import { Aviso } from "@/components/Aviso/Aviso";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { AREA_LABEL } from "@/domain/areas";
import { ESTADO, type EstadoOS } from "@/domain/estados";
import { fechaHora, numero } from "@/domain/format";
import type { TramoEstado } from "@/domain/tipos";
import { useCambiarEstado, useDetalleOS } from "@/data/consultas";
import { caminoRestante, destinosDirectos, esTerminal, requiereFormulario, requiereMotivo } from "@/app/transiciones";
import { ChipFueraDeBase, TIPO_CLIENTE } from "@/pages/catalogos/etiquetas";
import { PRIORIDAD, TIPO_INGRESO, TIPO_SERVICIO } from "./ingreso/etiquetas";
import { DialogoCambioEstado } from "./DialogoCambioEstado";
import { SelectorEstado } from "./EstadoEditable";
import { PestanaPresupuesto } from "./expediente/PestanaPresupuesto";
import { PestanaCompras } from "./expediente/PestanaCompras";
import { PestanaTrazabilidad } from "./expediente/PestanaTrazabilidad";
import s from "./DetalleOrden.module.css";

const DIA = 86_400_000;

const PESTANAS = ["resumen", "presupuesto", "compras", "trazabilidad"] as const;
type IdPestana = (typeof PESTANAS)[number];
const esPestana = (v: string | null): v is IdPestana => PESTANAS.some((p) => p === v);

/** Lo ocurrido más lo que falta si todo avanza sin retornos. */
function armarLinea(historial: TramoEstado[]): { tramos: Tramo[]; indiceActual: number; transcurrido: number; espera: number } {
  const ahora = Date.now();
  const hechos: Tramo[] = historial.map((t) => {
    const desde = new Date(t.desde);
    const fin = t.hasta ? new Date(t.hasta).getTime() : ahora;
    return {
      estado: t.estado,
      desde,
      duracionDias: t.hasta ? (fin - desde.getTime()) / DIA : undefined,
      responsable: t.responsable ?? undefined,
    };
  });
  const actual = historial[historial.length - 1]?.estado ?? "programada";
  const futuros: Tramo[] = (historial.length ? caminoRestante(actual) : ["programada" as EstadoOS, ...caminoRestante("programada")]).map(
    (estado) => ({ estado })
  );
  const inicio = historial[0] ? new Date(historial[0].desde).getTime() : ahora;
  const espera = historial
    .filter((t) => ESTADO[t.estado].espera)
    .reduce((a, t) => a + ((t.hasta ? new Date(t.hasta).getTime() : ahora) - new Date(t.desde).getTime()), 0);
  return {
    tramos: [...hechos, ...futuros],
    indiceActual: historial.length - 1,
    transcurrido: (ahora - inicio) / DIA,
    espera: espera / DIA,
  };
}

export function Component() {
  const { folio = "" } = useParams();
  const { data: d, isPending } = useDetalleOS(folio);
  const [destino, setDestino] = useState<EstadoOS | null>(null);
  // Estatus elegido en el selector, pendiente de guardar.
  const [pendiente, setPendiente] = useState<EstadoOS | "">("");
  const cambiar = useCambiarEstado();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const crudo = params.get("pestana");
  const pestana: IdPestana = esPestana(crudo) ? crudo : "resumen";
  const cambiarPestana = (p: IdPestana) => {
    const n = new URLSearchParams(params);
    n.set("pestana", p);
    setParams(n, { replace: true });
  };

  if (isPending) return <EmptyState titulo="Cargando O.S.…" />;

  const o = d?.resumen;
  const linea = armarLinea(d?.historial ?? []);
  const opciones = o ? destinosDirectos(o.estado) : [];
  const avance = opciones.find((x) => o && !requiereMotivo(o.estado, x));
  const conMotivo = [...(d?.historial ?? [])].reverse();

  return (
    <div className={s.vista}>
      <div className={s.migas}>
        <Link to="/ordenes">Órdenes de Servicio</Link> / <b>{folio}</b>
      </div>

      {!d && (
        <Aviso titulo={`No encontramos la O.S. ${folio}.`}>
          La pantalla se muestra sin datos mientras no exista en el sistema.
        </Aviso>
      )}

      {/* Banda de la O.S. */}
      <Surface as="header" className={s.banda}>
        <div className={s.bandaHead}>
          <h1 className={s.folio}>{o?.folio ?? folio}</h1>
          {o && <Estado estado={o.estado} sobreVidrio />}
          {o && !esTerminal(o.estado) && <Antiguedad dias={o.diasEnEstado} />}
          {o && <span className={s.responsable}>Responsable: {AREA_LABEL[ESTADO[o.estado].area]}</span>}
        </div>

        <dl className={s.datos}>
          <div>
            <dt>Unidad</dt>
            <dd>{o ? `${o.unidad.marca} ${o.unidad.modelo} ${d?.anio || ""}`.trim() : "—"}</dd>
          </div>
          <div>
            <dt>Placas</dt>
            <dd>
              {o ? (
                <Link to={`/unidades/${encodeURIComponent(o.unidad.placas)}`}>
                  <Folio folio={o.unidad.placas} />
                </Link>
              ) : (
                "—"
              )}
            </dd>
          </div>
          <div>
            <dt>VIN</dt>
            <dd>{d?.vin || "—"}</dd>
          </div>
          <div>
            <dt>Km al ingreso</dt>
            <dd>{d?.kilometrajeIngreso != null ? `${numero(d.kilometrajeIngreso)} km` : "—"}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>
              {o ? <Link to={`/clientes/${encodeURIComponent(o.cliente.id)}`}>{o.cliente.razonSocial}</Link> : "—"}
              {d?.clienteTipo && <span className={s.meta}>{TIPO_CLIENTE[d.clienteTipo]}</span>}
            </dd>
          </div>
          <div>
            <dt>Taller</dt>
            <dd className={s.taller}>
              {o?.taller.nombre ?? "—"}
              {o?.tallerBase && o.tallerBase.id !== o.taller.id && <ChipFueraDeBase base={o.tallerBase.nombre} />}
            </dd>
          </div>
          <div>
            <dt>Servicio</dt>
            <dd>
              {o ? TIPO_SERVICIO[o.tipoServicio] : "—"}
              {o && <span className={s.meta}>Prioridad {PRIORIDAD[o.prioridad].toLowerCase()}</span>}
            </dd>
          </div>
          <div>
            <dt>Ingreso · asesor</dt>
            <dd>
              {d ? TIPO_INGRESO[d.tipoIngreso] : "—"}
              <span className={s.meta}>{o?.asesor ?? "Asesor sin asignar"}</span>
            </dd>
          </div>
        </dl>

        {o && (
          <div className={s.acciones}>
            {esTerminal(o.estado) ? (
              <span className={s.meta}>La O.S. está {ESTADO[o.estado].label.toLowerCase()}: ya no cambia de estado.</span>
            ) : (
              <div className={s.cambio}>
                <label className={s.cambioEtiqueta} htmlFor="selector-estatus">
                  Cambiar estatus
                </label>
                <SelectorEstado
                  id="selector-estatus"
                  folio={o.folio}
                  estado={o.estado}
                  valor={pendiente}
                  onElegir={(v) => {
                    setPendiente(v);
                    cambiar.reset();
                  }}
                  className={s.selectorCiclo}
                />
                <Button
                  variante="primario"
                  disabled={!pendiente || cambiar.isPending}
                  onClick={() => {
                    if (!pendiente) return;
                    if (requiereFormulario(pendiente)) {
                      navigate(`/ordenes/recepcion/${encodeURIComponent(o.folio)}`);
                    } else if (requiereMotivo(o.estado, pendiente)) {
                      // El retorno no se guarda sin motivo: se captura en la confirmación.
                      setDestino(pendiente);
                    } else {
                      cambiar.mutate({ folio: o.folio, a: pendiente, comentario: null }, { onSuccess: () => setPendiente("") });
                    }
                  }}
                >
                  {cambiar.isPending ? "Guardando…" : "Guardar"}
                </Button>
                <span className={s.meta}>
                  {pendiente && requiereMotivo(o.estado, pendiente)
                    ? "Este cambio es un retorno: al guardar se pide el motivo."
                    : avance
                      ? `Siguiente en el ciclo: ${ESTADO[avance].label}.`
                      : ""}
                </span>
                {cambiar.error && <span className={s.error}>No se pudo guardar: {cambiar.error.message}</span>}
              </div>
            )}
          </div>
        )}
      </Surface>

      <div className={s.cuerpo}>
        <Surface className={s.expediente}>
          <Tabs
            etiqueta="Expediente de la O.S."
            idBase="os"
            activa={pestana}
            onCambiar={cambiarPestana}
            pestanas={[
              { id: "resumen", etiqueta: "Resumen" },
              { id: "presupuesto", etiqueta: "Presupuesto" },
              { id: "compras", etiqueta: "Compras", conteo: d?.expediente.compras.length },
              { id: "trazabilidad", etiqueta: "Trazabilidad" },
            ]}
          >
            {pestana === "resumen" && (
              <div className={s.resumen}>
                <section aria-labelledby="motivo">
                  <h3 id="motivo" className={s.subtitulo}>Motivo reportado por el cliente</h3>
                  {d ? <blockquote className={s.motivo}>“{d.motivoReportado}”</blockquote> : <EmptyState />}
                </section>
                <section aria-labelledby="historial">
                  <h3 id="historial" className={s.subtitulo}>Historial de cambios</h3>
                  {conMotivo.length === 0 ? (
                    <EmptyState />
                  ) : (
                    <ol className={s.historial}>
                      {conMotivo.map((t, i) => (
                        <li key={`${t.estado}-${t.desde}`} className={t.comentario ? s.conComentario : undefined}>
                          <div className={s.historialHead}>
                            <Estado estado={t.estado} />
                            <span className={s.meta}>
                              {fechaHora(new Date(t.desde))}
                              {t.responsable ? ` · ${t.responsable}` : ""}
                              {i === 0 && !esTerminal(t.estado) ? " · actual" : ""}
                            </span>
                          </div>
                          {t.comentario && <p className={s.comentario}>{t.comentario}</p>}
                        </li>
                      ))}
                    </ol>
                  )}
                </section>
              </div>
            )}
            {pestana === "presupuesto" && <PestanaPresupuesto presupuesto={d?.expediente.presupuesto ?? null} />}
            {pestana === "compras" && <PestanaCompras compras={d?.expediente.compras ?? []} />}
            {pestana === "trazabilidad" &&
              (d ? <PestanaTrazabilidad expediente={d.expediente} /> : <EmptyState />)}
          </Tabs>
        </Surface>

        <section className={s.columna} aria-labelledby="ciclo">
          <div className={s.cicloHead}>
            <h2 id="ciclo" className={s.cicloTitulo}>Ciclo de la O.S.</h2>
            <span className={s.meta}>
              {d ? `${numero(d.historial.length)} estados recorridos · faltan ${numero(linea.tramos.length - d.historial.length)}` : "—"}
            </span>
          </div>
          <Timeline
            tramos={linea.tramos}
            indiceActual={linea.indiceActual}
            resumen={{
              transcurridoDias: linea.transcurrido,
              productivoDias: Math.max(0, linea.transcurrido - linea.espera),
              esperaDias: linea.espera,
            }}
          />
        </section>
      </div>

      {o && destino && (
        <DialogoCambioEstado
          folio={o.folio}
          estado={o.estado}
          inicial={destino}
          onCerrar={() => {
            setDestino(null);
            setPendiente("");
          }}
        />
      )}
    </div>
  );
}

Component.displayName = "DetalleOrden";

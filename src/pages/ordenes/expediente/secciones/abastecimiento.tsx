import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/Button/Button";
import { Chip } from "@/components/Chip/Chip";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select, Textarea } from "@/components/Campo/Campo";
import { eventosDe, type CargaCotizacion, type Disponibilidad } from "@/domain/bitacora";
import { COTIZACIONES_MINIMAS, ESTADO_REQUISICION, type EstadoRequisicion } from "@/domain/compras";
import { cotizacionesVigentes, elecciones, piezasSolicitadas, type PiezaSolicitada } from "@/domain/expediente";
import { numero } from "@/domain/format";
import { useProveedores, useRegistrarEvento } from "@/data/consultas";
import { hoyISO } from "@/app/fechas";
import { aAdjuntos } from "../captura";
import { Acciones, Pendiente, Subtitulo, Tabla, dia, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

const DISPONIBILIDAD: Record<Disponibilidad, string> = {
  inmediata: "Inmediata",
  sobre_pedido: "Sobre pedido",
  agotado: "Agotado",
};

type Exp = PropsSeccion["exp"];

const solicitud = (exp: Exp) => eventosDe(exp.eventos, "requisicion_generada").at(-1) ?? null;

/** Estado de la solicitud según lo capturado: cotizaciones recibidas y piezas con proveedor. */
function estadoSolicitud(exp: Exp): EstadoRequisicion | null {
  const sol = solicitud(exp);
  if (!sol) return null;
  const piezas = piezasSolicitadas(exp.eventos);
  const cotizaciones = cotizacionesVigentes(exp.eventos);
  const elegidas = elecciones(exp.eventos);
  if (cotizaciones.length === 0) {
    // Sin cotizaciones capturadas aquí, cuenta lo que haya reportado Compras.
    return eventosDe(exp.eventos, "requisicion_actualizada").at(-1)?.carga.estado ?? sol.carga.estado;
  }
  const conProveedor = piezas.filter((p) => elegidas.has(p.id)).length;
  if (piezas.length > 0 && conProveedor === piezas.length) return "adjudicada";
  if (conProveedor > 0) return "parcialmente_adjudicada";
  return cotizaciones.length >= COTIZACIONES_MINIMAS ? "cotizada" : "en_cotizacion";
}

export const resumen: ResumenSeccion = (exp) => {
  const sol = solicitud(exp);
  if (!sol) return null;
  const estado = estadoSolicitud(exp);
  const n = cotizacionesVigentes(exp.eventos).length;
  return `${sol.carga.folio} · ${estado ? ESTADO_REQUISICION[estado].label : ""} · ${numero(n)} ${n === 1 ? "cotización" : "cotizaciones"}`;
};

/** La oferta más barata de cada pieza, para marcarla en el comparativo. */
function mejorPrecio(piezaId: string, cotizaciones: ReturnType<typeof cotizacionesVigentes>): number | null {
  const precios = cotizaciones.flatMap((c) => c.carga.partidas.filter((x) => x.piezaId === piezaId).map((x) => x.precioUnitario));
  return precios.length ? Math.min(...precios) : null;
}

/**
 * Solicitud de refacciones y su comparativo. Las piezas salen del
 * diagnóstico; cada proveedor cotiza las que quiera y se elige ganador por pieza.
 */
export default function Abastecimiento({ exp, abierta }: PropsSeccion) {
  const [cotizando, setCotizando] = useState(false);
  const [eligiendo, setEligiendo] = useState<{ pieza: PiezaSolicitada; cotizacion: CargaCotizacion; precio: number } | null>(null);
  const registrar = useRegistrarEvento();

  const sol = solicitud(exp);
  const piezas = piezasSolicitadas(exp.eventos);
  const cotizaciones = cotizacionesVigentes(exp.eventos);
  const elegidas = elecciones(exp.eventos);
  const estado = estadoSolicitud(exp);

  if (!sol) return <Pendiente>La solicitud de refacciones se genera al pasar la O.S. a ese estado.</Pendiente>;

  const elegir = (pieza: PiezaSolicitada, cotizacion: CargaCotizacion, precio: number) => {
    const minimo = mejorPrecio(pieza.id, cotizaciones);
    // Si no es la más barata, se pide la razón antes de guardar.
    if (minimo != null && precio > minimo) {
      registrar.reset();
      setEligiendo({ pieza, cotizacion, precio });
      return;
    }
    registrar.mutate({
      osId: exp.cabecera.folio,
      evento: {
        tipo: "proveedor_elegido",
        carga: { piezaId: pieza.id, cotizacionId: cotizacion.cotizacionId, proveedorId: cotizacion.proveedorId, proveedorNombre: cotizacion.proveedorNombre, precioUnitario: precio, justificacion: null },
      },
    });
  };

  return (
    <div className={s.bloques}>
      <dl className={s.totales}>
        <div><dt>Solicitud de refacciones</dt><dd><Folio folio={sol.carga.folio} tipo="requisicion" /></dd></div>
        <div><dt>Estado</dt><dd>{estado ? ESTADO_REQUISICION[estado].label : "—"}</dd></div>
        <div><dt>Generada</dt><dd className={s.cifra}>{fh(sol.en)}</dd></div>
        <div>
          <dt>Cotizaciones</dt>
          <dd className={s.cifra}>
            {numero(cotizaciones.length)} de {COTIZACIONES_MINIMAS}
            {cotizaciones.length < COTIZACIONES_MINIMAS && <span className={s.meta}> que pide la política</span>}
          </dd>
        </div>
      </dl>

      {piezas.length === 0 ? (
        <Pendiente>El diagnóstico no pidió refacciones: no hay piezas que cotizar.</Pendiente>
      ) : cotizaciones.length === 0 ? (
        <div>
          <Subtitulo>Piezas por cotizar · {numero(piezas.length)}</Subtitulo>
          <Tabla encabezados={["Pieza", "Clave", "Cantidad"]} derecha={[2]}>
            {piezas.map((p) => (
              <tr key={p.id}>
                <td>{p.descripcion}</td>
                <td className={s.cifra}>{p.clave || "—"}</td>
                <td className={s.der}>{numero(p.cantidad)}</td>
              </tr>
            ))}
          </Tabla>
        </div>
      ) : (
        <div>
          <Subtitulo>Comparativo · precio unitario sin IVA</Subtitulo>
          <Tabla encabezados={["Pieza", "Cant.", ...cotizaciones.map((c) => c.carga.proveedorNombre), "Elegido"]} derecha={[1]}>
            {piezas.map((p) => {
              const minimo = mejorPrecio(p.id, cotizaciones);
              const elegida = elegidas.get(p.id);
              return (
                <tr key={p.id}>
                  <td>{p.descripcion}{p.clave && <span className={s.meta}> · {p.clave}</span>}</td>
                  <td className={s.der}>{numero(p.cantidad)}</td>
                  {cotizaciones.map((c) => {
                    const oferta = c.carga.partidas.find((x) => x.piezaId === p.id);
                    if (!oferta) return <td key={c.id} className={s.meta}>No cotizó</td>;
                    const esElegida = elegida?.carga.cotizacionId === c.carga.cotizacionId;
                    return (
                      <td key={c.id}>
                        {/* El flex va dentro: en la celda misma rompe la tabla. */}
                        <div className={s.oferta}>
                        <Monto valor={oferta.precioUnitario} escala="tabla" />
                        <span className={s.meta}>
                          {DISPONIBILIDAD[oferta.disponibilidad]}
                          {oferta.diasEntrega != null && ` · ${numero(oferta.diasEntrega)} d`}
                        </span>
                        {/* El mejor precio se dice con texto, no solo con color. */}
                        {oferta.precioUnitario === minimo && <Chip tono="ok">Mejor precio</Chip>}
                        {esElegida ? (
                          <Chip tono="brand">✓ Elegido</Chip>
                        ) : (
                          abierta && (
                            <Button variante="fantasma" disabled={registrar.isPending} onClick={() => elegir(p, c.carga, oferta.precioUnitario)}>
                              Elegir
                            </Button>
                          )
                        )}
                        </div>
                      </td>
                    );
                  })}
                  <td>
                    {elegida ? (
                      <>
                        {elegida.carga.proveedorNombre}
                        {elegida.carga.justificacion && <span className={s.meta}> · {elegida.carga.justificacion}</span>}
                      </>
                    ) : (
                      <span className={s.meta}>Sin elegir</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </Tabla>
          <ul className={s.cotizacionesRecibidas}>
            {cotizaciones.map((c) => (
              <li key={c.id}>
                <b>{c.carga.proveedorNombre}</b>
                <span className={s.meta}>
                  recibida {fh(c.en)}
                  {c.carga.vigenciaHasta && `, vigente hasta ${dia(c.carga.vigenciaHasta)}`}
                  {c.carga.notas && ` · ${c.carga.notas}`}
                </span>
                {c.carga.soporte ? (
                  <a href={c.carga.soporte.url} target="_blank" rel="noreferrer">{c.carga.soporte.nombre}</a>
                ) : (
                  <span className={s.meta}>Sin soporte</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {registrar.error && !eligiendo && <Aviso tono="critico" titulo={registrar.error.message} />}

      {abierta && piezas.length > 0 && (
        <Acciones>
          <Button variante="primario" onClick={() => setCotizando(true)}>+ Registrar cotización</Button>
        </Acciones>
      )}

      <RegistrarCotizacion exp={exp} piezas={piezas} abierto={cotizando} onCerrar={() => setCotizando(false)} />

      <Justificar
        abierto={eligiendo != null}
        proveedor={eligiendo?.cotizacion.proveedorNombre ?? ""}
        guardando={registrar.isPending}
        error={registrar.error?.message ?? null}
        onCancelar={() => setEligiendo(null)}
        onConfirmar={(justificacion) => {
          if (!eligiendo) return;
          const { pieza, cotizacion, precio } = eligiendo;
          registrar.mutate(
            {
              osId: exp.cabecera.folio,
              evento: {
                tipo: "proveedor_elegido",
                carga: { piezaId: pieza.id, cotizacionId: cotizacion.cotizacionId, proveedorId: cotizacion.proveedorId, proveedorNombre: cotizacion.proveedorNombre, precioUnitario: precio, justificacion },
              },
            },
            { onSuccess: () => setEligiendo(null) }
          );
        }}
      />
    </div>
  );
}

function Justificar({
  abierto,
  proveedor,
  guardando,
  error,
  onCancelar,
  onConfirmar,
}: {
  abierto: boolean;
  proveedor: string;
  guardando: boolean;
  error: string | null;
  onCancelar: () => void;
  onConfirmar: (justificacion: string) => void;
}) {
  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (abierto) setTexto("");
  }, [abierto]);
  return (
    <Dialogo
      abierto={abierto}
      titulo={`¿Por qué ${proveedor} si no es el más barato?`}
      confirmar="Elegir"
      cancelar="Cancelar"
      confirmando={guardando || !texto.trim()}
      onCancelar={onCancelar}
      onConfirmar={() => onConfirmar(texto.trim())}
    >
      La razón queda en el expediente: tiempo de entrega, garantía, pieza original.
      <Textarea aria-label="Justificación" rows={3} value={texto} onChange={(x) => setTexto(x.target.value)} />
      {error && <Aviso tono="critico" titulo={error} />}
    </Dialogo>
  );
}

interface Oferta {
  precio: string;
  disponibilidad: Disponibilidad;
  dias: string;
}

function RegistrarCotizacion({ exp, piezas, abierto, onCerrar }: { exp: Exp; piezas: PiezaSolicitada[]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const { data: proveedores = [] } = useProveedores({});
  const [proveedorId, setProveedorId] = useState("");
  const [ofertas, setOfertas] = useState<Record<string, Oferta>>({});
  const [vigencia, setVigencia] = useState("");
  const [notas, setNotas] = useState("");
  const [archivo, setArchivo] = useState<FileList | null>(null);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setProveedorId("");
    setOfertas(Object.fromEntries(piezas.map((p) => [p.id, { precio: "", disponibilidad: "inmediata", dias: "" }])));
    setVigencia("");
    setNotas("");
    setArchivo(null);
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const proveedor = proveedores.find((p) => p.id === proveedorId);
  const capturadas = piezas.filter((p) => (ofertas[p.id]?.precio ?? "") !== "");
  const errores: string[] = [];
  if (!proveedor) errores.push("Elige al proveedor.");
  if (capturadas.length === 0) errores.push("Captura el precio de al menos una pieza.");
  if (capturadas.some((p) => !(Number(ofertas[p.id]?.precio) > 0))) errores.push("Los precios deben ser mayores que cero.");
  if (vigencia && vigencia < hoyISO()) errores.push("La vigencia no puede ser anterior a hoy.");
  const yaCotizo = cotizacionesVigentes(exp.eventos).some((c) => c.carga.proveedorId === proveedorId);

  const guardar = () => {
    setIntentado(true);
    if (errores.length > 0 || !proveedor) return;
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: {
          tipo: "cotizacion_registrada",
          carga: {
            cotizacionId: crypto.randomUUID(),
            proveedorId: proveedor.id,
            proveedorNombre: proveedor.nombreComercial || proveedor.razonSocial,
            partidas: capturadas.map((p) => {
              const o = ofertas[p.id] ?? { precio: "", disponibilidad: "inmediata" as const, dias: "" };
              return {
                piezaId: p.id,
                precioUnitario: Number(o.precio),
                disponibilidad: o.disponibilidad,
                diasEntrega: o.disponibilidad === "inmediata" || o.dias === "" ? null : Number(o.dias),
              };
            }),
            vigenciaHasta: vigencia || null,
            notas: notas.trim(),
            soporte: aAdjuntos(archivo)[0] ?? null,
          },
        },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Registrar cotización"
      subtitulo="Lo que respondió el proveedor. Las piezas que no cotizó se dejan en blanco."
      onCerrar={onCerrar}
      pie={
        <>
          {intentado && errores.length > 0 && <span className={f.resumenErrores} role="alert">{errores[0]}</span>}
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Registrar</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      {proveedores.length === 0 ? (
        <Aviso titulo="El padrón de proveedores está vacío.">
          <Link to="/compras/proveedores?nuevo=1">Registra al proveedor</Link> y vuelve a esta O.S.
        </Aviso>
      ) : (
        <Campo
          etiqueta="Proveedor"
          obligatorio
          ayuda={yaCotizo ? "Ya cotizó: esta cotización sustituye a la anterior en el comparativo." : undefined}
        >
          {(p) => (
            <Select {...p} value={proveedorId} onChange={(x) => setProveedorId(x.target.value)}>
              <option value="">Elige uno</option>
              {proveedores.map((v) => (
                <option key={v.id} value={v.id}>{v.razonSocial} · {v.rfc}</option>
              ))}
            </Select>
          )}
        </Campo>
      )}

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Precios por pieza (sin IVA)</legend>
        {piezas.map((p) => {
          const o = ofertas[p.id] ?? { precio: "", disponibilidad: "inmediata" as const, dias: "" };
          const poner = (c: Partial<Oferta>) => setOfertas({ ...ofertas, [p.id]: { ...o, ...c } });
          return (
            <div key={p.id} className={s.filaCotizacion}>
              <div className={s.piezaCotizada}>
                <b>{p.descripcion}</b>
                <span className={s.meta}>{p.clave ? `${p.clave} · ` : ""}{numero(p.cantidad)} {p.cantidad === 1 ? "pieza" : "piezas"}</span>
              </div>
              <Campo etiqueta="Precio unitario">
                {(c) => <Input {...c} inputMode="decimal" className={s.cifra} value={o.precio} onChange={(x) => poner({ precio: x.target.value.replace(/[^\d.]/g, "") })} />}
              </Campo>
              <Campo etiqueta="Disponibilidad">
                {(c) => (
                  <Select {...c} value={o.disponibilidad} onChange={(x) => poner({ disponibilidad: x.target.value as Disponibilidad })}>
                    {(Object.keys(DISPONIBILIDAD) as Disponibilidad[]).map((k) => (
                      <option key={k} value={k}>{DISPONIBILIDAD[k]}</option>
                    ))}
                  </Select>
                )}
              </Campo>
              <Campo etiqueta="Días de entrega">
                {(c) => (
                  <Input
                    {...c}
                    inputMode="numeric"
                    className={s.cifra}
                    disabled={o.disponibilidad === "inmediata"}
                    value={o.disponibilidad === "inmediata" ? "" : o.dias}
                    onChange={(x) => poner({ dias: x.target.value.replace(/\D/g, "") })}
                  />
                )}
              </Campo>
            </div>
          );
        })}
      </fieldset>

      <div className={f.rejilla2}>
        <Campo etiqueta="Vigente hasta">
          {(p) => <Input {...p} type="date" min={hoyISO()} value={vigencia} onChange={(x) => setVigencia(x.target.value)} />}
        </Campo>
        <Campo etiqueta="Notas">
          {(p) => <Input {...p} value={notas} onChange={(x) => setNotas(x.target.value)} />}
        </Campo>
      </div>
      <Campo etiqueta="Soporte de la cotización" ayuda="Foto o PDF que mandó el proveedor. Respalda el costo en el presupuesto.">
        {(p) => <Input {...p} type="file" accept="image/*,application/pdf" onChange={(x) => setArchivo(x.target.files)} />}
      </Campo>
    </PanelLateral>
  );
}

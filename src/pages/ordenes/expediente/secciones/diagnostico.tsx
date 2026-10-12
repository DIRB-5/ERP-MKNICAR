import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { Chip } from "@/components/Chip/Chip";
import { Aviso } from "@/components/Aviso/Aviso";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select, Textarea } from "@/components/Campo/Campo";
import { eventosDe, vigente, type CargaHallazgo, type RefCatalogo } from "@/domain/bitacora";
import type { SeveridadDano } from "@/domain/tipos";
import { numero } from "@/domain/format";
import { useProductos, useRegistrarEvento, useRegistros } from "@/data/consultas";
import { Acciones, Datos, Pendiente, Tabla, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import { OTRO, aAdjuntos, opcionesTecnico, tecnicoPorNombre } from "../captura";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

const SEVERIDAD: Record<SeveridadDano, string> = { leve: "Leve", moderado: "Moderada", grave: "Grave" };

export const resumen: ResumenSeccion = (exp) => {
  const tecnico = eventosDe(exp.eventos, "tecnico_asignado").at(-1);
  const n = eventosDe(exp.eventos, "hallazgo_agregado").length;
  return `${tecnico ? vigente(tecnico, exp.eventos).carga.tecnicoNombre : "Sin técnico"} · ${numero(n)} ${n === 1 ? "hallazgo" : "hallazgos"}`;
};

/** Los hallazgos alimentan el presupuesto: lo que aquí se registra no se captura dos veces. */
export default function Diagnostico({ exp, abierta }: PropsSeccion) {
  const [asignando, setAsignando] = useState(false);
  const [agregando, setAgregando] = useState(false);
  const tecnico = eventosDe(exp.eventos, "tecnico_asignado").at(-1);
  const hallazgos = eventosDe(exp.eventos, "hallazgo_agregado").map((e) => vigente(e, exp.eventos));

  return (
    <div className={s.bloques}>
      <Datos
        filas={[
          ["Técnico asignado", tecnico ? vigente(tecnico, exp.eventos).carga.tecnicoNombre : "Sin asignar"],
          ["Asignado", tecnico ? fh(tecnico.en) : "—"],
        ]}
      />

      {hallazgos.length === 0 ? (
        <Pendiente>Todavía no hay hallazgos. Cada hallazgo lleva su descripción, severidad y evidencia.</Pendiente>
      ) : (
        <ol className={s.hallazgos}>
          {hallazgos.map((h, i) => (
            <li key={h.id} className={s.hallazgo}>
              <div className={s.hallazgoHead}>
                <b>
                  {i + 1}. {h.carga.descripcion}
                </b>
                <Chip tono={h.carga.severidad === "grave" ? "critico" : "neutro"}>{SEVERIDAD[h.carga.severidad]}</Chip>
                <span className={s.meta}>{h.usuarioNombre} · {fh(h.en)}</span>
              </div>
              {h.carga.evidencias.length > 0 && (
                <p className={s.texto}>
                  Evidencia:{" "}
                  {h.carga.evidencias.map((a, j) => (
                    <a key={`${j}-${a.nombre}`} href={a.url} target="_blank" rel="noreferrer" className={s.adjunto}>
                      {a.nombre}
                    </a>
                  ))}
                </p>
              )}
              {(h.carga.servicios.length > 0 || h.carga.refacciones.length > 0) && (
                <Tabla encabezados={["Propuesto", "Clave", "Concepto", "Cantidad"]} derecha={[3]}>
                  {h.carga.servicios.map((x, j) => (
                    <tr key={`s-${j}`}>
                      <td>Servicio</td>
                      <td className={s.cifra}>{x.clave || "—"}{x.id == null && <span className={s.meta}> fuera de catálogo</span>}</td>
                      <td>{x.descripcion}</td>
                      <td className={s.der}>{numero(x.horas)} h</td>
                    </tr>
                  ))}
                  {h.carga.refacciones.map((x, j) => (
                    <tr key={`r-${j}`}>
                      <td>Refacción</td>
                      <td className={s.cifra}>{x.clave || "—"}{x.id == null && <span className={s.meta}> fuera de catálogo</span>}</td>
                      <td>{x.descripcion}</td>
                      <td className={s.der}>{numero(x.cantidad)}</td>
                    </tr>
                  ))}
                </Tabla>
              )}
            </li>
          ))}
        </ol>
      )}

      {abierta && (
        <Acciones>
          <Button onClick={() => setAsignando(true)}>{tecnico ? "Cambiar técnico" : "Asignar técnico"}</Button>
          <Button variante="primario" onClick={() => setAgregando(true)}>+ Agregar hallazgo</Button>
        </Acciones>
      )}

      <AsignarTecnico exp={exp} abierto={asignando} onCerrar={() => setAsignando(false)} />
      <NuevoHallazgo exp={exp} abierto={agregando} onCerrar={() => setAgregando(false)} />
    </div>
  );
}

function AsignarTecnico({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const opciones = opcionesTecnico(exp.eventos);
  const [elegido, setElegido] = useState("");
  const [nombre, setNombre] = useState("");
  const otro = elegido === OTRO || opciones.length === 0;
  const listo = otro ? nombre.trim() !== "" : elegido !== "";

  const guardar = () => {
    const t = otro ? tecnicoPorNombre(nombre) : opciones.find((o) => o.id === elegido);
    if (!t) return;
    registrar.mutate(
      { osId: exp.cabecera.folio, evento: { tipo: "tecnico_asignado", carga: { tecnicoId: t.id, tecnicoNombre: t.nombre.replace(/ \(tú\)$/, "") } } },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Asignar técnico"
      subtitulo="Quien diagnostica la unidad."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={!listo || registrar.isPending} onClick={guardar}>Asignar</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      {opciones.length > 0 && (
        <Campo etiqueta="Técnico">
          {(p) => (
            <Select {...p} value={elegido} onChange={(x) => setElegido(x.target.value)}>
              <option value="">Elige uno</option>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
              <option value={OTRO}>Otro…</option>
            </Select>
          )}
        </Campo>
      )}
      {otro && (
        <Campo etiqueta="Nombre del técnico" ayuda="Mientras no exista el catálogo de personal, se escribe el nombre.">
          {(p) => <Input {...p} value={nombre} onChange={(x) => setNombre(x.target.value)} />}
        </Campo>
      )}
    </PanelLateral>
  );
}

interface FilaRef {
  clave: string;
  /** id del catálogo, OTRO si se escribe a mano. */
  id: string;
  descripcion: string;
  cantidad: string;
}

const filaVacia = (): FilaRef => ({ clave: crypto.randomUUID(), id: "", descripcion: "", cantidad: "1" });

function NuevoHallazgo({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const { data: servicios = [] } = useRegistros("servicios", { alcance: exp.cabecera.taller.id });
  const { data: productos = [] } = useProductos({});
  const [descripcion, setDescripcion] = useState("");
  const [severidad, setSeveridad] = useState<SeveridadDano>("moderado");
  const [archivos, setArchivos] = useState<FileList | null>(null);
  const [filasS, setFilasS] = useState<FilaRef[]>([]);
  const [filasR, setFilasR] = useState<FilaRef[]>([]);
  const [intentado, setIntentado] = useState(false);

  const refServicio = (x: FilaRef): (RefCatalogo & { horas: number }) | null => {
    const horas = Number(x.cantidad);
    if (x.id === OTRO) return x.descripcion.trim() ? { id: null, clave: "", descripcion: x.descripcion.trim(), horas } : null;
    const r = servicios.find((v) => v.id === x.id);
    return r ? { id: r.id, clave: String(r.valores.clave ?? ""), descripcion: String(r.valores.descripcion ?? ""), horas } : null;
  };
  const refRefaccion = (x: FilaRef): (RefCatalogo & { cantidad: number }) | null => {
    const cantidad = Number(x.cantidad);
    if (x.id === OTRO) return x.descripcion.trim() ? { id: null, clave: "", descripcion: x.descripcion.trim(), cantidad } : null;
    const p = productos.find((v) => v.id === x.id);
    return p ? { id: p.id, clave: p.numeroParte, descripcion: p.descripcion, cantidad } : null;
  };

  const sinDescripcion = !descripcion.trim();
  const cantidadesMalas = [...filasS, ...filasR].some((x) => x.id !== "" && !(Number(x.cantidad) > 0));

  const guardar = () => {
    setIntentado(true);
    if (sinDescripcion || cantidadesMalas) return;
    const carga: CargaHallazgo = {
      hallazgoId: crypto.randomUUID(),
      descripcion: descripcion.trim(),
      severidad,
      evidencias: aAdjuntos(archivos),
      servicios: filasS.map(refServicio).filter((x): x is NonNullable<typeof x> => x != null),
      refacciones: filasR.map(refRefaccion).filter((x): x is NonNullable<typeof x> => x != null),
    };
    registrar.mutate(
      { osId: exp.cabecera.folio, evento: { tipo: "hallazgo_agregado", carga } },
      {
        onSuccess: () => {
          setDescripcion("");
          setArchivos(null);
          setFilasS([]);
          setFilasR([]);
          setIntentado(false);
          onCerrar();
        },
      }
    );
  };

  const editorFilas = (
    titulo: string,
    filas: FilaRef[],
    setFilas: (f: FilaRef[]) => void,
    opciones: { id: string; texto: string }[],
    unidad: string,
    vacioCatalogo: string
  ) => (
    <fieldset className={f.seccion}>
      <legend className={f.seccionTitulo}>{titulo}</legend>
      {opciones.length === 0 && <p className={s.meta}>{vacioCatalogo}</p>}
      {filas.map((x, i) => {
        const poner = (cambio: Partial<FilaRef>) => setFilas(filas.map((y) => (y.clave === x.clave ? { ...y, ...cambio } : y)));
        return (
          <div key={x.clave} className={s.filaCaptura}>
            <Campo etiqueta={`${titulo.replace(/s$/, "")} ${i + 1}`}>
              {(p) => (
                <Select {...p} value={x.id} onChange={(e) => poner({ id: e.target.value })}>
                  <option value="">Elige del catálogo</option>
                  {opciones.map((o) => (
                    <option key={o.id} value={o.id}>{o.texto}</option>
                  ))}
                  <option value={OTRO}>No está en el catálogo…</option>
                </Select>
              )}
            </Campo>
            {x.id === OTRO && (
              <Campo etiqueta="Descripción">
                {(p) => <Input {...p} value={x.descripcion} onChange={(e) => poner({ descripcion: e.target.value })} />}
              </Campo>
            )}
            <Campo etiqueta={unidad} error={intentado && x.id !== "" && !(Number(x.cantidad) > 0) ? "Mayor que cero." : undefined}>
              {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={x.cantidad} onChange={(e) => poner({ cantidad: e.target.value.replace(/[^\d.]/g, "") })} />}
            </Campo>
            <Button variante="fantasma" onClick={() => setFilas(filas.filter((y) => y.clave !== x.clave))} aria-label={`Quitar renglón ${i + 1}`}>
              Quitar
            </Button>
          </div>
        );
      })}
      <div>
        <Button onClick={() => setFilas([...filas, filaVacia()])}>+ Agregar</Button>
      </div>
    </fieldset>
  );

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Nuevo hallazgo"
      subtitulo="Lo que encontró el técnico. Sus servicios y refacciones pasan directo al presupuesto."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>
            {registrar.isPending ? "Guardando…" : "Agregar hallazgo"}
          </Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <Campo etiqueta="Qué se encontró" obligatorio error={intentado && sinDescripcion ? "Describe el hallazgo." : undefined}>
        {(p) => <Textarea {...p} rows={3} value={descripcion} onChange={(x) => setDescripcion(x.target.value)} />}
      </Campo>
      <div className={f.rejilla2}>
        <Campo etiqueta="Severidad" obligatorio>
          {(p) => (
            <Select {...p} value={severidad} onChange={(x) => setSeveridad(x.target.value as SeveridadDano)}>
              {(Object.keys(SEVERIDAD) as SeveridadDano[]).map((k) => (
                <option key={k} value={k}>{SEVERIDAD[k]}</option>
              ))}
            </Select>
          )}
        </Campo>
        <Campo etiqueta="Evidencia" ayuda="Fotos o video del hallazgo.">
          {(p) => <Input {...p} type="file" multiple accept="image/*,video/*,application/pdf" onChange={(x) => setArchivos(x.target.files)} />}
        </Campo>
      </div>
      {editorFilas(
        "Servicios",
        filasS,
        setFilasS,
        servicios.map((v) => ({ id: v.id, texto: `${String(v.valores.clave ?? "")} · ${String(v.valores.descripcion ?? "")}` })),
        "Horas",
        "El catálogo de servicios está vacío: se puede escribir el servicio a mano."
      )}
      {editorFilas(
        "Refacciones",
        filasR,
        setFilasR,
        productos.map((p) => ({ id: p.id, texto: `${p.numeroParte} · ${p.descripcion}` })),
        "Cantidad",
        "El catálogo de productos está vacío: se puede escribir la refacción a mano."
      )}
    </PanelLateral>
  );
}

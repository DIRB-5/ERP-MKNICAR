import { useEffect, useState, type ComponentType } from "react";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Chip } from "@/components/Chip/Chip";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { Aviso } from "@/components/Aviso/Aviso";
import { PuntoArea } from "@/components/PuntoArea/PuntoArea";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select, Textarea } from "@/components/Campo/Campo";
import { areaVar } from "@/domain/areas";
import { CORREGIBLES, eventosDe, vigente, type EventoOS } from "@/domain/bitacora";
import { SECCION_DEL_EVENTO } from "@/domain/expediente";
import { useRegistrarEvento } from "@/data/consultas";
import { aAdjuntos } from "./captura";
import { fh, type PropsSeccion, type ResumenSeccion } from "./comun";
import s from "./Expediente.module.css";

export interface ModuloSeccion {
  default: ComponentType<PropsSeccion>;
  resumen?: ResumenSeccion;
}

interface Props extends PropsSeccion {
  modulo: ModuloSeccion | undefined;
  desplegada: boolean;
  onAlternar: () => void;
}

/** Eventos de esta sección que tienen campos corregibles. */
const corregiblesDe = (eventos: readonly EventoOS[], clave: string) =>
  eventos.filter((e) => SECCION_DEL_EVENTO[e.tipo] === clave && CORREGIBLES[e.tipo]);

/** Cómo se nombra cada registro corregible en el selector de "Corregir". */
const NOMBRE_EVENTO: Partial<Record<EventoOS["tipo"], string>> = {
  recepcion_registrada: "Recepción",
  tecnico_asignado: "Asignación de técnico",
  hallazgo_agregado: "Hallazgo",
  mano_obra_cargada: "Entrada de mano de obra",
  calidad_liberada: "Liberación de calidad",
  remision_emitida: "Remisión",
  factura_vinculada: "Factura",
};

const etiquetaCampo = (e: EventoOS, campo: string) => CORREGIBLES[e.tipo]?.find((c) => c.campo === campo)?.etiqueta ?? campo;

/**
 * Marco de toda sección: título con el color de su área, estado (en curso,
 * solo lectura, corregida), resumen cuando está replegada, y las notas,
 * evidencias y correcciones, que se agregan en cualquier estado.
 */
export function SeccionMarco({ modulo, desplegada, onAlternar, ...props }: Props) {
  const { exp, seccion, abierta, ahora } = props;
  const [dialogo, setDialogo] = useState<"nota" | "evidencia" | "corregir" | null>(null);
  const clave = seccion.clave;
  const idCuerpo = `seccion-${clave}-cuerpo`;

  const notas = eventosDe(exp.eventos, "nota_agregada").filter((e) => e.carga.seccion === clave);
  const evidencias = eventosDe(exp.eventos, "evidencia_agregada").filter((e) => e.carga.seccion === clave);
  const correcciones = eventosDe(exp.eventos, "correccion").filter((e) => e.carga.seccion === clave);
  const ultimaCorreccion = correcciones.at(-1);
  const corregibles = corregiblesDe(exp.eventos, clave);
  const resumen = modulo?.resumen?.(exp, ahora) ?? null;
  const Componente = modulo?.default;

  return (
    <Surface as="section" id={clave} className={s.seccion} style={{ ["--dom" as string]: areaVar(seccion.area) }} aria-labelledby={`${clave}-titulo`}>
      <header className={s.seccionHead}>
        <button type="button" className={s.alternar} aria-expanded={desplegada} aria-controls={idCuerpo} onClick={onAlternar}>
          <span aria-hidden="true" className={s.flecha}>{desplegada ? "▾" : "▸"}</span>
          <PuntoArea area={seccion.area} />
          <h3 id={`${clave}-titulo`} className={s.seccionTitulo}>{seccion.titulo}</h3>
          <Chip tono={abierta ? "brand" : "neutro"}>{abierta ? "En curso" : seccion.soloLectura ? "Solo lectura · la alimenta otro módulo" : "Solo lectura"}</Chip>
          {ultimaCorreccion && (
            <span className={s.meta}>Corregida el {fh(ultimaCorreccion.en)} por {ultimaCorreccion.usuarioNombre}</span>
          )}
          {!desplegada && resumen && <span className={s.resumenSeccion}>{resumen}</span>}
        </button>
        <div className={s.herramientas}>
          <Button variante="fantasma" onClick={() => setDialogo("nota")}>+ Nota</Button>
          <Button variante="fantasma" onClick={() => setDialogo("evidencia")}>+ Evidencia</Button>
          {!abierta && corregibles.length > 0 && <Button variante="fantasma" onClick={() => setDialogo("corregir")}>Corregir</Button>}
        </div>
      </header>

      {desplegada && (
        <div id={idCuerpo} className={s.seccionCuerpo}>
          {Componente ? <Componente {...props} /> : <Aviso tono="critico" titulo={`Falta el componente de la sección "${clave}".`} />}

          {(notas.length > 0 || evidencias.length > 0) && (
            <ul className={s.anotaciones} aria-label="Notas y evidencias">
              {[...notas, ...evidencias]
                .sort((a, b) => a.en.localeCompare(b.en))
                .map((e) => (
                  <li key={e.id}>
                    <span className={s.meta}>{e.usuarioNombre} · {fh(e.en)}</span>
                    {e.tipo === "nota_agregada" ? (
                      <p className={s.texto}>{e.carga.texto}</p>
                    ) : (
                      <p className={s.texto}>
                        <a href={e.carga.archivo.url} target="_blank" rel="noreferrer">{e.carga.archivo.nombre}</a>
                        {e.carga.descripcion && ` · ${e.carga.descripcion}`}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
          )}

          {correcciones.length > 0 && (
            <details className={s.correcciones}>
              <summary>Correcciones ({correcciones.length}) · los valores anteriores siguen aquí</summary>
              <ul>
                {correcciones.map((c) => {
                  const original = exp.eventos.find((e) => e.id === c.carga.corrigeId);
                  const historia = original ? vigente(original, exp.eventos).correcciones.find((x) => x.en === c.en) : undefined;
                  return (
                    <li key={c.id}>
                      <span className={s.meta}>{c.usuarioNombre} · {fh(c.en)} · motivo: {c.motivo}</span>
                      {Object.entries(c.carga.cambios).map(([campo, nuevo]) => (
                        <p key={campo} className={s.texto}>
                          {original ? etiquetaCampo(original, campo) : campo}: <s>{String(historia?.anteriores[campo] ?? "—")}</s> → <b>{String(nuevo)}</b>
                        </p>
                      ))}
                    </li>
                  );
                })}
              </ul>
            </details>
          )}
        </div>
      )}

      <Nota exp={exp} clave={clave} abierto={dialogo === "nota"} onCerrar={() => setDialogo(null)} />
      <Evidencia exp={exp} clave={clave} abierto={dialogo === "evidencia"} onCerrar={() => setDialogo(null)} />
      <Corregir exp={exp} clave={clave} eventos={corregibles} abierto={dialogo === "corregir"} onCerrar={() => setDialogo(null)} />
    </Surface>
  );
}

type PropsDialogo = { exp: PropsSeccion["exp"]; clave: PropsSeccion["seccion"]["clave"]; abierto: boolean; onCerrar: () => void };

/** Una nota es un evento, no una edición: se agrega aunque la sección esté cerrada. */
function Nota({ exp, clave, abierto, onCerrar }: PropsDialogo) {
  const registrar = useRegistrarEvento();
  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (abierto) {
      setTexto("");
      registrar.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);
  return (
    <Dialogo
      abierto={abierto}
      titulo="Agregar nota"
      confirmar="Agregar"
      cancelar="Cancelar"
      confirmando={registrar.isPending || !texto.trim()}
      onCancelar={onCerrar}
      onConfirmar={() =>
        registrar.mutate({ osId: exp.cabecera.folio, evento: { tipo: "nota_agregada", carga: { seccion: clave, texto: texto.trim() } } }, { onSuccess: onCerrar })
      }
    >
      <Textarea aria-label="Nota" rows={4} value={texto} onChange={(x) => setTexto(x.target.value)} />
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
    </Dialogo>
  );
}

function Evidencia({ exp, clave, abierto, onCerrar }: PropsDialogo) {
  const registrar = useRegistrarEvento();
  const [archivo, setArchivo] = useState<FileList | null>(null);
  const [descripcion, setDescripcion] = useState("");
  useEffect(() => {
    if (abierto) {
      setArchivo(null);
      setDescripcion("");
      registrar.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);
  const adjunto = aAdjuntos(archivo)[0];
  return (
    <Dialogo
      abierto={abierto}
      titulo="Agregar evidencia"
      confirmar="Agregar"
      cancelar="Cancelar"
      confirmando={registrar.isPending || !archivo?.length}
      onCancelar={onCerrar}
      onConfirmar={() => {
        if (!adjunto) return;
        registrar.mutate(
          { osId: exp.cabecera.folio, evento: { tipo: "evidencia_agregada", carga: { seccion: clave, descripcion: descripcion.trim(), archivo: adjunto } } },
          { onSuccess: onCerrar }
        );
      }}
    >
      <Input type="file" aria-label="Archivo" accept="image/*,video/*,application/pdf" onChange={(x) => setArchivo(x.target.files)} />
      <Input aria-label="Descripción" placeholder="Qué muestra (opcional)" value={descripcion} onChange={(x) => setDescripcion(x.target.value)} />
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
    </Dialogo>
  );
}

/** Una sección cerrada no se edita: se corrige con motivo, y lo anterior sigue consultable. */
function Corregir({ exp, clave, eventos, abierto, onCerrar }: PropsDialogo & { eventos: EventoOS[] }) {
  const registrar = useRegistrarEvento();
  const [eventoId, setEventoId] = useState("");
  const [valores, setValores] = useState<Record<string, string>>({});
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);

  const evento = eventos.find((e) => e.id === eventoId);
  const campos = evento ? CORREGIBLES[evento.tipo] ?? [] : [];
  const actuales = evento ? (vigente(evento, exp.eventos).carga as unknown as Record<string, unknown>) : {};

  const elegir = (id: string) => {
    setEventoId(id);
    const e = eventos.find((x) => x.id === id);
    const v = e ? (vigente(e, exp.eventos).carga as unknown as Record<string, unknown>) : {};
    setValores(Object.fromEntries((e ? CORREGIBLES[e.tipo] ?? [] : []).map((c) => [c.campo, String(v[c.campo] ?? "")])));
  };

  useEffect(() => {
    if (!abierto) return;
    elegir(eventos.at(-1)?.id ?? "");
    setMotivo("");
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const cambios: Record<string, string | number> = {};
  for (const c of campos) {
    const nuevo = valores[c.campo] ?? "";
    if (nuevo !== String(actuales[c.campo] ?? "")) cambios[c.campo] = c.tipo === "numero" ? Number(nuevo) : nuevo.trim();
  }
  const numerosMalos = campos.some((c) => c.tipo === "numero" && c.campo in cambios && !Number.isFinite(cambios[c.campo]));
  const sinCambios = Object.keys(cambios).length === 0;

  const nombreEvento = (e: EventoOS) => `${NOMBRE_EVENTO[e.tipo] ?? e.tipo} · ${fh(e.en)}`;

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Corregir"
      subtitulo="La corrección entra como evento nuevo con su motivo. El valor original no se borra."
      onCerrar={onCerrar}
      pie={
        <>
          {intentado && (sinCambios || !motivo.trim() || numerosMalos) && (
            <span className={s.razon} role="alert">
              {sinCambios ? "No cambiaste ningún valor." : numerosMalos ? "Revisa los números." : "Escribe el motivo de la corrección."}
            </span>
          )}
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button
            variante="primario"
            disabled={registrar.isPending}
            onClick={() => {
              setIntentado(true);
              if (!evento || sinCambios || !motivo.trim() || numerosMalos) return;
              registrar.mutate(
                { osId: exp.cabecera.folio, evento: { tipo: "correccion", carga: { seccion: clave, corrigeId: evento.id, cambios }, motivo: motivo.trim() } },
                { onSuccess: onCerrar }
              );
            }}
          >
            Guardar corrección
          </Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      {eventos.length > 1 && (
        <Campo etiqueta="Qué registro se corrige">
          {(p) => (
            <Select {...p} value={eventoId} onChange={(x) => elegir(x.target.value)}>
              {eventos.map((e) => (
                <option key={e.id} value={e.id}>{nombreEvento(e)}</option>
              ))}
            </Select>
          )}
        </Campo>
      )}
      {campos.map((c) => (
        <Campo key={c.campo} etiqueta={c.etiqueta} ayuda={`Valor actual: ${String(actuales[c.campo] ?? "—")}`}>
          {(p) => (
            <Input
              {...p}
              inputMode={c.tipo === "numero" ? "decimal" : undefined}
              className={c.tipo === "numero" ? s.cifra : undefined}
              value={valores[c.campo] ?? ""}
              onChange={(x) => setValores({ ...valores, [c.campo]: x.target.value })}
            />
          )}
        </Campo>
      ))}
      <Campo etiqueta="Motivo de la corrección" obligatorio>
        {(p) => <Textarea {...p} rows={3} value={motivo} onChange={(x) => setMotivo(x.target.value)} />}
      </Campo>
    </PanelLateral>
  );
}

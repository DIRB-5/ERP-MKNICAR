import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Textarea } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Chip } from "@/components/Chip/Chip";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { numero } from "@/domain/format";
import type { PerfilTecnico } from "@/domain/tipos";
import { usePerfilTecnico, useRegistrarEvaluacion } from "@/data/consultas";
import { useSesion } from "@/app/useSesion";
import { NIVEL_LABEL, UMBRAL_BRECHA, nivelPorPuntaje } from "@/app/habilidades";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./EvaluacionHabilidades.module.css";

interface Fila {
  clave: string;
  nombre: string;
  valor: string;
}

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const filaVacia = (nombre = ""): Fila => ({ clave: crypto.randomUUID(), nombre, valor: "" });

/** Se evalúan de nuevo las mismas habilidades de la vez anterior; se pueden agregar o quitar. */
const filasIniciales = (t: PerfilTecnico | null | undefined): Fila[] =>
  t && t.habilidades.length > 0 ? t.habilidades.map((h) => filaVacia(h.nombre)) : [filaVacia()];

function Formulario({ tecnico }: { tecnico: PerfilTecnico | null }) {
  const navigate = useNavigate();
  const sesion = useSesion();
  const registrar = useRegistrarEvaluacion();

  const [fecha, setFecha] = useState(hoyISO());
  const [evaluador, setEvaluador] = useState(sesion.nombre ?? "");
  const [filas, setFilas] = useState<Fila[]>(() => filasIniciales(tecnico));
  const [observaciones, setObservaciones] = useState("");
  const [horas, setHoras] = useState("");
  const [intentado, setIntentado] = useState(false);

  const anterior = new Map((tecnico?.habilidades ?? []).map((h) => [h.nombre, h.valor]));
  const poner = (clave: string, cambio: Partial<Fila>) => setFilas((xs) => xs.map((x) => (x.clave === clave ? { ...x, ...cambio } : x)));

  // Validación
  const errores: { fecha?: string; evaluador?: string; filas?: string } = {};
  const erroresFila: Record<string, { nombre?: string; valor?: string }> = {};
  if (!fecha) errores.fecha = "Indica la fecha de la evaluación.";
  else if (fecha > hoyISO()) errores.fecha = "No puede ser futura.";
  if (!evaluador.trim()) errores.evaluador = "Indica quién evalúa.";
  if (filas.length === 0) errores.filas = "Agrega al menos una habilidad.";
  const vistos = new Set<string>();
  for (const x of filas) {
    const e: { nombre?: string; valor?: string } = {};
    const n = x.nombre.trim().toLowerCase();
    if (!n) e.nombre = "Nombre de la habilidad.";
    else if (vistos.has(n)) e.nombre = "Está repetida.";
    else vistos.add(n);
    const v = Number(x.valor);
    if (x.valor.trim() === "" || !Number.isInteger(v) || v < 0 || v > 100) e.valor = "Puntaje de 0 a 100.";
    if (Object.keys(e).length > 0) erroresFila[x.clave] = e;
  }
  const hs = Number(horas);
  const errorHoras = horas.trim() !== "" && (!Number.isInteger(hs) || hs < 0 || hs > 500) ? "Entre 0 y 500 horas." : undefined;
  const numErrores = Object.keys(errores).length + Object.keys(erroresFila).length + (errorHoras ? 1 : 0);

  const brechas = filas.filter((x) => x.valor.trim() !== "" && Number(x.valor) < UMBRAL_BRECHA && x.nombre.trim());
  const mostrar = intentado;

  const guardar = async () => {
    setIntentado(true);
    if (!tecnico || numErrores > 0) return;
    await registrar.mutateAsync({
      tecnicoId: tecnico.id,
      datos: {
        fecha,
        evaluador: evaluador.trim(),
        habilidades: filas.map((x) => ({ nombre: x.nombre.trim(), valor: Number(x.valor) })),
        observaciones: observaciones.trim(),
        horasCapacitacion: horas.trim() ? hs : 0,
      },
    });
    navigate(`/personal/tecnicos/${encodeURIComponent(tecnico.id)}`);
  };

  return (
    <form
      className={f.pagina}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        void guardar();
      }}
    >
      <div className={f.migas}>
        <Link to="/personal">Personal</Link> /{" "}
        {tecnico ? <Link to={`/personal/tecnicos/${encodeURIComponent(tecnico.id)}`}>{tecnico.nombre}</Link> : "Técnico"} / Evaluación
      </div>
      <header>
        <h1 className={f.titulo}>Evaluación de habilidades</h1>
        <p className={f.subtitulo}>
          {tecnico ? `${tecnico.nombre} · ${tecnico.puesto} ${tecnico.nivel} · ${tecnico.taller.nombre}` : "—"}
        </p>
      </header>

      {!tecnico && (
        <Aviso titulo="No encontramos a este técnico.">
          El formulario se muestra, pero no se puede guardar. Regístralo primero en Personal.
        </Aviso>
      )}

      <Surface as="section" aria-labelledby="sec-eval" className={f.bloque}>
        <h2 id="sec-eval" className={f.bloqueTitulo}>Evaluación</h2>
        <div className={f.rejilla2}>
          <Campo etiqueta="Fecha" obligatorio error={mostrar ? errores.fecha : undefined}>
            {(p) => <Input {...p} type="date" max={hoyISO()} value={fecha} onChange={(x) => setFecha(x.target.value)} />}
          </Campo>
          <Campo etiqueta="Evaluador" obligatorio error={mostrar ? errores.evaluador : undefined} ayuda="Jefe de taller o instructor que evalúa.">
            {(p) => <Input {...p} value={evaluador} onChange={(x) => setEvaluador(x.target.value)} />}
          </Campo>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-hab" className={f.bloque}>
        <h2 id="sec-hab" className={f.bloqueTitulo}>Habilidades</h2>
        <p className={s.nota}>
          Puntaje de 0 a 100. El nivel se asigna solo: 90 o más Experto, 70 Avanzado, 50 Intermedio, menos Básico.
          Por debajo de {UMBRAL_BRECHA} se marca como brecha.
        </p>
        {mostrar && errores.filas && <Aviso tono="critico" titulo={errores.filas} />}

        <ul className={s.lista}>
          {filas.map((x, i) => {
            const e = mostrar ? erroresFila[x.clave] ?? {} : {};
            const v = Number(x.valor);
            const valido = x.valor.trim() !== "" && Number.isInteger(v) && v >= 0 && v <= 100;
            const previo = anterior.get(x.nombre.trim());
            return (
              <li key={x.clave} className={`${s.fila} ${valido && v < UMBRAL_BRECHA ? s.brecha : ""}`}>
                <Campo etiqueta={`Habilidad ${i + 1}`} error={e.nombre}>
                  {(p) => (
                    <Input {...p} placeholder="Diagnóstico electrónico" value={x.nombre} onChange={(ev) => poner(x.clave, { nombre: ev.target.value })} />
                  )}
                </Campo>
                <Campo etiqueta="Puntaje" error={e.valor} ayuda={previo != null ? `Anterior: ${previo}` : undefined}>
                  {(p) => (
                    <Input
                      {...p}
                      inputMode="numeric"
                      maxLength={3}
                      value={x.valor}
                      onChange={(ev) => poner(x.clave, { valor: ev.target.value.replace(/\D/g, "") })}
                    />
                  )}
                </Campo>
                <div className={s.resultado}>
                  {valido ? (
                    <>
                      <Chip tono={v < UMBRAL_BRECHA ? "critico" : nivelPorPuntaje(v) === "experto" || nivelPorPuntaje(v) === "avanzado" ? "brand" : "neutro"}>
                        {NIVEL_LABEL[nivelPorPuntaje(v)]}
                        {v < UMBRAL_BRECHA ? " · brecha" : ""}
                      </Chip>
                      {previo != null && v !== previo && (
                        <span className={s.cambio}>
                          {v > previo ? "▲" : "▼"} {numero(Math.abs(v - previo))}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className={s.nota}>—</span>
                  )}
                </div>
                <div className={s.quitar}>
                  <Button variante="fantasma" onClick={() => setFilas((xs) => xs.filter((y) => y.clave !== x.clave))} aria-label={`Quitar habilidad ${i + 1}`}>
                    Quitar
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
        <div>
          <Button onClick={() => setFilas((xs) => [...xs, filaVacia()])}>+ Agregar habilidad</Button>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-plan" className={f.bloque}>
        <h2 id="sec-plan" className={f.bloqueTitulo}>Plan de desarrollo</h2>
        {brechas.length > 0 ? (
          <Aviso tono="critico" titulo={`${brechas.length === 1 ? "1 brecha" : `${brechas.length} brechas`} detectadas`}>
            {brechas.map((b) => `${b.nombre.trim()} en ${b.valor}`).join(" · ")}. Limitan su asignación a esas O.S.
          </Aviso>
        ) : (
          <p className={s.nota}>Sin brechas por ahora.</p>
        )}
        <div className={f.rejilla3}>
          <Campo etiqueta="Capacitación sugerida (horas)" error={mostrar ? errorHoras : undefined}>
            {(p) => <Input {...p} inputMode="numeric" maxLength={3} value={horas} onChange={(x) => setHoras(x.target.value.replace(/\D/g, ""))} />}
          </Campo>
        </div>
        <Campo etiqueta="Observaciones">
          {(p) => (
            <Textarea
              {...p}
              placeholder="Fortalezas, áreas de mejora y compromisos acordados con el técnico."
              value={observaciones}
              onChange={(x) => setObservaciones(x.target.value)}
            />
          )}
        </Campo>
      </Surface>

      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to={tecnico ? `/personal/tecnicos/${encodeURIComponent(tecnico.id)}` : "/personal"}>Cancelar</Link>
        <Button type="submit" variante="primario" disabled={!tecnico || registrar.isPending}>
          {registrar.isPending ? "Guardando…" : "Guardar evaluación"}
        </Button>
      </Surface>
    </form>
  );
}

export function Component() {
  const { id = "" } = useParams();
  const { data: tecnico, isPending } = usePerfilTecnico(id);
  if (isPending) return <EmptyState titulo="Cargando técnico…" />;
  // El formulario se monta cuando ya se sabe quién es, para prellenar sus habilidades.
  return <Formulario key={tecnico?.id ?? "sin-tecnico"} tecnico={tecnico ?? null} />;
}

Component.displayName = "EvaluacionHabilidades";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Chip } from "@/components/Chip/Chip";
import { Monto } from "@/components/Monto/Monto";
import type { DatosAltaTecnico, TipoContrato } from "@/domain/tipos";
import { useCrearTecnico } from "@/data/consultas";
import { TALLERES } from "@/app/navegacion";
import { correoValido, telefonoValido } from "@/app/validacionesCliente";
import { curpValida, nssValido } from "@/app/validacionesPersonal";
import { useTallerPorDefecto } from "@/pages/ordenes/ingreso/useTallerPorDefecto";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./NuevoTecnico.module.css";

/** Sugerencias; el puesto se puede escribir libremente. */
const PUESTOS = ["Mecánico general", "Mecánico diésel", "Técnico eléctrico", "Técnico en alta tensión", "Hojalatero", "Pintor", "Ayudante general"] as const;
const NIVELES = ["I", "II", "III", "IV"] as const;
const TURNOS = ["Matutino", "Vespertino", "Nocturno", "Mixto"] as const;
const CONTRATOS: Record<TipoContrato, string> = {
  indeterminado: "Indeterminado",
  determinado: "Determinado",
  por_obra: "Por obra",
};
/** 48 horas semanales de la jornada diurna (LFT) por 4.33 semanas. Ajustable por persona. */
const HORAS_MES_DEFECTO = "208";

interface CertEditable {
  clave: string;
  nombre: string;
  obtenida: string;
  vence: string;
}

interface Estado {
  nombre: string;
  numeroEmpleado: string;
  correo: string;
  telefono: string;
  puesto: string;
  nivel: string;
  tallerId: string;
  turno: string;
  fechaIngreso: string;
  tipoContrato: TipoContrato;
  especialidades: string[];
  especialidadNueva: string;
  puedeRecibirUnidades: boolean;
  costoMensual: string;
  horasMes: string;
  certificaciones: CertEditable[];
  curp: string;
  nss: string;
}

type CampoTecnico =
  | "nombre"
  | "numeroEmpleado"
  | "correo"
  | "telefono"
  | "puesto"
  | "tallerId"
  | "fechaIngreso"
  | "costoMensual"
  | "horasMes"
  | "curp"
  | "nss";

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const certVacia = (): CertEditable => ({ clave: crypto.randomUUID(), nombre: "", obtenida: "", vence: "" });
const certEnBlanco = (c: CertEditable) => !c.nombre.trim() && !c.obtenida && !c.vence;

function revisar(e: Estado) {
  const errores: Partial<Record<CampoTecnico, string>> = {};
  const erroresCert: Record<string, Partial<Record<"nombre" | "obtenida" | "vence", string>>> = {};

  if (!e.nombre.trim()) errores.nombre = "Captura el nombre completo.";
  if (!e.numeroEmpleado.trim()) errores.numeroEmpleado = "Captura el número de empleado.";
  if (e.correo.trim() && !correoValido(e.correo)) errores.correo = "El correo no es válido.";
  if (e.telefono.trim() && !telefonoValido(e.telefono)) errores.telefono = "El teléfono debe tener 10 dígitos.";
  if (!e.puesto.trim()) errores.puesto = "Indica el puesto.";
  if (!e.tallerId) errores.tallerId = "Elige su taller.";
  if (!e.fechaIngreso) errores.fechaIngreso = "Indica la fecha de ingreso.";
  else if (e.fechaIngreso > hoyISO()) errores.fechaIngreso = "No puede ser una fecha futura.";

  const costo = Number(e.costoMensual);
  if (!e.costoMensual.trim() || !Number.isFinite(costo) || costo <= 0) errores.costoMensual = "Captura el costo mensual integrado.";
  const horas = Number(e.horasMes);
  if (!Number.isInteger(horas) || horas < 1 || horas > 300) errores.horasMes = "Entre 1 y 300 horas al mes.";

  if (e.curp.trim() && !curpValida(e.curp)) errores.curp = "La CURP tiene 18 caracteres y un formato fijo.";
  if (e.nss.trim() && !nssValido(e.nss)) errores.nss = "El NSS tiene 11 dígitos y el último es verificador.";

  for (const c of e.certificaciones.filter((x) => !certEnBlanco(x))) {
    const ec: (typeof erroresCert)[string] = {};
    if (!c.nombre.trim()) ec.nombre = "Nombre de la certificación.";
    if (!c.obtenida) ec.obtenida = "Fecha en que la obtuvo.";
    else if (c.obtenida > hoyISO()) ec.obtenida = "No puede ser futura.";
    if (c.vence && c.obtenida && c.vence <= c.obtenida) ec.vence = "Debe vencer después de obtenida.";
    if (Object.keys(ec).length > 0) erroresCert[c.clave] = ec;
  }

  const numErrores = Object.keys(errores).length + Object.keys(erroresCert).length;
  return { errores, erroresCert, numErrores };
}

function aDatos(e: Estado): DatosAltaTecnico {
  return {
    nombre: e.nombre.trim(),
    numeroEmpleado: e.numeroEmpleado.trim().toUpperCase(),
    correo: e.correo.trim(),
    telefono: e.telefono.trim(),
    puesto: e.puesto.trim(),
    nivel: e.nivel,
    tallerId: e.tallerId,
    turno: e.turno,
    fechaIngreso: e.fechaIngreso,
    tipoContrato: e.tipoContrato,
    especialidades: e.especialidades,
    puedeRecibirUnidades: e.puedeRecibirUnidades,
    costoMensualIntegrado: Number(e.costoMensual),
    horasDisponiblesMes: Number(e.horasMes),
    certificaciones: e.certificaciones
      .filter((c) => !certEnBlanco(c))
      .map((c) => ({ nombre: c.nombre.trim(), obtenida: c.obtenida, vence: c.vence || null })),
    curp: e.curp.trim().toUpperCase() || null,
    nss: e.nss.replace(/\D/g, "") || null,
  };
}

export function Component() {
  const navigate = useNavigate();
  const crear = useCrearTecnico();
  const tallerDefecto = useTallerPorDefecto();

  const [estado, setEstado] = useState<Estado>(() => ({
    nombre: "",
    numeroEmpleado: "",
    correo: "",
    telefono: "",
    puesto: "",
    nivel: "I",
    tallerId: tallerDefecto,
    turno: "Matutino",
    fechaIngreso: hoyISO(),
    tipoContrato: "indeterminado",
    especialidades: [],
    especialidadNueva: "",
    puedeRecibirUnidades: false,
    costoMensual: "",
    horasMes: HORAS_MES_DEFECTO,
    certificaciones: [certVacia()],
    curp: "",
    nss: "",
  }));
  const [intentado, setIntentado] = useState(false);

  const r = revisar(estado);
  const errores = intentado ? r.errores : {};
  const erroresCert = intentado ? r.erroresCert : {};
  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setEstado((e) => ({ ...e, [k]: v }));
  const ponerCert = (clave: string, cambio: Partial<CertEditable>) =>
    setEstado((e) => ({ ...e, certificaciones: e.certificaciones.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)) }));

  const agregarEspecialidad = () => {
    const n = estado.especialidadNueva.trim();
    if (!n || estado.especialidades.some((x) => x.toLowerCase() === n.toLowerCase())) return;
    setEstado((e) => ({ ...e, especialidades: [...e.especialidades, n], especialidadNueva: "" }));
  };

  const costo = Number(estado.costoMensual);
  const horas = Number(estado.horasMes);
  const costoHora = costo > 0 && horas > 0 ? costo / horas : null;

  const guardar = async () => {
    setIntentado(true);
    if (r.numErrores > 0) return;
    const { id } = await crear.mutateAsync(aDatos(estado));
    navigate(`/personal/tecnicos/${encodeURIComponent(id)}`);
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
        <Link to="/personal">Personal</Link> / Nuevo técnico
      </div>
      <header>
        <h1 className={f.titulo}>Nuevo técnico</h1>
        <p className={f.subtitulo}>
          Sus habilidades se registran en la primera evaluación; su productividad sale de las O.S. que atienda.
        </p>
      </header>

      <Surface as="section" aria-labelledby="sec-generales" className={f.bloque}>
        <h2 id="sec-generales" className={f.bloqueTitulo}>Datos generales</h2>
        <div className={f.rejilla2}>
          <Campo etiqueta="Nombre completo" obligatorio error={errores.nombre}>
            {(p) => <Input {...p} autoComplete="off" value={estado.nombre} onChange={(x) => set("nombre", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Número de empleado" obligatorio error={errores.numeroEmpleado}>
            {(p) => (
              <Input {...p} autoComplete="off" value={estado.numeroEmpleado} onChange={(x) => set("numeroEmpleado", x.target.value.toUpperCase())} />
            )}
          </Campo>
          <Campo etiqueta="Correo" error={errores.correo}>
            {(p) => <Input {...p} type="email" autoComplete="off" value={estado.correo} onChange={(x) => set("correo", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Teléfono" error={errores.telefono} ayuda="10 dígitos.">
            {(p) => <Input {...p} type="tel" autoComplete="off" value={estado.telefono} onChange={(x) => set("telefono", x.target.value)} />}
          </Campo>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-puesto" className={f.bloque}>
        <h2 id="sec-puesto" className={f.bloqueTitulo}>Puesto y adscripción</h2>
        <div className={f.rejilla3}>
          <Campo etiqueta="Puesto" obligatorio error={errores.puesto}>
            {(p) => (
              <>
                <Input {...p} list="puestos-tecnico" value={estado.puesto} onChange={(x) => set("puesto", x.target.value)} />
                <datalist id="puestos-tecnico">
                  {PUESTOS.map((x) => (
                    <option key={x} value={x} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
          <Campo etiqueta="Nivel" obligatorio>
            {(p) => (
              <Select {...p} value={estado.nivel} onChange={(x) => set("nivel", x.target.value)}>
                {NIVELES.map((n) => (
                  <option key={n} value={n}>Nivel {n}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Taller" obligatorio error={errores.tallerId}>
            {(p) => (
              <Select {...p} value={estado.tallerId} onChange={(x) => set("tallerId", x.target.value)}>
                <option value="">Elige un taller</option>
                {TALLERES.slice(1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Turno" obligatorio>
            {(p) => (
              <Select {...p} value={estado.turno} onChange={(x) => set("turno", x.target.value)}>
                {TURNOS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Fecha de ingreso" obligatorio error={errores.fechaIngreso}>
            {(p) => <Input {...p} type="date" max={hoyISO()} value={estado.fechaIngreso} onChange={(x) => set("fechaIngreso", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Tipo de contrato" obligatorio>
            {(p) => (
              <Select {...p} value={estado.tipoContrato} onChange={(x) => set("tipoContrato", x.target.value as TipoContrato)}>
                {(Object.keys(CONTRATOS) as TipoContrato[]).map((c) => (
                  <option key={c} value={c}>{CONTRATOS[c]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>

        <div>
          <div className={s.subtitulo}>Especialidades</div>
          {estado.especialidades.length > 0 && (
            <ul className={s.especialidades}>
              {estado.especialidades.map((x) => (
                <li key={x}>
                  <Chip tono="brand">{x}</Chip>
                  <button
                    type="button"
                    className={s.quitar}
                    aria-label={`Quitar ${x}`}
                    onClick={() => set("especialidades", estado.especialidades.filter((y) => y !== x))}
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className={s.agregar}>
            <Input
              aria-label="Nueva especialidad"
              placeholder="Diésel, híbridos, alta tensión…"
              value={estado.especialidadNueva}
              onChange={(x) => set("especialidadNueva", x.target.value)}
              onKeyDown={(x) => {
                if (x.key === "Enter") {
                  x.preventDefault();
                  agregarEspecialidad();
                }
              }}
            />
            <Button onClick={agregarEspecialidad} disabled={!estado.especialidadNueva.trim()}>
              + Agregar
            </Button>
          </div>
        </div>

        <label className={f.casilla}>
          <input type="checkbox" checked={estado.puedeRecibirUnidades} onChange={(x) => set("puedeRecibirUnidades", x.target.checked)} />
          Puede recibir unidades en su taller
        </label>
        {estado.puedeRecibirUnidades && (
          <p className={s.nota}>Aparecerá en la lista "Recibe" al registrar la recepción de una unidad en {estado.tallerId || "su taller"}.</p>
        )}
      </Surface>

      <Surface as="section" aria-labelledby="sec-costo" className={f.bloque}>
        <h2 id="sec-costo" className={f.bloqueTitulo}>Costo de mano de obra</h2>
        <div className={f.rejilla3}>
          <Campo etiqueta="Costo mensual integrado (MXN)" obligatorio error={errores.costoMensual} ayuda="Sueldo + prestaciones + carga social.">
            {(p) => (
              <Input {...p} inputMode="decimal" value={estado.costoMensual} onChange={(x) => set("costoMensual", x.target.value.replace(/[^\d.]/g, ""))} />
            )}
          </Campo>
          <Campo etiqueta="Horas disponibles al mes" obligatorio error={errores.horasMes} ayuda="208 = jornada diurna de 48 horas semanales.">
            {(p) => (
              <Input {...p} inputMode="numeric" maxLength={3} value={estado.horasMes} onChange={(x) => set("horasMes", x.target.value.replace(/\D/g, ""))} />
            )}
          </Campo>
          <SoloLectura etiqueta="Costo por hora integrado">
            {costoHora != null ? <><Monto valor={costoHora} /> /hr</> : "—"}
          </SoloLectura>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-cert" className={f.bloque}>
        <h2 id="sec-cert" className={f.bloqueTitulo}>Certificaciones</h2>
        {estado.certificaciones.map((c, i) => {
          const e = erroresCert[c.clave] ?? {};
          return (
            <fieldset key={c.clave} className={s.cert}>
              <legend className={s.leyenda}>Certificación {i + 1}</legend>
              <div className={s.certCampos}>
                <Campo etiqueta="Nombre" error={e.nombre}>
                  {(p) => <Input {...p} placeholder="Alta tensión nivel 2" value={c.nombre} onChange={(x) => ponerCert(c.clave, { nombre: x.target.value })} />}
                </Campo>
                <Campo etiqueta="Obtenida" error={e.obtenida}>
                  {(p) => <Input {...p} type="date" max={hoyISO()} value={c.obtenida} onChange={(x) => ponerCert(c.clave, { obtenida: x.target.value })} />}
                </Campo>
                <Campo etiqueta="Vence" error={e.vence} ayuda="Vacío si no vence.">
                  {(p) => <Input {...p} type="date" value={c.vence} onChange={(x) => ponerCert(c.clave, { vence: x.target.value })} />}
                </Campo>
                <div className={s.quitarFila}>
                  <Button
                    variante="fantasma"
                    onClick={() => set("certificaciones", estado.certificaciones.filter((x) => x.clave !== c.clave))}
                    aria-label={`Quitar certificación ${i + 1}`}
                  >
                    Quitar
                  </Button>
                </div>
              </div>
            </fieldset>
          );
        })}
        <div>
          <Button onClick={() => set("certificaciones", [...estado.certificaciones, certVacia()])}>+ Agregar certificación</Button>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-exp" className={f.bloque}>
        <h2 id="sec-exp" className={f.bloqueTitulo}>Expediente laboral</h2>
        <p className={s.nota}>Solo RRHH y Dirección lo verán en su perfil. Se puede completar después.</p>
        <div className={f.rejilla2}>
          <Campo etiqueta="CURP" error={errores.curp}>
            {(p) => <Input {...p} autoComplete="off" maxLength={18} value={estado.curp} onChange={(x) => set("curp", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="NSS" error={errores.nss} ayuda="Número de seguridad social del IMSS, 11 dígitos.">
            {(p) => (
              <Input {...p} inputMode="numeric" maxLength={11} value={estado.nss} onChange={(x) => set("nss", x.target.value.replace(/\D/g, ""))} />
            )}
          </Campo>
        </div>
      </Surface>

      {crear.error && <Aviso tono="critico" titulo={crear.error.message} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && r.numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {r.numErrores} {r.numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/personal">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Registrar técnico"}
        </Button>
      </Surface>
    </form>
  );
}

Component.displayName = "NuevoTecnico";

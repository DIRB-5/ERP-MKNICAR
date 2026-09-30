import { Campo, Input, SoloLectura, Textarea } from "@/components/Campo/Campo";
import { NivelCombustible } from "@/components/NivelCombustible/NivelCombustible";
import { ListaDanos } from "@/components/ListaDanos/ListaDanos";
import { CargaFotos } from "@/components/CargaFotos/CargaFotos";
import { MarcadorFirma } from "@/components/MarcadorFirma/MarcadorFirma";
import {
  ELEMENTOS_INVENTARIO,
  type DanoPrevio,
  type DatosRecepcion,
  type ElementoInventario,
  type FotoRecepcion,
  type Unidad,
} from "@/domain/tipos";
import { aInputFechaHora, deInputFechaHora } from "@/app/fechas";
import { revisarKilometraje } from "@/app/validacionesIngreso";
import { useSesion } from "@/app/useSesion";
import { FOTOS_REQUERIDAS, INVENTARIO } from "./etiquetas";
import f from "./Formulario.module.css";

export interface EstadoRecepcion {
  fechaHora: string;
  kilometraje: string;
  nivelCombustible: number | null;
  entregaNombre: string;
  inventario: Record<ElementoInventario, boolean>;
  objetosPersonales: string;
  danos: DanoPrevio[];
  fotos: FotoRecepcion[];
  autorizaDiagnostico: boolean;
}

export type CampoRecepcion = "fechaHora" | "kilometraje" | "nivelCombustible" | "entregaNombre" | "fotos";

export const recepcionInicial = (): EstadoRecepcion => ({
  fechaHora: aInputFechaHora(new Date()),
  kilometraje: "",
  nivelCombustible: null,
  entregaNombre: "",
  inventario: Object.fromEntries(ELEMENTOS_INVENTARIO.map((k) => [k, false])) as Record<ElementoInventario, boolean>,
  objetosPersonales: "",
  danos: [],
  fotos: [],
  autorizaDiagnostico: false,
});

export interface RevisionRecepcion {
  errores: Partial<Record<CampoRecepcion, string>>;
  advertencias: string[];
}

/**
 * Solo se exige la condición que se ve al recibir. Nada técnico y nada de
 * catálogo: el vehículo ya está físicamente en el taller.
 */
export function revisarRecepcion(e: EstadoRecepcion, unidad: Unidad | null): RevisionRecepcion {
  const errores: RevisionRecepcion["errores"] = {};
  const advertencias: string[] = [];

  const cuando = deInputFechaHora(e.fechaHora);
  if (!cuando) errores.fechaHora = "Indica fecha y hora de ingreso.";
  else if (cuando.getTime() > Date.now() + 5 * 60_000) errores.fechaHora = "No puede ser en el futuro.";

  const km = Number(e.kilometraje);
  if (e.kilometraje.trim() === "" || !Number.isFinite(km) || km < 0) {
    errores.kilometraje = "Captura el kilometraje u horómetro del tablero.";
  } else {
    const r = revisarKilometraje(km, unidad, cuando ?? new Date());
    if (r.error) errores.kilometraje = r.error;
    if (r.advertencia) advertencias.push(r.advertencia);
  }

  if (e.nivelCombustible == null) errores.nivelCombustible = "Marca el nivel de combustible.";
  if (!e.entregaNombre.trim()) errores.entregaNombre = "Escribe el nombre de quien entrega la unidad.";

  const faltan = FOTOS_REQUERIDAS.filter((t) => !e.fotos.some((x) => x.etiqueta === t));
  if (faltan.length > 0) errores.fotos = `Faltan fotos: ${faltan.join(", ")}.`;

  return { errores, advertencias };
}

/** Solo se llama cuando `revisarRecepcion` no devolvió errores. */
export function aDatosRecepcion(e: EstadoRecepcion, recibeId: string): DatosRecepcion {
  return {
    fechaHora: deInputFechaHora(e.fechaHora) as Date,
    kilometraje: Number(e.kilometraje),
    nivelCombustible: e.nivelCombustible as number,
    recibeId,
    entregaNombre: e.entregaNombre.trim(),
    inventario: e.inventario,
    objetosPersonales: e.objetosPersonales.trim(),
    danosPrevios: e.danos,
    fotos: e.fotos,
    autorizaDiagnostico: e.autorizaDiagnostico,
    firmaEntrega: null,
  };
}

interface Props {
  estado: EstadoRecepcion;
  onCambiar: (siguiente: EstadoRecepcion) => void;
  errores: RevisionRecepcion["errores"];
  /** Unidad contra la que se valida el kilometraje; null si aún no se elige. */
  unidad: Unidad | null;
}

export function FormRecepcion({ estado: e, onCambiar, errores, unidad }: Props) {
  const sesion = useSesion();
  const set = <K extends keyof EstadoRecepcion>(k: K, v: EstadoRecepcion[K]) => onCambiar({ ...e, [k]: v });
  const km = Number(e.kilometraje);
  const aviso =
    e.kilometraje.trim() && Number.isFinite(km) ? revisarKilometraje(km, unidad, deInputFechaHora(e.fechaHora) ?? new Date()).advertencia : undefined;

  return (
    <>
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Llegada</legend>
        <div className={f.rejilla3}>
          <Campo etiqueta="Fecha y hora real de ingreso" obligatorio error={errores.fechaHora}>
            {(c) => <Input {...c} type="datetime-local" value={e.fechaHora} onChange={(x) => set("fechaHora", x.target.value)} />}
          </Campo>
          <SoloLectura etiqueta="Recibe">
            {sesion.nombre ?? "Pendiente: contexto de sesión"}
          </SoloLectura>
          <Campo etiqueta="Entrega" obligatorio error={errores.entregaNombre} ayuda="Nombre de quien trae la unidad.">
            {(c) => <Input {...c} autoComplete="name" value={e.entregaNombre} onChange={(x) => set("entregaNombre", x.target.value)} />}
          </Campo>
        </div>
      </fieldset>

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Condición</legend>
        <div className={f.rejilla2}>
          <Campo
            etiqueta="Kilometraje u horómetro"
            obligatorio
            error={errores.kilometraje}
            ayuda={errores.kilometraje ? undefined : aviso ?? (unidad && unidad.kilometrajeUltimo > 0 ? `Última lectura: ${unidad.kilometrajeUltimo.toLocaleString("es-MX")} km.` : "Lo que marca el tablero.")}
          >
            {(c) => (
              <Input {...c} inputMode="numeric" value={e.kilometraje} onChange={(x) => set("kilometraje", x.target.value.replace(/[^\d]/g, ""))} />
            )}
          </Campo>
          <div>
            <NivelCombustible valor={e.nivelCombustible} onCambiar={(n) => set("nivelCombustible", n)} />
            {errores.nivelCombustible && (
              <div className={f.resumenErrores} role="alert">
                {errores.nivelCombustible}
              </div>
            )}
          </div>
        </div>

        <fieldset className={f.inventario}>
          <legend>Inventario: marca lo que llega con la unidad</legend>
          {ELEMENTOS_INVENTARIO.map((k) => (
            <label key={k} className={f.casilla}>
              <input type="checkbox" checked={e.inventario[k]} onChange={(x) => set("inventario", { ...e.inventario, [k]: x.target.checked })} />
              {INVENTARIO[k]}
            </label>
          ))}
        </fieldset>

        <Campo etiqueta="Objetos personales o carga a bordo" ayuda="Lo que el cliente deja dentro y el taller debe devolver.">
          {(c) => <Textarea {...c} value={e.objetosPersonales} onChange={(x) => set("objetosPersonales", x.target.value)} />}
        </Campo>

        <div>
          <div className={f.subtituloCampo}>Daños previos</div>
          <ListaDanos danos={e.danos} onCambiar={(d) => set("danos", d)} />
        </div>
      </fieldset>

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Fotos</legend>
        <CargaFotos requeridas={FOTOS_REQUERIDAS} fotos={e.fotos} onCambiar={(x) => set("fotos", x)} error={errores.fotos} />
      </fieldset>

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Conformidad</legend>
        <label className={f.casilla}>
          <input type="checkbox" checked={e.autorizaDiagnostico} onChange={(x) => set("autorizaDiagnostico", x.target.checked)} />
          Quien entrega autoriza el diagnóstico
        </label>
        <MarcadorFirma nombre={e.entregaNombre} />
      </fieldset>
    </>
  );
}

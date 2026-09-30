import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { useIngresoDirecto, useReceptores } from "@/data/consultas";
import { useSesion } from "@/app/useSesion";
import { useTallerPorDefecto } from "./ingreso/useTallerPorDefecto";
import { FormAltaOS, aDatosAlta, altaInicial, revisarAlta } from "./ingreso/FormAltaOS";
import { FormRecepcion, aDatosRecepcion, recepcionInicial, revisarRecepcion } from "./ingreso/FormRecepcion";
import f from "./ingreso/Formulario.module.css";

/** Unidad que llegó sin cita: alta y recepción juntas, un solo guardado. */
export function Component() {
  const navigate = useNavigate();
  const sesion = useSesion();
  const ingresar = useIngresoDirecto();
  const tallerDefecto = useTallerPorDefecto();

  const [alta, setAlta] = useState(() => altaInicial(tallerDefecto));
  const [recepcion, setRecepcion] = useState(recepcionInicial);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const { data: receptores = [] } = useReceptores(alta.tallerId);

  const rAlta = revisarAlta(alta, "directo");
  const rRecepcion = revisarRecepcion(recepcion, alta.unidad?.unidad ?? null, receptores);
  const numErrores = Object.keys(rAlta.errores).length + Object.keys(rRecepcion.errores).length;
  const advertencias = [...rAlta.advertencias, ...rRecepcion.advertencias];

  const guardar = async () => {
    const os = await ingresar.mutateAsync({
      alta: aDatosAlta(alta, "directo"),
      // Sin contexto de sesión todavía no hay id de asesor; el backend lo tomará del token.
      recepcion: aDatosRecepcion(recepcion, sesion.usuarioId ?? "", receptores),
    });
    navigate(`/ordenes?vista=ingresos&recibida=${encodeURIComponent(os.folio)}`);
  };

  const intentar = () => {
    setIntentado(true);
    if (numErrores > 0) return;
    if (rAlta.confirmaciones.length > 0) setConfirmar(true);
    else void guardar();
  };

  return (
    <form
      className={f.pagina}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        intentar();
      }}
    >
      <div className={f.migas}>
        <Link to="/ordenes?vista=ingresos">Ingresos de hoy</Link> / Ingreso directo
      </div>
      <header>
        <h1 className={f.titulo}>Ingreso directo</h1>
        <p className={f.subtitulo}>La unidad llegó sin cita: se abre la O.S. y se recibe en un solo paso.</p>
      </header>

      <Surface as="section" aria-labelledby="sec-os" className={f.bloque}>
        <h2 id="sec-os" className={f.bloqueTitulo}>1 · Orden de servicio</h2>
        <FormAltaOS modo="directo" estado={alta} onCambiar={setAlta} errores={intentado ? rAlta.errores : {}} />
      </Surface>

      <Surface as="section" aria-labelledby="sec-recepcion" className={f.bloque}>
        <h2 id="sec-recepcion" className={f.bloqueTitulo}>2 · Recepción</h2>
        <FormRecepcion
          estado={recepcion}
          onCambiar={setRecepcion}
          errores={intentado ? rRecepcion.errores : {}}
          unidad={alta.unidad?.unidad ?? null}
          receptores={receptores}
          tallerId={alta.tallerId}
        />
      </Surface>

      {advertencias.length > 0 && (
        <div className={f.avisos}>
          {advertencias.map((a) => (
            <Aviso key={a} titulo={a} />
          ))}
        </div>
      )}
      {ingresar.error && <Aviso tono="critico" titulo={`No se pudo registrar el ingreso: ${ingresar.error.message}`} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/ordenes?vista=ingresos">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={ingresar.isPending}>
          {ingresar.isPending ? "Guardando…" : "Abrir O.S. y recibir"}
        </Button>
      </Surface>

      <Dialogo
        abierto={confirmar}
        titulo="Antes de recibir"
        confirmar="Recibir de todos modos"
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => {
          setConfirmar(false);
          void guardar();
        }}
      >
        {rAlta.confirmaciones.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </Dialogo>
    </form>
  );
}

Component.displayName = "IngresoDirecto";

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { useCrearOS } from "@/data/consultas";
import { useTallerPorDefecto } from "./ingreso/useTallerPorDefecto";
import { FormAltaOS, aDatosAlta, altaInicial, revisarAlta } from "./ingreso/FormAltaOS";
import f from "./ingreso/Formulario.module.css";

export function Component() {
  const navigate = useNavigate();
  const crear = useCrearOS();
  const tallerDefecto = useTallerPorDefecto();
  const [estado, setEstado] = useState(() => altaInicial(tallerDefecto));
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const revision = revisarAlta(estado, "programada");
  const errores = intentado ? revision.errores : {};
  const numErrores = Object.keys(revision.errores).length;

  const guardar = async () => {
    const os = await crear.mutateAsync(aDatosAlta(estado, "programada"));
    navigate(`/ordenes?vista=ingresos&programada=${encodeURIComponent(os.folio)}`);
  };

  const intentar = () => {
    setIntentado(true);
    if (numErrores > 0) return;
    if (revision.confirmaciones.length > 0) setConfirmar(true);
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
        <Link to="/ordenes">Órdenes de Servicio</Link> / Crear O.S.
      </div>
      <header>
        <h1 className={f.titulo}>Crear O.S.</h1>
        <p className={f.subtitulo}>Programa una cita o una recolección. La condición de la unidad se registra al recibirla.</p>
      </header>

      <Surface className={f.bloque}>
        <FormAltaOS modo="programada" estado={estado} onCambiar={setEstado} errores={errores} />
      </Surface>

      {revision.advertencias.length > 0 && (
        <div className={f.avisos}>
          {revision.advertencias.map((a) => (
            <Aviso key={a} titulo={a} />
          ))}
        </div>
      )}
      {crear.error && <Aviso tono="critico" titulo={`No se pudo crear la O.S.: ${crear.error.message}`} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/ordenes">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Programar ingreso"}
        </Button>
      </Surface>

      <Dialogo
        abierto={confirmar}
        titulo="Antes de programar"
        confirmar="Programar de todos modos"
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => {
          setConfirmar(false);
          void guardar();
        }}
      >
        {revision.confirmaciones.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </Dialogo>
    </form>
  );
}

Component.displayName = "CrearOrden";

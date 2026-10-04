import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { useCliente, useCrearOS, useUnidades } from "@/data/consultas";
import { TALLERES } from "@/app/navegacion";
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
  const [salir, setSalir] = useState(false);

  // De regreso del alta de unidad llegan ?cliente= y ?unidad=: se eligen solos, una vez.
  const [params] = useSearchParams();
  const clienteParam = params.get("cliente") ?? "";
  const placasParam = params.get("unidad") ?? "";
  const { data: clientePrevio } = useCliente(clienteParam);
  const { data: unidadesCliente } = useUnidades({ alcance: TALLERES[0], clienteId: clienteParam || "__ninguno__" });
  const unidadPrevia = placasParam ? unidadesCliente?.find((u) => u.unidad.placas === placasParam) : undefined;
  const [precargado, setPrecargado] = useState(false);
  if (!precargado && clientePrevio && (!placasParam || unidadPrevia)) {
    setPrecargado(true);
    const autoriza = clientePrevio.contactos.find((c) => c.autorizaPresupuesto);
    setEstado({
      ...estado,
      cliente: clientePrevio,
      clienteTexto: clientePrevio.razonSocial,
      unidad: unidadPrevia ?? null,
      unidadTexto: unidadPrevia?.unidad.placas ?? "",
      contactoAutorizaId: autoriza?.id ?? "",
      canal: autoriza?.canalPreferido ?? "correo",
    });
  }

  // Salir a registrar la unidad pierde lo capturado: se confirma solo si hay algo.
  const hayCaptura = Boolean(
    estado.cliente || estado.motivo.trim() || estado.tipoServicio || estado.programadaPara || estado.entrega
  );
  const irARegistrarUnidad = () =>
    navigate(`/unidades/nueva?desde=os${estado.cliente ? `&cliente=${encodeURIComponent(estado.cliente.id)}` : ""}`);

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
      <header className={f.encabezado}>
        <div>
          <h1 className={f.titulo}>Crear O.S.</h1>
          <p className={f.subtitulo}>Programa una cita o una recolección. La condición de la unidad se registra al recibirla.</p>
        </div>
        <Button onClick={() => (hayCaptura ? setSalir(true) : irARegistrarUnidad())}>+ Registrar unidad</Button>
      </header>

      {precargado && unidadPrevia && (
        <Aviso titulo={`Unidad ${unidadPrevia.unidad.placas} registrada y elegida.`}>Continúa con los datos de la O.S.</Aviso>
      )}

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
        abierto={salir}
        titulo="¿Salir a registrar la unidad?"
        confirmar="Registrar unidad"
        cancelar="Seguir en la O.S."
        onCancelar={() => setSalir(false)}
        onConfirmar={() => {
          setSalir(false);
          irARegistrarUnidad();
        }}
      >
        <p>
          Lo que llevas capturado en esta O.S. se pierde. Al registrar la unidad regresas aquí con el cliente y la unidad
          ya elegidos.
        </p>
      </Dialogo>

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

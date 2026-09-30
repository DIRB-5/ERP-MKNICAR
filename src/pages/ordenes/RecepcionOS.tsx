import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Estado } from "@/components/Estado/Estado";
import { Folio } from "@/components/Folio/Folio";
import { fechaHora } from "@/domain/format";
import { useCliente, useIngreso, useReceptores, useRecibirOS } from "@/data/consultas";
import { useSesion } from "@/app/useSesion";
import { FormRecepcion, aDatosRecepcion, recepcionInicial, revisarRecepcion } from "./ingreso/FormRecepcion";
import { PRIORIDAD, TIPO_INGRESO, TIPO_SERVICIO } from "./ingreso/etiquetas";
import f from "./ingreso/Formulario.module.css";

export function Component() {
  const { folio = "" } = useParams();
  const navigate = useNavigate();
  const sesion = useSesion();
  const { data: ingreso, isPending } = useIngreso(folio);
  const { data: cliente } = useCliente(ingreso?.cliente.id ?? "");
  const recibir = useRecibirOS();
  const { data: receptores = [] } = useReceptores(ingreso?.orden.tallerId ?? "");

  const [estado, setEstado] = useState(recepcionInicial);
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  if (isPending) return <EmptyState titulo="Cargando O.S.…" />;

  if (!ingreso) {
    return (
      <div className={f.pagina}>
        <EmptyState titulo={`No encontramos la O.S. ${folio}`}>
          Si la unidad llegó sin cita, regístrala como ingreso directo.
          <div className={f.accionesCentro}>
            <Link to="/ordenes/ingreso-directo">Ingreso directo</Link>
            <Link to="/ordenes?vista=ingresos">Volver a ingresos de hoy</Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  const { orden, unidad } = ingreso;

  if (orden.estado !== "programada") {
    return (
      <div className={f.pagina}>
        <div className={f.migas}>
          <Link to="/ordenes?vista=ingresos">Ingresos de hoy</Link> / {orden.folio}
        </div>
        <Aviso titulo={`La O.S. ${orden.folio} ya no espera recepción.`}>
          Su estado actual es <Estado estado={orden.estado} />. <Folio folio={orden.folio} tipo="os" />
        </Aviso>
      </div>
    );
  }

  const revision = revisarRecepcion(estado, unidad, receptores);
  const errores = intentado ? revision.errores : {};
  const numErrores = Object.keys(revision.errores).length;
  const suspendido = cliente?.estado === "credito_suspendido";

  const guardar = async () => {
    // Sin contexto de sesión todavía no hay id de asesor; el backend lo tomará del token.
    await recibir.mutateAsync({ folio: orden.folio, datos: aDatosRecepcion(estado, sesion.usuarioId ?? "", receptores) });
    navigate(`/ordenes?vista=ingresos&recibida=${encodeURIComponent(orden.folio)}`);
  };

  const intentar = () => {
    setIntentado(true);
    if (numErrores > 0) return;
    if (suspendido) setConfirmar(true);
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
        <Link to="/ordenes?vista=ingresos">Ingresos de hoy</Link> / Recibir {orden.folio}
      </div>
      <header>
        <h1 className={f.titulo}>Recibir unidad {unidad.placas}</h1>
        <p className={f.subtitulo}>Registra la condición en que llega. El diagnóstico lo hace el técnico después.</p>
      </header>

      <Surface as="dl" aria-label="Datos de la O.S." className={f.ficha}>
        <div>
          <dt>Folio</dt>
          <dd><Folio folio={orden.folio} tipo="os" /></dd>
        </div>
        <div>
          <dt>Cliente</dt>
          <dd><Link to={`/clientes/${encodeURIComponent(ingreso.cliente.id)}`}>{ingreso.cliente.razonSocial}</Link></dd>
        </div>
        <div>
          <dt>Unidad</dt>
          <dd>{unidad.placas} · {unidad.marca} {unidad.modelo} {unidad.anio}</dd>
        </div>
        <div>
          <dt>Ingreso</dt>
          <dd>{TIPO_INGRESO[orden.tipoIngreso]}{ingreso.hora ? ` · ${fechaHora(ingreso.hora)}` : ""}</dd>
        </div>
        <div>
          <dt>Servicio</dt>
          <dd>{TIPO_SERVICIO[orden.tipoServicio]} · prioridad {PRIORIDAD[orden.prioridad].toLowerCase()}</dd>
        </div>
        <div>
          <dt>Taller</dt>
          <dd>{orden.tallerId}</dd>
        </div>
        <div className={f.motivo}>
          <dt>Motivo reportado por el cliente</dt>
          <dd>“{orden.motivoReportado}”</dd>
        </div>
      </Surface>

      {suspendido && <Aviso tono="critico" titulo={`${ingreso.cliente.razonSocial} tiene el crédito suspendido`} />}

      <Surface className={f.bloque}>
        <FormRecepcion
          estado={estado}
          onCambiar={setEstado}
          errores={errores}
          unidad={unidad}
          receptores={receptores}
          tallerId={orden.tallerId}
        />
      </Surface>

      {revision.advertencias.length > 0 && (
        <div className={f.avisos}>
          {revision.advertencias.map((a) => (
            <Aviso key={a} titulo={a} />
          ))}
        </div>
      )}
      {recibir.error && <Aviso tono="critico" titulo={`No se pudo recibir: ${recibir.error.message}`} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/ordenes?vista=ingresos">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={recibir.isPending}>
          {recibir.isPending ? "Guardando…" : "Recibir unidad"}
        </Button>
      </Surface>

      <Dialogo
        abierto={confirmar}
        titulo="Cliente con crédito suspendido"
        confirmar="Recibir de todos modos"
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => {
          setConfirmar(false);
          void guardar();
        }}
      >
        <p>
          {ingreso.cliente.razonSocial} tiene el crédito suspendido. La unidad se recibe igual: ya está en el
          taller. Avisa a Dirección antes de comprometer compras.
        </p>
      </Dialogo>
    </form>
  );
}

Component.displayName = "RecepcionOS";

import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Folio } from "@/components/Folio/Folio";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input } from "@/components/Campo/Campo";
import { eventosDe, vigente } from "@/domain/bitacora";
import { numero } from "@/domain/format";
import { useRegistrarEvento } from "@/data/consultas";
import { aInputFechaHora, deInputFechaHora } from "@/app/fechas";
import { Acciones, Datos, Pendiente, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

const kmEntrada = (exp: PropsSeccion["exp"]) => {
  const r = eventosDe(exp.eventos, "recepcion_registrada").at(-1);
  return r ? Number(vigente(r, exp.eventos).carga.kilometraje) : null;
};

export const resumen: ResumenSeccion = (exp) => {
  const r = eventosDe(exp.eventos, "remision_emitida").at(-1);
  return r ? `${r.carga.folio} · entregada a ${vigente(r, exp.eventos).carga.recibeNombre}` : null;
};

export default function Entrega({ exp, abierta }: PropsSeccion) {
  const [registrando, setRegistrando] = useState(false);
  const remision = eventosDe(exp.eventos, "remision_emitida").at(-1);
  const r = remision ? vigente(remision, exp.eventos).carga : null;

  return (
    <div className={s.bloques}>
      {!r ? (
        <Pendiente>La entrega se registra en la remisión: kilometraje de salida, quién recibe y su firma.</Pendiente>
      ) : (
        <Datos
          filas={[
            ["Remisión", <Folio folio={r.folio} tipo="remision" />],
            ["Kilometraje de salida", <span className={s.cifra}>{numero(r.kilometrajeSalida)} km</span>],
            ["Entregada", fh(r.entregadaEn)],
            ["Recibió", r.recibeNombre],
            ["Firma", r.firma ? "Firmada" : "Pendiente: el capturador de firma llega en una fase siguiente"],
          ]}
        />
      )}

      {abierta && !r && (
        <Acciones>
          <Button variante="primario" onClick={() => setRegistrando(true)}>Registrar entrega</Button>
        </Acciones>
      )}

      <RegistrarEntrega exp={exp} abierto={registrando} onCerrar={() => setRegistrando(false)} />
    </div>
  );
}

function RegistrarEntrega({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const entrada = kmEntrada(exp);
  const [km, setKm] = useState("");
  const [cuando, setCuando] = useState("");
  const [recibe, setRecibe] = useState("");
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setKm("");
    setCuando(aInputFechaHora(new Date()));
    setRecibe("");
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const fecha = deInputFechaHora(cuando);
  const errores: Partial<Record<"km" | "cuando" | "recibe", string>> = {};
  if (km === "" || !(Number(km) >= 0)) errores.km = "Captura el kilometraje del tablero.";
  else if (entrada != null && Number(km) < entrada) errores.km = `No puede ser menor que el de entrada (${numero(entrada)} km).`;
  if (!fecha) errores.cuando = "Indica cuándo se entregó.";
  if (!recibe.trim()) errores.recibe = "¿Quién recibe la unidad?";
  const visibles = intentado ? errores : {};

  const guardar = () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0 || !fecha) return;
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: {
          tipo: "remision_emitida",
          carga: { folio: "", kilometrajeSalida: Number(km), entregadaEn: fecha.toISOString(), recibeNombre: recibe.trim(), firma: null },
        },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Entrega de la unidad"
      subtitulo="El folio de la remisión lo asigna el sistema."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Registrar entrega</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <div className={f.rejilla2}>
        <Campo etiqueta="Kilometraje de salida" obligatorio error={visibles.km} ayuda={entrada != null ? `Entró con ${numero(entrada)} km.` : undefined}>
          {(p) => <Input {...p} inputMode="numeric" className={s.cifra} value={km} onChange={(x) => setKm(x.target.value.replace(/\D/g, ""))} />}
        </Campo>
        <Campo etiqueta="Fecha y hora" obligatorio error={visibles.cuando}>
          {(p) => <Input {...p} type="datetime-local" value={cuando} onChange={(x) => setCuando(x.target.value)} />}
        </Campo>
      </div>
      <Campo etiqueta="Quién recibe" obligatorio error={visibles.recibe}>
        {(p) => <Input {...p} autoComplete="name" value={recibe} onChange={(x) => setRecibe(x.target.value)} />}
      </Campo>
      <p className={s.meta}>La firma se agrega cuando exista el capturador de firma.</p>
    </PanelLateral>
  );
}

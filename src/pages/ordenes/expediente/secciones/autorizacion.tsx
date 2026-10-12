import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select } from "@/components/Campo/Campo";
import { dias as fmtDias } from "@/domain/format";
import type { MedioAutorizacion, ResultadoAutorizacion } from "@/domain/bitacora";
import { useRegistrarEvento } from "@/data/consultas";
import { aInputFechaHora, deInputFechaHora } from "@/app/fechas";
import { versiones } from "../calculos";
import { aAdjuntos } from "../captura";
import { Acciones, Pendiente, Tabla, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import { ChipVersion } from "./presupuesto";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

export const MEDIO: Record<MedioAutorizacion, string> = {
  correo: "Correo",
  portal: "Portal",
  firma_fisica: "Firma física",
  llamada: "Llamada",
  whatsapp: "WhatsApp",
};

const RESULTADOS: Record<ResultadoAutorizacion, string> = {
  autorizada: "Autorizada",
  parcial: "Autorizada parcial",
  rechazada: "Rechazada",
};

const DIA = 86_400_000;
const diasEntre = (desde: string, hasta: string) => Math.max(0, (new Date(hasta).getTime() - new Date(desde).getTime()) / DIA);

export const resumen: ResumenSeccion = (exp, ahora) => {
  const v = versiones(exp.eventos).filter((x) => x.enviadaEn).at(-1);
  if (!v?.enviadaEn) return null;
  const espera = diasEntre(v.enviadaEn, v.respuesta?.respondidaEn ?? ahora);
  return `Versión ${v.carga.version} · ${v.respuesta ? RESULTADOS[v.respuesta.resultado] : "sin respuesta"} · ${fmtDias(espera)} d de espera`;
};

/** Cada versión enviada y su respuesta. Entre una y otra corre el punto de espera #1. */
export default function Autorizacion({ exp, abierta, ahora }: PropsSeccion) {
  const [registrando, setRegistrando] = useState(false);
  const enviadas = versiones(exp.eventos).filter((v) => v.enviadaEn);
  const sinRespuesta = enviadas.filter((v) => !v.respuesta);

  return (
    <div className={s.bloques}>
      {enviadas.length === 0 ? (
        <Pendiente>Ninguna versión se ha enviado al cliente.</Pendiente>
      ) : (
        <Tabla encabezados={["Versión", "Enviada", "Respuesta", "Medio", "Autorizó", "Evidencia", "Resultado", "Espera"]} derecha={[7]}>
          {enviadas.map((v) => {
            const r = v.respuesta;
            const espera = diasEntre(v.enviadaEn ?? ahora, r?.respondidaEn ?? ahora);
            return (
              <tr key={v.evento.id}>
                <td className={s.cifra}>{v.carga.version}</td>
                <td className={s.cifra}>{v.enviadaEn ? fh(v.enviadaEn) : "—"}</td>
                <td className={s.cifra}>{r ? fh(r.respondidaEn) : "—"}</td>
                <td>{r ? MEDIO[r.medio] : "—"}</td>
                <td>{r?.autorizo || "—"}</td>
                <td>
                  {r?.evidencia ? (
                    <a href={r.evidencia.url} target="_blank" rel="noreferrer">{r.evidencia.nombre}</a>
                  ) : (
                    "—"
                  )}
                </td>
                <td><ChipVersion v={v} /></td>
                {/* Punto de espera #1: el número que el producto existe para medir. */}
                <td className={`${s.der} ${s.espera}`}>
                  {fmtDias(espera)} d{!r && <span className={s.meta}> y contando</span>}
                </td>
              </tr>
            );
          })}
        </Tabla>
      )}

      {abierta && sinRespuesta.length > 0 && (
        <Acciones>
          <Button variante="primario" onClick={() => setRegistrando(true)}>Registrar respuesta del cliente</Button>
        </Acciones>
      )}

      <RegistrarRespuesta
        exp={exp}
        abierto={registrando}
        versionesPendientes={sinRespuesta.map((v) => ({ version: v.carga.version, subtotal: v.totales.subtotal }))}
        onCerrar={() => setRegistrando(false)}
      />
    </div>
  );
}

function RegistrarRespuesta({
  exp,
  abierto,
  versionesPendientes,
  onCerrar,
}: {
  exp: PropsSeccion["exp"];
  abierto: boolean;
  versionesPendientes: { version: number; subtotal: number }[];
  onCerrar: () => void;
}) {
  const registrar = useRegistrarEvento();
  const [version, setVersion] = useState("");
  const [resultado, setResultado] = useState<ResultadoAutorizacion>("autorizada");
  const [medio, setMedio] = useState<MedioAutorizacion>("correo");
  const [autorizo, setAutorizo] = useState("");
  const [cuando, setCuando] = useState("");
  const [monto, setMonto] = useState("");
  const [archivo, setArchivo] = useState<FileList | null>(null);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setVersion(String(versionesPendientes.at(-1)?.version ?? ""));
    setResultado("autorizada");
    setAutorizo(exp.cabecera.contactoAutoriza ?? "");
    setCuando(aInputFechaHora(new Date()));
    setMonto("");
    setArchivo(null);
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const fecha = deInputFechaHora(cuando);
  const tope = versionesPendientes.find((v) => String(v.version) === version)?.subtotal ?? 0;
  const errores: Partial<Record<"autorizo" | "cuando" | "monto", string>> = {};
  if (!autorizo.trim()) errores.autorizo = "¿Quién respondió del lado del cliente?";
  if (!fecha) errores.cuando = "Indica cuándo respondió.";
  else if (fecha.getTime() > Date.now() + 5 * 60_000) errores.cuando = "No puede ser en el futuro.";
  if (resultado === "parcial" && !(Number(monto) > 0 && Number(monto) < tope)) errores.monto = "Un monto mayor que cero y menor que el de la versión.";
  const visibles = intentado ? errores : {};

  const guardar = () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0 || !fecha) return;
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: {
          tipo: "autorizacion_cliente",
          carga: {
            version: Number(version),
            respondidaEn: fecha.toISOString(),
            medio,
            autorizo: autorizo.trim(),
            resultado,
            montoAutorizado: resultado === "parcial" ? Number(monto) : null,
            evidencia: aAdjuntos(archivo)[0] ?? null,
          },
        },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Respuesta del cliente"
      subtitulo="Con esto se cierra el punto de espera #1 de esta versión."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Registrar</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <div className={f.rejilla2}>
        <Campo etiqueta="Versión" obligatorio>
          {(p) => (
            <Select {...p} value={version} onChange={(x) => setVersion(x.target.value)}>
              {versionesPendientes.map((v) => (
                <option key={v.version} value={v.version}>Versión {v.version}</option>
              ))}
            </Select>
          )}
        </Campo>
        <Campo etiqueta="Resultado" obligatorio>
          {(p) => (
            <Select {...p} value={resultado} onChange={(x) => setResultado(x.target.value as ResultadoAutorizacion)}>
              {(Object.keys(RESULTADOS) as ResultadoAutorizacion[]).map((k) => (
                <option key={k} value={k}>{RESULTADOS[k]}</option>
              ))}
            </Select>
          )}
        </Campo>
        <Campo etiqueta="Quién respondió" obligatorio error={visibles.autorizo}>
          {(p) => <Input {...p} value={autorizo} onChange={(x) => setAutorizo(x.target.value)} />}
        </Campo>
        <Campo etiqueta="Medio" obligatorio>
          {(p) => (
            <Select {...p} value={medio} onChange={(x) => setMedio(x.target.value as MedioAutorizacion)}>
              {(Object.keys(MEDIO) as MedioAutorizacion[]).map((k) => (
                <option key={k} value={k}>{MEDIO[k]}</option>
              ))}
            </Select>
          )}
        </Campo>
        <Campo etiqueta="Cuándo respondió" obligatorio error={visibles.cuando}>
          {(p) => <Input {...p} type="datetime-local" value={cuando} onChange={(x) => setCuando(x.target.value)} />}
        </Campo>
        {resultado === "parcial" && (
          <Campo etiqueta="Monto autorizado (sin IVA)" obligatorio error={visibles.monto}>
            {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={monto} onChange={(x) => setMonto(x.target.value.replace(/[^\d.]/g, ""))} />}
          </Campo>
        )}
      </div>
      <Campo etiqueta="Evidencia" ayuda="Correo, captura del portal o documento firmado.">
        {(p) => <Input {...p} type="file" accept="image/*,application/pdf,.eml,.msg" onChange={(x) => setArchivo(x.target.files)} />}
      </Campo>
    </PanelLateral>
  );
}

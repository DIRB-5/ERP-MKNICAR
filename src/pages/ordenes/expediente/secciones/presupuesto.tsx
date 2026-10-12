import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { Chip, type TonoChip } from "@/components/Chip/Chip";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { numero } from "@/domain/format";
import { useRegistrarEvento } from "@/data/consultas";
import { FormPresupuesto } from "../FormPresupuesto";
import { autorizado, versiones, type VersionPresupuesto } from "../calculos";
import { Acciones, Pendiente, Tabla, dia, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

const RESULTADO: Record<string, { label: string; tono: TonoChip }> = {
  autorizada: { label: "Autorizada", tono: "ok" },
  parcial: { label: "Autorizada parcial", tono: "ok" },
  rechazada: { label: "Rechazada", tono: "critico" },
};

export function ChipVersion({ v }: { v: VersionPresupuesto }) {
  if (v.respuesta) {
    const r = RESULTADO[v.respuesta.resultado] ?? { label: v.respuesta.resultado, tono: "neutro" as const };
    return <Chip tono={r.tono}>{r.label}</Chip>;
  }
  return <Chip>{v.enviadaEn ? "Enviada, sin respuesta" : "Sin enviar"}</Chip>;
}

export const resumen: ResumenSeccion = (exp) => {
  const vs = versiones(exp.eventos);
  if (vs.length === 0) return null;
  const a = autorizado(exp.eventos);
  return `${numero(vs.length)} ${vs.length === 1 ? "versión" : "versiones"} · autorizado $${numero(Math.round(a.subtotal))} sin IVA`;
};

function Version({ v }: { v: VersionPresupuesto }) {
  const c = v.carga;
  return (
    <article className={s.version}>
      <header className={s.versionHead}>
        <b>{c.version === 1 ? "Presupuesto" : `Adenda ${c.version - 1}`}</b>
        <Folio folio={c.folio} tipo="presupuesto" />
        <span className={s.meta}>versión {c.version} · {fh(v.evento.en)} · vigente hasta {dia(c.vigenciaHasta)}</span>
        <ChipVersion v={v} />
      </header>
      {c.motivo && <p className={s.texto}>Motivo: {c.motivo}</p>}
      <Tabla
        encabezados={["Partida", "Concepto", "Horas / cant.", "Tarifa / precio", "Importe"]}
        derecha={[2, 3, 4]}
        pie={
          <>
            <tr><td colSpan={4}>Subtotal</td><td className={s.der}><Monto valor={v.totales.subtotal} escala="tabla" /></td></tr>
            <tr><td colSpan={4}>IVA</td><td className={s.der}><Monto valor={v.totales.iva} escala="tabla" /></td></tr>
            <tr><td colSpan={4}>Total</td><td className={s.der}><Monto valor={v.totales.total} escala="tabla" /></td></tr>
          </>
        }
      >
        {c.servicios.map((x, i) => (
          <tr key={`s-${i}`}>
            <td>Servicio</td>
            <td>{x.concepto}{x.clave && <span className={s.meta}> · {x.clave}</span>}</td>
            <td className={s.der}>{numero(x.horas)} h</td>
            <td className={s.der}><Monto valor={x.tarifa} escala="tabla" /></td>
            <td className={s.der}><Monto valor={x.horas * x.tarifa} escala="tabla" /></td>
          </tr>
        ))}
        {c.refacciones.map((x, i) => (
          <tr key={`r-${i}`}>
            <td>Refacción</td>
            <td>{x.concepto}{x.clave && <span className={s.meta}> · {x.clave}</span>}</td>
            <td className={s.der}>{numero(x.cantidad)}</td>
            <td className={s.der}><Monto valor={x.precio} escala="tabla" /></td>
            <td className={s.der}><Monto valor={x.cantidad * x.precio} escala="tabla" /></td>
          </tr>
        ))}
      </Tabla>
    </article>
  );
}

/** Documento versionado: la versión 1 es el presupuesto, las siguientes adendas. */
export default function Presupuesto({ exp, abierta }: PropsSeccion) {
  const [emitiendo, setEmitiendo] = useState(false);
  const registrar = useRegistrarEvento();
  const vs = versiones(exp.eventos);
  const a = autorizado(exp.eventos);

  return (
    <div className={s.bloques}>
      {vs.length === 0 ? (
        <Pendiente>Aún no se emite el presupuesto. Sus partidas salen de los hallazgos del diagnóstico.</Pendiente>
      ) : (
        <>
          {vs.map((v) => (
            <Version key={v.evento.id} v={v} />
          ))}
          <dl className={s.totales}>
            <div>
              <dt>Total vigente (versiones autorizadas)</dt>
              <dd><Monto valor={a.subtotal} escala="md" /> <span className={s.meta}>sin IVA</span></dd>
            </div>
          </dl>
        </>
      )}

      {abierta && (
        <Acciones>
          <Button variante="primario" onClick={() => { registrar.reset(); setEmitiendo(true); }}>
            {vs.length === 0 ? "Emitir presupuesto" : "Emitir adenda"}
          </Button>
        </Acciones>
      )}

      <FormPresupuesto
        abierto={emitiendo}
        eventos={exp.eventos}
        tallerId={exp.cabecera.taller.id}
        guardando={registrar.isPending}
        error={registrar.error?.message ?? null}
        onCerrar={() => setEmitiendo(false)}
        onEmitir={(tipo, carga) =>
          registrar.mutate(
            { osId: exp.cabecera.folio, evento: tipo === "adenda_emitida" ? { tipo, carga } : { tipo, carga } },
            { onSuccess: () => setEmitiendo(false) }
          )
        }
      />
    </div>
  );
}

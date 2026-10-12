import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { eventosDe, type CargaOC } from "@/domain/bitacora";
import { DIAS_BACKORDER, ESTADO_OC } from "@/domain/compras";
import { dias as fmtDias } from "@/domain/format";
import { tramosPorEstado, type TramoEstadoOS } from "@/domain/tiempos";
import type { EstadoOS } from "@/domain/estados";
import { Pendiente, Subtitulo, Tabla, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

function ordenesCompra(exp: PropsSeccion["exp"]): CargaOC[] {
  const porFolio = new Map<string, CargaOC>();
  for (const e of eventosDe(exp.eventos, "oc_vinculada").sort((a, b) => a.en.localeCompare(b.en))) porFolio.set(e.carga.folio, e.carga);
  return [...porFolio.values()];
}

const tramos = (exp: PropsSeccion["exp"], ahora: string, estado: EstadoOS) =>
  tramosPorEstado(exp.eventos, ahora).filter((t) => t.estado === estado);

export const resumen: ResumenSeccion = (exp, ahora) => {
  const oc = ordenesCompra(exp);
  if (oc.length === 0) return null;
  const dir = tramos(exp, ahora, "autorizacion_oc").reduce((a, t) => a + t.dias, 0);
  const pago = tramos(exp, ahora, "en_proceso_pago").reduce((a, t) => a + t.dias, 0);
  return `${oc.length} O.C. · Dirección ${fmtDias(dir)} d · pago ${fmtDias(pago)} d`;
};

function Esperas({ titulo, lista }: { titulo: string; lista: TramoEstadoOS[] }) {
  if (lista.length === 0) return null;
  return (
    <div>
      <Subtitulo>{titulo}</Subtitulo>
      <Tabla encabezados={["Desde", "Hasta", "Movió", "Días"]} derecha={[3]}>
        {lista.map((t) => (
          <tr key={t.desde}>
            <td className={s.cifra}>{fh(t.desde)}</td>
            <td className={s.cifra}>{t.hasta ? fh(t.hasta) : <span className={s.meta}>sigue abierto</span>}</td>
            <td>{t.usuarioNombre}</td>
            <td className={`${s.der} ${s.espera}`}>{fmtDias(t.dias)} d</td>
          </tr>
        ))}
      </Tabla>
    </div>
  );
}

/** Solo lectura: las O.C. viven en Compras. Aquí se ve cuánto esperó la O.S. por ellas. */
export default function Compra({ exp, ahora }: PropsSeccion) {
  const oc = ordenesCompra(exp);
  const backorder = tramos(exp, ahora, "espera_refaccion");
  const diasBackorder = backorder.reduce((a, t) => a + t.dias, 0);

  return (
    <div className={s.bloques}>
      {oc.length === 0 ? (
        <Pendiente>Compras todavía no vincula una orden de compra a esta O.S.</Pendiente>
      ) : (
        <Tabla encabezados={["O.C.", "Proveedor", "Estado", "Monto"]} derecha={[3]}>
          {oc.map((o) => (
            <tr key={o.folio}>
              <td><Folio folio={o.folio} tipo="ordenCompra" /></td>
              <td>{o.proveedor}</td>
              <td>{ESTADO_OC[o.estado].label}</td>
              <td className={s.der}><Monto valor={o.monto} escala="tabla" /></td>
            </tr>
          ))}
        </Tabla>
      )}

      <Esperas titulo="Autorización de Dirección · punto de espera #2" lista={tramos(exp, ahora, "autorizacion_oc")} />
      <Esperas titulo="Pago · punto de espera #3" lista={tramos(exp, ahora, "en_proceso_pago")} />

      {backorder.length > 0 && (
        <div>
          <Subtitulo>Backorder</Subtitulo>
          <p className={s.texto}>
            <b className={diasBackorder > DIAS_BACKORDER ? s.malo : s.espera}>{fmtDias(diasBackorder)} d</b> en espera de refacción, contra{" "}
            <b className={s.cifra}>{DIAS_BACKORDER} d</b> de política.
            {diasBackorder > DIAS_BACKORDER && " Pasó del límite: la O.C. se puede cerrar con lo recibido."}
          </p>
        </div>
      )}
    </div>
  );
}

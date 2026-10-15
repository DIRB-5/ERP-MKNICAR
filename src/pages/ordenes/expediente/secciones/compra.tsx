import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { eventosDe, type CargaOC } from "@/domain/bitacora";
import { DIAS_BACKORDER, ESTADO_OC } from "@/domain/compras";
import { dias as fmtDias } from "@/domain/format";
import { PUNTO_ESPERA, desgloseEspera } from "@/domain/tiempos";
import { Pendiente, Subtitulo, Tabla, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

function ordenesCompra(exp: PropsSeccion["exp"]): CargaOC[] {
  const porFolio = new Map<string, CargaOC>();
  for (const e of eventosDe(exp.eventos, "oc_vinculada").sort((a, b) => a.en.localeCompare(b.en))) porFolio.set(e.carga.folio, e.carga);
  return [...porFolio.values()];
}

export const resumen: ResumenSeccion = (exp, ahora) => {
  const oc = ordenesCompra(exp);
  if (oc.length === 0) return null;
  const d = desgloseEspera(exp.eventos, ahora);
  return `${oc.length} O.C. · Dirección ${fmtDias(d.direccion)} d · Tesorería ${fmtDias(d.tesoreria)} d · proveedor ${fmtDias(d.proveedor)} d`;
};

/**
 * Solo lectura: las O.C. viven en Compras. La O.S. se queda en "Autorizado a
 * compra" mientras sus O.C. esperan a Dirección, a Tesorería y al proveedor;
 * esas esperas se miden aquí, desde los estados de cada O.C.
 */
export default function Compra({ exp, ahora }: PropsSeccion) {
  const oc = ordenesCompra(exp);
  const d = desgloseEspera(exp.eventos, ahora);

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

      <div>
        <Subtitulo>Esperas de la compra</Subtitulo>
        <Tabla encabezados={["Punto de espera", "Días"]} derecha={[1]}>
          {(["direccion", "tesoreria", "proveedor"] as const).map((p) => (
            <tr key={p}>
              <td>{PUNTO_ESPERA[p]}</td>
              <td className={`${s.der} ${d[p] > 0 ? s.espera : ""}`}>{fmtDias(d[p])} d</td>
            </tr>
          ))}
        </Tabla>
      </div>

      {d.proveedor > 0 && (
        <p className={s.texto}>
          <b className={d.proveedor > DIAS_BACKORDER ? s.malo : s.espera}>{fmtDias(d.proveedor)} d</b> esperando refacción del proveedor, contra{" "}
          <b className={s.cifra}>{DIAS_BACKORDER} d</b> de política.
          {d.proveedor > DIAS_BACKORDER && " Pasó del límite: la O.C. se puede cerrar con lo recibido."}
        </p>
      )}
    </div>
  );
}

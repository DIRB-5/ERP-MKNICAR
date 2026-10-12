import { Link } from "react-router-dom";
import { Folio } from "@/components/Folio/Folio";
import { eventosDe, type CargaRequisicion } from "@/domain/bitacora";
import { ESTADO_REQUISICION } from "@/domain/compras";
import { Pendiente, Tabla, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

/** Estado más reciente de cada requisición de la O.S. */
function requisiciones(exp: PropsSeccion["exp"]): (CargaRequisicion & { desde: string })[] {
  const porFolio = new Map<string, CargaRequisicion & { desde: string }>();
  const eventos = [...eventosDe(exp.eventos, "requisicion_generada"), ...eventosDe(exp.eventos, "requisicion_actualizada")].sort((a, b) =>
    a.en.localeCompare(b.en)
  );
  for (const e of eventos) porFolio.set(e.carga.folio, { ...e.carga, desde: porFolio.get(e.carga.folio)?.desde ?? e.en });
  return [...porFolio.values()];
}

export const resumen: ResumenSeccion = (exp) => {
  const r = requisiciones(exp);
  return r.length ? r.map((x) => `${x.folio} · ${ESTADO_REQUISICION[x.estado].label}`).join(" · ") : null;
};

/** Solo lectura: el trabajo de abastecimiento vive en Compras. */
export default function Abastecimiento({ exp }: PropsSeccion) {
  const lista = requisiciones(exp);
  if (lista.length === 0) {
    return <Pendiente>Compras todavía no registra la requisición de esta O.S.</Pendiente>;
  }
  return (
    <Tabla encabezados={["Requisición", "Estado", "Comparativo", "Generada"]}>
      {lista.map((r) => (
        <tr key={r.folio}>
          <td><Folio folio={r.folio} tipo="requisicion" /></td>
          <td>{ESTADO_REQUISICION[r.estado].label}</td>
          <td>
            {r.comparativoFolio ? (
              <Link to={`/requisiciones/${encodeURIComponent(r.folio)}`} className={s.cifra}>{r.comparativoFolio}</Link>
            ) : (
              <span className={s.meta}>Aún sin comparativo</span>
            )}
          </td>
          <td className={s.cifra}>{fh(r.desde)}</td>
        </tr>
      ))}
    </Tabla>
  );
}

import { Link } from "react-router-dom";
import { Monto } from "@/components/Monto/Monto";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { fecha, numero, puntos } from "@/domain/format";
import type { ExpedienteOS } from "@/domain/tipos";
import { fechaLocal } from "@/app/fechas";
import { trazabilidad } from "./calculos";
import s from "./Expediente.module.css";

/** Costo contra ingreso de la O.S., con la mano de obra a costo real y no a precio de venta. */
export function PestanaTrazabilidad({ expediente }: { expediente: ExpedienteOS }) {
  const t = trazabilidad(expediente);
  const mo = expediente.manoObra;
  const horas = mo.reduce((a, m) => ({ est: a.est + m.horasEstandar, real: a.real + m.horasReales }), { est: 0, real: 0 });

  if (!t) {
    return (
      <EmptyState titulo="Sin datos para la trazabilidad">
        Aparece cuando la O.S. tiene presupuesto: compara su ingreso con el costo real de refacciones y mano de obra.
      </EmptyState>
    );
  }

  return (
    <div className={s.pestana}>
      <div className={s.ecuacion} aria-label="Margen real de la O.S.">
        <div><span className={s.meta}>Ingreso</span><Monto valor={t.ingreso} escala="sm" /></div>
        <span aria-hidden="true">−</span>
        <div>
          <span className={s.meta}>Refacciones{t.refaccionesReales ? "" : " (estimado)"}</span>
          <Monto valor={t.costoRefacciones} escala="sm" />
        </div>
        <span aria-hidden="true">−</span>
        <div><span className={s.meta}>Mano de obra</span><Monto valor={t.costoManoObra} escala="sm" /></div>
        <span aria-hidden="true">=</span>
        <div className={s.margen}>
          <span className={s.meta}>Margen real</span>
          <span className={t.margen < 0 ? s.malo : undefined}>
            <Monto valor={t.margen} escala="sm" /> {t.margenPct != null && `· ${t.margenPct.toFixed(1)}%`}
          </span>
        </div>
      </div>
      {t.margenPresupuestadoPct != null && t.margenPct != null && (
        <p className={s.nota}>
          Margen presupuestado {t.margenPresupuestadoPct.toFixed(1)}% · desviación{" "}
          {puntos(t.margenPct - t.margenPresupuestadoPct)}. El presupuesto no incluye la mano de obra a costo; aquí sí.
        </p>
      )}

      <h3 className={s.subtitulo}>Mano de obra</h3>
      {mo.length === 0 ? (
        <p className={s.nota}>Ningún técnico ha registrado horas en esta O.S.</p>
      ) : (
        <div className={`${s.scroll} scroll-x`}>
          <table className={s.tabla}>
            <thead>
              <tr>
                <th scope="col">Técnico</th>
                <th scope="col" className={s.der}>Estándar</th>
                <th scope="col" className={s.der}>Reales</th>
                <th scope="col" className={s.der}>Costo/hr</th>
                <th scope="col" className={s.der}>Total</th>
              </tr>
            </thead>
            <tbody>
              {mo.map((m) => (
                <tr key={`${m.tecnicoId}-${m.fecha}`}>
                  <td>
                    <Link to={`/personal/tecnicos/${encodeURIComponent(m.tecnicoId)}`} className={s.fuerte}>
                      {m.tecnico}
                    </Link>
                    <span className={s.meta}>{m.puesto} · {fecha(fechaLocal(m.fecha))}</span>
                  </td>
                  <td className={s.der}>{m.horasEstandar.toFixed(1)}</td>
                  <td className={`${s.der} ${m.horasReales > m.horasEstandar ? s.malo : ""}`}>{m.horasReales.toFixed(1)}</td>
                  <td className={s.der}><Monto valor={m.costoHora} /></td>
                  <td className={s.der}><Monto valor={m.horasReales * m.costoHora} /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className={s.fuerte}>Total</td>
                <td className={s.der}>{horas.est.toFixed(1)}</td>
                <td className={s.der}>{horas.real.toFixed(1)}</td>
                <td />
                <td className={s.der}><Monto valor={t.costoManoObra} /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      <dl className={s.utilidad}>
        <dt>Mano de obra facturada</dt>
        <dd><Monto valor={t.manoObraFacturada} /></dd>
        <dt>Costo real de mano de obra</dt>
        <dd><Monto valor={t.costoManoObra} /></dd>
        <dt>Margen de mano de obra</dt>
        <dd>
          <Monto valor={t.manoObraFacturada - t.costoManoObra} />
          {t.manoObraFacturada > 0 && ` · ${(((t.manoObraFacturada - t.costoManoObra) / t.manoObraFacturada) * 100).toFixed(1)}%`}
        </dd>
        <dt>Horas sobre el estándar</dt>
        <dd className={horas.real > horas.est ? s.malo : undefined}>{numero(Math.max(0, horas.real - horas.est))} hrs</dd>
      </dl>
    </div>
  );
}

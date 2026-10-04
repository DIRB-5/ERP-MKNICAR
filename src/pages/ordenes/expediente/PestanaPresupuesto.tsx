import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { fecha, numero } from "@/domain/format";
import type { ConceptoPresupuesto, PresupuestoOS } from "@/domain/tipos";
import { fechaLocal } from "@/app/fechas";
import { TASA_IVA } from "@/app/sat";
import { importe, totales } from "./calculos";
import s from "./Expediente.module.css";

function Grupo({ titulo, conceptos }: { titulo: string; conceptos: ConceptoPresupuesto[] }) {
  if (conceptos.length === 0) return null;
  return (
    <>
      <tr className={s.grupo}>
        <td colSpan={8}>{titulo}</td>
      </tr>
      {conceptos.map((c) => (
        <tr key={c.id}>
          <td className={s.der}>{numero(c.cantidad)}</td>
          <td><Folio folio={c.clave} /></td>
          <td className={s.fuerte}>{c.descripcion}</td>
          <td>{c.unidad}</td>
          <td className={s.der}>{c.tipo === "refaccion" ? <Monto valor={c.costo} /> : "—"}</td>
          <td className={s.der}><Monto valor={c.precioUnitario} /></td>
          <td className={s.der}>{c.descuento > 0 ? <Monto valor={c.descuento} /> : "—"}</td>
          <td className={s.der}><Monto valor={importe(c)} /></td>
        </tr>
      ))}
    </>
  );
}

export function PestanaPresupuesto({ presupuesto }: { presupuesto: PresupuestoOS | null }) {
  const t = totales(presupuesto);
  if (!presupuesto || !t) {
    return (
      <EmptyState titulo="Todavía no hay presupuesto">
        Se arma después del diagnóstico y la cotización de refacciones.
      </EmptyState>
    );
  }
  return (
    <div className={s.pestana}>
      <div className={s.cabecera}>
        <div>
          Presupuesto <Folio folio={presupuesto.folio} tipo="presupuesto" />
          <span className={s.meta}>
            Versión {numero(presupuesto.version)} · {fecha(fechaLocal(presupuesto.fecha), { anio: true })}
          </span>
        </div>
      </div>

      <div className={`${s.scroll} scroll-x`}>
        <table className={s.tabla}>
          <thead>
            <tr>
              <th scope="col" className={s.der}>Cant.</th>
              <th scope="col">Clave</th>
              <th scope="col">Descripción</th>
              <th scope="col">Unidad</th>
              <th scope="col" className={s.der}>Costo</th>
              <th scope="col" className={s.der}>P. unitario</th>
              <th scope="col" className={s.der}>Descuento</th>
              <th scope="col" className={s.der}>Importe</th>
            </tr>
          </thead>
          <tbody>
            <Grupo titulo="Refacciones" conceptos={presupuesto.conceptos.filter((c) => c.tipo === "refaccion")} />
            <Grupo titulo="Mano de obra" conceptos={presupuesto.conceptos.filter((c) => c.tipo === "mano_obra")} />
          </tbody>
        </table>
      </div>

      <div className={s.resumen}>
        <dl className={s.utilidad}>
          <dt>Costo de refacciones</dt>
          <dd><Monto valor={t.costo} /></dd>
          <dt>Utilidad</dt>
          <dd className={t.utilidad < 0 ? s.malo : undefined}><Monto valor={t.utilidad} /></dd>
        </dl>
        <dl className={s.totales}>
          <dt>Refacciones</dt>
          <dd><Monto valor={t.refacciones + presupuesto.conceptos.filter((c) => c.tipo === "refaccion").reduce((a, c) => a + c.descuento, 0)} /></dd>
          <dt>Mano de obra</dt>
          <dd><Monto valor={t.manoObra + presupuesto.conceptos.filter((c) => c.tipo === "mano_obra").reduce((a, c) => a + c.descuento, 0)} /></dd>
          <dt>Descuentos</dt>
          <dd>{t.descuentos > 0 ? <>−<Monto valor={t.descuentos} /></> : <Monto valor={0} />}</dd>
          <dt>Subtotal</dt>
          <dd><Monto valor={t.subtotal} /></dd>
          <dt>IVA {Math.round(TASA_IVA * 100)}%</dt>
          <dd><Monto valor={t.iva} /></dd>
          <dt className={s.fuerte}>Total</dt>
          <dd className={s.fuerte}><Monto valor={t.total} escala="sm" /></dd>
        </dl>
      </div>
    </div>
  );
}

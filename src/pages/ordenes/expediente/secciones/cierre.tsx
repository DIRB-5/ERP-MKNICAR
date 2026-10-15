import { Monto } from "@/components/Monto/Monto";
import { dias as fmtDias, numero } from "@/domain/format";
import { PUNTO_ESPERA, desgloseEspera, diasEnEspera, diasTotales, porcentajeEspera } from "@/domain/tiempos";
import { autorizado, costoReal, desviacion } from "../calculos";
import { Subtitulo, Tabla, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

export const resumen: ResumenSeccion = (exp, ahora) =>
  `${Math.round(porcentajeEspera(exp.eventos, ahora))}% del tiempo en espera · ${fmtDias(diasTotales(exp.eventos, ahora))} d en total`;

/** Horas a un decimal: una autorización parcial reparte horas en fracciones. */
const redondear = (h: number) => Math.round(h * 10) / 10;

function Desv({ real, base }: { real: number; base: number }) {
  const d = desviacion(real, base);
  return d == null ? <>—</> : <Monto valor={d} formato="porcentaje" sentido="desviacion" escala="tabla" />;
}

/**
 * El argumento del sistema: cuánto se presupuestó contra cuánto costó, y
 * cuánto de la vida de la O.S. se fue esperando a alguien.
 */
export default function Cierre({ exp, ahora }: PropsSeccion) {
  const a = autorizado(exp.eventos);
  const c = costoReal(exp.eventos);
  const total = diasTotales(exp.eventos, ahora);
  const espera = diasEnEspera(exp.eventos, ahora);
  const pct = porcentajeEspera(exp.eventos, ahora);
  const puntos = desgloseEspera(exp.eventos, ahora);

  return (
    <div className={s.bloques}>
      <div className={s.cierreHero}>
        <div>
          <span className={s.heroValor}>{Math.round(pct)}%</span>
          <span className={s.heroEtiqueta}>de la vida de esta O.S. se fue esperando</span>
        </div>
        <dl className={s.totales}>
          <div><dt>Días totales</dt><dd className={s.cifra}>{fmtDias(total)} d</dd></div>
          <div><dt>Días productivos</dt><dd className={s.cifra}>{fmtDias(total - espera)} d</dd></div>
          <div><dt>Días en espera</dt><dd className={`${s.cifra} ${s.espera}`}>{fmtDias(espera)} d</dd></div>
        </dl>
      </div>

      <div>
        <Subtitulo>Dónde se esperó</Subtitulo>
        <Tabla encabezados={["Punto de espera", "Días"]} derecha={[1]}>
          {(Object.keys(puntos) as (keyof typeof puntos)[]).map((p) => (
            <tr key={p}>
              <td>{PUNTO_ESPERA[p]}</td>
              <td className={`${s.der} ${puntos[p] > 0 ? s.espera : ""}`}>{fmtDias(puntos[p])} d</td>
            </tr>
          ))}
        </Tabla>
      </div>

      <div>
        <Subtitulo>Presupuestado contra real</Subtitulo>
        <Tabla encabezados={["Concepto", "Presupuestado", "Real", "Desviación"]} derecha={[1, 2, 3]}>
          <tr>
            <td>Mano de obra · horas</td>
            <td className={s.der}>{numero(redondear(a.horas))} h</td>
            <td className={s.der}>{numero(redondear(c.horas))} h</td>
            <td className={s.der}><Desv real={c.horas} base={a.horas} /></td>
          </tr>
          <tr>
            <td>Mano de obra · importe</td>
            <td className={s.der}><Monto valor={a.servicios} escala="tabla" /></td>
            <td className={s.der}><Monto valor={c.manoObra} escala="tabla" /></td>
            <td className={s.der}><Desv real={c.manoObra} base={a.servicios} /></td>
          </tr>
          <tr>
            <td>Refacciones</td>
            <td className={s.der}><Monto valor={a.refacciones} escala="tabla" /></td>
            <td className={s.der}><Monto valor={c.refacciones} escala="tabla" /></td>
            <td className={s.der}><Desv real={c.refacciones} base={a.refacciones} /></td>
          </tr>
          <tr className={s.filaTotal}>
            <td>Total</td>
            <td className={s.der}><Monto valor={a.subtotal} escala="tabla" /></td>
            <td className={s.der}><Monto valor={c.total} escala="tabla" /></td>
            <td className={s.der}><Desv real={c.total} base={a.subtotal} /></td>
          </tr>
        </Tabla>
        <p className={s.meta}>Presupuestado: lo autorizado por el cliente, sin IVA. Real: el costo registrado de mano de obra y refacciones.</p>
      </div>
    </div>
  );
}

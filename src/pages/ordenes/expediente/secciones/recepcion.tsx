import { Chip } from "@/components/Chip/Chip";
import { eventosDe, vigente } from "@/domain/bitacora";
import { ELEMENTOS_INVENTARIO } from "@/domain/tipos";
import { numero } from "@/domain/format";
import { FOTOS_REQUERIDAS, INVENTARIO } from "@/pages/ordenes/ingreso/etiquetas";
import { Datos, Pendiente, Subtitulo, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

const recepcionDe = (exp: PropsSeccion["exp"]) => {
  const e = eventosDe(exp.eventos, "recepcion_registrada").at(-1);
  return e ? vigente(e, exp.eventos).carga : null;
};

export const resumen: ResumenSeccion = (exp) => {
  const r = recepcionDe(exp);
  return r ? `${numero(r.kilometraje)} km · combustible ${r.nivelCombustible}/8 · entregó ${r.entregaNombre}` : null;
};

/** La condición en que llegó la unidad, en palabras del cliente: sin interpretar. */
export default function Recepcion({ exp }: PropsSeccion) {
  const r = recepcionDe(exp);
  if (!r) return <Pendiente>La recepción se registra con el formulario de ingreso de la unidad.</Pendiente>;

  const presentes = ELEMENTOS_INVENTARIO.filter((k) => r.inventario[k]);
  const faltantes = ELEMENTOS_INVENTARIO.filter((k) => !r.inventario[k]);

  return (
    <div className={s.bloques}>
      <Datos
        filas={[
          ["Llegó", fh(r.fechaHora)],
          ["Kilometraje de entrada", <span className={s.cifra}>{numero(r.kilometraje)} km</span>],
          ["Combustible", <span className={s.cifra}>{r.nivelCombustible}/8 de tanque</span>],
          ["Recibió", r.recibeNombre],
          ["Entregó", r.entregaNombre],
          ["Autoriza diagnóstico", r.autorizaDiagnostico ? "Sí" : "No"],
        ]}
      />

      <div>
        <Subtitulo>Motivo reportado por el cliente</Subtitulo>
        <ol className={s.motivos}>
          {exp.cabecera.motivosReportados.map((m, i) => (
            <li key={`${i}-${m}`}>“{m}”</li>
          ))}
        </ol>
      </div>

      <div>
        <Subtitulo>Inventario de la unidad</Subtitulo>
        <ul className={s.lista}>
          {presentes.map((k) => (
            <li key={k}><span aria-hidden="true">✓</span> {INVENTARIO[k]}</li>
          ))}
          {faltantes.map((k) => (
            <li key={k} className={s.ausente}><span aria-hidden="true">✗</span> {INVENTARIO[k]} <span className={s.meta}>(no llegó)</span></li>
          ))}
        </ul>
        {r.inventarioExtra && <p className={s.texto}>Además: {r.inventarioExtra}</p>}
      </div>

      <Datos filas={[["Pertenencias a bordo", r.objetosPersonales || "Ninguna declarada"]]} />

      {r.danosPrevios.length > 0 && (
        <div>
          <Subtitulo>Daños previos</Subtitulo>
          <ul className={s.lista}>
            {r.danosPrevios.map((d, i) => (
              <li key={`${i}-${d.zona}`}>
                <b>{d.zona}</b>: {d.descripcion} <Chip tono={d.severidad === "grave" ? "critico" : "neutro"}>{d.severidad}</Chip>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <Subtitulo>Fotografías</Subtitulo>
        <ul className={s.fotos}>
          {FOTOS_REQUERIDAS.map((vista) => {
            const foto = r.fotos.find((f) => f.etiqueta === vista);
            return (
              <li key={vista}>
                <span className={s.meta}>{vista}</span>
                {foto?.archivo.url ? (
                  <a href={foto.archivo.url} target="_blank" rel="noreferrer">Ver foto</a>
                ) : foto ? (
                  <span>{foto.archivo.nombre}</span>
                ) : (
                  <span className={s.ausente}>Sin foto</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <Datos filas={[["Firma de quien entrega", r.firmaEntrega ? "Firmada" : "Pendiente: el capturador de firma llega en una fase siguiente"]]} />
    </div>
  );
}

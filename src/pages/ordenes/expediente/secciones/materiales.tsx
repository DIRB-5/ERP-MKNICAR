import { eventosDe } from "@/domain/bitacora";
import { numero } from "@/domain/format";
import { Pendiente, Subtitulo, Tabla, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import s from "../Expediente.module.css";

const pendientesDe = (exp: PropsSeccion["exp"]) => eventosDe(exp.eventos, "material_recibido").at(-1)?.carga.pendientes ?? [];

export const resumen: ResumenSeccion = (exp) => {
  const recibidas = eventosDe(exp.eventos, "material_recibido").flatMap((e) => e.carga.partidas).length;
  const faltan = pendientesDe(exp).length;
  if (recibidas === 0) return null;
  return `${numero(recibidas)} ${recibidas === 1 ? "partida recibida" : "partidas recibidas"}${faltan ? ` · ${numero(faltan)} por recibir` : " · completo"}`;
};

/** Solo lectura: la entrada la registra Almacén y genera su capa de costo PEPS. */
export default function Materiales({ exp }: PropsSeccion) {
  const entradas = eventosDe(exp.eventos, "material_recibido");
  const pendientes = pendientesDe(exp);

  if (entradas.length === 0) return <Pendiente>Almacén todavía no registra la entrada de material para esta O.S.</Pendiente>;

  return (
    <div className={s.bloques}>
      <Tabla encabezados={["Recibido", "Partida", "Cantidad", "Almacén", "Capa de costo"]} derecha={[2]}>
        {entradas.flatMap((e) =>
          e.carga.partidas.map((p, i) => (
            <tr key={`${e.id}-${i}`}>
              <td className={s.cifra}>{fh(e.en)}</td>
              <td>{p.descripcion}</td>
              <td className={s.der}>{numero(p.cantidad)}</td>
              <td>{p.almacen}</td>
              {/* La capa se enlaza cuando exista la pantalla de Almacén. */}
              <td className={s.cifra}>{p.capaCostoId}</td>
            </tr>
          ))
        )}
      </Tabla>

      <div>
        <Subtitulo>Pendientes por recibir · {numero(pendientes.length)}</Subtitulo>
        {pendientes.length === 0 ? (
          <p className={s.texto}>Todo lo pedido ya llegó.</p>
        ) : (
          <Tabla encabezados={["Partida", "Cantidad"]} derecha={[1]}>
            {pendientes.map((p, i) => (
              <tr key={`${i}-${p.descripcion}`}>
                <td>{p.descripcion}</td>
                <td className={s.der}>{numero(p.cantidad)}</td>
              </tr>
            ))}
          </Tabla>
        )}
      </div>
    </div>
  );
}

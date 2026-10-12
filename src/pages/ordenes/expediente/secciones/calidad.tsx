import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Textarea } from "@/components/Campo/Campo";
import { eventosDe, vigente } from "@/domain/bitacora";
import { PUNTOS_CALIDAD } from "@/domain/expediente";
import { useRegistrarEvento } from "@/data/consultas";
import { usuarioActual } from "@/app/sesion";
import { Acciones, Datos, Pendiente, fh, type PropsSeccion, type ResumenSeccion } from "../comun";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

export const resumen: ResumenSeccion = (exp) => {
  const l = eventosDe(exp.eventos, "calidad_liberada").at(-1);
  return l ? `Liberada por ${l.carga.liberoNombre} · ${fh(l.en)}` : null;
};

/** Por qué el usuario de la sesión no puede liberar, o null si puede. */
function impedimento(exp: PropsSeccion["exp"]): string | null {
  const yo = usuarioActual();
  if (!yo.id) return "Sin sesión iniciada no se puede saber quién libera.";
  const reparo = eventosDe(exp.eventos, "mano_obra_cargada").some((m) => m.carga.tecnicoId === yo.id);
  return reparo ? "Tú registraste trabajo en esta reparación: la liberación la hace otra persona." : null;
}

export default function Calidad({ exp, abierta }: PropsSeccion) {
  const [liberando, setLiberando] = useState(false);
  const liberaciones = eventosDe(exp.eventos, "calidad_liberada").map((e) => vigente(e, exp.eventos));
  const ultima = liberaciones.at(-1);
  const razon = impedimento(exp);

  return (
    <div className={s.bloques}>
      {!ultima ? (
        <Pendiente>Falta la revisión de salida. La libera alguien distinto de quien reparó.</Pendiente>
      ) : (
        <>
          <ul className={s.lista}>
            {ultima.carga.puntos.map((p) => (
              <li key={p.punto} className={p.cumple ? undefined : s.ausente}>
                <span aria-hidden="true">{p.cumple ? "✓" : "✗"}</span> {p.punto}
              </li>
            ))}
          </ul>
          <Datos
            filas={[
              ["Liberó", ultima.carga.liberoNombre],
              ["Cuándo", fh(ultima.en)],
              ["Observaciones", ultima.carga.observaciones || "Sin observaciones"],
            ]}
          />
        </>
      )}

      {abierta && (
        <Acciones>
          {/* Deshabilitado con la razón a la vista: oculto confundiría. */}
          {razon && <span className={s.razon}>{razon}</span>}
          <Button variante="primario" disabled={razon != null} onClick={() => setLiberando(true)}>
            Liberar unidad
          </Button>
        </Acciones>
      )}

      <Liberar exp={exp} abierto={liberando} onCerrar={() => setLiberando(false)} />
    </div>
  );
}

function Liberar({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [observaciones, setObservaciones] = useState("");
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setMarcados(new Set());
    setObservaciones("");
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const completos = PUNTOS_CALIDAD.every((p) => marcados.has(p));

  const guardar = () => {
    setIntentado(true);
    if (!completos) return;
    const yo = usuarioActual();
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: {
          tipo: "calidad_liberada",
          carga: {
            puntos: PUNTOS_CALIDAD.map((punto) => ({ punto, cumple: marcados.has(punto) })),
            liberoId: yo.id,
            liberoNombre: yo.nombre,
            observaciones: observaciones.trim(),
          },
        },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Liberación de calidad"
      subtitulo="Solo se libera con todos los puntos verificados."
      onCerrar={onCerrar}
      pie={
        <>
          {intentado && !completos && <span className={f.resumenErrores} role="alert">Falta verificar puntos de la lista.</span>}
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Liberar</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Lista de verificación de salida</legend>
        {PUNTOS_CALIDAD.map((p) => (
          <label key={p} className={f.casilla}>
            <input
              type="checkbox"
              checked={marcados.has(p)}
              onChange={(x) => {
                const n = new Set(marcados);
                if (x.target.checked) n.add(p);
                else n.delete(p);
                setMarcados(n);
              }}
            />
            {p}
          </label>
        ))}
      </fieldset>
      <Campo etiqueta="Observaciones">
        {(p) => <Textarea {...p} rows={3} value={observaciones} onChange={(x) => setObservaciones(x.target.value)} />}
      </Campo>
    </PanelLateral>
  );
}

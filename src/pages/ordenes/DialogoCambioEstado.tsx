import { useState } from "react";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { Textarea } from "@/components/Campo/Campo";
import { Aviso } from "@/components/Aviso/Aviso";
import { AREA_LABEL } from "@/domain/areas";
import { ESTADO, type EstadoOS } from "@/domain/estados";
import { useCambiarEstado } from "@/data/consultas";
import { destinosDirectos, requiereMotivo } from "@/app/transiciones";
import s from "./DialogoCambioEstado.module.css";

export interface DialogoCambioEstadoProps {
  folio: string;
  estado: EstadoOS;
  /** Destino ya elegido al abrir, p. ej. desde un botón del detalle. */
  inicial?: EstadoOS;
  onCerrar: () => void;
}

/**
 * Cambio de estado de una O.S. Muestra solo los destinos que permite la
 * topología; si el backend niega la facultad, el error se ve aquí mismo.
 */
export function DialogoCambioEstado({ folio, estado, inicial, onCerrar }: DialogoCambioEstadoProps) {
  const opciones = destinosDirectos(estado);
  const [destino, setDestino] = useState<EstadoOS | undefined>(inicial ?? opciones[0]);
  const [motivo, setMotivo] = useState("");
  const [intentado, setIntentado] = useState(false);
  const cambiar = useCambiarEstado();

  const pideMotivo = destino != null && requiereMotivo(estado, destino);
  const faltaMotivo = pideMotivo && !motivo.trim();

  const confirmar = () => {
    setIntentado(true);
    if (!destino || faltaMotivo) return;
    cambiar.mutate(
      { folio, a: destino, comentario: motivo.trim() || null },
      { onSuccess: onCerrar }
    );
  };

  return (
    <Dialogo
      abierto
      titulo={`Cambiar estado de ${folio}`}
      confirmar={destino ? `Pasar a ${ESTADO[destino].label}` : "Cambiar"}
      cancelar="Cancelar"
      confirmando={cambiar.isPending}
      onConfirmar={confirmar}
      onCancelar={onCerrar}
    >
      <p>
        Estado actual: <b>{ESTADO[estado].label}</b> · {AREA_LABEL[ESTADO[estado].area]}
      </p>

      {opciones.length === 0 ? (
        <Aviso titulo="Esta O.S. ya no cambia de estado." />
      ) : (
        <fieldset className={s.opciones}>
          <legend className={s.leyenda}>Pasar a</legend>
          {opciones.map((d) => {
            const retorno = requiereMotivo(estado, d);
            return (
              <label key={d} className={`${s.opcion} ${destino === d ? s.elegida : ""}`}>
                <input type="radio" name={`destino-${folio}`} checked={destino === d} onChange={() => setDestino(d)} />
                <span>
                  <b>{ESTADO[d].label}</b>
                  <span className={s.meta}>
                    Responsable: {AREA_LABEL[ESTADO[d].area]}
                    {retorno ? " · pide motivo" : ""}
                  </span>
                </span>
              </label>
            );
          })}
        </fieldset>
      )}

      {pideMotivo && (
        <label className={s.motivo}>
          <span className={s.leyenda}>Motivo (obligatorio)</span>
          <Textarea
            value={motivo}
            onChange={(x) => setMotivo(x.target.value)}
            placeholder="Por qué no avanza: queda en el historial de la O.S."
            aria-invalid={intentado && faltaMotivo ? true : undefined}
          />
          {intentado && faltaMotivo && <span className={s.error}>Escribe el motivo del cambio.</span>}
        </label>
      )}

      {cambiar.error && <Aviso tono="critico" titulo={`No se pudo cambiar: ${cambiar.error.message}`} />}
    </Dialogo>
  );
}

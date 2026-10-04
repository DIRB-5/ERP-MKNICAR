import { useNavigate } from "react-router-dom";
import { Estado } from "@/components/Estado/Estado";
import { ESTADOS, ESTADO, type EstadoOS } from "@/domain/estados";
import { destinos, destinosDirectos, requiereFormulario, requiereMotivo } from "@/app/transiciones";
import s from "./EstadoEditable.module.css";

export interface EstadoEditableProps {
  folio: string;
  estado: EstadoOS;
  /** Abre la confirmación con el destino elegido. */
  onElegir: (destino: EstadoOS) => void;
}

/**
 * Selector del ciclo de la O.S.: muestra los 20 pasos en orden para que se vea
 * el ciclo completo, pero solo deja elegir los que permite la topología desde el
 * estado actual. La recepción se hace con su formulario, no desde aquí.
 */
export function SelectorEstado({
  folio,
  estado,
  onElegir,
  className,
  valor,
  id,
}: EstadoEditableProps & {
  className?: string;
  id?: string;
  /**
   * Con `valor` el selector solo elige: queda controlado y avisa cualquier
   * destino válido (incluida la recepción), y quien lo usa decide cuándo guardar.
   * Sin `valor`, elegir ya dispara la acción.
   */
  valor?: EstadoOS | "";
}) {
  const navigate = useNavigate();
  const directos = new Set(destinosDirectos(estado));
  // "Unidad recibida" sí es alcanzable desde Programada, pero con su formulario.
  const conFormulario = new Set(destinos(estado).filter(requiereFormulario));

  return (
    <select
      id={id}
      className={`${s.selector} ${className ?? ""}`}
      value={valor ?? ""}
      aria-label={`Cambiar estatus de ${folio}`}
      onChange={(e) => {
        const v = e.target.value as EstadoOS;
        if (valor !== undefined) onElegir(v);
        else if (conFormulario.has(v)) navigate(`/ordenes/recepcion/${encodeURIComponent(folio)}`);
        else if (directos.has(v)) onElegir(v);
      }}
    >
      <option value="">Cambiar a…</option>
      {ESTADOS.map((d) => {
        const actual = d === estado;
        const habilitado = directos.has(d) || conFormulario.has(d);
        const nota = actual
          ? " (actual)"
          : conFormulario.has(d)
            ? " · con formulario de recepción"
            : directos.has(d) && requiereMotivo(estado, d)
              ? " · pide motivo"
              : "";
        return (
          <option key={d} value={d} disabled={!habilitado}>
            {actual ? "● " : ""}
            {ESTADO[d].label}
            {nota}
          </option>
        );
      })}
    </select>
  );
}

/** Estado actual con su selector debajo, para las celdas de tabla. */
export function EstadoEditable(props: EstadoEditableProps) {
  return (
    <div className={s.celda}>
      <Estado estado={props.estado} />
      <SelectorEstado {...props} />
    </div>
  );
}

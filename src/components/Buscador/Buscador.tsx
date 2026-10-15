import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import styles from "./Buscador.module.css";

export interface OpcionBusqueda {
  id: string;
  etiqueta: string;
  detalle?: string;
}

export interface BuscadorProps {
  /** Viene de `Campo` para enlazar la etiqueta. */
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  placeholder?: string;
  /** Texto escrito; la búsqueda la hace quien usa el componente. */
  texto: string;
  onTexto: (texto: string) => void;
  opciones: readonly OpcionBusqueda[];
  seleccion: OpcionBusqueda | null;
  onSeleccionar: (opcion: OpcionBusqueda | null) => void;
  cargando?: boolean;
  /** Qué mostrar cuando no hay coincidencias: suele llevar una acción. */
  sinResultados?: ReactNode;
  disabled?: boolean;
}

/** Combobox con lista filtrada (patrón ARIA 1.2): flechas, Enter y Escape. */
export function Buscador({
  id,
  placeholder,
  texto,
  onTexto,
  opciones,
  seleccion,
  onSeleccionar,
  cargando,
  sinResultados,
  disabled,
  ...aria
}: BuscadorProps) {
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const idLista = `${id}-lista`;
  const mostrar = abierto && !seleccion && texto.trim().length > 0;
  const refInput = useRef<HTMLInputElement>(null);
  const posicion = usePosicionLista(refInput, mostrar);

  // El texto va primero y la selección al final: quien usa el buscador suele
  // actualizar su estado completo en cada aviso, y el último gana. Al revés, el
  // texto pisaba la selección recién hecha.
  const elegir = (o: OpcionBusqueda) => {
    onTexto(o.etiqueta);
    onSeleccionar(o);
    setAbierto(false);
  };

  return (
    <div className={styles.buscador}>
      <input
        ref={refInput}
        id={id}
        {...aria}
        type="text"
        role="combobox"
        aria-expanded={mostrar}
        aria-controls={idLista}
        aria-autocomplete="list"
        aria-activedescendant={mostrar && opciones[activo] ? `${idLista}-${activo}` : undefined}
        autoComplete="off"
        className={styles.control}
        placeholder={placeholder}
        value={texto}
        disabled={disabled}
        onChange={(e) => {
          onTexto(e.target.value);
          if (seleccion) onSeleccionar(null);
          setActivo(0);
          setAbierto(true);
        }}
        onFocus={() => setAbierto(true)}
        onBlur={() => setAbierto(false)}
        onKeyDown={(e) => {
          if (!mostrar) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActivo((i) => Math.min(i + 1, opciones.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActivo((i) => Math.max(i - 1, 0));
          } else if (e.key === "Enter") {
            const o = opciones[activo];
            if (o) {
              e.preventDefault();
              elegir(o);
            }
          } else if (e.key === "Escape") {
            setAbierto(false);
          }
        }}
      />
      {seleccion && <span className={styles.check} aria-hidden="true">✓</span>}
      {mostrar &&
        posicion &&
        createPortal(
        <ul id={idLista} role="listbox" className={styles.lista} style={posicion.estilo}>
          {cargando ? (
            <li className={styles.nota}>Buscando…</li>
          ) : opciones.length === 0 ? (
            <li className={styles.nota}>{sinResultados ?? "Sin coincidencias"}</li>
          ) : (
            opciones.map((o, i) => (
              <li
                key={o.id}
                id={`${idLista}-${i}`}
                role="option"
                aria-selected={i === activo}
                className={`${styles.opcion} ${i === activo ? styles.activa : ""}`}
                // mousedown para ganarle al blur del input.
                onMouseDown={(e) => {
                  e.preventDefault();
                  elegir(o);
                }}
                onMouseEnter={() => setActivo(i)}
              >
                <span className={styles.etiqueta}>{o.etiqueta}</span>
                {o.detalle && <span className={styles.detalle}>{o.detalle}</span>}
              </li>
            ))
          )}
        </ul>,
          posicion.contenedor
        )}
    </div>
  );
}

const ALTO_MAXIMO = 256;

/**
 * La lista se dibuja fuera del formulario: cada superficie de vidrio crea su
 * propio contexto de apilamiento y la siguiente la tapaba. Va pegada al campo
 * con posición fija; si abajo no cabe, se abre hacia arriba. Dentro de un
 * `<dialog>` se monta en el dialog, que vive en la capa superior.
 */
function usePosicionLista(ref: RefObject<HTMLInputElement>, abierta: boolean) {
  const [posicion, setPosicion] = useState<{ estilo: CSSProperties; contenedor: Element } | null>(null);

  useLayoutEffect(() => {
    const input = ref.current;
    if (!abierta || !input) {
      setPosicion(null);
      return;
    }
    const contenedor = input.closest("dialog") ?? document.body;
    const medir = () => {
      const r = input.getBoundingClientRect();
      const abajo = window.innerHeight - r.bottom;
      const haciaArriba = abajo < ALTO_MAXIMO && r.top > abajo;
      setPosicion({
        contenedor,
        estilo: {
          left: r.left,
          width: r.width,
          ...(haciaArriba ? { bottom: window.innerHeight - r.top + 4 } : { top: r.bottom + 4 }),
          maxHeight: Math.min(ALTO_MAXIMO, (haciaArriba ? r.top : abajo) - 8),
        },
      });
    };
    medir();
    // El formulario hace scroll dentro de su contenedor: se escucha en captura.
    window.addEventListener("scroll", medir, true);
    window.addEventListener("resize", medir);
    return () => {
      window.removeEventListener("scroll", medir, true);
      window.removeEventListener("resize", medir);
    };
  }, [ref, abierta]);

  return posicion;
}

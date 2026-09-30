import { useState } from "react";
import type { CategoriaProducto } from "@/domain/tipos";
import { numero } from "@/domain/format";
import s from "./ProveedoresProductos.module.css";

interface Props {
  categorias: CategoriaProducto[];
  categoriaId: string;
  subcategoriaId: string;
  onElegir: (categoriaId: string, subcategoriaId: string) => void;
  cargando: boolean;
}

export function ArbolCategorias({ categorias, categoriaId, subcategoriaId, onElegir, cargando }: Props) {
  const [abiertas, setAbiertas] = useState<Set<string>>(() => new Set(categoriaId ? [categoriaId] : []));
  const total = categorias.reduce((a, c) => a + c.total, 0);

  const alternar = (id: string) => {
    const n = new Set(abiertas);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setAbiertas(n);
  };

  return (
    <nav className={s.arbol} aria-label="Categorías">
      <div className={s.arbolTitulo}>Categorías</div>
      <button
        type="button"
        className={`${s.nodo} ${!categoriaId ? s.nodoActivo : ""}`}
        aria-current={!categoriaId ? "true" : undefined}
        onClick={() => onElegir("", "")}
      >
        <span>Todas</span>
        {categorias.length > 0 && <span className={s.conteo}>{numero(total)}</span>}
      </button>

      {categorias.length === 0 ? (
        <p className={s.arbolVacio}>{cargando ? "Cargando…" : "Sin categorías todavía"}</p>
      ) : (
        <ul className={s.ramas}>
          {categorias.map((c) => {
            const abierta = abiertas.has(c.id);
            const activa = categoriaId === c.id && !subcategoriaId;
            return (
              <li key={c.id}>
                <div className={s.fila}>
                  {c.subcategorias.length > 0 && (
                    <button
                      type="button"
                      className={s.flecha}
                      aria-expanded={abierta}
                      aria-label={`${abierta ? "Contraer" : "Expandir"} ${c.nombre}`}
                      onClick={() => alternar(c.id)}
                    >
                      {abierta ? "▾" : "▸"}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`${s.nodo} ${activa ? s.nodoActivo : ""}`}
                    aria-current={activa ? "true" : undefined}
                    onClick={() => {
                      onElegir(c.id, "");
                      if (!abierta) alternar(c.id);
                    }}
                  >
                    <span>{c.nombre}</span>
                    <span className={s.conteo}>{numero(c.total)}</span>
                  </button>
                </div>
                {abierta && (
                  <ul className={s.subramas}>
                    {c.subcategorias.map((sub) => {
                      const subActiva = subcategoriaId === sub.id;
                      return (
                        <li key={sub.id}>
                          <button
                            type="button"
                            className={`${s.nodo} ${s.subnodo} ${subActiva ? s.nodoActivo : ""}`}
                            aria-current={subActiva ? "true" : undefined}
                            onClick={() => onElegir(c.id, sub.id)}
                          >
                            <span>{sub.nombre}</span>
                            <span className={s.conteo}>{numero(sub.total)}</span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}

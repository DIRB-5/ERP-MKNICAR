import { useState } from "react";
import { Link } from "react-router-dom";
import { Campo, Input, Select } from "@/components/Campo/Campo";
import { Buscador, type OpcionBusqueda } from "@/components/Buscador/Buscador";
import { Button } from "@/components/Button/Button";
import { Chip } from "@/components/Chip/Chip";
import type { Disponibilidad, Proveedor } from "@/domain/tipos";
import { useProveedores } from "@/data/consultas";
import { DISPONIBILIDAD } from "./etiquetas";
import s from "./NuevoProducto.module.css";

export interface PrecioEditable {
  clave: string;
  proveedor: Proveedor | null;
  precio: string;
  entregaDias: string;
  disponibilidad: Disponibilidad;
}

export type ErroresPrecio = Partial<Record<"proveedor" | "precio" | "entregaDias", string>>;

export const precioVacio = (): PrecioEditable => ({
  clave: crypto.randomUUID(),
  proveedor: null,
  precio: "",
  entregaDias: "",
  disponibilidad: "inmediata",
});

interface Props {
  fila: PrecioEditable;
  indice: number;
  errores: ErroresPrecio;
  esMejor: boolean;
  onCambiar: (cambio: Partial<PrecioEditable>) => void;
  onQuitar: () => void;
}

/** Un proveedor del padrón con su precio para este producto. */
export function FilaPrecio({ fila, indice, errores, esMejor, onCambiar, onQuitar }: Props) {
  const [texto, setTexto] = useState(fila.proveedor?.razonSocial ?? "");
  const { data: proveedores = [], isFetching } = useProveedores({ texto: texto || undefined });

  const opciones: OpcionBusqueda[] = proveedores.slice(0, 20).map((p) => ({
    id: p.id,
    etiqueta: p.razonSocial,
    detalle: `${p.rfc}${p.estado === "suspendido" ? " · Suspendido" : ""} · crédito ${p.creditoDias} días`,
  }));

  return (
    <fieldset className={s.fila}>
      <legend className={s.leyenda}>
        Proveedor {indice + 1}
        {esMejor && <Chip tono="ok">Mejor precio</Chip>}
        {fila.proveedor?.estado === "suspendido" && <Chip tono="critico">Proveedor suspendido</Chip>}
      </legend>
      <div className={s.filaCampos}>
        <Campo etiqueta="Proveedor" obligatorio error={errores.proveedor}>
          {(p) => (
            <Buscador
              {...p}
              placeholder="Razón social o RFC"
              texto={texto}
              onTexto={setTexto}
              opciones={opciones}
              cargando={isFetching}
              seleccion={fila.proveedor ? { id: fila.proveedor.id, etiqueta: fila.proveedor.razonSocial } : null}
              onSeleccionar={(o) => onCambiar({ proveedor: proveedores.find((x) => x.id === o?.id) ?? null })}
              sinResultados={
                <>
                  No está en el padrón. <Link to="/proveedores/nuevo">Registrar proveedor</Link>
                </>
              }
            />
          )}
        </Campo>
        <Campo etiqueta="Precio (MXN)" obligatorio error={errores.precio} ayuda="Sin IVA, por unidad.">
          {(p) => (
            <Input {...p} inputMode="decimal" value={fila.precio} onChange={(x) => onCambiar({ precio: x.target.value.replace(/[^\d.]/g, "") })} />
          )}
        </Campo>
        <Campo etiqueta="Entrega (días)" obligatorio error={errores.entregaDias}>
          {(p) => (
            <Input {...p} inputMode="numeric" maxLength={3} value={fila.entregaDias} onChange={(x) => onCambiar({ entregaDias: x.target.value.replace(/\D/g, "") })} />
          )}
        </Campo>
        <Campo etiqueta="Disponibilidad">
          {(p) => (
            <Select {...p} value={fila.disponibilidad} onChange={(x) => onCambiar({ disponibilidad: x.target.value as Disponibilidad })}>
              {(Object.keys(DISPONIBILIDAD) as Disponibilidad[]).map((d) => (
                <option key={d} value={d}>{DISPONIBILIDAD[d].label}</option>
              ))}
            </Select>
          )}
        </Campo>
        <div className={s.quitar}>
          <Button variante="fantasma" onClick={onQuitar} aria-label={`Quitar proveedor ${indice + 1}`}>
            Quitar
          </Button>
        </div>
      </div>
    </fieldset>
  );
}

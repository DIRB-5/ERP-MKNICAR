import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Monto } from "@/components/Monto/Monto";
import type { DatosAltaProducto, TipoProducto } from "@/domain/tipos";
import { useCategorias, useCrearCategoria, useCrearProducto, useCrearSubcategoria } from "@/data/consultas";
import { FilaPrecio, precioVacio, type ErroresPrecio, type PrecioEditable } from "./FilaPrecio";
import { TIPO_PRODUCTO, margen } from "./etiquetas";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./NuevoProducto.module.css";

/** Sugerencias para la unidad de medida; se puede escribir otra. */
const UNIDADES = ["Pieza", "Juego", "Kit", "Par", "Litro", "Cubeta", "Tambor", "Metro", "Caja", "Servicio"] as const;

/** Margen por debajo del cual se advierte. No bloquea: la política de precios la fija Dirección. */
const MARGEN_MINIMO = 20;

interface Estado {
  numeroParte: string;
  marca: string;
  descripcion: string;
  tipo: TipoProducto;
  unidadMedida: string;
  categoriaId: string;
  subcategoriaId: string;
  precioSugerido: string;
  precios: PrecioEditable[];
}

type CampoProducto = "numeroParte" | "marca" | "descripcion" | "unidadMedida" | "categoriaId" | "precioSugerido";

const numeroValido = (v: string) => v.trim() !== "" && Number.isFinite(Number(v));

function revisar(e: Estado) {
  const errores: Partial<Record<CampoProducto, string>> = {};
  const erroresPrecio: Record<string, ErroresPrecio> = {};

  if (!e.numeroParte.trim()) errores.numeroParte = "Captura el número de parte.";
  if (!e.marca.trim()) errores.marca = "Captura la marca.";
  if (!e.descripcion.trim()) errores.descripcion = "Describe el producto.";
  if (!e.unidadMedida.trim()) errores.unidadMedida = "Indica en qué unidad se compra.";
  if (!e.categoriaId) errores.categoriaId = "Elige o crea una categoría.";
  if (!numeroValido(e.precioSugerido) || Number(e.precioSugerido) <= 0) {
    errores.precioSugerido = "Captura el precio de venta sugerido.";
  }

  const vistos = new Set<string>();
  for (const p of e.precios) {
    const ep: ErroresPrecio = {};
    if (!p.proveedor) ep.proveedor = "Elige un proveedor del padrón.";
    else if (vistos.has(p.proveedor.id)) ep.proveedor = "Este proveedor ya está en la lista.";
    else vistos.add(p.proveedor.id);
    if (!numeroValido(p.precio) || Number(p.precio) <= 0) ep.precio = "Captura su precio.";
    if (p.entregaDias.trim() === "") ep.entregaDias = "Días de entrega.";
    if (Object.keys(ep).length > 0) erroresPrecio[p.clave] = ep;
  }

  const numErrores = Object.keys(errores).length + Object.keys(erroresPrecio).length;
  return { errores, erroresPrecio, numErrores };
}

function aDatos(e: Estado): DatosAltaProducto {
  return {
    numeroParte: e.numeroParte.trim().toUpperCase(),
    descripcion: e.descripcion.trim(),
    marca: e.marca.trim(),
    categoriaId: e.categoriaId,
    subcategoriaId: e.subcategoriaId || null,
    tipo: e.tipo,
    unidadMedida: e.unidadMedida.trim(),
    precioSugerido: Number(e.precioSugerido),
    precios: e.precios.flatMap((p) =>
      p.proveedor
        ? [{ proveedorId: p.proveedor.id, precio: Number(p.precio), entregaDias: Number(p.entregaDias), disponibilidad: p.disponibilidad }]
        : []
    ),
  };
}

/** Crear categoría o subcategoría sin salir del formulario. */
function NuevaClasificacion({ etiqueta, onCrear, pendiente }: { etiqueta: string; onCrear: (nombre: string) => void; pendiente: boolean }) {
  const [abierta, setAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  if (!abierta) {
    return (
      <Button variante="fantasma" onClick={() => setAbierta(true)}>
        + {etiqueta}
      </Button>
    );
  }
  return (
    <div className={s.nueva}>
      <Input aria-label={etiqueta} autoFocus value={nombre} onChange={(x) => setNombre(x.target.value)} placeholder="Nombre" />
      <Button
        disabled={!nombre.trim() || pendiente}
        onClick={() => {
          onCrear(nombre);
          setNombre("");
          setAbierta(false);
        }}
      >
        Crear
      </Button>
      <Button variante="fantasma" onClick={() => setAbierta(false)}>
        Cancelar
      </Button>
    </div>
  );
}

export function Component() {
  const navigate = useNavigate();
  const crear = useCrearProducto();
  const crearCategoria = useCrearCategoria();
  const crearSubcategoria = useCrearSubcategoria();
  const { data: categorias = [] } = useCategorias();

  const [estado, setEstado] = useState<Estado>(() => ({
    numeroParte: "",
    marca: "",
    descripcion: "",
    tipo: "original",
    unidadMedida: "Pieza",
    categoriaId: "",
    subcategoriaId: "",
    precioSugerido: "",
    precios: [precioVacio()],
  }));
  const [intentado, setIntentado] = useState(false);

  const r = revisar(estado);
  const errores = intentado ? r.errores : {};
  const erroresPrecio = intentado ? r.erroresPrecio : {};
  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setEstado((e) => ({ ...e, [k]: v }));
  const ponerPrecio = (clave: string, cambio: Partial<PrecioEditable>) =>
    setEstado((e) => ({ ...e, precios: e.precios.map((p) => (p.clave === clave ? { ...p, ...cambio } : p)) }));

  const categoria = categorias.find((c) => c.id === estado.categoriaId);

  // Costos derivados de las cotizaciones capturadas: así se verán en el catálogo.
  const validos = estado.precios.filter((p) => p.proveedor && numeroValido(p.precio) && Number(p.precio) > 0);
  const montos = validos.map((p) => Number(p.precio));
  const costoPromedio = montos.length ? montos.reduce((a, x) => a + x, 0) / montos.length : null;
  const mejor = montos.length > 1 ? Math.min(...montos) : null;
  const precio = Number(estado.precioSugerido);
  const m = costoPromedio != null && precio > 0 ? margen(precio, costoPromedio) : null;

  const guardar = async () => {
    setIntentado(true);
    if (r.numErrores > 0) return;
    const p = await crear.mutateAsync(aDatos(estado));
    navigate(`/productos?sel=${encodeURIComponent(p.id)}`);
  };

  return (
    <form
      className={f.pagina}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        void guardar();
      }}
    >
      <div className={f.migas}>
        <Link to="/productos">Proveedores y productos</Link> / Nuevo producto
      </div>
      <header>
        <h1 className={f.titulo}>Nuevo producto</h1>
        <p className={f.subtitulo}>
          Los precios por proveedor alimentan el comparativo de cotizaciones y el costo del catálogo.
        </p>
      </header>

      <Surface as="section" aria-labelledby="sec-id" className={f.bloque}>
        <h2 id="sec-id" className={f.bloqueTitulo}>Identificación</h2>
        <div className={f.rejilla3}>
          <Campo etiqueta="Número de parte" obligatorio error={errores.numeroParte}>
            {(p) => <Input {...p} autoComplete="off" value={estado.numeroParte} onChange={(x) => set("numeroParte", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="Marca" obligatorio error={errores.marca}>
            {(p) => <Input {...p} value={estado.marca} onChange={(x) => set("marca", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Tipo" obligatorio>
            {(p) => (
              <Select {...p} value={estado.tipo} onChange={(x) => set("tipo", x.target.value as TipoProducto)}>
                {(Object.keys(TIPO_PRODUCTO) as TipoProducto[]).map((t) => (
                  <option key={t} value={t}>{TIPO_PRODUCTO[t]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
        <div className={s.descripcion}>
          <Campo etiqueta="Descripción" obligatorio error={errores.descripcion}>
            {(p) => (
              <Input {...p} placeholder="Juego de balatas delanteras cerámicas" value={estado.descripcion} onChange={(x) => set("descripcion", x.target.value)} />
            )}
          </Campo>
          <Campo etiqueta="Unidad de medida" obligatorio error={errores.unidadMedida}>
            {(p) => (
              <>
                <Input {...p} list="unidades-medida" value={estado.unidadMedida} onChange={(x) => set("unidadMedida", x.target.value)} />
                <datalist id="unidades-medida">
                  {UNIDADES.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-clasif" className={f.bloque}>
        <h2 id="sec-clasif" className={f.bloqueTitulo}>Clasificación</h2>
        <div className={f.rejilla2}>
          <div className={s.conAccion}>
            <Campo etiqueta="Categoría" obligatorio error={errores.categoriaId} ayuda={categorias.length === 0 ? "El catálogo aún no tiene categorías: crea la primera." : undefined}>
              {(p) => (
                <Select
                  {...p}
                  disabled={categorias.length === 0}
                  value={estado.categoriaId}
                  onChange={(x) => setEstado((e) => ({ ...e, categoriaId: x.target.value, subcategoriaId: "" }))}
                >
                  <option value="">Elige una</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </Select>
              )}
            </Campo>
            <NuevaClasificacion
              etiqueta="Nueva categoría"
              pendiente={crearCategoria.isPending}
              onCrear={(nombre) =>
                crearCategoria.mutate(nombre, {
                  onSuccess: (c) => setEstado((e) => ({ ...e, categoriaId: c.id, subcategoriaId: "" })),
                })
              }
            />
          </div>
          <div className={s.conAccion}>
            <Campo etiqueta="Subcategoría" ayuda={!categoria ? "Primero elige la categoría." : undefined}>
              {(p) => (
                <Select {...p} disabled={!categoria || categoria.subcategorias.length === 0} value={estado.subcategoriaId} onChange={(x) => set("subcategoriaId", x.target.value)}>
                  <option value="">{categoria && categoria.subcategorias.length === 0 ? "Sin subcategorías" : "Ninguna"}</option>
                  {categoria?.subcategorias.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.nombre}</option>
                  ))}
                </Select>
              )}
            </Campo>
            {categoria && (
              <NuevaClasificacion
                etiqueta="Nueva subcategoría"
                pendiente={crearSubcategoria.isPending}
                onCrear={(nombre) =>
                  crearSubcategoria.mutate(
                    { categoriaId: categoria.id, nombre },
                    { onSuccess: (sub) => set("subcategoriaId", sub.id) }
                  )
                }
              />
            )}
          </div>
        </div>
        {(crearCategoria.error || crearSubcategoria.error) && (
          <Aviso tono="critico" titulo={(crearCategoria.error ?? crearSubcategoria.error)?.message ?? ""} />
        )}
      </Surface>

      <Surface as="section" aria-labelledby="sec-prov" className={f.bloque}>
        <h2 id="sec-prov" className={f.bloqueTitulo}>Proveedores y precios</h2>
        <p className={s.nota}>Quién lo surte y a qué precio. Aparecerán en "Precios por proveedor" y contarán en su catálogo.</p>
        {estado.precios.map((p, i) => (
          <FilaPrecio
            key={p.clave}
            fila={p}
            indice={i}
            errores={erroresPrecio[p.clave] ?? {}}
            esMejor={mejor != null && Number(p.precio) === mejor && Boolean(p.proveedor)}
            onCambiar={(cambio) => ponerPrecio(p.clave, cambio)}
            onQuitar={() => set("precios", estado.precios.filter((x) => x.clave !== p.clave))}
          />
        ))}
        <div>
          <Button onClick={() => set("precios", [...estado.precios, precioVacio()])}>+ Agregar proveedor</Button>
        </div>
        {estado.precios.length === 0 && (
          <Aviso titulo="Sin proveedores, el producto queda en el catálogo pero no se podrá cotizar ni requisitar." />
        )}
      </Surface>

      <Surface as="section" aria-labelledby="sec-precio" className={f.bloque}>
        <h2 id="sec-precio" className={f.bloqueTitulo}>Precio de venta</h2>
        <div className={f.rejilla3}>
          <SoloLectura etiqueta="Costo promedio">
            {costoPromedio != null ? <Monto valor={costoPromedio} /> : "Sale de los precios de proveedor"}
          </SoloLectura>
          <Campo etiqueta="Precio sugerido (MXN)" obligatorio error={errores.precioSugerido} ayuda="Sin IVA. Se usa al armar el presupuesto.">
            {(p) => (
              <Input {...p} inputMode="decimal" value={estado.precioSugerido} onChange={(x) => set("precioSugerido", x.target.value.replace(/[^\d.]/g, ""))} />
            )}
          </Campo>
          <SoloLectura etiqueta="Margen">
            {m == null ? "—" : <span className={m < MARGEN_MINIMO ? s.malo : undefined}>{m.toFixed(1)}%</span>}
          </SoloLectura>
        </div>
        {m != null && m < MARGEN_MINIMO && (
          <Aviso tono={m < 0 ? "critico" : "info"} titulo={m < 0 ? "El precio sugerido queda por debajo del costo." : `El margen queda por debajo de ${MARGEN_MINIMO}%.`}>
            Se puede guardar; revisa el precio con Dirección.
          </Aviso>
        )}
      </Surface>

      {crear.error && <Aviso tono="critico" titulo={crear.error.message} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && r.numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {r.numErrores} {r.numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/productos">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Registrar producto"}
        </Button>
      </Surface>
    </form>
  );
}

Component.displayName = "NuevoProducto";

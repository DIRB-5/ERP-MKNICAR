import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Monto } from "@/components/Monto/Monto";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Textarea } from "@/components/Campo/Campo";
import { eventosDe, vigente, type CargaPresupuesto, type EventoOS } from "@/domain/bitacora";
import type { Producto, RegistroCatalogo } from "@/domain/tipos";
import { ultimaVersion } from "@/domain/expediente";
import { useProductos, useRegistros } from "@/data/consultas";
import { hoyISO } from "@/app/fechas";
import { totalesVersion } from "./calculos";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./Expediente.module.css";

interface Fila {
  clave: string;
  concepto: string;
  codigo: string;
  /** Horas (servicio) o cantidad (refacción). */
  cantidad: string;
  /** Tarifa por hora (servicio) o precio unitario (refacción), sin IVA. */
  precio: string;
}

const fila = (concepto = "", codigo = "", cantidad = "1", precio = ""): Fila => ({ clave: crypto.randomUUID(), concepto, codigo, cantidad, precio });

const sumarDias = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** La versión 1 nace de los hallazgos del diagnóstico: no se captura dos veces. */
function desdeHallazgos(eventos: readonly EventoOS[], servicios: RegistroCatalogo[], productos: Producto[]) {
  const hs = eventosDe(eventos, "hallazgo_agregado").map((e) => vigente(e, eventos).carga);
  return {
    servicios: hs.flatMap((h) =>
      h.servicios.map((x) => {
        const cat = servicios.find((v) => v.id === x.id);
        return fila(x.descripcion, x.clave, String(x.horas), cat?.valores.precio != null ? String(cat.valores.precio) : "");
      })
    ),
    refacciones: hs.flatMap((h) =>
      h.refacciones.map((x) => {
        const cat = productos.find((p) => p.id === x.id);
        return fila(x.descripcion, x.clave, String(x.cantidad), cat ? String(cat.precioSugerido) : "");
      })
    ),
  };
}

export interface FormPresupuestoProps {
  abierto: boolean;
  eventos: readonly EventoOS[];
  tallerId: string;
  /** El motivo de la adenda viene escrito cuando la dispara un sobrecosto. */
  motivoInicial?: string;
  guardando: boolean;
  error: string | null;
  titulo?: string;
  onCerrar: () => void;
  onEmitir: (tipo: "presupuesto_emitido" | "adenda_emitida", carga: CargaPresupuesto) => void;
}

export function FormPresupuesto({ abierto, eventos, tallerId, motivoInicial = "", guardando, error, titulo, onCerrar, onEmitir }: FormPresupuestoProps) {
  const { data: catServicios = [] } = useRegistros("servicios", { alcance: tallerId });
  const { data: productos = [] } = useProductos({});
  const version = ultimaVersion(eventos) + 1;
  const esAdenda = version > 1;

  const [servicios, setServicios] = useState<Fila[]>([]);
  const [refacciones, setRefacciones] = useState<Fila[]>([]);
  const [vigencia, setVigencia] = useState(sumarDias(15));
  const [motivo, setMotivo] = useState(motivoInicial);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const base = esAdenda ? { servicios: [], refacciones: [] } : desdeHallazgos(eventos, catServicios, productos);
    setServicios(base.servicios);
    setRefacciones(base.refacciones);
    setVigencia(sumarDias(15));
    setMotivo(motivoInicial);
    setIntentado(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const carga: CargaPresupuesto = {
    version,
    folio: "",
    servicios: servicios.map((x) => ({ concepto: x.concepto.trim(), clave: x.codigo.trim(), horas: Number(x.cantidad) || 0, tarifa: Number(x.precio) || 0 })),
    refacciones: refacciones.map((x) => ({ concepto: x.concepto.trim(), clave: x.codigo.trim(), cantidad: Number(x.cantidad) || 0, precio: Number(x.precio) || 0 })),
    vigenciaHasta: vigencia,
    motivo: motivo.trim(),
  };
  const t = totalesVersion(carga);

  const errores: string[] = [];
  if (servicios.length + refacciones.length === 0) errores.push("Agrega al menos una partida.");
  if ([...servicios, ...refacciones].some((x) => !x.concepto.trim())) errores.push("Toda partida lleva concepto.");
  if ([...servicios, ...refacciones].some((x) => !(Number(x.cantidad) > 0) || !(Number(x.precio) >= 0) || x.precio === "")) {
    errores.push("Revisa cantidades y precios: cantidad mayor que cero y precio capturado.");
  }
  if (!vigencia || vigencia < hoyISO()) errores.push("La vigencia no puede ser anterior a hoy.");
  if (esAdenda && !motivo.trim()) errores.push("La adenda necesita su motivo.");

  const editor = (titulo: string, filas: Fila[], setFilas: (f: Fila[]) => void, cant: string, prec: string) => (
    <fieldset className={f.seccion}>
      <legend className={f.seccionTitulo}>{titulo}</legend>
      {filas.length === 0 && <p className={s.meta}>Sin partidas.</p>}
      {filas.map((x, i) => {
        const poner = (c: Partial<Fila>) => setFilas(filas.map((y) => (y.clave === x.clave ? { ...y, ...c } : y)));
        return (
          <div key={x.clave} className={s.filaPartida}>
            <Campo etiqueta={`Concepto ${i + 1}`}>
              {(p) => <Input {...p} value={x.concepto} onChange={(e) => poner({ concepto: e.target.value })} />}
            </Campo>
            <Campo etiqueta="Clave">
              {(p) => <Input {...p} className={s.cifra} value={x.codigo} onChange={(e) => poner({ codigo: e.target.value })} />}
            </Campo>
            <Campo etiqueta={cant}>
              {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={x.cantidad} onChange={(e) => poner({ cantidad: e.target.value.replace(/[^\d.]/g, "") })} />}
            </Campo>
            <Campo etiqueta={prec}>
              {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={x.precio} onChange={(e) => poner({ precio: e.target.value.replace(/[^\d.]/g, "") })} />}
            </Campo>
            <Button variante="fantasma" onClick={() => setFilas(filas.filter((y) => y.clave !== x.clave))} aria-label={`Quitar partida ${i + 1}`}>
              Quitar
            </Button>
          </div>
        );
      })}
      <div>
        <Button onClick={() => setFilas([...filas, fila()])}>+ Agregar partida</Button>
      </div>
    </fieldset>
  );

  return (
    <PanelLateral
      abierto={abierto}
      titulo={titulo ?? (esAdenda ? `Adenda · versión ${version}` : "Presupuesto · versión 1")}
      subtitulo={esAdenda ? "Se suma a las versiones anteriores; ninguna se sustituye." : "Las partidas vienen de los hallazgos del diagnóstico."}
      onCerrar={onCerrar}
      pie={
        <>
          {intentado && errores.length > 0 && <span className={f.resumenErrores} role="alert">{errores[0]}</span>}
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button
            variante="primario"
            disabled={guardando}
            onClick={() => {
              setIntentado(true);
              if (errores.length === 0) onEmitir(esAdenda ? "adenda_emitida" : "presupuesto_emitido", carga);
            }}
          >
            {guardando ? "Emitiendo…" : esAdenda ? "Emitir adenda" : "Emitir presupuesto"}
          </Button>
        </>
      }
    >
      {error && <Aviso tono="critico" titulo={error} />}
      {esAdenda && (
        <Campo etiqueta="Motivo de la adenda" obligatorio>
          {(p) => <Textarea {...p} rows={2} value={motivo} onChange={(e) => setMotivo(e.target.value)} />}
        </Campo>
      )}
      {editor("Servicios", servicios, setServicios, "Horas", "Tarifa por hora")}
      {editor("Refacciones", refacciones, setRefacciones, "Cantidad", "Precio unitario")}
      <div className={f.rejilla2}>
        <Campo etiqueta="Vigente hasta" obligatorio>
          {(p) => <Input {...p} type="date" min={hoyISO()} value={vigencia} onChange={(e) => setVigencia(e.target.value)} />}
        </Campo>
        <dl className={s.totales}>
          <div><dt>Subtotal</dt><dd><Monto valor={t.subtotal} escala="tabla" /></dd></div>
          <div><dt>IVA</dt><dd><Monto valor={t.iva} escala="tabla" /></dd></div>
          <div><dt>Total</dt><dd><Monto valor={t.total} escala="tabla" /></dd></div>
        </dl>
      </div>
    </PanelLateral>
  );
}

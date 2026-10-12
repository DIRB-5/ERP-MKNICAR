import { useEffect, useState } from "react";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { MESES_VIGENCIA_OPINION, TIPO_DOCUMENTO_FISCAL, type TipoDocumentoFiscal } from "@/domain/compras";
import type { DocumentoFiscalProveedor } from "@/domain/tipos/compras";
import { hoyISO } from "@/app/fechas";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./Proveedores.module.css";

const TIPOS = Object.keys(TIPO_DOCUMENTO_FISCAL) as TipoDocumentoFiscal[];

/** AAAA-MM-DD más n meses, en hora local. */
function sumarMeses(dia: string, n: number): string {
  const [a = 0, m = 1, d = 1] = dia.split("-").map(Number);
  const r = new Date(a, m - 1 + n, d);
  const mm = String(r.getMonth() + 1).padStart(2, "0");
  const dd = String(r.getDate()).padStart(2, "0");
  return `${r.getFullYear()}-${mm}-${dd}`;
}

/** La opinión caduca sola; los demás se capturan a mano o se dejan sin vigencia. */
const vigenciaSugerida = (tipo: TipoDocumentoFiscal, fecha: string) =>
  tipo === "opinion_cumplimiento" && fecha ? sumarMeses(fecha, MESES_VIGENCIA_OPINION) : "";

export interface DocumentoFiscalFormularioProps {
  abierto: boolean;
  guardando: boolean;
  error: string | null;
  onCerrar: () => void;
  onAgregar: (doc: DocumentoFiscalProveedor) => void;
}

export function DocumentoFiscalFormulario({ abierto, guardando, error, onCerrar, onAgregar }: DocumentoFiscalFormularioProps) {
  const [tipo, setTipo] = useState<TipoDocumentoFiscal>("opinion_cumplimiento");
  const [fecha, setFecha] = useState("");
  const [vigencia, setVigencia] = useState("");
  const [archivo, setArchivo] = useState<File | null>(null);
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    const hoy = hoyISO();
    setTipo("opinion_cumplimiento");
    setFecha(hoy);
    setVigencia(vigenciaSugerida("opinion_cumplimiento", hoy));
    setArchivo(null);
    setIntentado(false);
  }, [abierto]);

  const errores: Partial<Record<"fecha" | "vigencia", string>> = {};
  if (!fecha) errores.fecha = "Indica la fecha del documento.";
  else if (fecha > hoyISO()) errores.fecha = "No puede ser posterior a hoy.";
  if (tipo === "opinion_cumplimiento" && !vigencia) errores.vigencia = "La opinión de cumplimiento siempre tiene vigencia.";
  if (vigencia && fecha && vigencia < fecha) errores.vigencia = "La vigencia no puede terminar antes de la fecha del documento.";
  const visibles = intentado ? errores : {};

  const agregar = () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0) return;
    onAgregar({
      id: crypto.randomUUID(),
      tipo,
      fechaDocumento: fecha,
      vigenciaHasta: vigencia || null,
      // Sin API, el archivo vive como URL local de esta sesión; la API devolverá la suya.
      archivo: archivo ? { nombre: archivo.name, url: URL.createObjectURL(archivo) } : null,
    });
  };

  const idForm = "form-documento";

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Agregar documento fiscal"
      subtitulo="La opinión de cumplimiento del SAT caduca cada mes: súbela cada vez que se renueve."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button type="submit" form={idForm} variante="primario" disabled={guardando}>
            {guardando ? "Guardando…" : "Agregar documento"}
          </Button>
        </>
      }
    >
      <form
        id={idForm}
        className={s.formulario}
        noValidate
        onSubmit={(ev) => {
          ev.preventDefault();
          agregar();
        }}
      >
        {error && <Aviso tono="critico" titulo={error} />}
        <Campo etiqueta="Documento" obligatorio>
          {(p) => (
            <Select
              {...p}
              value={tipo}
              onChange={(x) => {
                const t = TIPOS.find((v) => v === x.target.value) ?? "opinion_cumplimiento";
                setTipo(t);
                setVigencia(vigenciaSugerida(t, fecha));
              }}
            >
              {TIPOS.map((t) => (
                <option key={t} value={t}>{TIPO_DOCUMENTO_FISCAL[t]}</option>
              ))}
            </Select>
          )}
        </Campo>
        <div className={f.rejilla2}>
          <Campo etiqueta="Fecha del documento" obligatorio error={visibles.fecha}>
            {(p) => (
              <Input
                {...p}
                type="date"
                max={hoyISO()}
                value={fecha}
                onChange={(x) => {
                  setFecha(x.target.value);
                  setVigencia(vigenciaSugerida(tipo, x.target.value) || vigencia);
                }}
              />
            )}
          </Campo>
          <Campo
            etiqueta="Vigente hasta"
            obligatorio={tipo === "opinion_cumplimiento"}
            error={visibles.vigencia}
            ayuda={tipo === "opinion_cumplimiento" ? "Un mes después de emitida." : "Vacío si no caduca."}
          >
            {(p) => <Input {...p} type="date" min={fecha || undefined} value={vigencia} onChange={(x) => setVigencia(x.target.value)} />}
          </Campo>
        </div>
        <Campo etiqueta="Archivo" ayuda="PDF o imagen del documento.">
          {(p) => <Input {...p} type="file" accept="application/pdf,image/*" onChange={(x) => setArchivo(x.target.files?.[0] ?? null)} />}
        </Campo>
      </form>
    </PanelLateral>
  );
}

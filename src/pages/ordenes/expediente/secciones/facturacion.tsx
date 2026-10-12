import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Folio } from "@/components/Folio/Folio";
import { Monto } from "@/components/Monto/Monto";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input } from "@/components/Campo/Campo";
import { eventosDe, vigente } from "@/domain/bitacora";
import { numero } from "@/domain/format";
import { useRegistrarEvento } from "@/data/consultas";
import { hoyISO } from "@/app/fechas";
import { Acciones, Pendiente, Tabla, dia, type PropsSeccion, type ResumenSeccion } from "../comun";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

export const resumen: ResumenSeccion = (exp) => {
  const fs = eventosDe(exp.eventos, "factura_vinculada");
  if (fs.length === 0) return null;
  const total = fs.reduce((a, e) => a + Number(vigente(e, exp.eventos).carga.monto), 0);
  return `${numero(fs.length)} ${fs.length === 1 ? "factura" : "facturas"} · $${numero(Math.round(total))}`;
};

/**
 * Solo vinculación. Emitir y timbrar el CFDI está fuera de la fase 1. Una O.S.
 * puede estar en varias facturas y una factura cubrir varias O.S.
 */
export default function Facturacion({ exp, abierta }: PropsSeccion) {
  const [vinculando, setVinculando] = useState(false);
  const facturas = eventosDe(exp.eventos, "factura_vinculada").map((e) => vigente(e, exp.eventos));

  return (
    <div className={s.bloques}>
      {facturas.length === 0 ? (
        <Pendiente>Ninguna factura vinculada todavía. La emisión y el timbrado no son parte de la fase 1.</Pendiente>
      ) : (
        <Tabla encabezados={["Factura", "Fecha", "También cubre", "Monto"]} derecha={[3]}>
          {facturas.map((x) => (
            <tr key={x.id}>
              <td><Folio folio={x.carga.folio} tipo="factura" /></td>
              <td className={s.cifra}>{dia(x.carga.fecha)}</td>
              <td>
                {x.carga.osFolios.filter((o) => o !== exp.cabecera.folio).map((o) => (
                  <span key={o} className={s.adjunto}><Folio folio={o} tipo="os" /></span>
                ))}
                {x.carga.osFolios.length <= 1 && <span className={s.meta}>Solo esta O.S.</span>}
              </td>
              <td className={s.der}><Monto valor={Number(x.carga.monto)} escala="tabla" /></td>
            </tr>
          ))}
        </Tabla>
      )}

      {abierta && (
        <Acciones>
          <Button variante="primario" onClick={() => setVinculando(true)}>+ Vincular factura</Button>
        </Acciones>
      )}

      <VincularFactura exp={exp} abierto={vinculando} onCerrar={() => setVinculando(false)} />
    </div>
  );
}

function VincularFactura({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const [folio, setFolio] = useState("");
  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [otras, setOtras] = useState("");
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setFolio("");
    setMonto("");
    setFecha(hoyISO());
    setOtras("");
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const errores: Partial<Record<"folio" | "monto" | "fecha", string>> = {};
  if (!folio.trim()) errores.folio = "Captura el folio de la factura.";
  if (!(Number(monto) > 0)) errores.monto = "Un monto mayor que cero.";
  if (!fecha || fecha > hoyISO()) errores.fecha = "Una fecha de hoy o anterior.";
  const visibles = intentado ? errores : {};

  const guardar = () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0) return;
    const osFolios = [exp.cabecera.folio, ...otras.split(/[\s,]+/).map((x) => x.trim().toUpperCase()).filter(Boolean)];
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: { tipo: "factura_vinculada", carga: { folio: folio.trim().toUpperCase(), monto: Number(monto), fecha, osFolios: [...new Set(osFolios)] } },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Vincular factura"
      subtitulo="La factura se emite fuera del sistema; aquí solo se liga a la O.S."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Vincular</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <div className={f.rejilla2}>
        <Campo etiqueta="Folio de la factura" obligatorio error={visibles.folio}>
          {(p) => <Input {...p} className={s.cifra} value={folio} onChange={(x) => setFolio(x.target.value)} />}
        </Campo>
        <Campo etiqueta="Monto" obligatorio error={visibles.monto}>
          {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={monto} onChange={(x) => setMonto(x.target.value.replace(/[^\d.]/g, ""))} />}
        </Campo>
        <Campo etiqueta="Fecha" obligatorio error={visibles.fecha}>
          {(p) => <Input {...p} type="date" max={hoyISO()} value={fecha} onChange={(x) => setFecha(x.target.value)} />}
        </Campo>
        <Campo etiqueta="Otras O.S. que cubre" ayuda="Folios separados por coma, si la factura es de varias O.S.">
          {(p) => <Input {...p} className={s.cifra} value={otras} onChange={(x) => setOtras(x.target.value)} />}
        </Campo>
      </div>
    </PanelLateral>
  );
}

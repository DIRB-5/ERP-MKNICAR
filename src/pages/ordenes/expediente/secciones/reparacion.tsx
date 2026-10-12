import { useEffect, useState } from "react";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Monto } from "@/components/Monto/Monto";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select, Textarea } from "@/components/Campo/Campo";
import { eventosDe, vigente } from "@/domain/bitacora";
import { numero, porcentaje } from "@/domain/format";
import { useRegistrarEvento, useTransicionar } from "@/data/consultas";
import { hoyISO } from "@/app/fechas";
import { FormPresupuesto } from "../FormPresupuesto";
import { autorizado, costoReal, desviacion } from "../calculos";
import { OTRO, opcionesTecnico, tecnicoPorNombre } from "../captura";
import { Acciones, Pendiente, Subtitulo, Tabla, dia, type PropsSeccion, type ResumenSeccion } from "../comun";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "../Expediente.module.css";

export const resumen: ResumenSeccion = (exp) => {
  const c = costoReal(exp.eventos);
  if (c.total === 0 && c.horas === 0) return null;
  const d = desviacion(c.total, autorizado(exp.eventos).subtotal);
  return `${numero(c.horas)} h · costo $${numero(Math.round(c.total))}${d != null ? ` · ${porcentaje(d)} contra lo autorizado` : ""}`;
};

/** Bitácora de trabajo y consumo, con el costo corriendo contra lo autorizado. */
export default function Reparacion({ exp, abierta }: PropsSeccion) {
  const [cargando, setCargando] = useState(false);
  const [sobrecosto, setSobrecosto] = useState(false);
  const registrar = useRegistrarEvento();
  const transicionar = useTransicionar();

  const trabajo = eventosDe(exp.eventos, "mano_obra_cargada").map((e) => vigente(e, exp.eventos));
  const consumos = eventosDe(exp.eventos, "refaccion_consumida");
  const costo = costoReal(exp.eventos);
  const base = autorizado(exp.eventos).subtotal;
  const d = desviacion(costo.total, base);
  const puedeSobrecosto = abierta && exp.cabecera.estado === "en_reparacion";

  return (
    <div className={s.bloques}>
      <div>
        <Subtitulo>Bitácora de trabajo</Subtitulo>
        {trabajo.length === 0 ? (
          <Pendiente>Sin entradas de mano de obra todavía.</Pendiente>
        ) : (
          <Tabla
            encabezados={["Fecha", "Técnico", "Trabajo", "Horas", "Costo"]}
            derecha={[3, 4]}
            pie={
              <tr>
                <td colSpan={3}>Mano de obra</td>
                <td className={s.der}>{numero(costo.horas)} h</td>
                <td className={s.der}><Monto valor={costo.manoObra} escala="tabla" /></td>
              </tr>
            }
          >
            {trabajo.map((t) => (
              <tr key={t.id}>
                <td className={s.cifra}>{dia(t.carga.fecha)}</td>
                <td>{t.carga.tecnicoNombre}</td>
                <td>{t.carga.descripcion}</td>
                <td className={s.der}>{numero(t.carga.horas)} h</td>
                <td className={s.der}><Monto valor={t.carga.horas * t.carga.costoHora} escala="tabla" /></td>
              </tr>
            ))}
          </Tabla>
        )}
      </div>

      <div>
        <Subtitulo>Consumo de refacciones</Subtitulo>
        {consumos.length === 0 ? (
          <Pendiente>Almacén todavía no registra salidas para esta O.S.</Pendiente>
        ) : (
          <Tabla
            encabezados={["Salida", "Refacción", "Cantidad", "Capa", "Costo"]}
            derecha={[2, 4]}
            pie={
              <tr>
                <td colSpan={4}>Refacciones</td>
                <td className={s.der}><Monto valor={costo.refacciones} escala="tabla" /></td>
              </tr>
            }
          >
            {consumos.map((c) => (
              <tr key={c.id}>
                <td className={s.cifra}>{c.carga.salidaFolio}</td>
                <td>{c.carga.descripcion}{c.carga.numeroParte && <span className={s.meta}> · {c.carga.numeroParte}</span>}</td>
                <td className={s.der}>{numero(c.carga.cantidad)}</td>
                <td className={s.cifra}>{c.carga.capaCostoId}</td>
                <td className={s.der}><Monto valor={c.carga.cantidad * c.carga.costoUnitario} escala="tabla" /></td>
              </tr>
            ))}
          </Tabla>
        )}
      </div>

      <dl className={s.totales}>
        <div><dt>Costo acumulado</dt><dd><Monto valor={costo.total} escala="md" /></dd></div>
        <div><dt>Presupuesto autorizado (sin IVA)</dt><dd><Monto valor={base} escala="md" /></dd></div>
        <div>
          <dt>Desviación</dt>
          <dd>{d == null ? "—" : <Monto valor={d} formato="porcentaje" sentido="desviacion" escala="md" />}</dd>
        </div>
      </dl>

      {abierta && (
        <Acciones>
          {puedeSobrecosto && (
            <Button onClick={() => { registrar.reset(); transicionar.reset(); setSobrecosto(true); }}>
              Solicitar autorización de sobrecosto
            </Button>
          )}
          <Button variante="primario" onClick={() => setCargando(true)}>+ Registrar trabajo</Button>
        </Acciones>
      )}

      <RegistrarTrabajo exp={exp} abierto={cargando} onCerrar={() => setCargando(false)} />

      {/* El sobrecosto es una adenda más el retorno a autorización que ya existe en la máquina. */}
      <FormPresupuesto
        abierto={sobrecosto}
        titulo="Sobrecosto · adenda para autorizar"
        eventos={exp.eventos}
        tallerId={exp.cabecera.taller.id}
        motivoInicial="Sobrecosto durante la reparación: "
        guardando={registrar.isPending || transicionar.isPending}
        error={registrar.error?.message ?? transicionar.error?.message ?? null}
        onCerrar={() => setSobrecosto(false)}
        onEmitir={(_, carga) =>
          registrar.mutate(
            { osId: exp.cabecera.folio, evento: { tipo: "adenda_emitida", carga } },
            {
              onSuccess: () =>
                transicionar.mutate(
                  { osId: exp.cabecera.folio, destino: "pendiente_autorizacion", motivo: carga.motivo },
                  { onSuccess: () => setSobrecosto(false) }
                ),
            }
          )
        }
      />
    </div>
  );
}

function RegistrarTrabajo({ exp, abierto, onCerrar }: { exp: PropsSeccion["exp"]; abierto: boolean; onCerrar: () => void }) {
  const registrar = useRegistrarEvento();
  const opciones = opcionesTecnico(exp.eventos);
  const [elegido, setElegido] = useState("");
  const [nombre, setNombre] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [horas, setHoras] = useState("");
  const [costoHora, setCostoHora] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [intentado, setIntentado] = useState(false);

  useEffect(() => {
    if (!abierto) return;
    setElegido(opciones[0]?.id ?? OTRO);
    setNombre("");
    setFecha(hoyISO());
    setHoras("");
    setCostoHora("");
    setDescripcion("");
    setIntentado(false);
    registrar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const otro = elegido === OTRO;
  const tecnico = otro ? (nombre.trim() ? tecnicoPorNombre(nombre) : null) : opciones.find((o) => o.id === elegido) ?? null;
  const errores: Partial<Record<"tecnico" | "fecha" | "horas" | "costo" | "descripcion", string>> = {};
  if (!tecnico) errores.tecnico = "¿Quién hizo el trabajo?";
  if (!fecha || fecha > hoyISO()) errores.fecha = "Una fecha de hoy o anterior.";
  if (!(Number(horas) > 0 && Number(horas) <= 24)) errores.horas = "Entre 0 y 24 horas.";
  if (costoHora === "" || !(Number(costoHora) >= 0)) errores.costo = "Captura el costo por hora.";
  if (!descripcion.trim()) errores.descripcion = "Describe el trabajo.";
  const visibles = intentado ? errores : {};

  const guardar = () => {
    setIntentado(true);
    if (Object.keys(errores).length > 0 || !tecnico) return;
    registrar.mutate(
      {
        osId: exp.cabecera.folio,
        evento: {
          tipo: "mano_obra_cargada",
          carga: {
            tecnicoId: tecnico.id,
            tecnicoNombre: tecnico.nombre.replace(/ \(tú\)$/, ""),
            fecha,
            horas: Number(horas),
            costoHora: Number(costoHora),
            descripcion: descripcion.trim(),
          },
        },
      },
      { onSuccess: onCerrar }
    );
  };

  return (
    <PanelLateral
      abierto={abierto}
      titulo="Registrar trabajo"
      subtitulo="Una entrada por técnico y jornada."
      onCerrar={onCerrar}
      pie={
        <>
          <Button variante="fantasma" onClick={onCerrar}>Cancelar</Button>
          <Button variante="primario" disabled={registrar.isPending} onClick={guardar}>Registrar</Button>
        </>
      }
    >
      {registrar.error && <Aviso tono="critico" titulo={registrar.error.message} />}
      <div className={f.rejilla2}>
        <Campo etiqueta="Técnico" obligatorio error={!otro ? visibles.tecnico : undefined}>
          {(p) => (
            <Select {...p} value={elegido} onChange={(x) => setElegido(x.target.value)}>
              {opciones.map((o) => (
                <option key={o.id} value={o.id}>{o.nombre}</option>
              ))}
              <option value={OTRO}>Otro…</option>
            </Select>
          )}
        </Campo>
        {otro && (
          <Campo etiqueta="Nombre del técnico" obligatorio error={visibles.tecnico}>
            {(p) => <Input {...p} value={nombre} onChange={(x) => setNombre(x.target.value)} />}
          </Campo>
        )}
        <Campo etiqueta="Fecha" obligatorio error={visibles.fecha}>
          {(p) => <Input {...p} type="date" max={hoyISO()} value={fecha} onChange={(x) => setFecha(x.target.value)} />}
        </Campo>
        <Campo etiqueta="Horas" obligatorio error={visibles.horas}>
          {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={horas} onChange={(x) => setHoras(x.target.value.replace(/[^\d.]/g, ""))} />}
        </Campo>
        <Campo etiqueta="Costo por hora" obligatorio error={visibles.costo} ayuda="Mientras no exista el módulo de personal.">
          {(p) => <Input {...p} inputMode="decimal" className={s.cifra} value={costoHora} onChange={(x) => setCostoHora(x.target.value.replace(/[^\d.]/g, ""))} />}
        </Campo>
      </div>
      <Campo etiqueta="Trabajo realizado" obligatorio error={visibles.descripcion}>
        {(p) => <Textarea {...p} rows={3} value={descripcion} onChange={(x) => setDescripcion(x.target.value)} />}
      </Campo>
    </PanelLateral>
  );
}

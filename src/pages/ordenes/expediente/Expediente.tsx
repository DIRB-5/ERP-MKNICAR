import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Button } from "@/components/Button/Button";
import { Estado } from "@/components/Estado/Estado";
import { Folio } from "@/components/Folio/Folio";
import { Aviso } from "@/components/Aviso/Aviso";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Timeline } from "@/components/Timeline/Timeline";
import { AREA_LABEL } from "@/domain/areas";
import { ESTADO, type EstadoOS } from "@/domain/estados";
import { dias as fmtDias } from "@/domain/format";
import { SECCIONES, bloqueoPara, desplegadasPorDefecto, seccionAbierta, seccionVisible, type ClaveSeccion, type Expediente as TExpediente } from "@/domain/expediente";
import { PUNTOS_ESPERA, desgloseEspera, diasEnEspera, diasTotales, porcentajeEspera, tramosPorEstado } from "@/domain/tiempos";
import { useCambiarEstado, useExpediente, useTransicionar } from "@/data/consultas";
import { destinos, esTerminal, requiereFormulario, requiereMotivo } from "@/app/transiciones";
import { ChipFueraDeBase } from "@/pages/catalogos/etiquetas";
import { DialogoCambioEstado } from "../DialogoCambioEstado";
import { SelectorEstado } from "../EstadoEditable";
import { SeccionMarco, type ModuloSeccion } from "./SeccionMarco";
import { fh } from "./comun";
import s from "./Expediente.module.css";

/**
 * Cada sección es un archivo `secciones/<clave>.tsx`. Se cargan solas: agregar
 * una sección es declararla en domain/expediente.ts y crear su archivo.
 */
const MODULOS = import.meta.glob<ModuloSeccion>("./secciones/*.tsx", { eager: true });
const moduloDe = (clave: ClaveSeccion) => MODULOS[`./secciones/${clave}.tsx`];

export function Component() {
  const { folio = "" } = useParams();
  const { data: exp, isPending } = useExpediente(folio);

  if (isPending) return <EmptyState titulo="Cargando O.S.…" />;
  if (!exp) {
    return (
      <div className={s.vista}>
        <div className={s.migas}>
          <Link to="/ordenes">Órdenes de Servicio</Link> / <b>{folio}</b>
        </div>
        <Aviso tono="critico" titulo={`No encontramos la O.S. ${folio}.`} />
      </div>
    );
  }
  // La key reinicia lo desplegado cuando la O.S. cambia de estado.
  return <Vista key={`${exp.cabecera.folio}-${exp.cabecera.estado}`} exp={exp} />;
}

Component.displayName = "Expediente";

function Vista({ exp }: { exp: TExpediente }) {
  const { cabecera: c, eventos } = exp;
  const ahora = useMemo(() => new Date().toISOString(), [eventos]);
  const [desplegadas, setDesplegadas] = useState(() => desplegadasPorDefecto(eventos, c.estado));
  const alternar = (clave: ClaveSeccion) =>
    setDesplegadas((d) => {
      const n = new Set(d);
      if (n.has(clave)) n.delete(clave);
      else n.add(clave);
      return n;
    });

  const visibles = SECCIONES.filter((sec) => seccionVisible(sec, eventos));

  // Un folio de documento (presupuesto, remisión, factura) llega con #seccion: se despliega y se muestra.
  const { hash } = useLocation();
  useEffect(() => {
    const clave = SECCIONES.find((x) => `#${x.clave}` === hash)?.clave;
    if (!clave) return;
    setDesplegadas((d) => new Set(d).add(clave));
    requestAnimationFrame(() => document.getElementById(clave)?.scrollIntoView({ block: "start" }));
  }, [hash]);

  // La línea de tiempo queda fija justo debajo del encabezado, mida lo que mida.
  const refEncabezado = useRef<HTMLDivElement>(null);
  const [altoEncabezado, setAltoEncabezado] = useState(0);
  useLayoutEffect(() => {
    const el = refEncabezado.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setAltoEncabezado(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={s.vista} style={{ ["--alto-encabezado" as string]: `${altoEncabezado}px` }}>
      <div className={s.migas}>
        <Link to="/ordenes">Órdenes de Servicio</Link> / <b>{c.folio}</b>
      </div>

      <div ref={refEncabezado} className={s.encabezadoFijo}>
        <Encabezado exp={exp} ahora={ahora} />
      </div>

      <div className={s.cuerpo}>
        <aside className={s.columnaTiempo} aria-label="Línea de tiempo">
          <LineaTiempo exp={exp} ahora={ahora} />
        </aside>

        <div className={s.secciones}>
          {visibles.map((sec) => (
            <SeccionMarco
              key={sec.clave}
              exp={exp}
              seccion={sec}
              abierta={seccionAbierta(sec, c.estado)}
              ahora={ahora}
              modulo={moduloDe(sec.clave)}
              desplegada={desplegadas.has(sec.clave)}
              onAlternar={() => alternar(sec.clave)}
            />
          ))}
        </div>
      </div>

      <BarraAccion exp={exp} />
    </div>
  );
}

/* ── Encabezado ───────────────────────────────────────────────────── */

function Encabezado({ exp, ahora }: { exp: TExpediente; ahora: string }) {
  const { cabecera: c, eventos } = exp;
  const def = ESTADO[c.estado];
  const tramo = tramosPorEstado(eventos, ahora).at(-1);
  const terminal = esTerminal(c.estado);
  const retenida = c.estado === "retenida";

  return (
    <Surface as="header" variante="strong" elevacion="raised" className={s.encabezado}>
      <div className={s.identidad}>
        <h1 className={s.folio}>{c.folio}</h1>
        <Estado estado={c.estado} />
        <dl className={s.datosCabecera}>
          <div>
            <dt>Unidad</dt>
            <dd>
              <Link to={`/unidades/${encodeURIComponent(c.unidad.placas)}`}><Folio folio={c.unidad.placas} /></Link>{" "}
              {`${c.unidad.marca} ${c.unidad.modelo} ${c.unidad.anio || ""}`.trim()}
            </dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd><Link to={`/clientes/${encodeURIComponent(c.cliente.id)}`}>{c.cliente.razonSocial}</Link></dd>
          </div>
          <div>
            <dt>Taller</dt>
            <dd className={s.taller}>
              {c.taller.nombre}
              {c.tallerBase && c.tallerBase.id !== c.taller.id && <ChipFueraDeBase base={c.tallerBase.nombre} />}
            </dd>
          </div>
          <div>
            <dt>Responsable</dt>
            <dd>
              {AREA_LABEL[def.area]}
              {tramo?.usuarioNombre && <span className={s.meta}> · movió {tramo.usuarioNombre}</span>}
            </dd>
          </div>
        </dl>
      </div>

      {/* Si la O.S. espera, este es el número más grande del encabezado: tiene que incomodar. */}
      {tramo && !terminal && (
        <div className={`${s.antiguedad} ${def.espera ? (retenida ? s.antiguedadRetenida : s.antiguedadEspera) : ""}`}>
          <span className={s.antiguedadValor}>{fmtDias(tramo.dias)}</span>
          <span className={s.antiguedadEtiqueta}>
            {tramo.dias === 1 ? "día" : "días"} en {def.label.toLowerCase()}
            {def.espera && !retenida && " · esperando"}
            {retenida && " · retenida"}
          </span>
        </div>
      )}
      {terminal && tramo && (
        <div className={s.antiguedad}>
          <span className={s.antiguedadEtiqueta}>{def.label} el {fh(tramo.desde)}</span>
        </div>
      )}

      <CambioEstatus exp={exp} />
    </Surface>
  );
}

/** El selector con los 20 estatus se conserva junto a la barra de acción. */
function CambioEstatus({ exp }: { exp: TExpediente }) {
  const { cabecera: c } = exp;
  const [pendiente, setPendiente] = useState<EstadoOS | "">("");
  const [destino, setDestino] = useState<EstadoOS | null>(null);
  const cambiar = useCambiarEstado();
  const navigate = useNavigate();
  if (esTerminal(c.estado)) return null;

  return (
    <div className={s.cambio}>
      <label className={s.cambioEtiqueta} htmlFor="selector-estatus">Cambiar estatus</label>
      <SelectorEstado
        id="selector-estatus"
        folio={c.folio}
        estado={c.estado}
        valor={pendiente}
        onElegir={(v) => {
          setPendiente(v);
          cambiar.reset();
        }}
      />
      <Button
        disabled={!pendiente || cambiar.isPending}
        onClick={() => {
          if (!pendiente) return;
          if (requiereFormulario(pendiente)) navigate(`/ordenes/recepcion/${encodeURIComponent(c.folio)}`);
          else if (requiereMotivo(c.estado, pendiente)) setDestino(pendiente);
          else cambiar.mutate({ folio: c.folio, a: pendiente, comentario: null }, { onSuccess: () => setPendiente("") });
        }}
      >
        {cambiar.isPending ? "Guardando…" : "Guardar"}
      </Button>
      {cambiar.error && <span className={s.razon} role="alert">{cambiar.error.message}</span>}
      {destino && (
        <DialogoCambioEstado
          folio={c.folio}
          estado={c.estado}
          inicial={destino}
          onCerrar={() => {
            setDestino(null);
            setPendiente("");
          }}
        />
      )}
    </div>
  );
}

/* ── Línea de tiempo y tiempos ────────────────────────────────────── */

function LineaTiempo({ exp, ahora }: { exp: TExpediente; ahora: string }) {
  const tramos = tramosPorEstado(exp.eventos, ahora);
  const total = diasTotales(exp.eventos, ahora);
  const espera = diasEnEspera(exp.eventos, ahora);
  const pct = porcentajeEspera(exp.eventos, ahora);
  const puntos = desgloseEspera(exp.eventos, ahora);

  return (
    <div className={s.linea}>
      {/* Un nodo por tramo vivido: lo que falta no se dibuja. */}
      <Timeline
        tramos={tramos.map((t) => ({ estado: t.estado, desde: new Date(t.desde), duracionDias: t.dias, responsable: t.usuarioNombre }))}
        indiceActual={esTerminal(exp.cabecera.estado) ? tramos.length : tramos.length - 1}
      />
      <Surface variante="strong" elevacion="none" className={s.tiempos} aria-label="Tiempos de la O.S.">
        <dl className={s.tiemposCifras}>
          <div><dt>Días totales</dt><dd>{fmtDias(total)}</dd></div>
          <div><dt>En espera</dt><dd className={espera > 0 ? s.espera : undefined}>{fmtDias(espera)}</dd></div>
          <div><dt>% de espera</dt><dd className={pct > 50 ? s.malo : pct > 0 ? s.espera : undefined}>{Math.round(pct)}%</dd></div>
        </dl>
        <ul className={s.puntos}>
          {PUNTOS_ESPERA.map((p) => (
            <li key={p}>
              <span>{ESTADO[p].label}</span>
              <b className={puntos[p] > 0 ? s.espera : undefined}>{fmtDias(puntos[p])} d</b>
            </li>
          ))}
        </ul>
      </Surface>
    </div>
  );
}

/* ── Barra de acción siguiente ────────────────────────────────────── */

/**
 * Las transiciones válidas desde el estado actual. Una primaria, el resto
 * secundarias. Nunca se ocultan: deshabilitadas con su razón a la vista.
 */
function BarraAccion({ exp }: { exp: TExpediente }) {
  const { cabecera: c, eventos } = exp;
  const navigate = useNavigate();
  const transicionar = useTransicionar();
  const [conMotivo, setConMotivo] = useState<EstadoOS | null>(null);
  const opciones = destinos(c.estado);

  if (opciones.length === 0) {
    return (
      <Surface variante="strong" elevacion="float" className={s.barra}>
        <span className={s.meta}>La O.S. está {ESTADO[c.estado].label.toLowerCase()}: ya no tiene acciones siguientes.</span>
      </Surface>
    );
  }

  const ejecutar = (d: EstadoOS) => {
    transicionar.reset();
    if (requiereFormulario(d)) navigate(`/ordenes/recepcion/${encodeURIComponent(c.folio)}`);
    else if (requiereMotivo(c.estado, d)) setConMotivo(d);
    else transicionar.mutate({ osId: c.folio, destino: d });
  };

  return (
    <Surface variante="strong" elevacion="float" className={s.barra} aria-label="Acción siguiente">
      <span className={s.barraEtiqueta}>Siguiente</span>
      <div className={s.barraAcciones}>
        {opciones.map((d, i) => {
          const bloqueo = bloqueoPara(d, eventos);
          const retorno = requiereMotivo(c.estado, d);
          return (
            <div key={d} className={s.accion}>
              <Button
                variante={i === 0 ? "primario" : "secundario"}
                disabled={bloqueo != null || transicionar.isPending}
                onClick={() => ejecutar(d)}
                aria-describedby={bloqueo ? `bloqueo-${d}` : undefined}
              >
                {requiereFormulario(d) ? "Registrar recepción" : `Pasar a ${ESTADO[d].label}`}
                {retorno && " (pide motivo)"}
              </Button>
              {bloqueo && <span id={`bloqueo-${d}`} className={s.razon}>{bloqueo}</span>}
            </div>
          );
        })}
      </div>
      {transicionar.error && <span className={s.razon} role="alert">No se pudo: {transicionar.error.message}</span>}
      {conMotivo && <DialogoCambioEstado folio={c.folio} estado={c.estado} inicial={conMotivo} onCerrar={() => setConMotivo(null)} />}
    </Surface>
  );
}

import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Tabs } from "@/components/Tabs/Tabs";
import { DataTable, type Columna } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Aviso } from "@/components/Aviso/Aviso";
import { Button } from "@/components/Button/Button";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { Monto } from "@/components/Monto/Monto";
import { Chip } from "@/components/Chip/Chip";
import { fecha } from "@/domain/format";
import { TIPO_DOCUMENTO_FISCAL, situacionDocumentos } from "@/domain/compras";
import type { DocumentoFiscalProveedor, Proveedor } from "@/domain/tipos/compras";
import { useCambiarActivoProveedor, useCategorias, useGuardarProveedor, useProveedor } from "@/data/consultas";
import { REGIMEN_FISCAL, USO_CFDI } from "@/app/sat";
import { fechaLocal, hoyISO } from "@/app/fechas";
import { ProveedorFormulario } from "./ProveedorFormulario";
import { DocumentoFiscalFormulario } from "./DocumentoFiscalFormulario";
import { ChipActivo, ChipDocumentos, MONEDA, condicionesPago, datosDe, fiscalesFaltantes } from "./proveedorEtiquetas";
import c from "@/pages/catalogos/Catalogo.module.css";
import s from "./Proveedores.module.css";

type Pestana = "generales" | "documentos" | "historial";
const PESTANAS: readonly Pestana[] = ["generales", "documentos", "historial"];

const dia = (iso: string) => fecha(fechaLocal(iso), { anio: true });
const oGuion = (v: string) => v || "—";

/** Pares etiqueta-valor; el valor vacío se muestra como guion, nunca se oculta. */
function Datos({ filas }: { filas: [string, ReactNode][] }) {
  return (
    <dl className={c.datos}>
      {filas.map(([etiqueta, valor]) => (
        <div key={etiqueta}>
          <dt>{etiqueta}</dt>
          <dd>{valor}</dd>
        </div>
      ))}
    </dl>
  );
}

function Generales({ p }: { p: Proveedor }) {
  const { data: categorias = [] } = useCategorias();
  const nombres = p.categoriaIds.map((id) => categorias.find((x) => x.id === id)?.nombre ?? "Sin nombre");
  const b = p.datosBancarios;
  return (
    <div className={s.generales}>
      <section aria-labelledby="g-fiscales">
        <h3 id="g-fiscales" className={s.seccion}>Fiscales</h3>
        <Datos
          filas={[
            ["Razón social", p.razonSocial],
            ["Nombre comercial", oGuion(p.nombreComercial)],
            ["RFC", p.rfc],
            ["Régimen fiscal", p.regimenFiscal ? `${p.regimenFiscal} · ${REGIMEN_FISCAL[p.regimenFiscal] ?? ""}` : "—"],
            ["Uso de CFDI", p.usoCfdi ? `${p.usoCfdi} · ${USO_CFDI[p.usoCfdi] ?? ""}` : "—"],
            ["Domicilio fiscal", oGuion(p.domicilioFiscal)],
            ["Código postal", oGuion(p.codigoPostal)],
            ["Correo de facturación", oGuion(p.correoFacturacion)],
          ]}
        />
      </section>
      <section aria-labelledby="g-comerciales">
        <h3 id="g-comerciales" className={s.seccion}>Comerciales</h3>
        <Datos
          filas={[
            ["Condiciones de pago", condicionesPago(p)],
            ["Límite de crédito", p.limiteCredito == null ? "Sin límite registrado" : <Monto valor={p.limiteCredito} escala="tabla" />],
            ["Moneda", MONEDA[p.moneda]],
            ["Categorías", nombres.length ? nombres.join(" · ") : "—"],
            ["Talleres que surte", p.tallerIds.length ? p.tallerIds.join(" · ") : "Todos"],
          ]}
        />
      </section>
      <section aria-labelledby="g-contacto">
        <h3 id="g-contacto" className={s.seccion}>Contacto</h3>
        {p.contactos.length === 0 ? (
          <p className={s.nota}>Sin contactos registrados.</p>
        ) : (
          <ul className={s.contactos}>
            {p.contactos.map((x, i) => (
              <li key={`${i}-${x.nombre}`}>
                <b>{x.nombre}</b>
                {i === 0 && <Chip>Principal</Chip>}
                <span className={c.secundario}>{[x.puesto, x.telefono, x.correo].filter(Boolean).join(" · ")}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section aria-labelledby="g-pago">
        <h3 id="g-pago" className={s.seccion}>Pago</h3>
        <Datos
          filas={[
            ["Depositar a", oGuion(b.beneficiario)],
            ["Banco", oGuion(b.banco)],
            ["CLABE", oGuion(b.clabe)],
            ["Cuenta", oGuion(b.cuenta)],
            ["Tarjeta", oGuion(b.tarjeta)],
            ["Convenio", oGuion(b.convenio)],
            ["Referencia", oGuion(b.referencia)],
            ["Solicita", oGuion(b.solicita)],
          ]}
        />
        {b.comentarios && <p className={s.nota}>{b.comentarios}</p>}
      </section>
    </div>
  );
}

function Documentos({ p, hoy, onAgregar, onQuitar }: { p: Proveedor; hoy: string; onAgregar: () => void; onQuitar: (id: string) => void }) {
  const columnas: readonly Columna<DocumentoFiscalProveedor>[] = [
    { id: "tipo", encabezado: "Documento", celda: (d) => <span className={c.celdaFuerte}>{TIPO_DOCUMENTO_FISCAL[d.tipo]}</span> },
    { id: "fecha", encabezado: "Fecha", numerica: true, celda: (d) => dia(d.fechaDocumento) },
    { id: "vigencia", encabezado: "Vigente hasta", numerica: true, celda: (d) => (d.vigenciaHasta ? dia(d.vigenciaHasta) : "No caduca") },
    {
      id: "situacion",
      encabezado: "Situación",
      celda: (d) =>
        d.vigenciaHasta && d.vigenciaHasta < hoy ? (
          <Chip tono="critico"><span aria-hidden="true">!</span> Vencido</Chip>
        ) : (
          <Chip tono="ok"><span aria-hidden="true">✓</span> Vigente</Chip>
        ),
    },
    {
      id: "archivo",
      encabezado: "Archivo",
      celda: (d) =>
        d.archivo ? (
          <a href={d.archivo.url} target="_blank" rel="noreferrer">{d.archivo.nombre}</a>
        ) : (
          <span className={c.secundario}>Sin archivo</span>
        ),
    },
    {
      id: "quitar",
      encabezado: "",
      celda: (d) => (
        <Button variante="fantasma" onClick={() => onQuitar(d.id)} aria-label={`Quitar ${TIPO_DOCUMENTO_FISCAL[d.tipo]} del ${dia(d.fechaDocumento)}`}>
          Quitar
        </Button>
      ),
    },
  ];
  // Lo más reciente arriba: es lo que se revisa.
  const filas = [...p.documentos].sort((a, b) => b.fechaDocumento.localeCompare(a.fechaDocumento));

  return (
    <div className={s.documentos}>
      <div className={s.barraDocumentos}>
        <p className={s.nota}>Si la opinión de cumplimiento está vencida, Tesorería decide si se le puede pagar.</p>
        <Button onClick={onAgregar}>+ Agregar documento</Button>
      </div>
      <Surface variante="solid" elevacion="none" className={s.tabla}>
        <DataTable
          plano
          columnas={columnas}
          filas={filas}
          claveFila={(d) => d.id}
          vacio={
            <EmptyState titulo="Sin documentos fiscales">
              Sube la constancia de situación fiscal, la opinión de cumplimiento del SAT y la carátula bancaria.
            </EmptyState>
          }
        />
      </Surface>
    </div>
  );
}

export function Component() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const pestana: Pestana = PESTANAS.find((x) => x === params.get("pestana")) ?? "generales";
  const editando = params.has("editar");
  const [agregandoDoc, setAgregandoDoc] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const { data: p, isPending } = useProveedor(id);
  const guardar = useGuardarProveedor();
  const cambiarActivo = useCambiarActivoProveedor();
  const hoy = hoyISO();

  const poner = (k: string, v: string | null) => {
    const n = new URLSearchParams(params);
    if (v == null) n.delete(k);
    else n.set(k, v);
    setParams(n, { replace: true });
  };

  if (isPending) return <EmptyState titulo="Cargando proveedor…" />;
  if (!p) {
    return (
      <div className={c.vista}>
        <Aviso tono="critico" titulo="No encontramos este proveedor.">
          <Link to="/compras/proveedores">Volver al padrón de proveedores</Link>
        </Aviso>
      </div>
    );
  }

  const situacion = situacionDocumentos(p.documentos, hoy);
  const vencida = [...p.documentos]
    .filter((d) => d.tipo === "opinion_cumplimiento" && d.vigenciaHasta)
    .sort((a, b) => (b.vigenciaHasta ?? "").localeCompare(a.vigenciaHasta ?? ""))[0];
  const faltan = fiscalesFaltantes(p);

  const guardarDocumentos = (documentos: DocumentoFiscalProveedor[]) =>
    guardar.mutateAsync({ id: p.id, datos: { ...datosDe(p), documentos } });

  return (
    <div className={c.vista}>
      <div className={c.migas}>
        <Link to="/compras/proveedores">Proveedores</Link> / {p.razonSocial}
      </div>

      <Surface as="header" className={c.ficha}>
        <div className={c.fichaPrincipal}>
          <h1 className={c.fichaTitulo}>{p.razonSocial}</h1>
          <span className={c.fichaSub}>
            <span className={s.cifra}>{p.rfc}</span>
            {p.nombreComercial && ` · ${p.nombreComercial}`}
          </span>
          <div className={s.chips}>
            <ChipActivo activo={p.activo} />
            <ChipDocumentos proveedor={p} hoy={hoy} />
          </div>
        </div>
        <div className={`${s.accionesFicha} ${c.alFinal}`}>
          {p.activo ? (
            <Button variante="fantasma" onClick={() => setConfirmarBaja(true)}>
              Dar de baja
            </Button>
          ) : (
            <Button onClick={() => cambiarActivo.mutate({ id: p.id, activo: true })} disabled={cambiarActivo.isPending}>
              Reactivar
            </Button>
          )}
          <Button variante="primario" onClick={() => poner("editar", "1")}>
            Editar
          </Button>
        </div>
      </Surface>

      {situacion === "opinion_vencida" && (
        <Aviso tono="critico" titulo={`La opinión de cumplimiento venció${vencida?.vigenciaHasta ? ` el ${dia(vencida.vigenciaHasta)}` : ""}.`}>
          Pide al proveedor la opinión del mes y súbela en Documentos fiscales. Tesorería decide si se le puede pagar mientras tanto.
        </Aviso>
      )}
      {situacion === "sin_opinion" && (
        <Aviso titulo="Este proveedor no tiene opinión de cumplimiento registrada.">
          Súbela en Documentos fiscales; caduca cada mes.
        </Aviso>
      )}
      {faltan.length > 0 && (
        <Aviso titulo={`Faltan datos fiscales: ${faltan.join(", ")}.`}>Sin ellos Tesorería no puede pagarle.</Aviso>
      )}
      {!p.activo && <Aviso titulo="Proveedor dado de baja.">No aparece al cotizar ni al comprar. Sus compras anteriores se conservan.</Aviso>}

      <Surface>
        <Tabs
          etiqueta="Expediente del proveedor"
          idBase="proveedor"
          activa={pestana}
          onCambiar={(x) => poner("pestana", x === "generales" ? null : x)}
          pestanas={[
            { id: "generales", etiqueta: "Generales" },
            { id: "documentos", etiqueta: "Documentos fiscales", conteo: p.documentos.length },
            { id: "historial", etiqueta: "Historial de compras" },
          ]}
        >
          {pestana === "generales" && <Generales p={p} />}
          {pestana === "documentos" && (
            <Documentos
              p={p}
              hoy={hoy}
              onAgregar={() => {
                guardar.reset();
                setAgregandoDoc(true);
              }}
              onQuitar={(docId) => void guardarDocumentos(p.documentos.filter((d) => d.id !== docId))}
            />
          )}
          {pestana === "historial" && (
            <EmptyState titulo="Todavía no hay compras a este proveedor">
              Este historial se llena cuando existan órdenes de compra a su nombre.
            </EmptyState>
          )}
        </Tabs>
      </Surface>

      <ProveedorFormulario
        abierto={editando}
        proveedor={p}
        onCerrar={() => poner("editar", null)}
        onGuardado={() => poner("editar", null)}
      />

      <DocumentoFiscalFormulario
        abierto={agregandoDoc}
        guardando={guardar.isPending}
        error={guardar.error?.message ?? null}
        onCerrar={() => setAgregandoDoc(false)}
        // Si falla, el panel sigue abierto y muestra el error.
        onAgregar={(doc) => guardarDocumentos([...p.documentos, doc]).then(() => setAgregandoDoc(false), () => undefined)}
      />

      <Dialogo
        abierto={confirmarBaja}
        titulo={`¿Dar de baja a ${p.razonSocial}?`}
        confirmar="Dar de baja"
        cancelar="Cancelar"
        confirmando={cambiarActivo.isPending}
        onCancelar={() => setConfirmarBaja(false)}
        onConfirmar={() =>
          cambiarActivo.mutate(
            { id: p.id, activo: false },
            {
              onSuccess: () => {
                setConfirmarBaja(false);
                navigate("/compras/proveedores");
              },
            }
          )
        }
      >
        Deja de aparecer al cotizar y al comprar. No se borra: sus órdenes de compra anteriores se conservan y se puede reactivar.
        {cambiarActivo.error && <Aviso tono="critico" titulo={cambiarActivo.error.message} />}
      </Dialogo>
    </div>
  );
}

Component.displayName = "ProveedorDetalle";

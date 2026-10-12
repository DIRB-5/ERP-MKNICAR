import { useEffect, useState } from "react";
import { PanelLateral } from "@/components/PanelLateral/PanelLateral";
import { Campo, Input, Select, Textarea } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import type {
  CondicionesPago,
  ContactoProveedor,
  DatosBancariosProveedor,
  DatosProveedor,
  Moneda,
  Proveedor,
} from "@/domain/tipos/compras";
import { useCategorias, useGuardarProveedor } from "@/data/consultas";
import { REGIMEN_FISCAL, USO_CFDI } from "@/app/sat";
import { TALLERES } from "@/app/navegacion";
import {
  clabeValida,
  codigoPostalValido,
  correoValido,
  normalizarRfc,
  revisarRfc,
  telefonoValido,
} from "@/app/validacionesCliente";
import { MONEDA } from "./proveedorEtiquetas";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./Proveedores.module.css";

interface ContactoEditable extends ContactoProveedor {
  clave: string;
}

/** Todo como texto mientras se edita; se convierte al guardar. */
interface Estado {
  razonSocial: string;
  nombreComercial: string;
  rfc: string;
  regimenFiscal: string;
  usoCfdi: string;
  domicilioFiscal: string;
  codigoPostal: string;
  correoFacturacion: string;
  condicionesPago: CondicionesPago;
  diasCredito: string;
  limiteCredito: string;
  moneda: Moneda;
  categoriaIds: string[];
  tallerIds: string[];
  contactos: ContactoEditable[];
  bancarios: DatosBancariosProveedor;
}

type CampoError =
  | "razonSocial"
  | "rfc"
  | "codigoPostal"
  | "correoFacturacion"
  | "diasCredito"
  | "limiteCredito"
  | "cuenta"
  | "clabe"
  | "tarjeta";
type ErroresContacto = Partial<Record<"nombre" | "telefono" | "correo", string>>;

/** Sucursales que puede surtir: todos los talleres reales, sin la opción de alcance. */
const SUCURSALES = TALLERES.filter((t) => t !== "Todos los talleres");

const BANCARIOS_VACIOS: DatosBancariosProveedor = {
  beneficiario: "",
  banco: "",
  cuenta: "",
  clabe: "",
  tarjeta: "",
  convenio: "",
  referencia: "",
  solicita: "",
  comentarios: "",
};

const contactoVacio = (): ContactoEditable => ({ clave: crypto.randomUUID(), nombre: "", puesto: "", telefono: "", correo: "" });
const contactoSinDatos = (c: ContactoEditable) => !c.nombre.trim() && !c.puesto.trim() && !c.telefono.trim() && !c.correo.trim();
const soloDigitos = (v: string) => v.replace(/\D/g, "");

function estadoDe(p: Proveedor | null): Estado {
  if (!p) {
    return {
      razonSocial: "",
      nombreComercial: "",
      rfc: "",
      // La mayoría de los proveedores de refacciones son personas morales.
      regimenFiscal: "601",
      usoCfdi: "G01",
      domicilioFiscal: "",
      codigoPostal: "",
      correoFacturacion: "",
      condicionesPago: "credito",
      diasCredito: "30",
      limiteCredito: "",
      moneda: "MXN",
      categoriaIds: [],
      tallerIds: [],
      contactos: [contactoVacio()],
      bancarios: BANCARIOS_VACIOS,
    };
  }
  return {
    razonSocial: p.razonSocial,
    nombreComercial: p.nombreComercial,
    rfc: p.rfc,
    regimenFiscal: p.regimenFiscal,
    usoCfdi: p.usoCfdi,
    domicilioFiscal: p.domicilioFiscal,
    codigoPostal: p.codigoPostal,
    correoFacturacion: p.correoFacturacion,
    condicionesPago: p.condicionesPago,
    diasCredito: p.diasCredito != null ? String(p.diasCredito) : "",
    limiteCredito: p.limiteCredito != null ? String(p.limiteCredito) : "",
    moneda: p.moneda,
    categoriaIds: p.categoriaIds,
    tallerIds: p.tallerIds,
    contactos: p.contactos.length > 0 ? p.contactos.map((c) => ({ ...c, clave: crypto.randomUUID() })) : [contactoVacio()],
    bancarios: p.datosBancarios,
  };
}

/** Solo forma: RFC, CLABE y lo que se puede leer mal. La validación de negocio es del backend. */
function revisar(e: Estado) {
  const errores: Partial<Record<CampoError, string>> = {};
  const erroresContacto: Record<string, ErroresContacto> = {};

  if (!e.razonSocial.trim()) errores.razonSocial = "Captura la razón social.";
  const rfc = revisarRfc(e.rfc);
  if (rfc) errores.rfc = rfc;
  if (e.codigoPostal && !codigoPostalValido(e.codigoPostal)) errores.codigoPostal = "El código postal tiene 5 dígitos.";
  if (e.correoFacturacion.trim() && !correoValido(e.correoFacturacion)) errores.correoFacturacion = "El correo no es válido.";

  const dias = Number(e.diasCredito);
  if (e.condicionesPago === "credito" && (e.diasCredito.trim() === "" || !Number.isInteger(dias) || dias < 1 || dias > 365)) {
    errores.diasCredito = "Días de crédito entre 1 y 365.";
  }
  if (e.limiteCredito.trim() !== "" && !(Number(e.limiteCredito) >= 0)) errores.limiteCredito = "Captura un monto válido.";

  const b = e.bancarios;
  if (b.cuenta && b.cuenta.length < 7) errores.cuenta = "La cuenta tiene entre 7 y 11 dígitos.";
  if (b.clabe && b.clabe.length !== 18) errores.clabe = "La CLABE tiene 18 dígitos.";
  else if (b.clabe && !clabeValida(b.clabe)) errores.clabe = "La CLABE no es válida: revisa el dígito verificador (el último).";
  if (b.tarjeta && b.tarjeta.length !== 16) errores.tarjeta = "La tarjeta tiene 16 dígitos.";

  const capturados = e.contactos.filter((c) => !contactoSinDatos(c));
  for (const c of capturados) {
    const ec: ErroresContacto = {};
    if (!c.nombre.trim()) ec.nombre = "Captura el nombre.";
    if (!c.telefono.trim() && !c.correo.trim()) ec.telefono = "Captura al menos teléfono o correo.";
    if (c.telefono.trim() && !telefonoValido(c.telefono)) ec.telefono = "El teléfono debe tener 10 dígitos.";
    if (c.correo.trim() && !correoValido(c.correo)) ec.correo = "El correo no es válido.";
    if (Object.keys(ec).length > 0) erroresContacto[c.clave] = ec;
  }

  const numErrores = Object.keys(errores).length + Object.keys(erroresContacto).length;
  return { errores, erroresContacto, capturados, numErrores };
}

function aDatos(e: Estado, capturados: ContactoEditable[], documentos: Proveedor["documentos"]): DatosProveedor {
  const b = e.bancarios;
  return {
    razonSocial: e.razonSocial.trim(),
    nombreComercial: e.nombreComercial.trim(),
    rfc: normalizarRfc(e.rfc),
    regimenFiscal: e.regimenFiscal,
    usoCfdi: e.usoCfdi,
    domicilioFiscal: e.domicilioFiscal.trim(),
    codigoPostal: e.codigoPostal.trim(),
    correoFacturacion: e.correoFacturacion.trim(),
    condicionesPago: e.condicionesPago,
    diasCredito: e.condicionesPago === "credito" ? Number(e.diasCredito) : null,
    limiteCredito: e.limiteCredito.trim() === "" ? null : Number(e.limiteCredito),
    moneda: e.moneda,
    categoriaIds: e.categoriaIds,
    tallerIds: e.tallerIds,
    contactos: capturados.map(({ clave: _clave, ...c }) => ({
      nombre: c.nombre.trim(),
      puesto: c.puesto.trim(),
      telefono: c.telefono.trim(),
      correo: c.correo.trim(),
    })),
    datosBancarios: {
      beneficiario: b.beneficiario.trim(),
      banco: b.banco.trim(),
      cuenta: b.cuenta,
      clabe: b.clabe,
      tarjeta: b.tarjeta,
      convenio: b.convenio.trim(),
      referencia: b.referencia.trim(),
      solicita: b.solicita.trim(),
      comentarios: b.comentarios.trim(),
    },
    documentos,
  };
}

const alternar = (lista: string[], id: string, marcado: boolean) =>
  marcado ? [...lista, id] : lista.filter((x) => x !== id);

export interface ProveedorFormularioProps {
  abierto: boolean;
  /** null para dar de alta. */
  proveedor: Proveedor | null;
  onCerrar: () => void;
  onGuardado: (p: Proveedor) => void;
}

export function ProveedorFormulario({ abierto, proveedor, onCerrar, onGuardado }: ProveedorFormularioProps) {
  const guardar = useGuardarProveedor();
  const { data: categorias = [], isPending: cargandoCategorias } = useCategorias();
  const [inicial, setInicial] = useState(() => estadoDe(proveedor));
  const [estado, setEstado] = useState(inicial);
  const [intentado, setIntentado] = useState(false);
  const [confirmarDescarte, setConfirmarDescarte] = useState(false);

  // Cada apertura empieza del proveedor actual, no de lo que quedó a medias.
  useEffect(() => {
    if (!abierto) return;
    const e = estadoDe(proveedor);
    setInicial(e);
    setEstado(e);
    setIntentado(false);
    guardar.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, proveedor]);

  const r = revisar(estado);
  const errores = intentado ? r.errores : {};
  const erroresContacto = intentado ? r.erroresContacto : {};
  const sucio = JSON.stringify(estado) !== JSON.stringify(inicial);

  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setEstado((e) => ({ ...e, [k]: v }));
  const ponerBanco = (cambio: Partial<DatosBancariosProveedor>) => setEstado((e) => ({ ...e, bancarios: { ...e.bancarios, ...cambio } }));
  const ponerContacto = (clave: string, cambio: Partial<ContactoEditable>) =>
    setEstado((e) => ({ ...e, contactos: e.contactos.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)) }));

  const intentarCerrar = () => (sucio ? setConfirmarDescarte(true) : onCerrar());

  const enviar = async () => {
    setIntentado(true);
    if (r.numErrores > 0) return;
    const p = await guardar.mutateAsync({
      id: proveedor?.id ?? null,
      datos: aDatos(estado, r.capturados, proveedor?.documentos ?? []),
    });
    onGuardado(p);
  };

  const b = estado.bancarios;
  const idForm = "form-proveedor";

  return (
    <>
      <PanelLateral
        abierto={abierto}
        titulo={proveedor ? "Editar proveedor" : "Nuevo proveedor"}
        subtitulo="Con estos datos Abastecimiento lo invita a cotizar y Tesorería le programa pagos."
        onCerrar={intentarCerrar}
        pie={
          <>
            {intentado && r.numErrores > 0 && (
              <span className={f.resumenErrores} role="alert">
                Revisa {r.numErrores} {r.numErrores === 1 ? "campo marcado" : "campos marcados"}.
              </span>
            )}
            <Button variante="fantasma" onClick={intentarCerrar}>
              Cancelar
            </Button>
            <Button type="submit" form={idForm} variante="primario" disabled={guardar.isPending}>
              {guardar.isPending ? "Guardando…" : proveedor ? "Guardar cambios" : "Registrar proveedor"}
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
            void enviar();
          }}
        >
          {guardar.error && <Aviso tono="critico" titulo={guardar.error.message} />}

          <fieldset className={f.seccion}>
            <legend className={f.seccionTitulo}>Fiscales</legend>
            <p className={s.nota}>Sin estos datos Tesorería no puede pagarle. Se pueden completar después.</p>
            <div className={f.rejilla2}>
              <Campo etiqueta="Razón social" obligatorio error={errores.razonSocial} ayuda="Tal como aparece en su constancia de situación fiscal.">
                {(p) => <Input {...p} autoComplete="organization" value={estado.razonSocial} onChange={(x) => set("razonSocial", x.target.value)} />}
              </Campo>
              <Campo etiqueta="Nombre comercial" ayuda="Como lo conocen en los talleres, si es distinto.">
                {(p) => <Input {...p} autoComplete="off" value={estado.nombreComercial} onChange={(x) => set("nombreComercial", x.target.value)} />}
              </Campo>
              <Campo etiqueta="RFC" obligatorio error={errores.rfc} ayuda="12 caracteres para persona moral, 13 para física.">
                {(p) => <Input {...p} autoComplete="off" maxLength={15} value={estado.rfc} onChange={(x) => set("rfc", x.target.value.toUpperCase())} />}
              </Campo>
              <Campo etiqueta="Régimen fiscal">
                {(p) => (
                  <Select {...p} value={estado.regimenFiscal} onChange={(x) => set("regimenFiscal", x.target.value)}>
                    <option value="">Sin capturar</option>
                    {Object.entries(REGIMEN_FISCAL).map(([clave, nombre]) => (
                      <option key={clave} value={clave}>{clave} · {nombre}</option>
                    ))}
                  </Select>
                )}
              </Campo>
              <Campo etiqueta="Uso de CFDI" ayuda="Cómo nos factura: mercancías para refacciones, gastos para servicios.">
                {(p) => (
                  <Select {...p} value={estado.usoCfdi} onChange={(x) => set("usoCfdi", x.target.value)}>
                    {Object.entries(USO_CFDI).map(([clave, nombre]) => (
                      <option key={clave} value={clave}>{clave} · {nombre}</option>
                    ))}
                  </Select>
                )}
              </Campo>
              <Campo etiqueta="Correo de facturación" error={errores.correoFacturacion} ayuda="A donde envía sus CFDI.">
                {(p) => <Input {...p} type="email" autoComplete="off" value={estado.correoFacturacion} onChange={(x) => set("correoFacturacion", x.target.value)} />}
              </Campo>
            </div>
            <div className={s.domicilio}>
              <Campo etiqueta="Domicilio fiscal">
                {(p) => (
                  <Input {...p} placeholder="Calle y número, colonia, municipio, estado" value={estado.domicilioFiscal} onChange={(x) => set("domicilioFiscal", x.target.value)} />
                )}
              </Campo>
              <Campo etiqueta="Código postal" error={errores.codigoPostal}>
                {(p) => <Input {...p} inputMode="numeric" maxLength={5} value={estado.codigoPostal} onChange={(x) => set("codigoPostal", soloDigitos(x.target.value))} />}
              </Campo>
            </div>
          </fieldset>

          <fieldset className={f.seccion}>
            <legend className={f.seccionTitulo}>Comerciales</legend>
            <div className={f.rejilla2}>
              <Campo etiqueta="Condiciones de pago" obligatorio>
                {(p) => (
                  <Select {...p} value={estado.condicionesPago} onChange={(x) => set("condicionesPago", x.target.value === "contado" ? "contado" : "credito")}>
                    <option value="credito">Crédito</option>
                    <option value="contado">Contado</option>
                  </Select>
                )}
              </Campo>
              {estado.condicionesPago === "credito" ? (
                <Campo etiqueta="Días de crédito" obligatorio error={errores.diasCredito}>
                  {(p) => <Input {...p} inputMode="numeric" maxLength={3} value={estado.diasCredito} onChange={(x) => set("diasCredito", soloDigitos(x.target.value))} />}
                </Campo>
              ) : (
                <div />
              )}
              <Campo etiqueta="Límite de crédito" error={errores.limiteCredito} ayuda="Vacío si no hay un límite acordado.">
                {(p) => (
                  <Input
                    {...p}
                    inputMode="decimal"
                    className={s.cifra}
                    value={estado.limiteCredito}
                    onChange={(x) => set("limiteCredito", x.target.value.replace(/[^\d.]/g, ""))}
                  />
                )}
              </Campo>
              <Campo etiqueta="Moneda" obligatorio>
                {(p) => (
                  <Select {...p} value={estado.moneda} onChange={(x) => set("moneda", x.target.value === "USD" ? "USD" : "MXN")}>
                    {(Object.keys(MONEDA) as Moneda[]).map((m) => (
                      <option key={m} value={m}>{MONEDA[m]}</option>
                    ))}
                  </Select>
                )}
              </Campo>
            </div>

            <fieldset className={s.opcionesGrupo}>
              <legend className={s.leyenda}>Categorías que surte</legend>
              {categorias.length === 0 ? (
                <p className={s.nota}>
                  {cargandoCategorias ? "Cargando categorías…" : "El catálogo todavía no tiene categorías. Podrás asignarlas cuando se carguen."}
                </p>
              ) : (
                <div className={s.opciones}>
                  {categorias.map((c) => (
                    <label key={c.id} className={f.casilla}>
                      <input
                        type="checkbox"
                        checked={estado.categoriaIds.includes(c.id)}
                        onChange={(x) => set("categoriaIds", alternar(estado.categoriaIds, c.id, x.target.checked))}
                      />
                      {c.nombre}
                    </label>
                  ))}
                </div>
              )}
            </fieldset>

            <fieldset className={s.opcionesGrupo}>
              <legend className={s.leyenda}>Talleres que surte</legend>
              <p className={s.nota}>Sin marcar ninguno, surte a todos.</p>
              <div className={s.opciones}>
                {SUCURSALES.map((t) => (
                  <label key={t} className={f.casilla}>
                    <input type="checkbox" checked={estado.tallerIds.includes(t)} onChange={(x) => set("tallerIds", alternar(estado.tallerIds, t, x.target.checked))} />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>

          <fieldset className={f.seccion}>
            <legend className={f.seccionTitulo}>Contacto</legend>
            <p className={s.nota}>El primero es el principal: vendedor, crédito y cobranza, o quien atiende pedidos urgentes.</p>
            {estado.contactos.map((c, i) => {
              const e = erroresContacto[c.clave] ?? {};
              return (
                <fieldset key={c.clave} className={s.contacto}>
                  <legend className={s.leyenda}>{i === 0 ? "Contacto principal" : `Contacto ${i + 1}`}</legend>
                  <div className={f.rejilla2}>
                    <Campo etiqueta="Nombre" error={e.nombre}>
                      {(p) => <Input {...p} autoComplete="off" value={c.nombre} onChange={(x) => ponerContacto(c.clave, { nombre: x.target.value })} />}
                    </Campo>
                    <Campo etiqueta="Puesto">
                      {(p) => <Input {...p} value={c.puesto} onChange={(x) => ponerContacto(c.clave, { puesto: x.target.value })} />}
                    </Campo>
                    <Campo etiqueta="Teléfono" error={e.telefono}>
                      {(p) => <Input {...p} type="tel" autoComplete="off" value={c.telefono} onChange={(x) => ponerContacto(c.clave, { telefono: x.target.value })} />}
                    </Campo>
                    <Campo etiqueta="Correo" error={e.correo}>
                      {(p) => <Input {...p} type="email" autoComplete="off" value={c.correo} onChange={(x) => ponerContacto(c.clave, { correo: x.target.value })} />}
                    </Campo>
                  </div>
                  <div>
                    <Button
                      variante="fantasma"
                      onClick={() => set("contactos", estado.contactos.filter((x) => x.clave !== c.clave))}
                      aria-label={`Quitar contacto ${i + 1}`}
                    >
                      Quitar
                    </Button>
                  </div>
                </fieldset>
              );
            })}
            <div>
              <Button onClick={() => set("contactos", [...estado.contactos, contactoVacio()])}>+ Agregar contacto</Button>
            </div>
          </fieldset>

          <fieldset className={f.seccion}>
            <legend className={f.seccionTitulo}>Pago</legend>
            <p className={s.nota}>Opcionales ahora; Tesorería los necesita para pagarle.</p>
            <div className={f.rejilla2}>
              <Campo etiqueta="Depositar a" ayuda="Titular de la cuenta, si no es la razón social.">
                {(p) => <Input {...p} autoComplete="off" value={b.beneficiario} onChange={(x) => ponerBanco({ beneficiario: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Banco">
                {(p) => <Input {...p} autoComplete="off" value={b.banco} onChange={(x) => ponerBanco({ banco: x.target.value })} />}
              </Campo>
              <Campo etiqueta="CLABE" error={errores.clabe} ayuda="18 dígitos.">
                {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={18} className={s.cifra} value={b.clabe} onChange={(x) => ponerBanco({ clabe: soloDigitos(x.target.value) })} />}
              </Campo>
              <Campo etiqueta="Cuenta" error={errores.cuenta}>
                {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={11} className={s.cifra} value={b.cuenta} onChange={(x) => ponerBanco({ cuenta: soloDigitos(x.target.value) })} />}
              </Campo>
              <Campo etiqueta="Tarjeta" error={errores.tarjeta} ayuda="16 dígitos, para depósito a tarjeta.">
                {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={16} className={s.cifra} value={b.tarjeta} onChange={(x) => ponerBanco({ tarjeta: soloDigitos(x.target.value) })} />}
              </Campo>
              <Campo etiqueta="Convenio">
                {(p) => <Input {...p} autoComplete="off" maxLength={20} value={b.convenio} onChange={(x) => ponerBanco({ convenio: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Referencia">
                {(p) => <Input {...p} autoComplete="off" maxLength={40} value={b.referencia} onChange={(x) => ponerBanco({ referencia: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Solicita">
                {(p) => <Input {...p} autoComplete="off" value={b.solicita} onChange={(x) => ponerBanco({ solicita: x.target.value })} />}
              </Campo>
            </div>
            <Campo etiqueta="Comentarios">
              {(p) => <Textarea {...p} rows={3} value={b.comentarios} onChange={(x) => ponerBanco({ comentarios: x.target.value })} />}
            </Campo>
          </fieldset>
        </form>
      </PanelLateral>

      <Dialogo
        abierto={confirmarDescarte}
        titulo="¿Descartar los cambios?"
        confirmar="Descartar"
        cancelar="Seguir editando"
        onCancelar={() => setConfirmarDescarte(false)}
        onConfirmar={() => {
          setConfirmarDescarte(false);
          onCerrar();
        }}
      >
        Lo que capturaste en este proveedor no se ha guardado.
      </Dialogo>
    </>
  );
}

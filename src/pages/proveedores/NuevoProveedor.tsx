import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura, Textarea } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import type { ContactoProveedor, DatosAltaProveedor, DatosBancariosProveedor } from "@/domain/tipos";
import { useCategorias, useCrearProveedor } from "@/data/consultas";
import { REGIMEN_FISCAL, USO_CFDI } from "@/app/sat";
import {
  clabeValida,
  codigoPostalValido,
  correoValido,
  normalizarRfc,
  revisarRfc,
  telefonoValido,
} from "@/app/validacionesCliente";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import s from "./NuevoProveedor.module.css";

interface ContactoEditable extends ContactoProveedor {
  clave: string;
}

interface Estado {
  razonSocial: string;
  rfc: string;
  regimenFiscal: string;
  usoCfdi: string;
  codigoPostal: string;
  domicilioFiscal: string;
  categoriaIds: string[];
  condicion: "credito" | "contado";
  creditoDias: string;
  bancarios: DatosBancariosProveedor;
  contactos: ContactoEditable[];
}

type CampoProveedor = "razonSocial" | "rfc" | "regimenFiscal" | "codigoPostal" | "domicilioFiscal" | "creditoDias" | "cuenta" | "clabe" | "tarjeta";
type ErroresContacto = Partial<Record<"nombre" | "telefono" | "correo", string>>;

const contactoVacio = (): ContactoEditable => ({ clave: crypto.randomUUID(), nombre: "", puesto: "", telefono: "", correo: "" });
const vacio = (c: ContactoEditable) => !c.nombre.trim() && !c.puesto.trim() && !c.telefono.trim() && !c.correo.trim();

function revisar(e: Estado) {
  const errores: Partial<Record<CampoProveedor, string>> = {};
  const erroresContacto: Record<string, ErroresContacto> = {};

  if (!e.razonSocial.trim()) errores.razonSocial = "Captura la razón social.";
  const rfc = revisarRfc(e.rfc);
  if (rfc) errores.rfc = rfc;
  if (!e.regimenFiscal) errores.regimenFiscal = "Elige el régimen fiscal.";
  if (!codigoPostalValido(e.codigoPostal)) errores.codigoPostal = "El código postal tiene 5 dígitos.";
  if (!e.domicilioFiscal.trim()) errores.domicilioFiscal = "Captura el domicilio fiscal.";
  const credito = Number(e.creditoDias);
  if (e.condicion === "credito" && (e.creditoDias.trim() === "" || !Number.isInteger(credito) || credito < 1 || credito > 365)) {
    errores.creditoDias = "Días de crédito entre 1 y 365.";
  }
  const b = e.bancarios;
  if (b.cuenta && b.cuenta.length < 7) errores.cuenta = "La cuenta tiene entre 7 y 11 dígitos.";
  if (b.clabe && !clabeValida(b.clabe)) {
    errores.clabe = "La CLABE no es válida: son 18 dígitos y el último es verificador.";
  }
  if (b.tarjeta && b.tarjeta.length !== 16) errores.tarjeta = "La tarjeta tiene 16 dígitos.";

  const capturados = e.contactos.filter((c) => !vacio(c));
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

function aDatos(e: Estado, capturados: ContactoEditable[]): DatosAltaProveedor {
  return {
    razonSocial: e.razonSocial.trim(),
    rfc: normalizarRfc(e.rfc),
    regimenFiscal: e.regimenFiscal,
    usoCfdi: e.usoCfdi,
    codigoPostal: e.codigoPostal.trim(),
    domicilioFiscal: e.domicilioFiscal.trim(),
    categoriaIds: e.categoriaIds,
    creditoDias: e.condicion === "contado" ? 0 : Number(e.creditoDias),
    datosBancarios: {
      beneficiario: e.bancarios.beneficiario.trim(),
      banco: e.bancarios.banco.trim(),
      cuenta: e.bancarios.cuenta,
      clabe: e.bancarios.clabe,
      tarjeta: e.bancarios.tarjeta,
      convenio: e.bancarios.convenio.trim(),
      referencia: e.bancarios.referencia.trim(),
      solicita: e.bancarios.solicita.trim(),
      comentarios: e.bancarios.comentarios.trim(),
    },
    contactos: capturados.map(({ clave: _clave, ...c }) => ({
      nombre: c.nombre.trim(),
      puesto: c.puesto.trim(),
      telefono: c.telefono.trim(),
      correo: c.correo.trim(),
    })),
  };
}

export function Component() {
  const navigate = useNavigate();
  const crear = useCrearProveedor();
  const { data: categorias = [], isPending: cargandoCategorias } = useCategorias();

  const [estado, setEstado] = useState<Estado>(() => ({
    razonSocial: "",
    rfc: "",
    // La mayoría de los proveedores de refacciones son personas morales.
    regimenFiscal: "601",
    usoCfdi: "G01",
    codigoPostal: "",
    domicilioFiscal: "",
    categoriaIds: [],
    condicion: "credito",
    creditoDias: "30",
    bancarios: { beneficiario: "", banco: "", cuenta: "", clabe: "", tarjeta: "", convenio: "", referencia: "", solicita: "", comentarios: "" },
    contactos: [contactoVacio()],
  }));
  const [intentado, setIntentado] = useState(false);

  const r = revisar(estado);
  const errores = intentado ? r.errores : {};
  const erroresContacto = intentado ? r.erroresContacto : {};
  const set = <K extends keyof Estado>(k: K, v: Estado[K]) => setEstado({ ...estado, [k]: v });
  const ponerBanco = (cambio: Partial<DatosBancariosProveedor>) => set("bancarios", { ...estado.bancarios, ...cambio });
  const soloDigitos = (v: string) => v.replace(/\D/g, "");
  const ponerContacto = (clave: string, cambio: Partial<ContactoEditable>) =>
    set("contactos", estado.contactos.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)));

  const guardar = async () => {
    setIntentado(true);
    if (r.numErrores > 0) return;
    const p = await crear.mutateAsync(aDatos(estado, r.capturados));
    navigate(`/proveedores?sel=${encodeURIComponent(p.id)}`);
  };

  const credito = Number(estado.creditoDias);
  const b = estado.bancarios;

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
        <Link to="/proveedores">Proveedores y productos</Link> / Nuevo proveedor
      </div>
      <header>
        <h1 className={f.titulo}>Nuevo proveedor</h1>
        <p className={f.subtitulo}>
          Con estos datos Abastecimiento lo invita a cotizar y Tesorería le programa pagos.
        </p>
      </header>

      <Surface as="section" aria-labelledby="sec-fiscal" className={f.bloque}>
        <h2 id="sec-fiscal" className={f.bloqueTitulo}>Datos fiscales</h2>
        <div className={f.rejilla2}>
          <Campo etiqueta="Razón social" obligatorio error={errores.razonSocial} ayuda="Tal como aparece en su constancia de situación fiscal.">
            {(p) => <Input {...p} autoComplete="organization" value={estado.razonSocial} onChange={(x) => set("razonSocial", x.target.value)} />}
          </Campo>
          <Campo etiqueta="RFC" obligatorio error={errores.rfc} ayuda="12 caracteres para persona moral, 13 para física.">
            {(p) => <Input {...p} autoComplete="off" maxLength={15} value={estado.rfc} onChange={(x) => set("rfc", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="Régimen fiscal" obligatorio error={errores.regimenFiscal}>
            {(p) => (
              <Select {...p} value={estado.regimenFiscal} onChange={(x) => set("regimenFiscal", x.target.value)}>
                <option value="">Elige uno</option>
                {Object.entries(REGIMEN_FISCAL).map(([clave, nombre]) => (
                  <option key={clave} value={clave}>{clave} · {nombre}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Uso de CFDI" obligatorio ayuda="Cómo nos factura: mercancías para refacciones, gastos para servicios.">
            {(p) => (
              <Select {...p} value={estado.usoCfdi} onChange={(x) => set("usoCfdi", x.target.value)}>
                {Object.entries(USO_CFDI).map(([clave, nombre]) => (
                  <option key={clave} value={clave}>{clave} · {nombre}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
        <div className={s.domicilio}>
          <Campo etiqueta="Domicilio fiscal" obligatorio error={errores.domicilioFiscal}>
            {(p) => (
              <Input {...p} placeholder="Calle y número, colonia, municipio, estado" value={estado.domicilioFiscal} onChange={(x) => set("domicilioFiscal", x.target.value)} />
            )}
          </Campo>
          <Campo etiqueta="Código postal" obligatorio error={errores.codigoPostal}>
            {(p) => (
              <Input {...p} inputMode="numeric" maxLength={5} value={estado.codigoPostal} onChange={(x) => set("codigoPostal", x.target.value.replace(/\D/g, ""))} />
            )}
          </Campo>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-comercial" className={f.bloque}>
        <h2 id="sec-comercial" className={f.bloqueTitulo}>Condiciones comerciales</h2>
        <div className={f.rejilla3}>
          <Campo etiqueta="Crédito o contado" obligatorio>
            {(p) => (
              <Select {...p} value={estado.condicion} onChange={(x) => set("condicion", x.target.value === "contado" ? "contado" : "credito")}>
                <option value="credito">Crédito</option>
                <option value="contado">Contado</option>
              </Select>
            )}
          </Campo>
          {estado.condicion === "credito" ? (
            <Campo
              etiqueta="Días de crédito"
              obligatorio
              error={errores.creditoDias}
              ayuda={!errores.creditoDias && estado.creditoDias.trim() !== "" ? `Paga a ${credito} días de la factura.` : undefined}
            >
              {(p) => (
                <Input {...p} inputMode="numeric" maxLength={3} value={estado.creditoDias} onChange={(x) => set("creditoDias", soloDigitos(x.target.value))} />
              )}
            </Campo>
          ) : (
            <SoloLectura etiqueta="Días de crédito">Se paga al recibir la factura</SoloLectura>
          )}
          <SoloLectura etiqueta="Estado">Activo</SoloLectura>
        </div>

        <fieldset className={s.categorias}>
          <legend className={s.leyenda}>Categorías que surte</legend>
          {categorias.length === 0 ? (
            <p className={s.nota}>
              {cargandoCategorias
                ? "Cargando categorías…"
                : "El catálogo todavía no tiene categorías. Podrás asignarlas cuando se carguen."}
            </p>
          ) : (
            <div className={s.opciones}>
              {categorias.map((c) => (
                <label key={c.id} className={s.casilla}>
                  <input
                    type="checkbox"
                    checked={estado.categoriaIds.includes(c.id)}
                    onChange={(x) =>
                      set(
                        "categoriaIds",
                        x.target.checked ? [...estado.categoriaIds, c.id] : estado.categoriaIds.filter((id) => id !== c.id)
                      )
                    }
                  />
                  {c.nombre}
                </label>
              ))}
            </div>
          )}
        </fieldset>
      </Surface>

      <Surface as="section" aria-labelledby="sec-bancarios" className={f.bloque}>
        <h2 id="sec-bancarios" className={f.bloqueTitulo}>Datos bancarios</h2>
        <p className={s.nota}>Opcionales ahora; Tesorería los necesita para pagarle.</p>
        <div className={f.rejilla2}>
          <Campo etiqueta="Depositar a" ayuda="Titular de la cuenta, si no es la razón social.">
            {(p) => <Input {...p} autoComplete="off" value={b.beneficiario} onChange={(x) => ponerBanco({ beneficiario: x.target.value })} />}
          </Campo>
          <Campo etiqueta="Banco">
            {(p) => <Input {...p} autoComplete="off" value={b.banco} onChange={(x) => ponerBanco({ banco: x.target.value })} />}
          </Campo>
        </div>
        <div className={f.rejilla3}>
          <Campo etiqueta="Cuenta" error={errores.cuenta}>
            {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={11} value={b.cuenta} onChange={(x) => ponerBanco({ cuenta: soloDigitos(x.target.value) })} />}
          </Campo>
          <Campo etiqueta="CLABE" error={errores.clabe} ayuda="18 dígitos.">
            {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={18} value={b.clabe} onChange={(x) => ponerBanco({ clabe: soloDigitos(x.target.value) })} />}
          </Campo>
          <Campo etiqueta="Tarjeta" error={errores.tarjeta} ayuda="16 dígitos, para depósito a tarjeta.">
            {(p) => <Input {...p} inputMode="numeric" autoComplete="off" maxLength={16} value={b.tarjeta} onChange={(x) => ponerBanco({ tarjeta: soloDigitos(x.target.value) })} />}
          </Campo>
        </div>
        <div className={f.rejilla3}>
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
      </Surface>

      <Surface as="section" aria-labelledby="sec-contactos" className={f.bloque}>
        <h2 id="sec-contactos" className={f.bloqueTitulo}>Contactos</h2>
        <p className={s.nota}>Vendedor, crédito y cobranza, o quien atiende pedidos urgentes.</p>
        {estado.contactos.map((c, i) => {
          const e = erroresContacto[c.clave] ?? {};
          return (
            <fieldset key={c.clave} className={s.contacto}>
              <legend className={s.leyenda}>Contacto {i + 1}</legend>
              <div className={f.rejilla4}>
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
      </Surface>

      {crear.error && <Aviso tono="critico" titulo={crear.error.message} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && r.numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {r.numErrores} {r.numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/proveedores">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Registrar proveedor"}
        </Button>
      </Surface>
    </form>
  );
}

Component.displayName = "NuevoProveedor";

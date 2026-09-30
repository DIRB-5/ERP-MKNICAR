import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import type { DatosAltaCliente, TipoCliente } from "@/domain/tipos";
import { useCrearCliente } from "@/data/consultas";
import { correoValido, normalizarRfc, revisarRfc, telefonoValido } from "@/app/validacionesCliente";
import { TIPO_CLIENTE } from "@/pages/catalogos/etiquetas";
import { EditorContactos, contactoVacio, estaVacio, type ContactoEditable, type ErroresContacto } from "./EditorContactos";
import styles from "./NuevoCliente.module.css";

interface EstadoCliente {
  razonSocial: string;
  rfc: string;
  tipo: TipoCliente;
  convenioId: string;
  ejecutivoCuenta: string;
  contactos: ContactoEditable[];
}

type CampoCliente = "razonSocial" | "rfc" | "ejecutivoCuenta";

function revisar(e: EstadoCliente) {
  const errores: Partial<Record<CampoCliente, string>> = {};
  const erroresContacto: Record<string, ErroresContacto> = {};

  if (!e.razonSocial.trim()) errores.razonSocial = "Captura la razón social.";
  const rfc = revisarRfc(e.rfc);
  if (rfc) errores.rfc = rfc;
  if (!e.ejecutivoCuenta.trim()) errores.ejecutivoCuenta = "Indica quién lleva la cuenta.";

  const capturados = e.contactos.filter((c) => !estaVacio(c));
  for (const c of capturados) {
    const ec: ErroresContacto = {};
    if (!c.nombre.trim()) ec.nombre = "Captura el nombre.";
    if (c.correo.trim() && !correoValido(c.correo)) ec.correo = "El correo no es válido.";
    if (c.telefono.trim() && !telefonoValido(c.telefono)) ec.telefono = "El teléfono debe tener 10 dígitos.";
    // El canal preferido es por donde saldrá la solicitud de autorización: debe tener su dato.
    if (c.canalPreferido === "correo" && !c.correo.trim()) ec.correo = "Es su canal preferido: captura el correo.";
    if (c.canalPreferido === "whatsapp" && !c.telefono.trim()) ec.telefono = "Es su canal preferido: captura el teléfono.";
    if (Object.keys(ec).length > 0) erroresContacto[c.clave] = ec;
  }

  const confirmaciones: string[] = [];
  if (capturados.length === 0) {
    confirmaciones.push("El cliente no tiene contactos. Sin ellos no se le podrá enviar ninguna cotización.");
  } else if (!capturados.some((c) => c.autorizaPresupuesto)) {
    confirmaciones.push(
      "Ningún contacto autoriza presupuestos. Las O.S. de este cliente no podrán enviarse a autorización hasta que se agregue uno."
    );
  }

  const numErrores = Object.keys(errores).length + Object.keys(erroresContacto).length;
  return { errores, erroresContacto, confirmaciones, numErrores, capturados };
}

function aDatos(e: EstadoCliente, capturados: ContactoEditable[]): DatosAltaCliente {
  return {
    razonSocial: e.razonSocial.trim(),
    rfc: normalizarRfc(e.rfc),
    tipo: e.tipo,
    convenioId: e.convenioId.trim() || null,
    ejecutivoCuenta: e.ejecutivoCuenta.trim(),
    contactos: capturados.map((c) => ({
      nombre: c.nombre.trim(),
      puesto: c.puesto.trim(),
      correo: c.correo.trim(),
      telefono: c.telefono.trim(),
      autorizaPresupuesto: c.autorizaPresupuesto,
      canalPreferido: c.canalPreferido,
    })),
  };
}

export function Component() {
  const navigate = useNavigate();
  const crear = useCrearCliente();
  const [estado, setEstado] = useState<EstadoCliente>(() => ({
    razonSocial: "",
    rfc: "",
    tipo: "flotilla",
    convenioId: "",
    ejecutivoCuenta: "",
    contactos: [{ ...contactoVacio(), autorizaPresupuesto: true }],
  }));
  const [intentado, setIntentado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const r = revisar(estado);
  const errores = intentado ? r.errores : {};
  const erroresContacto = intentado ? r.erroresContacto : {};
  const set = <K extends keyof EstadoCliente>(k: K, v: EstadoCliente[K]) => setEstado({ ...estado, [k]: v });

  const guardar = async () => {
    const cliente = await crear.mutateAsync(aDatos(estado, r.capturados));
    navigate(`/clientes/${encodeURIComponent(cliente.id)}?pestana=contactos`);
  };

  const intentar = () => {
    setIntentado(true);
    if (r.numErrores > 0) return;
    if (r.confirmaciones.length > 0) setConfirmar(true);
    else void guardar();
  };

  return (
    <form
      className={styles.pagina}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        intentar();
      }}
    >
      <div className={styles.migas}>
        <Link to="/clientes">Clientes</Link> / Registrar cliente
      </div>
      <header>
        <h1 className={styles.titulo}>Registrar cliente</h1>
        <p className={styles.subtitulo}>
          Los contactos que autorizan presupuestos son a quienes el alta de O.S. les manda la cotización.
        </p>
      </header>

      <Surface as="section" aria-labelledby="sec-datos" className={styles.bloque}>
        <h2 id="sec-datos" className={styles.bloqueTitulo}>Datos del cliente</h2>
        <div className={styles.rejilla2}>
          <Campo etiqueta="Razón social" obligatorio error={errores.razonSocial}>
            {(p) => <Input {...p} autoComplete="organization" value={estado.razonSocial} onChange={(x) => set("razonSocial", x.target.value)} />}
          </Campo>
          <Campo etiqueta="RFC" obligatorio error={errores.rfc} ayuda="12 caracteres para persona moral, 13 para física.">
            {(p) => (
              <Input {...p} autoComplete="off" maxLength={15} value={estado.rfc} onChange={(x) => set("rfc", x.target.value.toUpperCase())} />
            )}
          </Campo>
          <Campo etiqueta="Tipo" obligatorio>
            {(p) => (
              <Select {...p} value={estado.tipo} onChange={(x) => set("tipo", x.target.value as TipoCliente)}>
                {(Object.keys(TIPO_CLIENTE) as TipoCliente[]).map((t) => (
                  <option key={t} value={t}>{TIPO_CLIENTE[t]}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta="Ejecutivo de cuenta" obligatorio error={errores.ejecutivoCuenta}>
            {(p) => <Input {...p} value={estado.ejecutivoCuenta} onChange={(x) => set("ejecutivoCuenta", x.target.value)} />}
          </Campo>
          <Campo
            etiqueta="Convenio"
            ayuda="Clave del convenio, si tiene. Vacío: se cotiza con tarifas de lista."
          >
            {(p) => <Input {...p} value={estado.convenioId} onChange={(x) => set("convenioId", x.target.value)} />}
          </Campo>
          <SoloLectura etiqueta="Estado">Activo · el crédito lo suspende Tesorería, no el alta</SoloLectura>
        </div>
        {estado.tipo === "flotilla" && (
          <Aviso titulo="A las flotillas no se les cobra diagnóstico.">Se aplica automáticamente en sus O.S.</Aviso>
        )}
      </Surface>

      <Surface as="section" aria-labelledby="sec-contactos" className={styles.bloque}>
        <h2 id="sec-contactos" className={styles.bloqueTitulo}>Contactos de autorización</h2>
        <p className={styles.nota}>
          Marca quién puede autorizar presupuestos y por qué canal prefiere recibirlos. Pueden ser varios.
        </p>
        <EditorContactos contactos={estado.contactos} onCambiar={(c) => set("contactos", c)} errores={erroresContacto} />
      </Surface>

      {crear.error && <Aviso tono="critico" titulo={crear.error.message} />}

      <Surface variante="strong" elevacion="float" className={styles.pie}>
        {intentado && r.numErrores > 0 && (
          <span className={styles.resumenErrores} role="alert">
            Revisa los campos marcados.
          </span>
        )}
        <Link to="/clientes">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Registrar cliente"}
        </Button>
      </Surface>

      <Dialogo
        abierto={confirmar}
        titulo="Antes de registrar"
        confirmar="Registrar de todos modos"
        onCancelar={() => setConfirmar(false)}
        onConfirmar={() => {
          setConfirmar(false);
          void guardar();
        }}
      >
        {r.confirmaciones.map((c) => (
          <p key={c}>{c}</p>
        ))}
      </Dialogo>
    </form>
  );
}

Component.displayName = "NuevoCliente";

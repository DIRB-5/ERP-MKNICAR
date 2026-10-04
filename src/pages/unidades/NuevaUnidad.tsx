import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura } from "@/components/Campo/Campo";
import { Buscador, type OpcionBusqueda } from "@/components/Buscador/Buscador";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import type { Cliente, DatosAltaUnidad, TipoUnidad } from "@/domain/tipos";
import { useCliente, useClientes, useCrearUnidad } from "@/data/consultas";
import { TALLERES } from "@/app/navegacion";
import { normalizarPlacas, revisarAnio, revisarPlacas, revisarVin } from "@/app/validacionesUnidad";
import { useTallerPorDefecto } from "@/pages/ordenes/ingreso/useTallerPorDefecto";
import { TIPO_UNIDAD } from "@/pages/catalogos/etiquetas";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";
import { CamposFicha, aFicha, fichaVacia, revisarFicha, type FichaEditable } from "./CamposFicha";

const TODO_EL_PADRON = TALLERES[0];

interface EstadoUnidad {
  cliente: Cliente | null;
  clienteTexto: string;
  placas: string;
  vin: string;
  numeroEconomico: string;
  marca: string;
  modelo: string;
  anio: string;
  tipo: TipoUnidad;
  tallerBaseId: string;
  kilometraje: string;
  fechaKilometraje: string;
  /** Ficha técnica: todo opcional. */
  ficha: FichaEditable;
}

type CampoUnidad = keyof Omit<EstadoUnidad, "clienteTexto" | "numeroEconomico" | "tipo" | "ficha">;

const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

function revisar(e: EstadoUnidad): Partial<Record<CampoUnidad, string>> {
  const errores: Partial<Record<CampoUnidad, string>> = {};
  if (!e.cliente) errores.cliente = "Elige el cliente dueño de la unidad.";
  const placas = revisarPlacas(e.placas);
  if (placas) errores.placas = placas;
  const vin = revisarVin(e.vin);
  if (vin) errores.vin = vin;
  if (!e.marca.trim()) errores.marca = "Captura la marca.";
  if (!e.modelo.trim()) errores.modelo = "Captura el modelo.";
  const anio = revisarAnio(e.anio);
  if (anio) errores.anio = anio;
  if (!e.tallerBaseId) errores.tallerBaseId = "Elige el taller que la atiende normalmente.";
  if (e.kilometraje.trim() === "") errores.kilometraje = "Captura el kilometraje u horómetro actual.";
  if (!e.fechaKilometraje) errores.fechaKilometraje = "Indica la fecha de la lectura.";
  else if (e.fechaKilometraje > hoyISO()) errores.fechaKilometraje = "No puede ser una fecha futura.";

  return errores;
}

function aDatos(e: EstadoUnidad): DatosAltaUnidad {
  return {
    placas: normalizarPlacas(e.placas),
    vin: e.vin.trim().toUpperCase(),
    numeroEconomico: e.numeroEconomico.trim() || undefined,
    marca: e.marca.trim(),
    modelo: e.modelo.trim(),
    anio: Number(e.anio),
    tipo: e.tipo,
    clienteId: (e.cliente as Cliente).id,
    tallerBaseId: e.tallerBaseId,
    kilometrajeUltimo: Number(e.kilometraje),
    fechaKilometraje: e.fechaKilometraje,
    ficha: aFicha(e.ficha),
  };
}

export function Component() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const crear = useCrearUnidad();
  const tallerDefecto = useTallerPorDefecto();

  // Desde el expediente de un cliente se llega con ?cliente=id: el cliente ya viene elegido.
  const clienteParam = params.get("cliente") ?? "";
  const { data: clientePrevio } = useCliente(clienteParam);

  const [estado, setEstado] = useState<EstadoUnidad>(() => ({
    cliente: null,
    clienteTexto: "",
    placas: "",
    vin: "",
    numeroEconomico: "",
    marca: "",
    modelo: "",
    anio: "",
    tipo: "combustion",
    tallerBaseId: tallerDefecto,
    kilometraje: "",
    fechaKilometraje: hoyISO(),
    ficha: fichaVacia(),
  }));
  const [intentado, setIntentado] = useState(false);
  const [precargado, setPrecargado] = useState(false);

  // El cliente de la URL llega asíncrono; se aplica una sola vez para no pisar lo que el usuario cambie.
  if (clientePrevio && !precargado) {
    setPrecargado(true);
    setEstado({ ...estado, cliente: clientePrevio, clienteTexto: clientePrevio.razonSocial });
  }

  const { data: clientes, isFetching } = useClientes({ alcance: TODO_EL_PADRON, texto: estado.clienteTexto || undefined });
  const opciones: OpcionBusqueda[] = (clientes ?? []).slice(0, 20).map((c) => ({
    id: c.cliente.id,
    etiqueta: c.cliente.razonSocial,
    detalle: c.cliente.rfc,
  }));

  const erroresTodos = revisar(estado);
  const erroresFichaTodos = revisarFicha(estado.ficha);
  const errores = intentado ? erroresTodos : {};
  const erroresFicha = intentado ? erroresFichaTodos : {};
  const numErrores = Object.keys(erroresTodos).length + Object.keys(erroresFichaTodos).length;
  const set = <K extends keyof EstadoUnidad>(k: K, v: EstadoUnidad[K]) => setEstado({ ...estado, [k]: v });

  const guardar = async () => {
    setIntentado(true);
    if (numErrores > 0) return;
    const unidad = await crear.mutateAsync(aDatos(estado));
    navigate(`/unidades/${encodeURIComponent(unidad.placas)}`);
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
        <Link to="/unidades">Unidades</Link> / Registrar unidad
      </div>
      <header>
        <h1 className={f.titulo}>Registrar unidad</h1>
        <p className={f.subtitulo}>
          Alta completa en el padrón. Si la unidad ya está en el taller y falta el VIN, usa el alta rápida desde el
          ingreso directo.
        </p>
      </header>

      <Surface as="section" aria-labelledby="sec-propietario" className={f.bloque}>
        <h2 id="sec-propietario" className={f.bloqueTitulo}>Cliente</h2>
        <Campo etiqueta="Cliente" obligatorio error={errores.cliente}>
          {(p) => (
            <Buscador
              {...p}
              placeholder="Razón social o RFC"
              texto={estado.clienteTexto}
              onTexto={(t) => set("clienteTexto", t)}
              opciones={opciones}
              cargando={isFetching}
              seleccion={estado.cliente ? { id: estado.cliente.id, etiqueta: estado.cliente.razonSocial } : null}
              onSeleccionar={(o) =>
                setEstado({
                  ...estado,
                  cliente: (clientes ?? []).find((c) => c.cliente.id === o?.id)?.cliente ?? null,
                  clienteTexto: o?.etiqueta ?? estado.clienteTexto,
                })
              }
              sinResultados={
                <>
                  Ningún cliente coincide. <Link to="/clientes/nuevo">Registrar cliente</Link>
                </>
              }
            />
          )}
        </Campo>
        {estado.cliente?.estado === "credito_suspendido" && (
          <Aviso tono="critico" titulo={`${estado.cliente.razonSocial} tiene el crédito suspendido`}>
            Se puede registrar la unidad; Dirección debe saberlo antes de autorizar compras para ella.
          </Aviso>
        )}
      </Surface>

      <Surface as="section" aria-labelledby="sec-vehiculo" className={f.bloque}>
        <h2 id="sec-vehiculo" className={f.bloqueTitulo}>Vehículo</h2>
        <div className={f.rejilla3}>
          <Campo etiqueta="Placas" obligatorio error={errores.placas}>
            {(p) => <Input {...p} autoComplete="off" value={estado.placas} onChange={(x) => set("placas", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="VIN" obligatorio error={errores.vin} ayuda="Número de serie, 17 caracteres.">
            {(p) => (
              <Input {...p} autoComplete="off" maxLength={17} value={estado.vin} onChange={(x) => set("vin", x.target.value.toUpperCase().replace(/\s/g, ""))} />
            )}
          </Campo>
          <Campo etiqueta="Número económico" ayuda="El que usa el cliente para identificarla, si tiene.">
            {(p) => <Input {...p} autoComplete="off" value={estado.numeroEconomico} onChange={(x) => set("numeroEconomico", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Marca" obligatorio error={errores.marca}>
            {(p) => <Input {...p} value={estado.marca} onChange={(x) => set("marca", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Modelo" obligatorio error={errores.modelo}>
            {(p) => <Input {...p} value={estado.modelo} onChange={(x) => set("modelo", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Año modelo" obligatorio error={errores.anio}>
            {(p) => (
              <Input {...p} inputMode="numeric" maxLength={4} value={estado.anio} onChange={(x) => set("anio", x.target.value.replace(/\D/g, ""))} />
            )}
          </Campo>
          <Campo etiqueta="Motorización" obligatorio>
            {(p) => (
              <Select {...p} value={estado.tipo} onChange={(x) => set("tipo", x.target.value as TipoUnidad)}>
                {(Object.keys(TIPO_UNIDAD) as TipoUnidad[]).map((t) => (
                  <option key={t} value={t}>{TIPO_UNIDAD[t]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
      </Surface>

      <Surface as="section" aria-labelledby="sec-ficha" className={f.bloque}>
        <h2 id="sec-ficha" className={f.bloqueTitulo}>Ficha técnica</h2>
        <CamposFicha idBase="alta-completa" valor={estado.ficha} onCambiar={(x) => set("ficha", x)} errores={erroresFicha} />
      </Surface>

      <Surface as="section" aria-labelledby="sec-operacion" className={f.bloque}>
        <h2 id="sec-operacion" className={f.bloqueTitulo}>Operación</h2>
        <div className={f.rejilla3}>
          <Campo
            etiqueta="Taller base"
            obligatorio
            error={errores.tallerBaseId}
            ayuda="El que la atiende normalmente. Dónde está en cada momento lo dice su O.S. abierta."
          >
            {(p) => (
              <Select {...p} value={estado.tallerBaseId} onChange={(x) => set("tallerBaseId", x.target.value)}>
                <option value="">Elige un taller</option>
                {TALLERES.slice(1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            )}
          </Campo>
          <Campo etiqueta={estado.ficha.unidadOdometro === "km" ? "Kilometraje u horómetro" : "Millaje u horómetro"} obligatorio error={errores.kilometraje}>
            {(p) => (
              <Input {...p} inputMode="numeric" value={estado.kilometraje} onChange={(x) => set("kilometraje", x.target.value.replace(/\D/g, ""))} />
            )}
          </Campo>
          <Campo etiqueta="Fecha de la lectura" obligatorio error={errores.fechaKilometraje}>
            {(p) => <Input {...p} type="date" max={hoyISO()} value={estado.fechaKilometraje} onChange={(x) => set("fechaKilometraje", x.target.value)} />}
          </Campo>
          <SoloLectura etiqueta="Estado">Activa</SoloLectura>
        </div>
      </Surface>

      {crear.error && <Aviso tono="critico" titulo={crear.error.message} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        <Link to="/unidades">Cancelar</Link>
        <Button type="submit" variante="primario" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Registrar unidad"}
        </Button>
      </Surface>
    </form>
  );
}

Component.displayName = "NuevaUnidad";

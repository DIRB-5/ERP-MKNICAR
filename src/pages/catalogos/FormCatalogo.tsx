import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Campo, Input, Select, SoloLectura, Textarea } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Aviso } from "@/components/Aviso/Aviso";
import { Dialogo } from "@/components/Dialogo/Dialogo";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { CATALOGOS, esClaveCatalogo, type CampoCatalogo, type CatalogoDef } from "@/domain/catalogos";
import type { RegistroCatalogo, ValorCampo } from "@/domain/tipos";
import { useCambiarActivo, useGuardarRegistro, useRegistro } from "@/data/consultas";
import { TALLERES } from "@/app/navegacion";
import { useTaller } from "@/app/useTaller";
import { ChipActivo, mostrarValor } from "./valores";
import { useReferencias } from "./referencias";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";

type Borrador = Record<string, string | boolean>;

const NUMERICOS = new Set<CampoCatalogo["tipo"]>(["numero", "moneda", "porcentaje"]);

/** Valor guardado → texto de captura. */
function aBorrador(def: CatalogoDef, r: RegistroCatalogo | null): Borrador {
  return Object.fromEntries(
    def.campos.map((c) => {
      const v = r?.valores[c.clave];
      if (c.tipo === "booleano") return [c.clave, Boolean(v)];
      return [c.clave, v == null ? "" : String(v)];
    })
  );
}

/** Texto de captura → valor guardado. Vacío se guarda como null. */
function aValores(def: CatalogoDef, b: Borrador): Record<string, ValorCampo> {
  return Object.fromEntries(
    def.campos
      .filter((c) => !c.soloLectura)
      .map((c) => {
        const v = b[c.clave];
        if (c.tipo === "booleano") return [c.clave, Boolean(v)];
        const t = String(v ?? "").trim();
        if (!t) return [c.clave, null];
        return [c.clave, NUMERICOS.has(c.tipo) ? Number(t) : t];
      })
  );
}

function revisar(def: CatalogoDef, b: Borrador, tallerId: string): Record<string, string> {
  const errores: Record<string, string> = {};
  if (def.porTaller && !tallerId) errores.__taller = "Elige el taller al que pertenece.";
  for (const c of def.campos) {
    if (c.soloLectura || c.tipo === "booleano") continue;
    const t = String(b[c.clave] ?? "").trim();
    if (c.requerido && !t) {
      errores[c.clave] = c.tipo === "seleccion" || c.tipo === "referencia" ? "Elige una opción." : "Este dato es obligatorio.";
      continue;
    }
    if (!t || !NUMERICOS.has(c.tipo)) continue;
    const n = Number(t);
    if (!Number.isFinite(n)) errores[c.clave] = "Debe ser un número.";
    else if (c.tipo === "moneda" && n < 0) errores[c.clave] = "No puede ser negativo.";
    else if (c.tipo === "porcentaje" && (n < 0 || n > 100)) errores[c.clave] = "Entre 0 y 100.";
  }
  return errores;
}

function Formulario({ def, registro }: { def: CatalogoDef; registro: RegistroCatalogo | null }) {
  const navigate = useNavigate();
  const alcance = useTaller();
  const guardar = useGuardarRegistro(def.clave);
  const activo = useCambiarActivo(def.clave);
  const referencias = useReferencias(def, alcance);

  const [borrador, setBorrador] = useState<Borrador>(() => aBorrador(def, registro));
  const [tallerId, setTallerId] = useState(registro?.tallerId ?? (alcance === TALLERES[0] ? "" : alcance));
  const [intentado, setIntentado] = useState(false);
  const [confirmarBaja, setConfirmarBaja] = useState(false);

  const todosErrores = revisar(def, borrador, tallerId);
  const errores = intentado ? todosErrores : {};
  const numErrores = Object.keys(todosErrores).length;
  const set = (k: string, v: string | boolean) => setBorrador((b) => ({ ...b, [k]: v }));
  const lista = `/catalogos/${def.clave}`;

  const enviar = () => {
    setIntentado(true);
    if (numErrores > 0) return;
    guardar.mutate(
      { id: registro?.id ?? null, valores: aValores(def, borrador), tallerId: def.porTaller ? tallerId : null },
      { onSuccess: () => navigate(lista) }
    );
  };

  const control = (c: CampoCatalogo) => {
    if (c.soloLectura) {
      return (
        <SoloLectura key={c.clave} etiqueta={c.etiqueta}>
          {mostrarValor(c, registro?.valores[c.clave], referencias)}
        </SoloLectura>
      );
    }
    if (c.tipo === "booleano") {
      return (
        <label key={c.clave} className={f.casilla}>
          <input type="checkbox" checked={Boolean(borrador[c.clave])} onChange={(x) => set(c.clave, x.target.checked)} />
          {c.etiqueta}
        </label>
      );
    }
    const valor = String(borrador[c.clave] ?? "");
    return (
      <Campo key={c.clave} etiqueta={c.etiqueta} obligatorio={c.requerido} error={errores[c.clave]} ayuda={c.ayuda}>
        {(p) => {
          switch (c.tipo) {
            case "textoLargo":
              return <Textarea {...p} value={valor} onChange={(x) => set(c.clave, x.target.value)} />;
            case "seleccion":
              return (
                <Select {...p} value={valor} onChange={(x) => set(c.clave, x.target.value)}>
                  <option value="">Elige una</option>
                  {(c.opciones ?? []).map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </Select>
              );
            case "referencia":
              return (
                <Select {...p} value={valor} onChange={(x) => set(c.clave, x.target.value)}>
                  <option value="">{referencias.size === 0 ? "Sin registros todavía" : "Elige uno"}</option>
                  {[...referencias].map(([id, etiqueta]) => (
                    <option key={id} value={id}>{etiqueta}</option>
                  ))}
                </Select>
              );
            case "numero":
            case "moneda":
            case "porcentaje":
              return (
                <Input
                  {...p}
                  inputMode="decimal"
                  value={valor}
                  onChange={(x) => set(c.clave, x.target.value.replace(/[^\d.-]/g, ""))}
                />
              );
            default:
              return <Input {...p} value={valor} onChange={(x) => set(c.clave, x.target.value)} />;
          }
        }}
      </Campo>
    );
  };

  const largos = def.campos.filter((c) => c.tipo === "textoLargo");
  const cortos = def.campos.filter((c) => c.tipo !== "textoLargo");

  return (
    <form
      className={f.pagina}
      noValidate
      onSubmit={(ev) => {
        ev.preventDefault();
        enviar();
      }}
    >
      <div className={f.migas}>
        <Link to="/catalogos">Catálogos</Link> / <Link to={lista}>{def.nombre}</Link> /{" "}
        {registro ? "Editar" : `Nuevo ${def.nombreSingular}`}
      </div>
      <header className={f.encabezado}>
        <div>
          <h1 className={f.titulo}>{registro ? `Editar ${def.nombreSingular}` : `Nuevo ${def.nombreSingular}`}</h1>
          <p className={f.subtitulo}>{def.descripcion}</p>
        </div>
        {registro && <ChipActivo activo={registro.activo} />}
      </header>

      {registro && !registro.activo && (
        <Aviso titulo={`Este ${def.nombreSingular} está dado de baja.`}>
          No aparece en las listas ni se puede usar en nuevas O.S. Reactívalo si vuelve a usarse.
        </Aviso>
      )}

      <Surface className={f.bloque}>
        {def.porTaller && (
          <Campo etiqueta="Taller" obligatorio error={errores.__taller}>
            {(p) => (
              <Select {...p} value={tallerId} onChange={(x) => setTallerId(x.target.value)}>
                <option value="">Elige un taller</option>
                {TALLERES.slice(1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>
            )}
          </Campo>
        )}
        <div className={f.rejilla2}>{cortos.map(control)}</div>
        {largos.map(control)}
      </Surface>

      {(guardar.error || activo.error) && <Aviso tono="critico" titulo={(guardar.error ?? activo.error)?.message ?? ""} />}

      <Surface variante="strong" elevacion="float" className={f.pie}>
        {intentado && numErrores > 0 && (
          <span className={f.resumenErrores} role="alert">
            Revisa {numErrores} {numErrores === 1 ? "campo" : "campos"} marcados.
          </span>
        )}
        {registro &&
          (registro.activo ? (
            <Button variante="fantasma" onClick={() => setConfirmarBaja(true)}>
              Dar de baja
            </Button>
          ) : (
            <Button
              variante="fantasma"
              disabled={activo.isPending}
              onClick={() => activo.mutate({ id: registro.id, activo: true }, { onSuccess: () => navigate(lista) })}
            >
              Reactivar
            </Button>
          ))}
        <Link to={lista}>Cancelar</Link>
        <Button type="submit" variante="primario" disabled={guardar.isPending}>
          {guardar.isPending ? "Guardando…" : registro ? "Guardar cambios" : `Registrar ${def.nombreSingular}`}
        </Button>
      </Surface>

      {registro && (
        <Dialogo
          abierto={confirmarBaja}
          titulo={`¿Dar de baja este ${def.nombreSingular}?`}
          confirmar="Dar de baja"
          cancelar="Cancelar"
          confirmando={activo.isPending}
          onCancelar={() => setConfirmarBaja(false)}
          onConfirmar={() =>
            activo.mutate(
              { id: registro.id, activo: false },
              {
                onSuccess: () => {
                  setConfirmarBaja(false);
                  navigate(lista);
                },
              }
            )
          }
        >
          <p>
            Deja de aparecer en las listas y no se podrá usar en nuevas O.S. Lo ya registrado no cambia, y se puede
            reactivar después.
          </p>
        </Dialogo>
      )}
    </form>
  );
}

export function Component() {
  const { clave, id = "nuevo" } = useParams();
  const valida = esClaveCatalogo(clave);
  const { data: registro, isPending } = useRegistro(valida ? clave : "servicios", valida && id !== "nuevo" ? id : "");

  if (!valida) {
    return (
      <EmptyState titulo="Ese catálogo no existe">
        <Link to="/catalogos">Ver todos los catálogos</Link>
      </EmptyState>
    );
  }
  const def = CATALOGOS[clave];
  if (id !== "nuevo") {
    if (isPending) return <EmptyState titulo="Cargando…" />;
    if (!registro) {
      return (
        <EmptyState titulo={`No encontramos este ${def.nombreSingular}`}>
          <Link to={`/catalogos/${def.clave}`}>Volver a {def.nombre.toLowerCase()}</Link>
        </EmptyState>
      );
    }
  }
  return <Formulario key={`${clave}-${id}`} def={def} registro={id === "nuevo" ? null : registro ?? null} />;
}

Component.displayName = "FormCatalogo";

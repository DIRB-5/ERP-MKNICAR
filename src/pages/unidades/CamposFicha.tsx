import { Campo, Input, Select } from "@/components/Campo/Campo";
import type { ArbolLevas, FichaTecnica, UnidadOdometro } from "@/domain/tipos";
import f from "@/pages/ordenes/ingreso/Formulario.module.css";

/** Ficha técnica en edición: todo texto, se convierte al guardar. */
export interface FichaEditable {
  tipoVehiculo: string;
  subModelo: string;
  color: string;
  unidadOdometro: UnidadOdometro;
  tipoLlanta: string;
  rendimientoLlanta: string;
  medidaDelantera: string;
  medidaTrasera: string;
  tanque: string;
  motorLitros: string;
  motorCodigo: string;
  motorValvulas: string;
  motorCc: string;
  motorCilindros: string;
  arbolLevas: ArbolLevas | "";
}

export type ErroresFicha = Partial<Record<keyof FichaEditable, string>>;

export const fichaVacia = (): FichaEditable => ({
  tipoVehiculo: "",
  subModelo: "",
  color: "",
  unidadOdometro: "km",
  tipoLlanta: "",
  rendimientoLlanta: "",
  medidaDelantera: "",
  medidaTrasera: "",
  tanque: "",
  motorLitros: "",
  motorCodigo: "",
  motorValvulas: "",
  motorCc: "",
  motorCilindros: "",
  arbolLevas: "",
});

/** Sugerencias; se puede escribir otro tipo. */
const TIPOS_VEHICULO = ["Automóvil", "Pickup", "Camioneta", "Van", "Camión ligero", "Camión mediano", "Tractocamión", "Autobús"] as const;
const ARBOL_LEVAS: Record<ArbolLevas, string> = { ohv: "OHV (varillas)", sohc: "SOHC (un árbol)", dohc: "DOHC (doble árbol)" };

/** Campo numérico opcional: vacío es válido; si trae algo, debe caer en el rango. */
function revisarRango(v: string, min: number, max: number, unidad: string): string | undefined {
  if (!v.trim()) return undefined;
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) return `Entre ${min.toLocaleString("es-MX")} y ${max.toLocaleString("es-MX")} ${unidad}.`;
  return undefined;
}

export function revisarFicha(e: FichaEditable): ErroresFicha {
  const errores: ErroresFicha = {};
  const rangos: [keyof FichaEditable, string | undefined][] = [
    ["rendimientoLlanta", revisarRango(e.rendimientoLlanta, 1_000, 500_000, "km")],
    ["tanque", revisarRango(e.tanque, 1, 2_000, "litros")],
    ["motorLitros", revisarRango(e.motorLitros, 0.5, 20, "litros")],
    ["motorValvulas", revisarRango(e.motorValvulas, 2, 64, "válvulas")],
    ["motorCc", revisarRango(e.motorCc, 500, 20_000, "cc")],
    ["motorCilindros", revisarRango(e.motorCilindros, 1, 16, "cilindros")],
  ];
  for (const [campo, error] of rangos) if (error) errores[campo] = error;
  return errores;
}

const numeroOpcional = (v: string): number | null => (v.trim() ? Number(v) : null);

export function aFicha(e: FichaEditable): FichaTecnica {
  return {
    tipoVehiculo: e.tipoVehiculo.trim(),
    subModelo: e.subModelo.trim(),
    color: e.color.trim(),
    unidadOdometro: e.unidadOdometro,
    tipoLlanta: e.tipoLlanta.trim(),
    rendimientoLlantaKm: numeroOpcional(e.rendimientoLlanta),
    medidaLlantaDelantera: e.medidaDelantera.trim().toUpperCase(),
    medidaLlantaTrasera: e.medidaTrasera.trim().toUpperCase(),
    capacidadTanqueLitros: numeroOpcional(e.tanque),
    motorLitros: numeroOpcional(e.motorLitros),
    motorCodigo: e.motorCodigo.trim().toUpperCase(),
    motorValvulas: numeroOpcional(e.motorValvulas),
    motorCc: numeroOpcional(e.motorCc),
    motorCilindros: numeroOpcional(e.motorCilindros),
    arbolLevas: e.arbolLevas || null,
  };
}

/** true si se capturó algo además de la unidad del odómetro. */
export const hayFicha = (e: FichaEditable): boolean =>
  (Object.keys(e) as (keyof FichaEditable)[]).some((k) => k !== "unidadOdometro" && String(e[k]).trim() !== "");

const soloDigitos = (v: string) => v.replace(/\D/g, "");

interface Props {
  valor: FichaEditable;
  onCambiar: (siguiente: FichaEditable) => void;
  errores: ErroresFicha;
  /** Prefijo para los ids de los datalist cuando hay dos fichas en la misma página. */
  idBase: string;
}

/** Campos de la ficha técnica, compartidos por el alta completa y la alta rápida del ingreso. */
export function CamposFicha({ valor: e, onCambiar, errores, idBase }: Props) {
  const set = <K extends keyof FichaEditable>(k: K, v: FichaEditable[K]) => onCambiar({ ...e, [k]: v });
  const lista = `${idBase}-tipos-vehiculo`;

  return (
    <>
      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Identificación</legend>
        <div className={f.rejilla4}>
          <Campo etiqueta="Tipo de vehículo">
            {(p) => (
              <>
                <Input {...p} list={lista} value={e.tipoVehiculo} onChange={(x) => set("tipoVehiculo", x.target.value)} />
                <datalist id={lista}>
                  {TIPOS_VEHICULO.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </>
            )}
          </Campo>
          <Campo etiqueta="Sub modelo" ayuda="Cabina doble, chasis largo, XE…">
            {(p) => <Input {...p} value={e.subModelo} onChange={(x) => set("subModelo", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Color">
            {(p) => <Input {...p} value={e.color} onChange={(x) => set("color", x.target.value)} />}
          </Campo>
          <Campo etiqueta="El odómetro mide en">
            {(p) => (
              <Select {...p} value={e.unidadOdometro} onChange={(x) => set("unidadOdometro", x.target.value as UnidadOdometro)}>
                <option value="km">Kilómetros</option>
                <option value="mi">Millas</option>
              </Select>
            )}
          </Campo>
        </div>
      </fieldset>

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Llantas y combustible</legend>
        <div className={f.rejilla3}>
          <Campo etiqueta="Tipo de llanta" ayuda="Bajo rendimiento, alto rendimiento, tracción…">
            {(p) => <Input {...p} value={e.tipoLlanta} onChange={(x) => set("tipoLlanta", x.target.value)} />}
          </Campo>
          <Campo etiqueta="Rendimiento de la llanta (km)" error={errores.rendimientoLlanta} ayuda="Sirve para proyectar el cambio.">
            {(p) => <Input {...p} inputMode="numeric" value={e.rendimientoLlanta} onChange={(x) => set("rendimientoLlanta", soloDigitos(x.target.value))} />}
          </Campo>
          <Campo etiqueta="Capacidad del tanque (litros)" error={errores.tanque}>
            {(p) => <Input {...p} inputMode="numeric" value={e.tanque} onChange={(x) => set("tanque", soloDigitos(x.target.value))} />}
          </Campo>
          <Campo etiqueta="Medida llantas delanteras" ayuda="Por ejemplo 265/70 R17.">
            {(p) => <Input {...p} value={e.medidaDelantera} onChange={(x) => set("medidaDelantera", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="Medida llantas traseras" ayuda="Vacío si es igual a las delanteras.">
            {(p) => <Input {...p} value={e.medidaTrasera} onChange={(x) => set("medidaTrasera", x.target.value.toUpperCase())} />}
          </Campo>
        </div>
      </fieldset>

      <fieldset className={f.seccion}>
        <legend className={f.seccionTitulo}>Motor</legend>
        <div className={f.rejilla3}>
          <Campo etiqueta="Litros" error={errores.motorLitros} ayuda="Desplazamiento, p. ej. 2.5.">
            {(p) => <Input {...p} inputMode="decimal" value={e.motorLitros} onChange={(x) => set("motorLitros", x.target.value.replace(/[^\d.]/g, ""))} />}
          </Campo>
          <Campo etiqueta="Código de motor">
            {(p) => <Input {...p} autoComplete="off" value={e.motorCodigo} onChange={(x) => set("motorCodigo", x.target.value.toUpperCase())} />}
          </Campo>
          <Campo etiqueta="Cilindros" error={errores.motorCilindros}>
            {(p) => <Input {...p} inputMode="numeric" maxLength={2} value={e.motorCilindros} onChange={(x) => set("motorCilindros", soloDigitos(x.target.value))} />}
          </Campo>
          <Campo etiqueta="Válvulas" error={errores.motorValvulas}>
            {(p) => <Input {...p} inputMode="numeric" maxLength={2} value={e.motorValvulas} onChange={(x) => set("motorValvulas", soloDigitos(x.target.value))} />}
          </Campo>
          <Campo etiqueta="CC" error={errores.motorCc} ayuda="Centímetros cúbicos.">
            {(p) => <Input {...p} inputMode="numeric" maxLength={5} value={e.motorCc} onChange={(x) => set("motorCc", soloDigitos(x.target.value))} />}
          </Campo>
          <Campo etiqueta="Árbol de levas">
            {(p) => (
              <Select {...p} value={e.arbolLevas} onChange={(x) => set("arbolLevas", x.target.value as ArbolLevas | "")}>
                <option value="">Sin especificar</option>
                {(Object.keys(ARBOL_LEVAS) as ArbolLevas[]).map((a) => (
                  <option key={a} value={a}>{ARBOL_LEVAS[a]}</option>
                ))}
              </Select>
            )}
          </Campo>
        </div>
      </fieldset>
    </>
  );
}

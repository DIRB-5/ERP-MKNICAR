import { Link } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { numero } from "@/domain/format";
import type { ArbolLevas, FichaTecnica } from "@/domain/tipos";
import s from "./FichaTecnicaPanel.module.css";

const ARBOL: Record<ArbolLevas, string> = { ohv: "OHV", sohc: "SOHC", dohc: "DOHC" };

const texto = (v: string) => v.trim() || "—";
const cifra = (v: number | null, unidad = "") => (v == null ? "—" : `${numero(v)}${unidad ? ` ${unidad}` : ""}`);

/** Primer perfil técnico del vehículo: identificación, llantas, combustible y motor. */
export function FichaTecnicaPanel({ ficha }: { ficha?: FichaTecnica }) {
  if (!ficha) {
    return (
      <Panel titulo="Ficha técnica" subtitulo="Llantas, combustible y motor">
        <EmptyState titulo="Esta unidad no tiene ficha técnica">
          Se registró con el alta rápida del ingreso. La ficha completa se captura al darla de alta en el padrón.
          <div className={s.acciones}>
            <Link to="/unidades/nueva">Alta completa de unidad</Link>
          </div>
        </EmptyState>
      </Panel>
    );
  }

  const grupos: { titulo: string; datos: [string, string][] }[] = [
    {
      titulo: "Identificación",
      datos: [
        ["Tipo de vehículo", texto(ficha.tipoVehiculo)],
        ["Sub modelo", texto(ficha.subModelo)],
        ["Color", texto(ficha.color)],
        ["Odómetro", ficha.unidadOdometro === "mi" ? "Millas" : "Kilómetros"],
      ],
    },
    {
      titulo: "Llantas y combustible",
      datos: [
        ["Tipo de llanta", texto(ficha.tipoLlanta)],
        ["Rendimiento", cifra(ficha.rendimientoLlantaKm, "km")],
        ["Delanteras", texto(ficha.medidaLlantaDelantera)],
        ["Traseras", ficha.medidaLlantaTrasera.trim() || (ficha.medidaLlantaDelantera.trim() ? "Igual a delanteras" : "—")],
        ["Tanque", cifra(ficha.capacidadTanqueLitros, "L")],
      ],
    },
    {
      titulo: "Motor",
      datos: [
        ["Litros", ficha.motorLitros == null ? "—" : `${ficha.motorLitros.toFixed(1)} L`],
        ["Código", texto(ficha.motorCodigo)],
        ["Cilindros", cifra(ficha.motorCilindros)],
        ["Válvulas", cifra(ficha.motorValvulas)],
        ["CC", cifra(ficha.motorCc)],
        ["Árbol de levas", ficha.arbolLevas ? ARBOL[ficha.arbolLevas] : "—"],
      ],
    },
  ];

  return (
    <Panel titulo="Ficha técnica" subtitulo="Llantas, combustible y motor">
      <div className={s.grupos}>
        {grupos.map((g) => (
          <section key={g.titulo} aria-label={g.titulo}>
            <h3 className={s.titulo}>{g.titulo}</h3>
            <dl className={s.datos}>
              {g.datos.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Panel>
  );
}

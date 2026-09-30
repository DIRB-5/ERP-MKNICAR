import { useSearchParams } from "react-router-dom";
import { Panel } from "@/components/Panel/Panel";
import { Folio } from "@/components/Folio/Folio";
import { numero } from "@/domain/format";
import { useEntregas, type EntregaComprometida, type SituacionEntrega } from "@/app/useEntregas";
import { useTaller } from "@/app/useTaller";
import styles from "./CalendarioEntregas.module.css";

const SITUACION: Record<SituacionEntrega, string> = {
  lista: "Lista",
  en_proceso: "En proceso",
  en_riesgo: "En riesgo",
  entregada: "Entregada",
};

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"] as const;

const MES_ANIO = new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" });

const dosDigitos = (n: number) => String(n).padStart(2, "0");
const claveMes = (d: Date) => `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}`;
const claveDia = (d: Date) => `${claveMes(d)}-${dosDigitos(d.getDate())}`;

/** "2026-09" → primer día del mes en hora local. Un valor inválido cae en el mes actual. */
function inicioDeMes(clave: string | null): Date {
  const m = clave?.match(/^(\d{4})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, 1);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const hoy = new Date();
  return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
}

/** Semanas completas de lunes a domingo que cubren el mes. */
function celdas(inicio: Date): Date[] {
  const desfase = (inicio.getDay() + 6) % 7;
  const primera = new Date(inicio.getFullYear(), inicio.getMonth(), 1 - desfase);
  const diasMes = new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  const total = Math.ceil((desfase + diasMes) / 7) * 7;
  return Array.from(
    { length: total },
    (_, i) => new Date(primera.getFullYear(), primera.getMonth(), primera.getDate() + i)
  );
}

export function CalendarioEntregas() {
  const taller = useTaller();
  const [params, setParams] = useSearchParams();
  const inicio = inicioDeMes(params.get("mes"));
  const mes = claveMes(inicio);
  const entregas = useEntregas(taller, mes);

  const porDia = new Map<string, EntregaComprometida[]>();
  entregas?.forEach((e) => porDia.set(e.fecha, [...(porDia.get(e.fecha) ?? []), e]));
  const enRiesgo = entregas?.filter((e) => e.situacion === "en_riesgo").length ?? 0;

  const hoy = claveDia(new Date());

  const irA = (d: Date) => {
    const s = new URLSearchParams(params);
    s.set("mes", claveMes(d));
    setParams(s, { replace: true });
  };

  const titulo = MES_ANIO.format(inicio);

  return (
    <Panel
      titulo="Entregas comprometidas"
      subtitulo={
        entregas
          ? `${numero(entregas.length)} entregas · ${numero(enRiesgo)} en riesgo`
          : `${taller} · sin datos todavía`
      }
      extra={
        <div className={styles.navegacion}>
          <button type="button" onClick={() => irA(new Date(inicio.getFullYear(), inicio.getMonth() - 1, 1))} aria-label="Mes anterior">
            ←
          </button>
          <span className={styles.mes}>{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</span>
          <button type="button" onClick={() => irA(new Date(inicio.getFullYear(), inicio.getMonth() + 1, 1))} aria-label="Mes siguiente">
            →
          </button>
          <button type="button" onClick={() => irA(new Date())}>
            Hoy
          </button>
        </div>
      }
    >
      <div className={styles.calendario} role="grid" aria-label={`Entregas de ${titulo}`}>
        {DIAS_SEMANA.map((d) => (
          <div key={d} className={styles.diaSemana} role="columnheader">
            {d}
          </div>
        ))}
        {celdas(inicio).map((d) => {
          const clave = claveDia(d);
          const delDia = porDia.get(clave) ?? [];
          const fueraDeMes = d.getMonth() !== inicio.getMonth();
          return (
            <div
              key={clave}
              role="gridcell"
              aria-current={clave === hoy ? "date" : undefined}
              className={[
                styles.dia,
                fueraDeMes ? styles.fuera : "",
                clave === hoy ? styles.hoy : "",
              ].join(" ")}
            >
              <div className={styles.numero}>{d.getDate()}</div>
              <ul className={styles.entregas}>
                {delDia.map((e) => (
                  <li key={e.folio} className={`${styles.entrega} ${styles[e.situacion] ?? ""}`} title={`${e.placa} · ${e.modelo} · ${e.cliente}`}>
                    <Folio folio={e.folio} tipo="os" />
                    <span className={styles.situacion}>{SITUACION[e.situacion]}</span>
                    <span className={styles.cliente}>{e.cliente}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

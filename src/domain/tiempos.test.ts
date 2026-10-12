import { describe, expect, it } from "vitest";
import type { EstadoOS } from "./estados";
import type { EventoOS } from "./bitacora";
import {
  desgloseEspera,
  diasEnEspera,
  diasTotales,
  estadosVisitados,
  porcentajeEspera,
  tramoActual,
  tramosPorEstado,
} from "./tiempos";

const INICIO = Date.UTC(2026, 9, 1, 12); // 1 oct 2026, 12:00 UTC
const enDia = (d: number) => new Date(INICIO + d * 86_400_000).toISOString();

let n = 0;
/** Un evento de cambio de estado en el día `d` contado desde INICIO. */
function paso(estado: EstadoOS, d: number, antes?: EstadoOS): EventoOS {
  n += 1;
  return {
    id: `e${n}`,
    osId: "OS-PRUEBA",
    tipo: n === 1 ? "os_creada" : "cambio_estado",
    en: enDia(d),
    usuarioId: "u1",
    usuarioNombre: "Prueba",
    estadoAntes: antes,
    estadoDespues: estado,
    carga: {},
  } as EventoOS;
}

/** Una nota no mueve el estado: no debe crear tramos. */
const nota = (d: number): EventoOS => ({
  id: `nota-${d}`,
  osId: "OS-PRUEBA",
  tipo: "nota_agregada",
  en: enDia(d),
  usuarioId: "u1",
  usuarioNombre: "Prueba",
  carga: { seccion: "diagnostico", texto: "Nota" },
});

describe("tiempos de la O.S.", () => {
  // programada 1 d · recibida 1 d · diagnóstico 2 d · ... · pendiente de autorización 3 d (espera)
  // · presupuesto otra vez 1 d (retorno) · pendiente de autorización abierta desde el día 8.
  const eventos: EventoOS[] = [
    paso("programada", 0),
    paso("unidad_recibida", 1, "programada"),
    paso("en_diagnostico", 2, "unidad_recibida"),
    nota(3),
    paso("presupuesto_elaborado", 4, "en_diagnostico"),
    paso("pendiente_autorizacion", 4, "presupuesto_elaborado"),
    paso("presupuesto_elaborado", 7, "pendiente_autorizacion"),
    paso("pendiente_autorizacion", 8, "presupuesto_elaborado"),
  ];
  const ahora = enDia(10); // el último tramo lleva 2 días abierto

  it("arma un tramo por cambio de estado, en orden, ignorando eventos que no mueven el estado", () => {
    const t = tramosPorEstado(eventos, ahora);
    expect(t.map((x) => x.estado)).toEqual([
      "programada",
      "unidad_recibida",
      "en_diagnostico",
      "presupuesto_elaborado",
      "pendiente_autorizacion",
      "presupuesto_elaborado",
      "pendiente_autorizacion",
    ]);
    expect(t.map((x) => x.dias)).toEqual([1, 1, 2, 0, 3, 1, 2]);
  });

  it("deja abierto el tramo actual y lo cuenta hasta ahora", () => {
    const actual = tramoActual(eventos, ahora);
    expect(actual?.estado).toBe("pendiente_autorizacion");
    expect(actual?.hasta).toBeNull();
    expect(actual?.dias).toBe(2);
    expect(actual?.esEspera).toBe(true);
  });

  it("suma días totales, días en espera y porcentaje, incluido el tramo abierto", () => {
    expect(diasTotales(eventos, ahora)).toBe(10);
    // 3 días del primer envío + 2 del segundo, que sigue abierto.
    expect(diasEnEspera(eventos, ahora)).toBe(5);
    expect(porcentajeEspera(eventos, ahora)).toBe(50);
  });

  it("desglosa la espera por punto medible y suma las visitas repetidas", () => {
    expect(desgloseEspera(eventos, ahora)).toEqual({
      pendiente_autorizacion: 5,
      autorizacion_oc: 0,
      en_proceso_pago: 0,
      espera_refaccion: 0,
    });
  });

  it("no acumula días después de un estado terminal", () => {
    const cerrada = [...eventos, paso("rechazada", 12, "pendiente_autorizacion")];
    const t = tramosPorEstado(cerrada, enDia(30));
    expect(t.at(-1)).toMatchObject({ estado: "rechazada", dias: 0 });
    expect(diasTotales(cerrada, enDia(30))).toBe(12);
    expect(diasEnEspera(cerrada, enDia(30))).toBe(7);
  });

  it("no depende del orden en que llegan los eventos", () => {
    const desordenados = [...eventos].reverse();
    expect(diasTotales(desordenados, ahora)).toBe(10);
    expect(tramoActual(desordenados, ahora)?.estado).toBe("pendiente_autorizacion");
  });

  it("devuelve cero sin eventos y en una O.S. recién creada", () => {
    expect(tramosPorEstado([], ahora)).toEqual([]);
    expect(porcentajeEspera([], ahora)).toBe(0);
    const recien = [paso("programada", 10)];
    expect(diasTotales(recien, ahora)).toBe(0);
    expect(porcentajeEspera(recien, ahora)).toBe(0);
  });

  it("lista los estados visitados una sola vez", () => {
    expect([...estadosVisitados(eventos)]).toEqual([
      "programada",
      "unidad_recibida",
      "en_diagnostico",
      "presupuesto_elaborado",
      "pendiente_autorizacion",
    ]);
  });
});

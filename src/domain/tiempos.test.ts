import { describe, expect, it } from "vitest";
import type { EstadoOS } from "./estados";
import type { EstadoOC } from "./compras";
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
    tipo: antes ? "cambio_estado" : "os_creada",
    en: enDia(d),
    usuarioId: "u1",
    usuarioNombre: "Prueba",
    estadoAntes: antes,
    estadoDespues: estado,
    carga: {},
  } as EventoOS;
}

/** La O.C. reporta su estado: no mueve el de la O.S. */
const oc = (folio: string, estado: EstadoOC, d: number): EventoOS => ({
  id: `oc-${folio}-${d}`,
  osId: "OS-PRUEBA",
  tipo: "oc_vinculada",
  en: enDia(d),
  usuarioId: "u1",
  usuarioNombre: "Compras",
  carga: { folio, proveedor: "Proveedor", estado, monto: 1000 },
});

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
  // programación 1 d · diagnóstico 2 d · cotizar 1 d · Pte Autorización 3 d (espera)
  // · cotizar otra vez 1 d (retorno) · Pte Autorización abierta desde el día 8.
  const eventos: EventoOS[] = [
    paso("programacion", 0),
    paso("diagnostico", 1, "programacion"),
    nota(2),
    paso("cotizar", 3, "diagnostico"),
    paso("pendiente_autorizacion", 4, "cotizar"),
    paso("cotizar", 7, "pendiente_autorizacion"),
    paso("pendiente_autorizacion", 8, "cotizar"),
  ];
  const ahora = enDia(10); // el último tramo lleva 2 días abierto

  it("arma un tramo por cambio de estado, en orden, ignorando eventos que no mueven el estado", () => {
    const t = tramosPorEstado(eventos, ahora);
    expect(t.map((x) => x.estado)).toEqual(["programacion", "diagnostico", "cotizar", "pendiente_autorizacion", "cotizar", "pendiente_autorizacion"]);
    expect(t.map((x) => x.dias)).toEqual([1, 2, 1, 3, 1, 2]);
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

  it("desglosa la espera del cliente y suma las visitas repetidas", () => {
    expect(desgloseEspera(eventos, ahora)).toEqual({ cliente: 5, direccion: 0, tesoreria: 0, proveedor: 0 });
  });

  it("no acumula días después de un estado terminal", () => {
    const cancelada = [...eventos, paso("cancelada", 12, "pendiente_autorizacion")];
    const t = tramosPorEstado(cancelada, enDia(30));
    expect(t.at(-1)).toMatchObject({ estado: "cancelada", dias: 0 });
    expect(diasTotales(cancelada, enDia(30))).toBe(12);
    expect(diasEnEspera(cancelada, enDia(30))).toBe(7);
  });

  it("no depende del orden en que llegan los eventos", () => {
    const desordenados = [...eventos].reverse();
    expect(diasTotales(desordenados, ahora)).toBe(10);
    expect(tramoActual(desordenados, ahora)?.estado).toBe("pendiente_autorizacion");
  });

  it("devuelve cero sin eventos y en una O.S. recién creada", () => {
    expect(tramosPorEstado([], ahora)).toEqual([]);
    expect(porcentajeEspera([], ahora)).toBe(0);
    const recien = [paso("programacion", 10)];
    expect(diasTotales(recien, ahora)).toBe(0);
    expect(porcentajeEspera(recien, ahora)).toBe(0);
  });

  it("lista los estados visitados una sola vez", () => {
    expect([...estadosVisitados(eventos)]).toEqual(["programacion", "diagnostico", "cotizar", "pendiente_autorizacion"]);
  });
});

describe("esperas medidas en la O.C.", () => {
  // La O.S. entra a Autorizado a compra el día 2. La O.C. pasa 2 días en
  // autorización (Dirección), 1 por pagar (Tesorería) y 3 con el proveedor.
  const base: EventoOS[] = [
    paso("programacion", 0),
    paso("diagnostico", 0, "programacion"),
    paso("cotizar", 0, "diagnostico"),
    paso("pendiente_autorizacion", 1, "cotizar"),
    paso("autorizado_compra", 2, "pendiente_autorizacion"),
    oc("OC-1", "en_autorizacion", 2),
    oc("OC-1", "autorizada", 4),
    oc("OC-1", "enviada_proveedor", 5),
    oc("OC-1", "recibida_total", 8),
    paso("en_reparacion", 8, "autorizado_compra"),
  ];

  it("toma Dirección, Tesorería y proveedor de los estados que reporta la O.C.", () => {
    expect(desgloseEspera(base, enDia(10))).toEqual({ cliente: 1, direccion: 2, tesoreria: 1, proveedor: 3 });
    expect(diasEnEspera(base, enDia(10))).toBe(7);
    expect(porcentajeEspera(base, enDia(10))).toBe(70);
  });

  it("cuenta una sola vez dos O.C. esperando a la vez", () => {
    // OC-2 espera a Dirección del día 3 al 5: se encima con OC-1 (días 2 a 4).
    const paralelas = [...base, oc("OC-2", "en_autorizacion", 3), oc("OC-2", "enviada_proveedor", 5), oc("OC-2", "recibida_total", 7)];
    expect(desgloseEspera(paralelas, enDia(10)).direccion).toBe(3);
    // La unión total sigue siendo del día 1 al 8: 7 días.
    expect(diasEnEspera(paralelas, enDia(10))).toBe(7);
  });

  it("deja de contar la espera de una O.C. cuando la O.S. termina", () => {
    const abierta = [
      paso("programacion", 0),
      paso("autorizado_compra", 1, "programacion"),
      oc("OC-9", "en_autorizacion", 1),
      paso("cancelada", 3, "autorizado_compra"),
    ];
    expect(desgloseEspera(abierta, enDia(20)).direccion).toBe(2);
  });
});

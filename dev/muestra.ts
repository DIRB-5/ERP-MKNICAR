/*
 * DATOS DE MUESTRA — SOLO DESARROLLO.
 *
 * Vive fuera de src/ a propósito (CLAUDE.md, regla 8): nunca entra al build de
 * producción. src/main.tsx lo importa únicamente si import.meta.env.DEV y la
 * app se abrió con ?muestra. Todos los nombres son ficticios.
 *
 * Para quitarlo del proyecto basta con borrar este archivo y su import en main.tsx.
 *
 * Qué trae:
 *  - OS-MUE-0001 · 0002 · 0003: tres O.S. en curso (autorización, reparación, programada).
 *  - OS-MUE-0100: una O.S. que recorre 19 de los 20 estados, con los dos
 *    retornos (cliente rechaza el presupuesto; sobrecosto en reparación),
 *    espera de refacción y retención, hasta cerrar.
 *  - OS-MUE-1xx: la misma O.S. detenida en cada momento del ciclo, para ver el
 *    expediente como se ve en cada estado.
 *  - OS-MUE-0199: una O.S. rechazada por el cliente.
 */
import type { EstadoOS } from "@/domain/estados";
import type { CargasEvento, EventoOS, TipoEvento } from "@/domain/bitacora";
import { PUNTOS_CALIDAD } from "@/domain/expediente";
import { ELEMENTOS_INVENTARIO, type ClienteResumen, type OrdenServicio, type UnidadResumen } from "@/domain/tipos";
import { fijarSesion } from "@/app/sesion";
import { bitacoras, clientes, ordenes, unidades } from "@/data/memoria/almacen";
import { proveedores } from "@/data/memoria/proveedores";
import type { Proveedor } from "@/domain/tipos/compras";

const HORA = 3_600_000;
const DIA = 24 * HORA;
const hace = (dias: number) => new Date(Date.now() - dias * DIA);
const dia = (d: Date) => d.toISOString().slice(0, 10);
const enDias = (n: number) => dia(new Date(Date.now() + n * DIA));

/* ── Personas ficticias ───────────────────────────────────────────── */

const ASESORA = { id: "usr-asesora", nombre: "Asesora de muestra" };
const TECNICO = { id: "usr-tec-1", nombre: "Técnico de muestra" };
const AYUDANTE = { id: "usr-tec-2", nombre: "Ayudante de muestra" };
const COMPRAS = { id: "usr-compras", nombre: "Compras de muestra" };
const DIRECCION = { id: "usr-direccion", nombre: "Dirección de muestra" };
const TESORERIA = { id: "usr-tesoreria", nombre: "Tesorería de muestra" };
const ALMACEN = { id: "usr-almacen", nombre: "Almacén de muestra" };
/** El usuario de la sesión: no reparó nada, así que puede liberar calidad. */
const SESION = { id: "usr-muestra", nombre: "Usuario de muestra" };

type Persona = typeof ASESORA;

/* ── Bitácora ─────────────────────────────────────────────────────── */

type Paso = {
  [T in TipoEvento]: { d: number; tipo: T; a?: EstadoOS; carga?: CargasEvento[T]; motivo?: string; quien: Persona };
}[TipoEvento];

/**
 * Las fechas que viven dentro de la carga se alinean con el sello del evento,
 * para que sigan cuadrando cuando una copia recorre el tiempo.
 */
function fechasDeCarga(p: Paso, en: string): Paso["carga"] {
  const c = p.carga as Record<string, unknown> | undefined;
  if (!c) return c;
  switch (p.tipo) {
    case "recepcion_registrada":
      return { ...c, fechaHora: en } as Paso["carga"];
    case "autorizacion_cliente":
      return { ...c, respondidaEn: en } as Paso["carga"];
    case "remision_emitida":
      return { ...c, entregadaEn: en } as Paso["carga"];
    case "mano_obra_cargada":
    case "factura_vinculada":
      return { ...c, fecha: en.slice(0, 10) } as Paso["carga"];
    default:
      return c as Paso["carga"];
  }
}

/** `d` son días atrás. `a` marca el estado al que mueve el evento. */
function bitacora(folio: string, pasos: Paso[]): EventoOS[] {
  let estado: EstadoOS = "programada";
  return pasos.map((p, i) => {
    const en = hace(p.d).toISOString();
    const e = {
      id: `${folio}-e${i}`,
      osId: folio,
      tipo: p.tipo,
      en,
      usuarioId: p.quien.id,
      usuarioNombre: p.quien.nombre,
      ...(p.a ? { estadoAntes: estado, estadoDespues: p.a } : {}),
      carga: fechasDeCarga(p, en) ?? {},
      ...(p.motivo ? { motivo: p.motivo } : {}),
    } as EventoOS;
    if (p.a) estado = p.a;
    return e;
  });
}

const paso = <T extends TipoEvento>(d: number, tipo: T, quien: Persona, extra: { a?: EstadoOS; carga?: CargasEvento[T]; motivo?: string } = {}) =>
  ({ d, tipo, quien, ...extra }) as Paso;

const cambio = (d: number, a: EstadoOS, quien: Persona, motivo?: string) => paso(d, "cambio_estado", quien, { a, motivo });

const recepcion = (d: number, km: number, combustible: number): Paso =>
  paso(d, "recepcion_registrada", ASESORA, {
    a: "unidad_recibida",
    carga: {
      fechaHora: hace(d).toISOString(),
      kilometraje: km,
      nivelCombustible: combustible,
      recibeNombre: ASESORA.nombre,
      entregaNombre: "Chofer de muestra",
      inventario: Object.fromEntries(ELEMENTOS_INVENTARIO.map((k) => [k, k !== "herramienta"])) as CargasEvento["recepcion_registrada"]["inventario"],
      inventarioExtra: "",
      objetosPersonales: "Chaleco reflejante en el asiento del copiloto",
      danosPrevios: [{ zona: "Defensa trasera", descripcion: "Rayón de 10 cm", severidad: "leve" }],
      fotos: ["Frente", "Trasera", "Costado izquierdo", "Costado derecho", "Tablero con kilometraje"].map((etiqueta) => ({
        etiqueta,
        archivo: { nombre: `${etiqueta.toLowerCase().replace(/ /g, "-")}.jpg`, url: "" },
      })),
      autorizaDiagnostico: true,
      firmaEntrega: null,
    },
  });

const presupuesto = (
  d: number,
  version: number,
  servicios: [string, string, number, number][],
  refacciones: [string, string, number, number][],
  motivo = ""
): Paso =>
  paso(d, version === 1 ? "presupuesto_emitido" : "adenda_emitida", ASESORA, {
    carga: {
      version,
      folio: `PRE-MUE-${String(100 + version).padStart(4, "0")}-${Math.round(d * 10)}`,
      servicios: servicios.map(([concepto, clave, horas, tarifa]) => ({ concepto, clave, horas, tarifa })),
      refacciones: refacciones.map(([concepto, clave, cantidad, precio]) => ({ concepto, clave, cantidad, precio, costo: null, soporte: null })),
      vigenciaHasta: dia(hace(d - 15)),
      motivo,
    },
  });

const solicitud = (d: number, version: number) =>
  paso(d, "autorizacion_solicitada", ASESORA, { carga: { version, medio: "correo", enviadaA: "Laura Muestra" } });

const respuesta = (d: number, version: number, resultado: "autorizada" | "rechazada" | "parcial", monto: number | null = null) =>
  paso(d, "autorizacion_cliente", ASESORA, {
    carga: { version, respondidaEn: hace(d).toISOString(), medio: "correo", autorizo: "Laura Muestra", resultado, montoAutorizado: monto, evidencia: null },
  });

/* ── Proveedores y cotizaciones ───────────────────────────────────── */

const PROV_NORTE = { id: "muestra-prov-1", nombre: "Refaccionaria de Muestra Norte" };
const PROV_AUTO = { id: "muestra-prov-2", nombre: "Autopartes de Muestra" };
const PROV_DIST = { id: "muestra-prov-3", nombre: "Distribuidora de Muestra" };
type Prov = typeof PROV_NORTE;

const idCot = (prov: Prov, d: number) => `cot-${prov.id}-${Math.round(d * 10)}`;

/** precios: [pieza, precio unitario, disponibilidad, días de entrega]. */
const cotizacion = (d: number, prov: Prov, precios: [string, number, "inmediata" | "sobre_pedido", number | null][]) =>
  paso(d, "cotizacion_registrada", COMPRAS, {
    carga: {
      cotizacionId: idCot(prov, d),
      proveedorId: prov.id,
      proveedorNombre: prov.nombre,
      partidas: precios.map(([piezaId, precioUnitario, disponibilidad, diasEntrega]) => ({ piezaId, precioUnitario, disponibilidad, diasEntrega })),
      vigenciaHasta: null,
      notas: "",
      soporte: null,
    },
  });

const eleccion = (d: number, piezaId: string, prov: Prov, dCot: number, precio: number, justificacion: string | null = null) =>
  paso(d, "proveedor_elegido", COMPRAS, {
    carga: { piezaId, cotizacionId: idCot(prov, dCot), proveedorId: prov.id, proveedorNombre: prov.nombre, precioUnitario: precio, justificacion },
  });

function proveedorMuestra(prov: Prov, rfc: string, opinionHace: number | null): Proveedor {
  const hoy = new Date();
  const fechaOpinion = opinionHace == null ? null : dia(hace(opinionHace));
  const vigencia = opinionHace == null ? null : dia(new Date(hoy.getTime() - opinionHace * DIA + 30 * DIA));
  return {
    id: prov.id,
    razonSocial: `${prov.nombre} S.A. de C.V.`,
    nombreComercial: prov.nombre,
    rfc,
    regimenFiscal: "601",
    usoCfdi: "G01",
    domicilioFiscal: "Domicilio de muestra 100, Toluca, Estado de México",
    codigoPostal: "50000",
    correoFacturacion: "facturas@muestra.example",
    condicionesPago: "credito",
    diasCredito: 30,
    limiteCredito: 150_000,
    moneda: "MXN",
    categoriaIds: [],
    tallerIds: [],
    contactos: [{ nombre: "Vendedor de muestra", puesto: "Ventas", telefono: "5550000100", correo: "ventas@muestra.example" }],
    datosBancarios: { beneficiario: "", banco: "Banco de muestra", cuenta: "", clabe: "", tarjeta: "", convenio: "", referencia: "", solicita: "", comentarios: "" },
    documentos:
      fechaOpinion && vigencia
        ? [{ id: `${prov.id}-op`, tipo: "opinion_cumplimiento", fechaDocumento: fechaOpinion, vigenciaHasta: vigencia, archivo: null }]
        : [],
    activo: true,
  };
}

/* ── La O.S. completa: 19 estados, dos retornos, espera de refacción y retención ── */

const FOLIO_COMPLETA = "OS-MUE-0100";

const CICLO_COMPLETO: Paso[] = [
  paso(24, "os_creada", ASESORA, { a: "programada" }),
  recepcion(22, 64210, 3),
  cambio(21.8, "en_diagnostico", TECNICO),
  paso(21.8, "tecnico_asignado", ASESORA, { carga: { tecnicoId: TECNICO.id, tecnicoNombre: TECNICO.nombre } }),
  paso(21.5, "hallazgo_agregado", TECNICO, {
    carga: {
      hallazgoId: "h1",
      descripcion: "El clutch patina en tercera y cuarta; disco al límite de desgaste.",
      severidad: "grave",
      evidencias: [],
      servicios: [{ id: null, clave: "MO-CLU", descripcion: "Reemplazo de clutch", horas: 4 }],
      refacciones: [{ id: null, clave: "KIT-CLU-G", descripcion: "Kit de clutch", cantidad: 1 }],
    },
  }),
  paso(21.4, "hallazgo_agregado", TECNICO, {
    carga: {
      hallazgoId: "h2",
      descripcion: "Fuga leve de líquido en la bomba de clutch.",
      severidad: "moderado",
      evidencias: [],
      servicios: [],
      refacciones: [],
    },
  }),
  cambio(21.2, "requisicion_generada", TECNICO),
  paso(21.2, "requisicion_generada", COMPRAS, { carga: { folio: "REQ-MUE-0100", estado: "enviada", comparativoFolio: null } }),
  cambio(20.5, "en_cotizacion", COMPRAS),
  cotizacion(20, PROV_NORTE, [["h1:0", 3350, "inmediata", null]]),
  cotizacion(19.8, PROV_AUTO, [["h1:0", 3180, "sobre_pedido", 3]]),
  cotizacion(19.6, PROV_DIST, [["h1:0", 3420, "inmediata", null]]),
  eleccion(19.2, "h1:0", PROV_NORTE, 20, 3350, "Lo tiene en existencia; el más barato tarda 3 días."),
  cambio(19, "presupuesto_elaborado", ASESORA),
  presupuesto(19, 1, [["Reemplazo de clutch", "MO-CLU", 4, 450]], [["Kit de clutch genérico", "KIT-CLU-G", 1, 4200]]),
  cambio(18.8, "pendiente_autorizacion", ASESORA),
  solicitud(18.8, 1),
  respuesta(16, 1, "rechazada"),
  // Retorno 1: el cliente rechaza y pide otra cotización.
  cambio(16, "presupuesto_elaborado", ASESORA, "El cliente pidió cotizar el kit de clutch original."),
  presupuesto(15.5, 2, [["Reemplazo de clutch", "MO-CLU", 4, 450]], [["Kit de clutch original", "KIT-CLU-O", 1, 6900]], "Cambio a kit original a petición del cliente."),
  cambio(15.4, "pendiente_autorizacion", ASESORA),
  solicitud(15.4, 2),
  respuesta(14.6, 2, "autorizada"),
  cambio(14.6, "autorizada_compra", ASESORA),
  paso(14.5, "requisicion_actualizada", COMPRAS, { carga: { folio: "REQ-MUE-0100", estado: "adjudicada", comparativoFolio: "CMP-MUE-0100" } }),
  cambio(14.4, "oc_creada", COMPRAS),
  paso(14.4, "oc_vinculada", COMPRAS, { carga: { folio: "OC-MUE-0100", proveedor: "Proveedor de muestra", estado: "en_autorizacion", monto: 5400 } }),
  cambio(14.3, "autorizacion_oc", COMPRAS),
  paso(12.6, "oc_vinculada", DIRECCION, { carga: { folio: "OC-MUE-0100", proveedor: "Proveedor de muestra", estado: "autorizada", monto: 5400 } }),
  cambio(12.6, "en_proceso_pago", DIRECCION),
  paso(11, "oc_vinculada", TESORERIA, { carga: { folio: "OC-MUE-0100", proveedor: "Proveedor de muestra", estado: "enviada_proveedor", monto: 5400 } }),
  cambio(11, "espera_refaccion", TESORERIA),
  paso(8.5, "material_recibido", ALMACEN, {
    carga: { partidas: [{ descripcion: "Kit de clutch original", cantidad: 1, almacen: "Almacén Toluca", capaCostoId: "CAPA-MUE-0100" }], pendientes: [] },
  }),
  cambio(8.5, "material_recibido", ALMACEN),
  cambio(8.3, "en_reparacion", TECNICO),
  paso(8, "mano_obra_cargada", TECNICO, {
    carga: { tecnicoId: TECNICO.id, tecnicoNombre: TECNICO.nombre, fecha: dia(hace(8)), horas: 5, costoHora: 180, descripcion: "Desmontaje de transmisión y cambio de kit de clutch." },
  }),
  paso(8, "refaccion_consumida", ALMACEN, {
    carga: { numeroParte: "KIT-CLU-O", descripcion: "Kit de clutch original", cantidad: 1, costoUnitario: 5400, salidaFolio: "SAL-MUE-0100", capaCostoId: "CAPA-MUE-0100" },
  }),
  // Retorno 2: sobrecosto durante la reparación.
  presupuesto(7.6, 3, [["Rectificado de volante", "MO-VOL", 1.5, 450]], [["Collarín hidráulico", "COL-HID", 1, 1850]], "Sobrecosto: volante cristalizado y collarín con fuga."),
  cambio(7.6, "pendiente_autorizacion", TECNICO, "Sobrecosto: volante cristalizado y collarín con fuga."),
  solicitud(7.6, 3),
  respuesta(6.4, 3, "parcial", 1850),
  cambio(6.4, "autorizada_compra", ASESORA),
  cambio(6.3, "oc_creada", COMPRAS),
  paso(6.3, "oc_vinculada", COMPRAS, { carga: { folio: "OC-MUE-0101", proveedor: "Proveedor de muestra", estado: "en_autorizacion", monto: 1150 } }),
  cambio(6.2, "autorizacion_oc", COMPRAS),
  cambio(5.6, "en_proceso_pago", DIRECCION),
  paso(5.1, "oc_vinculada", TESORERIA, { carga: { folio: "OC-MUE-0101", proveedor: "Proveedor de muestra", estado: "recibida_total", monto: 1150 } }),
  paso(5, "material_recibido", ALMACEN, {
    carga: { partidas: [{ descripcion: "Collarín hidráulico", cantidad: 1, almacen: "Almacén Toluca", capaCostoId: "CAPA-MUE-0101" }], pendientes: [] },
  }),
  cambio(5, "material_recibido", ALMACEN),
  cambio(4.9, "en_reparacion", AYUDANTE),
  paso(4.6, "mano_obra_cargada", AYUDANTE, {
    carga: { tecnicoId: AYUDANTE.id, tecnicoNombre: AYUDANTE.nombre, fecha: dia(hace(4.6)), horas: 1.5, costoHora: 120, descripcion: "Cambio de collarín y prueba de manejo." },
  }),
  paso(4.6, "refaccion_consumida", ALMACEN, {
    carga: { numeroParte: "COL-HID", descripcion: "Collarín hidráulico", cantidad: 1, costoUnitario: 1150, salidaFolio: "SAL-MUE-0101", capaCostoId: "CAPA-MUE-0101" },
  }),
  paso(4.5, "nota_agregada", TECNICO, { carga: { seccion: "reparacion", texto: "El volante no se rectificó: el cliente solo autorizó el collarín." } }),
  cambio(4.4, "terminada_qa", AYUDANTE),
  paso(4.1, "calidad_liberada", SESION, {
    carga: { puntos: PUNTOS_CALIDAD.map((punto) => ({ punto, cumple: true })), liberoId: SESION.id, liberoNombre: SESION.nombre, observaciones: "Sin observaciones." },
  }),
  cambio(4, "remisionada", ASESORA),
  paso(3.9, "remision_emitida", ASESORA, {
    carga: { folio: "REM-MUE-0100", kilometrajeSalida: 64236, entregadaEn: hace(3.9).toISOString(), recibeNombre: "Chofer de muestra", firma: null },
  }),
  cambio(3.5, "retenida", DIRECCION, "Cliente con saldo vencido: la factura se retiene hasta que pague."),
  cambio(1.5, "facturada", ASESORA),
  paso(1.5, "factura_vinculada", ASESORA, {
    carga: { folio: "A-MUE-0100", monto: 13456, fecha: dia(hace(1.5)), osFolios: [FOLIO_COMPLETA] },
  }),
  paso(1, "os_cerrada", ASESORA, { a: "cerrada" }),
];

/**
 * La misma O.S. detenida en el primer paso por cada estado. Se recorre el
 * tiempo para que el tramo actual dure lo mismo que duró en la O.S. completa.
 */
function momentos(): { estado: EstadoOS; pasos: Paso[] }[] {
  const vistos = new Set<EstadoOS>();
  const r: { estado: EstadoOS; pasos: Paso[] }[] = [];
  CICLO_COMPLETO.forEach((p, i) => {
    if (!p.a || vistos.has(p.a) || p.a === "cerrada") return;
    vistos.add(p.a);
    const siguiente = CICLO_COMPLETO.findIndex((x, j) => j > i && x.a != null);
    const fin = siguiente === -1 ? CICLO_COMPLETO.length : siguiente;
    const corrimiento = siguiente === -1 ? 0 : (CICLO_COMPLETO[siguiente]?.d ?? 0);
    r.push({ estado: p.a, pasos: CICLO_COMPLETO.slice(0, fin).map((x) => ({ ...x, d: x.d - corrimiento })) });
  });
  return r;
}

/* ── Carga ────────────────────────────────────────────────────────── */

export function cargarMuestra(): void {
  if (clientes.some((c) => c.cliente.id === "muestra-cliente")) return;
  fijarSesion(SESION);

  // Tres proveedores: opinión vigente, vencida y sin opinión.
  proveedores.push(
    proveedorMuestra(PROV_NORTE, "RMN010101AB1", 5),
    proveedorMuestra(PROV_AUTO, "AMU020202CD2", 45),
    proveedorMuestra(PROV_DIST, "DMU030303EF3", null)
  );

  const cliente: ClienteResumen = {
    cliente: {
      id: "muestra-cliente",
      razonSocial: "Flotilla de Muestra S.A. de C.V.",
      rfc: "FMU240101AB1",
      tipo: "flotilla",
      convenioId: "CONV-MUESTRA",
      ejecutivoCuenta: "Ejecutivo de muestra",
      estado: "activo",
      contactos: [
        {
          id: "muestra-contacto-1",
          nombre: "Laura Muestra",
          puesto: "Gerente de flota",
          correo: "flota@muestra.example",
          telefono: "5550000001",
          autorizaPresupuesto: true,
          canalPreferido: "correo",
        },
        {
          id: "muestra-contacto-2",
          nombre: "Pedro Muestra",
          puesto: "Jefe de patio",
          correo: "patio@muestra.example",
          telefono: "5550000002",
          autorizaPresupuesto: false,
          canalPreferido: "whatsapp",
        },
      ],
    },
    unidades: 0,
    osAbiertas: 0,
    facturadoPeriodo: 0,
  };
  clientes.push(cliente);

  const ref = { id: cliente.cliente.id, razonSocial: cliente.cliente.razonSocial };
  const toluca = { id: "Toluca", nombre: "Toluca" };
  const cdmx = { id: "CDMX", nombre: "CDMX" };

  const base = {
    clienteId: ref.id,
    contactoSolicitaId: "muestra-contacto-2",
    contactoAutorizaId: "muestra-contacto-1",
    canalAutorizacion: "correo" as const,
    cobraDiagnostico: false,
    creadaPor: "",
  };

  /** Da de alta unidad, O.S. y bitácora de una sola vez. */
  function alta(o: {
    folio: string;
    placas: string;
    marca: string;
    modelo: string;
    anio: number;
    km: number;
    taller: typeof toluca;
    servicio: OrdenServicio["tipoServicio"];
    motivos: string[];
    pasos: Paso[];
    conFicha?: boolean;
  }) {
    const eventos = bitacora(o.folio, o.pasos);
    const estado = [...eventos].reverse().find((e) => e.estadoDespues)?.estadoDespues ?? "programada";
    const id = `muestra-${o.folio}`;
    const abierta = estado !== "programada" && estado !== "cerrada" && estado !== "rechazada";
    const unidad: UnidadResumen = {
      unidad: {
        id,
        placas: o.placas,
        vin: `MUESTRA${o.folio.replace(/\D/g, "").padStart(10, "0")}`,
        marca: o.marca,
        modelo: o.modelo,
        anio: o.anio,
        tipo: "combustion",
        clienteId: ref.id,
        tallerBaseId: toluca.id,
        kilometrajeUltimo: o.km,
        fechaKilometraje: dia(hace(10)),
        estado: "activa",
        ficha: o.conFicha
          ? {
              tipoVehiculo: "Pickup",
              subModelo: "Doble cabina SE",
              color: "Blanco",
              unidadOdometro: "km",
              tipoLlanta: "Bajo rendimiento",
              rendimientoLlantaKm: 55_000,
              medidaLlantaDelantera: "255/70 R16",
              medidaLlantaTrasera: "",
              capacidadTanqueLitros: 80,
              motorLitros: 2.5,
              motorCodigo: "QR25DE",
              motorValvulas: 16,
              motorCc: 2488,
              motorCilindros: 4,
              arbolLevas: "dohc",
            }
          : undefined,
      },
      cliente: ref,
      tallerBase: toluca,
      osAbierta: abierta ? { folio: o.folio, taller: o.taller, estado } : null,
      osAbiertas: abierta ? 1 : 0,
      ultimoServicio: dia(hace(120)),
    };
    unidades.push(unidad);
    cliente.unidades += 1;
    if (abierta) cliente.osAbiertas += 1;
    ordenes.push({
      ...base,
      folio: o.folio,
      unidadId: id,
      tallerId: o.taller.id,
      tipoIngreso: "cita",
      tipoServicio: o.servicio,
      motivosReportados: o.motivos,
      prioridad: "normal",
      estado,
      programadaPara: hace(o.pasos[0]?.d ?? 0),
      entregaComprometida: enDias(3),
      creadaEn: hace(o.pasos[0]?.d ?? 0),
    });
    bitacoras.set(o.folio, eventos);
  }

  // Tres O.S. en curso.
  alta({
    folio: "OS-MUE-0001",
    placas: "MUE-001-A",
    marca: "Nissan",
    modelo: "NP300 Frontier",
    anio: 2023,
    km: 87420,
    // Base en Toluca pero atendida en CDMX: aparece "Fuera de base".
    taller: cdmx,
    servicio: "correctivo",
    motivos: ["Hace un ruido al frenar.", "La camioneta se va hacia la derecha."],
    conFicha: true,
    pasos: [
      paso(11, "os_creada", ASESORA, { a: "programada" }),
      recepcion(10, 87420, 4),
      cambio(9.8, "en_diagnostico", TECNICO),
      paso(9.8, "tecnico_asignado", ASESORA, { carga: { tecnicoId: TECNICO.id, tecnicoNombre: TECNICO.nombre } }),
      paso(9.5, "hallazgo_agregado", TECNICO, {
        carga: {
          hallazgoId: "h1",
          descripcion: "Balatas delanteras al 10 % y discos con escalón.",
          severidad: "grave",
          evidencias: [],
          servicios: [{ id: null, clave: "MO-FRE", descripcion: "Cambio de balatas y discos delanteros", horas: 2 }],
          refacciones: [
            { id: null, clave: "BAL-DEL-01", descripcion: "Juego de balatas delanteras", cantidad: 1 },
            { id: null, clave: "DIS-DEL-01", descripcion: "Disco de freno delantero", cantidad: 2 },
          ],
        },
      }),
      cambio(9, "requisicion_generada", TECNICO),
      paso(9, "requisicion_generada", COMPRAS, { carga: { folio: "REQ-MUE-0001", estado: "enviada", comparativoFolio: null } }),
      cambio(8.6, "en_cotizacion", COMPRAS),
      cotizacion(8.2, PROV_NORTE, [["h1:0", 1150, "inmediata", null], ["h1:1", 1320, "inmediata", null]]),
      cotizacion(7.9, PROV_AUTO, [["h1:0", 1090, "inmediata", null], ["h1:1", 1380, "sobre_pedido", 2]]),
      eleccion(7.5, "h1:0", PROV_AUTO, 7.9, 1090),
      eleccion(7.5, "h1:1", PROV_NORTE, 8.2, 1320),
      cambio(7, "presupuesto_elaborado", ASESORA),
      presupuesto(7, 1, [["Cambio de balatas y discos delanteros", "MO-FRE", 2, 425]], [["Juego de balatas delanteras", "BAL-DEL-01", 1, 1500], ["Disco de freno delantero", "DIS-DEL-01", 2, 1714]]),
      cambio(6.5, "pendiente_autorizacion", ASESORA),
      solicitud(6.5, 1),
      respuesta(5, 1, "rechazada"),
      cambio(5, "presupuesto_elaborado", ASESORA, "El cliente pidió cotizar amortiguadores originales en lugar de genéricos."),
      presupuesto(4.5, 2, [["Reemplazo de suspensión delantera y alineación", "MO-SUSP", 3, 550]], [["Amortiguador delantero original", "AMO-ORIG-01", 2, 2850]], "Se suma la suspensión delantera con amortiguadores originales."),
      cambio(3.2, "pendiente_autorizacion", ASESORA),
      solicitud(3.2, 2),
    ],
  });

  alta({
    folio: "OS-MUE-0002",
    placas: "MUE-002-B",
    marca: "Isuzu",
    modelo: "ELF 600",
    anio: 2021,
    km: 142300,
    taller: toluca,
    servicio: "preventivo",
    motivos: ["Servicio de los 140 mil kilómetros."],
    pasos: [
      paso(6, "os_creada", ASESORA, { a: "programada" }),
      recepcion(6, 142300, 5),
      cambio(5.9, "en_diagnostico", TECNICO),
      paso(5.9, "tecnico_asignado", ASESORA, { carga: { tecnicoId: TECNICO.id, tecnicoNombre: TECNICO.nombre } }),
      paso(5.8, "hallazgo_agregado", TECNICO, {
        carga: {
          hallazgoId: "h1",
          descripcion: "Servicio preventivo de los 140 mil km: filtros y aceite.",
          severidad: "leve",
          evidencias: [],
          servicios: [{ id: null, clave: "MO-PREV-140", descripcion: "Servicio preventivo de los 140 mil km", horas: 3 }],
          refacciones: [{ id: null, clave: "ACE-15W40", descripcion: "Aceite 15W-40, cubeta 19 L", cantidad: 1 }],
        },
      }),
      cambio(5.5, "requisicion_generada", TECNICO),
      paso(5.5, "requisicion_generada", COMPRAS, { carga: { folio: "REQ-MUE-0002", estado: "enviada", comparativoFolio: null } }),
      cambio(5.2, "en_cotizacion", COMPRAS),
      cotizacion(5.1, PROV_NORTE, [["h1:0", 3072, "inmediata", null]]),
      cotizacion(5, PROV_DIST, [["h1:0", 3190, "inmediata", null]]),
      cotizacion(4.95, PROV_AUTO, [["h1:0", 3240, "inmediata", null]]),
      eleccion(4.9, "h1:0", PROV_NORTE, 5.1, 3072),
      cambio(4.8, "presupuesto_elaborado", ASESORA),
      presupuesto(4.8, 1, [["Servicio preventivo de los 140 mil km", "MO-PREV-140", 3, 800]], [["Aceite 15W-40, cubeta 19 L", "ACE-15W40", 1, 4560], ["Filtro de aceite", "FIL-ACE-01", 1, 690]]),
      cambio(4.6, "pendiente_autorizacion", ASESORA),
      solicitud(4.6, 1),
      respuesta(4, 1, "autorizada"),
      cambio(4, "autorizada_compra", ASESORA),
      cambio(3.9, "oc_creada", COMPRAS),
      paso(3.9, "oc_vinculada", COMPRAS, { carga: { folio: "OC-MUE-0002", proveedor: "Proveedor de muestra", estado: "recibida_total", monto: 3470 } }),
      cambio(3.6, "autorizacion_oc", COMPRAS),
      cambio(3, "en_proceso_pago", DIRECCION),
      paso(1.4, "material_recibido", ALMACEN, {
        carga: {
          partidas: [{ descripcion: "Aceite 15W-40, cubeta 19 L", cantidad: 1, almacen: "Almacén Toluca", capaCostoId: "CAPA-MUE-0002" }],
          pendientes: [{ descripcion: "Filtro de aceite", cantidad: 1 }],
        },
      }),
      cambio(1.4, "material_recibido", ALMACEN),
      cambio(1.2, "en_reparacion", AYUDANTE),
      paso(1, "mano_obra_cargada", AYUDANTE, {
        carga: { tecnicoId: AYUDANTE.id, tecnicoNombre: AYUDANTE.nombre, fecha: dia(hace(1)), horas: 3.5, costoHora: 120, descripcion: "Cambio de aceite y revisión de niveles." },
      }),
    ],
  });

  alta({
    folio: "OS-MUE-0003",
    placas: "MUE-003-C",
    marca: "Hino",
    modelo: "300 616",
    anio: 2022,
    km: 98100,
    taller: toluca,
    servicio: "diagnostico",
    motivos: ["Se prende el testigo del motor en carretera.", "Tarda en arrancar en frío.", "Revisar luces traseras."],
    pasos: [paso(2, "os_creada", ASESORA, { a: "programada" })],
  });

  // La O.S. completa y sus momentos.
  const comun = {
    marca: "Ford",
    modelo: "Transit 350",
    anio: 2022,
    km: 64210,
    taller: cdmx,
    servicio: "correctivo" as const,
    motivos: ["El clutch patina al subir pendientes.", "Huele a quemado después de manejar en ciudad."],
  };
  alta({ ...comun, folio: FOLIO_COMPLETA, placas: "MUE-100-A", pasos: CICLO_COMPLETO });
  momentos().forEach((m, i) => {
    const n = String(101 + i);
    alta({ ...comun, folio: `OS-MUE-${n.padStart(4, "0")}`, placas: `MUE-${n}-M`, pasos: m.pasos });
  });

  // Una O.S. que el cliente rechaza.
  alta({
    folio: "OS-MUE-0199",
    placas: "MUE-199-R",
    marca: "Chevrolet",
    modelo: "Tornado",
    anio: 2020,
    km: 120400,
    taller: toluca,
    servicio: "correctivo",
    motivos: ["No enciende el aire acondicionado."],
    pasos: [
      paso(9, "os_creada", ASESORA, { a: "programada" }),
      recepcion(8, 120400, 2),
      cambio(7.8, "en_diagnostico", TECNICO),
      paso(7.8, "tecnico_asignado", ASESORA, { carga: { tecnicoId: TECNICO.id, tecnicoNombre: TECNICO.nombre } }),
      paso(7.5, "hallazgo_agregado", TECNICO, {
        carga: {
          hallazgoId: "h1",
          descripcion: "Compresor de A/C trabado.",
          severidad: "moderado",
          evidencias: [],
          servicios: [{ id: null, clave: "MO-AC", descripcion: "Cambio de compresor y carga de gas", horas: 3 }],
          refacciones: [{ id: null, clave: "COMP-AC", descripcion: "Compresor de A/C", cantidad: 1 }],
        },
      }),
      cambio(7.2, "requisicion_generada", TECNICO),
      paso(7.2, "requisicion_generada", COMPRAS, { carga: { folio: "REQ-MUE-0199", estado: "enviada", comparativoFolio: null } }),
      cambio(6.8, "en_cotizacion", COMPRAS),
      cotizacion(6.5, PROV_DIST, [["h1:0", 5900, "sobre_pedido", 4]]),
      eleccion(6.2, "h1:0", PROV_DIST, 6.5, 5900),
      cambio(6, "presupuesto_elaborado", ASESORA),
      presupuesto(6, 1, [["Cambio de compresor y carga de gas", "MO-AC", 3, 450]], [["Compresor de A/C", "COMP-AC", 1, 7800]]),
      cambio(5.8, "pendiente_autorizacion", ASESORA),
      solicitud(5.8, 1),
      respuesta(2, 1, "rechazada"),
      cambio(2, "rechazada", ASESORA, "El cliente decidió no reparar el A/C esta temporada."),
    ],
  });
}

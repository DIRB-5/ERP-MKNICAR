/*
 * DATOS DE MUESTRA — SOLO DESARROLLO.
 *
 * Vive fuera de src/ a propósito (CLAUDE.md, regla 8): nunca entra al build de
 * producción. src/main.tsx lo importa únicamente si import.meta.env.DEV y la
 * app se abrió con ?muestra. Todos los nombres son ficticios.
 *
 * Para quitarlo del proyecto basta con borrar este archivo y su import en main.tsx.
 */
import type { EstadoOS } from "@/domain/estados";
import type { ClienteResumen, OrdenServicio, TramoEstado, UnidadResumen } from "@/domain/tipos";
import { clientes, expedientesOS, historialEstados, ordenes, recepciones, unidades } from "@/data/memoria/almacen";

const HORA = 3_600_000;
const DIA = 24 * HORA;
const hace = (dias: number, horas = 0) => new Date(Date.now() - dias * DIA - horas * HORA);
const dia = (d: Date) => d.toISOString().slice(0, 10);
const enDias = (n: number) => dia(new Date(Date.now() + n * DIA));

/** Arma el historial a partir de pasos [estado, días atrás, motivo?]; el último es el actual. */
function historial(pasos: [EstadoOS, number, string?][]): TramoEstado[] {
  return pasos.map(([estado, diasAtras, comentario], i) => ({
    estado,
    desde: hace(diasAtras).toISOString(),
    hasta: i < pasos.length - 1 ? hace(pasos[i + 1]?.[1] ?? 0).toISOString() : null,
    responsable: null,
    comentario: comentario ?? null,
  }));
}

export function cargarMuestra(): void {
  if (clientes.some((c) => c.cliente.id === "muestra-cliente")) return;

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
    unidades: 3,
    osAbiertas: 3,
    facturadoPeriodo: 0,
  };
  clientes.push(cliente);

  const ref = { id: cliente.cliente.id, razonSocial: cliente.cliente.razonSocial };
  const toluca = { id: "Toluca", nombre: "Toluca" };
  const cdmx = { id: "CDMX", nombre: "CDMX" };

  const unidad = (
    id: string,
    placas: string,
    marca: string,
    modelo: string,
    anio: number,
    km: number,
    folio: string,
    taller: typeof toluca,
    estado: EstadoOS
  ): UnidadResumen => ({
    unidad: {
      id,
      placas,
      vin: `MUESTRA${id.slice(-1).padStart(10, "0")}`,
      marca,
      modelo,
      anio,
      tipo: "combustion",
      clienteId: ref.id,
      tallerBaseId: toluca.id,
      kilometrajeUltimo: km,
      fechaKilometraje: dia(hace(10)),
      estado: "activa",
      // Solo la primera unidad trae ficha técnica, para ver los dos casos.
      ficha:
        id === "muestra-u1"
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
    osAbierta: estado === "programada" ? null : { folio, taller, estado },
    osAbiertas: estado === "programada" ? 0 : 1,
    ultimoServicio: dia(hace(120)),
  });

  unidades.push(
    // Base en Toluca pero atendida en CDMX: aparece "Fuera de base".
    unidad("muestra-u1", "MUE-001-A", "Nissan", "NP300 Frontier", 2023, 87420, "OS-MUE-0001", cdmx, "pendiente_autorizacion"),
    unidad("muestra-u2", "MUE-002-B", "Isuzu", "ELF 600", 2021, 142300, "OS-MUE-0002", toluca, "en_reparacion"),
    unidad("muestra-u3", "MUE-003-C", "Hino", "300 616", 2022, 98100, "OS-MUE-0003", toluca, "programada")
  );

  const base = {
    clienteId: ref.id,
    contactoSolicitaId: "muestra-contacto-2",
    contactoAutorizaId: "muestra-contacto-1",
    canalAutorizacion: "correo" as const,
    cobraDiagnostico: false,
    creadaPor: "",
  };

  const os: OrdenServicio[] = [
    {
      ...base,
      folio: "OS-MUE-0001",
      unidadId: "muestra-u1",
      tallerId: "CDMX",
      tipoIngreso: "cita",
      tipoServicio: "correctivo",
      motivoReportado: "Hace un ruido al frenar y la camioneta se va hacia la derecha.",
      prioridad: "alta",
      estado: "pendiente_autorizacion",
      programadaPara: hace(10),
      entregaComprometida: enDias(4),
      creadaEn: hace(11),
    },
    {
      ...base,
      folio: "OS-MUE-0002",
      unidadId: "muestra-u2",
      tallerId: "Toluca",
      tipoIngreso: "directo",
      tipoServicio: "preventivo",
      motivoReportado: "Servicio de los 140 mil kilómetros.",
      prioridad: "normal",
      estado: "en_reparacion",
      entregaComprometida: enDias(1),
      creadaEn: hace(6),
    },
    {
      ...base,
      folio: "OS-MUE-0003",
      unidadId: "muestra-u3",
      tallerId: "Toluca",
      tipoIngreso: "cita",
      tipoServicio: "diagnostico",
      motivoReportado: "Se prende el testigo del motor en carretera.",
      prioridad: "normal",
      estado: "programada",
      programadaPara: new Date(),
      creadaEn: hace(2),
    },
  ];
  ordenes.push(...os);

  historialEstados.set(
    "OS-MUE-0001",
    historial([
      ["programada", 11],
      ["unidad_recibida", 10],
      ["en_diagnostico", 9.8],
      ["requisicion_generada", 9],
      ["en_cotizacion", 8.6],
      ["presupuesto_elaborado", 7],
      ["pendiente_autorizacion", 6.5],
      // Un retorno: el cliente pidió cambiar refacciones y se rehízo el presupuesto.
      ["presupuesto_elaborado", 5, "El cliente pidió cotizar amortiguadores originales en lugar de genéricos."],
      ["pendiente_autorizacion", 3.2],
    ])
  );
  historialEstados.set(
    "OS-MUE-0002",
    historial([
      ["programada", 6],
      ["unidad_recibida", 6],
      ["en_diagnostico", 5.9],
      ["requisicion_generada", 5.5],
      ["en_cotizacion", 5.2],
      ["presupuesto_elaborado", 4.8],
      ["pendiente_autorizacion", 4.6],
      ["autorizada_compra", 4],
      ["oc_creada", 3.9],
      ["autorizacion_oc", 3.6],
      ["en_proceso_pago", 3],
      ["material_recibido", 1.4],
      ["en_reparacion", 1.2],
    ])
  );
  historialEstados.set("OS-MUE-0003", historial([["programada", 2]]));

  const recepcionBase = {
    nivelCombustible: 4,
    recibeId: "",
    entregaNombre: "Chofer de muestra",
    inventario: {
      llave: true,
      refaccion: true,
      gato: true,
      herramienta: false,
      tapetes: true,
      documentos: true,
      estereo: true,
      placas: true,
    },
    inventarioExtra: "",
    objetosPersonales: "",
    danosPrevios: [],
    fotos: [],
    autorizaDiagnostico: true,
    firmaEntrega: null,
  };
  recepciones.push(
    { ...recepcionBase, osId: "OS-MUE-0001", fechaHora: hace(10), kilometraje: 87420 },
    { ...recepcionBase, osId: "OS-MUE-0002", fechaHora: hace(6), kilometraje: 142300 }
  );

  expedientesOS.set("OS-MUE-0001", {
    presupuesto: {
      folio: "PRE-MUE-0001",
      version: 2,
      fecha: dia(hace(5)),
      conceptos: [
        { id: "c1", tipo: "refaccion", clave: "AMO-ORIG-01", descripcion: "Amortiguador delantero original", unidad: "Pieza", cantidad: 2, costo: 1980, precioUnitario: 2850, descuento: 0 },
        { id: "c2", tipo: "refaccion", clave: "BAL-DEL-01", descripcion: "Juego de balatas delanteras cerámicas", unidad: "Juego", cantidad: 1, costo: 1120.07, precioUnitario: 1500, descuento: 0 },
        { id: "c3", tipo: "refaccion", clave: "DIS-DEL-01", descripcion: "Disco de freno delantero ventilado", unidad: "Pieza", cantidad: 2, costo: 1240, precioUnitario: 1714, descuento: 150 },
        { id: "c4", tipo: "mano_obra", clave: "MO-SUSP", descripcion: "Reemplazo de suspensión delantera y alineación", unidad: "Servicio", cantidad: 1, costo: 0, precioUnitario: 1650, descuento: 0 },
        { id: "c5", tipo: "mano_obra", clave: "MO-FRE", descripcion: "Cambio de balatas y discos delanteros", unidad: "Servicio", cantidad: 1, costo: 0, precioUnitario: 850, descuento: 0 },
      ],
    },
    compras: [
      { tipo: "requisicion", folio: "REQ-MUE-0001", proveedor: null, estado: "En comparativo", fecha: dia(hace(9)), monto: null },
    ],
    manoObra: [
      { tecnicoId: "muestra-tec-1", tecnico: "Técnico de muestra", puesto: "Mecánico general", fecha: dia(hace(9.8)), horasEstandar: 1, horasReales: 1.5, costoHora: 180 },
    ],
    costoRefacciones: null,
  });

  expedientesOS.set("OS-MUE-0002", {
    presupuesto: {
      folio: "PRE-MUE-0002",
      version: 1,
      fecha: dia(hace(4.8)),
      conceptos: [
        { id: "c1", tipo: "refaccion", clave: "FIL-ACE-01", descripcion: "Filtro de aceite", unidad: "Pieza", cantidad: 1, costo: 398, precioUnitario: 690, descuento: 0 },
        { id: "c2", tipo: "refaccion", clave: "FIL-AIR-01", descripcion: "Filtro de aire primario", unidad: "Pieza", cantidad: 1, costo: 664, precioUnitario: 1140, descuento: 0 },
        { id: "c3", tipo: "refaccion", clave: "ACE-15W40", descripcion: "Aceite 15W-40, cubeta 19 L", unidad: "Cubeta", cantidad: 1, costo: 3072, precioUnitario: 4560, descuento: 0 },
        { id: "c4", tipo: "mano_obra", clave: "MO-PREV-140", descripcion: "Servicio preventivo de los 140 mil km", unidad: "Servicio", cantidad: 1, costo: 0, precioUnitario: 2400, descuento: 0 },
      ],
    },
    compras: [
      { tipo: "requisicion", folio: "REQ-MUE-0002", proveedor: null, estado: "Cerrada", fecha: dia(hace(5.5)), monto: null },
      { tipo: "ordenCompra", folio: "OC-MUE-0002", proveedor: "Proveedor de muestra", estado: "Pagada", fecha: dia(hace(3.9)), monto: 4134 },
    ],
    manoObra: [
      { tecnicoId: "muestra-tec-1", tecnico: "Técnico de muestra", puesto: "Mecánico general", fecha: dia(hace(5.9)), horasEstandar: 0.5, horasReales: 0.5, costoHora: 180 },
      { tecnicoId: "muestra-tec-2", tecnico: "Ayudante de muestra", puesto: "Ayudante general", fecha: dia(hace(1.2)), horasEstandar: 3, horasReales: 3.5, costoHora: 96 },
    ],
    costoRefacciones: 4134,
  });
}

/*
 * Repositorio de personal en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Arranca vacío a propósito (CLAUDE.md, regla 8). El módulo de personal está
 * fuera de la fase 1: lo que se da de alta en la sesión vive aquí hasta recargar.
 */
import type { DatosAltaTecnico, PerfilTecnico } from "@/domain/tipos";
import type { PersonalRepo } from "../repositorios";

const altas: { datos: DatosAltaTecnico; perfil: PerfilTecnico }[] = [];

const CONTRATO: Record<DatosAltaTecnico["tipoContrato"], string> = {
  indeterminado: "Indeterminado",
  determinado: "Determinado",
  por_obra: "Por obra",
};

export const personalRepoMemoria: PersonalRepo = {
  async dashboard() {
    return {
      resumen: null,
      talleres: [],
      puestos: [],
      antiguedadPromedioAnios: null,
      rotacionAnual: null,
      capacidad: [],
      certificaciones: [],
      // Sin O.S. registradas todavía, su productividad arranca en cero.
      tecnicos: altas.map(({ datos, perfil }) => ({
        id: perfil.id,
        nombre: perfil.nombre,
        taller: perfil.taller.nombre,
        puesto: perfil.puesto,
        horasDisponibles: datos.horasDisponiblesMes,
        horasAplicadas: 0,
        horasFacturadas: 0,
        ordenes: 0,
        retrabajos: 0,
        costoHora: perfil.costoHora,
      })),
    };
  },

  async tecnico(id) {
    return altas.find((a) => a.perfil.id === id)?.perfil ?? null;
  },

  async receptores(tallerId) {
    return altas
      .filter((a) => a.datos.puedeRecibirUnidades && a.datos.tallerId === tallerId)
      .map((a) => ({ id: a.perfil.id, nombre: a.perfil.nombre, puesto: a.perfil.puesto }));
  },

  async crearTecnico(d) {
    const numero = d.numeroEmpleado.trim().toUpperCase();
    const existente = altas.find((a) => a.perfil.numeroEmpleado === numero);
    if (existente) throw new Error(`El número de empleado ${numero} ya es de ${existente.perfil.nombre}.`);
    const perfil: PerfilTecnico = {
      id: crypto.randomUUID(),
      nombre: d.nombre.trim(),
      puesto: d.puesto.trim(),
      nivel: d.nivel,
      numeroEmpleado: numero,
      taller: { id: d.tallerId, nombre: d.tallerId },
      turno: d.turno,
      activo: true,
      especialidades: d.especialidades,
      fechaIngreso: d.fechaIngreso,
      recuperacion: 0,
      recuperacionVariacionPts: 0,
      ordenesMes: 0,
      horasAplicadasMes: 0,
      horasDisponiblesMes: d.horasDisponiblesMes,
      retrabajos90Dias: 0,
      tasaRetrabajo: 0,
      tasaRetrabajoTaller: 0,
      costoHora: d.horasDisponiblesMes > 0 ? d.costoMensualIntegrado / d.horasDisponiblesMes : 0,
      costoMensual: d.costoMensualIntegrado,
      participacionNominaTaller: 0,
      valorGenerado: 0,
      relacionValorCostoTaller: 0,
      habilidades: [],
      ultimaEvaluacion: null,
      certificaciones: d.certificaciones,
      meses: [],
      expediente: [
        { etiqueta: "Fecha de ingreso", valor: d.fechaIngreso },
        { etiqueta: "Tipo de contrato", valor: CONTRATO[d.tipoContrato] },
        { etiqueta: "Puesto / nivel", valor: `${d.puesto.trim()} ${d.nivel}` },
        { etiqueta: "CURP", valor: d.curp ?? "Pendiente" },
        { etiqueta: "NSS", valor: d.nss ?? "Pendiente" },
        { etiqueta: "Correo", valor: d.correo || "—" },
        { etiqueta: "Teléfono", valor: d.telefono || "—" },
      ],
      ordenesRecientes: [],
    };
    altas.push({ datos: d, perfil });
    return { id: perfil.id };
  },
};

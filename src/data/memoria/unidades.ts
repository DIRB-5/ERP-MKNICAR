/*
 * Repositorio de unidades en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 */
import type { UnidadRepo } from "../repositorios";
import type { Unidad } from "@/domain/tipos";
import { buscarCliente, clientes, historial, unidades } from "./almacen";

export const unidadRepoMemoria: UnidadRepo = {
  async listar(f) {
    return unidades.filter(
      (u) =>
        (!f.tallerBaseId || u.tallerBase.id === f.tallerBaseId) &&
        (!f.clienteId || u.cliente.id === f.clienteId) &&
        (!f.tipo || u.unidad.tipo === f.tipo) &&
        (!f.estado || u.unidad.estado === f.estado) &&
        (!f.soloEnPiso || u.osAbierta != null)
    );
  },
  async obtener(placas) {
    const resumen = unidades.find((u) => u.unidad.placas === placas);
    if (!resumen) return null;
    const ordenes = historial.get(placas) ?? [];
    const costoAcumulado = ordenes.reduce((a, o) => a + o.costo, 0);
    const km = resumen.unidad.kilometrajeUltimo;
    const anio = String(new Date().getFullYear());
    return {
      resumen,
      costoAcumulado,
      osHistoricas: ordenes.length,
      costoPorKm: km > 0 ? costoAcumulado / km : null,
      diasFueraOperacionAnio: ordenes
        .filter((o) => o.fecha.startsWith(anio))
        .reduce((a, o) => a + (o.diasCiclo ?? 0), 0),
    };
  },
  async historialDe(placas) {
    return [...(historial.get(placas) ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
  async crear(d) {
    const placas = d.placas.trim().toUpperCase();
    const vin = d.vin.trim().toUpperCase();
    if (unidades.some((u) => u.unidad.placas === placas)) throw new Error(`Ya existe una unidad con placas ${placas}.`);
    if (vin && unidades.some((u) => u.unidad.vin === vin)) throw new Error(`El VIN ${vin} ya está registrado.`);
    const unidad: Unidad = { ...d, id: crypto.randomUUID(), placas, vin, estado: "activa" };
    unidades.push({
      unidad,
      cliente: { id: d.clienteId, razonSocial: buscarCliente(d.clienteId)?.razonSocial ?? "" },
      tallerBase: { id: d.tallerBaseId, nombre: d.tallerBaseId },
      osAbierta: null,
      osAbiertas: 0,
      ultimoServicio: null,
    });
    const cliente = clientes.find((c) => c.cliente.id === d.clienteId);
    if (cliente) cliente.unidades += 1;
    return unidad;
  },
  async altaRapida(d) {
    const placas = d.placas.trim().toUpperCase();
    if (unidades.some((u) => u.unidad.placas === placas)) {
      throw new Error(`Ya existe una unidad con placas ${placas}.`);
    }
    const unidad: Unidad = {
      id: crypto.randomUUID(),
      placas,
      vin: "",
      marca: d.marca.trim(),
      modelo: d.modelo.trim(),
      anio: d.anio,
      tipo: "combustion",
      clienteId: d.clienteId,
      tallerBaseId: "",
      kilometrajeUltimo: 0,
      fechaKilometraje: new Date().toISOString().slice(0, 10),
      estado: "activa",
    };
    unidades.push({
      unidad,
      cliente: { id: d.clienteId, razonSocial: buscarCliente(d.clienteId)?.razonSocial ?? "" },
      tallerBase: { id: "", nombre: "Sin asignar" },
      osAbierta: null,
      osAbiertas: 0,
      ultimoServicio: null,
    });
    return unidad;
  },
};

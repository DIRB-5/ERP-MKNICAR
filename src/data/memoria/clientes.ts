/*
 * Repositorio de clientes en memoria.
 * SE BORRA CUANDO EXISTA LA API.
 */
import type { Cliente } from "@/domain/tipos";
import type { ClienteRepo } from "../repositorios";
import { buscarCliente, clientes, historial, unidades } from "./almacen";

export const clienteRepoMemoria: ClienteRepo = {
  async listar(f) {
    const texto = f.texto?.trim().toLowerCase();
    return clientes.filter(
      (c) =>
        (!f.tipo || c.cliente.tipo === f.tipo) &&
        (!f.estado || c.cliente.estado === f.estado) &&
        (!texto ||
          c.cliente.razonSocial.toLowerCase().includes(texto) ||
          c.cliente.rfc.toLowerCase().includes(texto))
    );
  },
  async obtener(id) {
    return buscarCliente(id);
  },
  async unidadesDe(clienteId) {
    return unidades.filter((u) => u.cliente.id === clienteId);
  },
  async ordenesDe(clienteId) {
    return unidades
      .filter((u) => u.cliente.id === clienteId)
      .flatMap((u) => historial.get(u.unidad.placas) ?? [])
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
  },
  async crear(d) {
    const rfc = d.rfc.trim().toUpperCase();
    const existente = clientes.find((c) => c.cliente.rfc === rfc);
    if (existente) throw new Error(`El RFC ${rfc} ya está registrado a nombre de ${existente.cliente.razonSocial}.`);
    const cliente: Cliente = {
      ...d,
      id: crypto.randomUUID(),
      rfc,
      estado: "activo",
      contactos: d.contactos.map((k) => ({ ...k, id: crypto.randomUUID() })),
    };
    clientes.push({ cliente, unidades: 0, osAbiertas: 0, facturadoPeriodo: 0 });
    return cliente;
  },
};

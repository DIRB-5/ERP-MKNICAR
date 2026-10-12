/*
 * Implementación en memoria de la capa de datos.
 * SE BORRA CUANDO EXISTA LA API.
 *
 * Está vacía a propósito: el proyecto no lleva datos de ejemplo (CLAUDE.md,
 * regla 8). Solo existe para que las páginas corran contra las firmas de
 * src/data/repositorios.ts mientras se define el contrato con el backend.
 */
import type {
  Cliente,
  ClienteResumen,
  OrdenHistorial,
  OrdenServicio,
  UnidadResumen,
} from "@/domain/tipos";
import type { EventoOS } from "@/domain/bitacora";

export const clientes: ClienteResumen[] = [];
export const unidades: UnidadResumen[] = [];
/** Historial de O.S. por placas. */
export const historial = new Map<string, OrdenHistorial[]>();

export const buscarCliente = (id: string): Cliente | null =>
  clientes.find((c) => c.cliente.id === id)?.cliente ?? null;

/* Lo que se crea en esta sesión del navegador; se pierde al recargar. */
export const ordenes: OrdenServicio[] = [];
/**
 * Bitácora de cada O.S., por folio. Append-only: de aquí salen el estado, los
 * tiempos y el expediente completo.
 */
export const bitacoras = new Map<string, EventoOS[]>();

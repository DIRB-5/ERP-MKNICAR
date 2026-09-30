import { Chip, type TonoChip } from "@/components/Chip/Chip";
import type {
  CanalContacto,
  EstadoCliente,
  EstadoUnidad,
  TipoCliente,
  TipoUnidad,
} from "@/domain/tipos";

export const TIPO_UNIDAD: Record<TipoUnidad, string> = {
  combustion: "Combustión",
  hibrido: "Híbrido",
  electrico: "Eléctrico",
};

export const ESTADO_UNIDAD: Record<EstadoUnidad, { label: string; tono: TonoChip }> = {
  activa: { label: "Activa", tono: "ok" },
  baja: { label: "Baja", tono: "neutro" },
  siniestrada: { label: "Siniestrada", tono: "critico" },
};

export const TIPO_CLIENTE: Record<TipoCliente, string> = {
  flotilla: "Flotilla",
  particular: "Particular",
};

export const ESTADO_CLIENTE: Record<EstadoCliente, { label: string; tono: TonoChip }> = {
  activo: { label: "Activo", tono: "ok" },
  credito_suspendido: { label: "Crédito suspendido", tono: "critico" },
};

export const CANAL: Record<CanalContacto, string> = {
  correo: "Correo",
  whatsapp: "WhatsApp",
};

export const ChipEstadoUnidad = ({ estado }: { estado: EstadoUnidad }) => (
  <Chip tono={ESTADO_UNIDAD[estado].tono}>{ESTADO_UNIDAD[estado].label}</Chip>
);

export const ChipEstadoCliente = ({ estado }: { estado: EstadoCliente }) => (
  <Chip tono={ESTADO_CLIENTE[estado].tono}>{ESTADO_CLIENTE[estado].label}</Chip>
);

/** Atenderse fuera del taller base se señala siempre: le dice algo a Dirección. */
export const ChipFueraDeBase = ({ base }: { base: string }) => (
  <Chip tono="brand" title={`Su taller base es ${base}`}>
    ↗ Fuera de base
  </Chip>
);

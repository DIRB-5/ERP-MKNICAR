/**
 * Las seis áreas del diagrama de flujo del negocio.
 * El color viaja con el dato mediante la variable local `--dom`.
 */
export const AREAS = [
  "cliente",
  "operacion",
  "abastecimiento",
  "direccion",
  "tesoreria",
  "almacen",
] as const;

export type Area = (typeof AREAS)[number];

export const AREA_LABEL: Record<Area, string> = {
  cliente: "Cliente",
  operacion: "Operación",
  abastecimiento: "Abastecimiento",
  direccion: "Dirección",
  tesoreria: "Tesorería",
  almacen: "Almacén",
};

/** Token CSS del área, para usar como valor de `--dom`. */
export const areaVar = (area: Area) => `var(--area-${area})`;

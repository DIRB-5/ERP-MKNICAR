/**
 * Catálogos oficiales del SAT (CFDI 4.0) que usa el alta de proveedores.
 * Son normativa publicada, no datos de ejemplo: se actualizan cuando el SAT
 * los cambie.
 */

/** c_RegimenFiscal, regímenes aplicables a personas morales y físicas. */
export const REGIMEN_FISCAL: Record<string, string> = {
  "601": "General de Ley Personas Morales",
  "603": "Personas Morales con Fines no Lucrativos",
  "605": "Sueldos y Salarios e Ingresos Asimilados a Salarios",
  "606": "Arrendamiento",
  "607": "Régimen de Enajenación o Adquisición de Bienes",
  "608": "Demás ingresos",
  "610": "Residentes en el Extranjero sin Establecimiento Permanente en México",
  "611": "Ingresos por Dividendos (socios y accionistas)",
  "612": "Personas Físicas con Actividades Empresariales y Profesionales",
  "614": "Ingresos por intereses",
  "615": "Régimen de los ingresos por obtención de premios",
  "616": "Sin obligaciones fiscales",
  "620": "Sociedades Cooperativas de Producción que optan por diferir sus ingresos",
  "621": "Incorporación Fiscal",
  "622": "Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras",
  "623": "Opcional para Grupos de Sociedades",
  "624": "Coordinados",
  "625": "Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
  "626": "Régimen Simplificado de Confianza",
};

/** c_UsoCFDI, solo los usos que aplican a compras de refacciones y servicios. */
export const USO_CFDI: Record<string, string> = {
  G01: "Adquisición de mercancías",
  G03: "Gastos en general",
  I08: "Otra maquinaria y equipo",
};

/** Tasa general del IVA. La frontera norte y sur tiene estímulo; lo resolverá el backend por taller. */
export const TASA_IVA = 0.16;

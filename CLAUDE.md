# ERP MKNICAR — instrucciones del repo

ERP para flotas vehiculares de MKNICAR (red nacional de 6 talleres de mantenimiento
de flotillas). Fase 1. Construido por Paralelo Product Studio.

Stack: Vite · React 18 · TypeScript estricto · CSS Modules · React Router ·
TanStack Query.

## Reglas que no se rompen

1. **`src/styles/tokens.css` NO se edita.** Es generado por
   `scripts/build-tokens.mjs` desde `design-system/tokens.json` en cada `dev` y
   cada `build`, y está en `.gitignore`. Un color, radio o espaciado nuevo se
   agrega al JSON, nunca al CSS.
2. **Ningún valor literal de color, radio, espaciado o sombra en un componente.**
   Siempre `var(--token)`. Si el token no existe, se agrega al JSON primero.
3. **Toda superficie de vidrio usa el componente `Surface`.** No se reimplementa:
   el vidrio necesita fondo + `backdrop-filter` con prefijo `-webkit-` + borde,
   las tres juntas, y `Surface` ya lo resuelve.
4. **El dato nunca va sobre vidrio traslúcido.** Contenedor en `glass`; cuerpo de
   tabla, celdas editables y campos en `Surface variante="solid"`.
5. **`font-variant-numeric: tabular-nums` en toda cifra.** Usar el componente
   `Monto`, que ya lo aplica. Sin numeración tabular las columnas de dinero no se
   pueden comparar, que es su única razón de existir.
6. **Todo folio de la cadena navega.** Usar `Folio` con su `tipo`. Un folio que no
   es enlace rompe la promesa central del producto.
7. **`pulso-actual` solo en el nodo actual de una O.S. detenida.** Es la única
   animación con significado. Las otras dos permitidas son `fade-vista` y
   `toast-in`. No se agregan más.
8. **Sin datos demo en el código.** Los componentes reciben props. Nada de
   constantes con órdenes, clientes ni montos de ejemplo dentro de `src/`.

## Dominio

`src/domain/` es la traducción de las reglas de negocio acordadas con el COO el
21 de septiembre de 2026. No se modifica sin que ese cambio venga de una decisión
del cliente.

- `estados.ts` — máquina de 20 estados de la O.S., incluidos `rechazada`,
  `espera_refaccion` y `retenida`; mapa de transiciones con los dos retornos
  (O.C. rechazada → presupuesto; sobrecosto → autorización del cliente); área
  responsable y umbrales de antigüedad.
  Aquí vive solo la **topología**. Quién puede ejecutar cada transición lo
  resuelve el motor de autorizaciones del backend; el cliente nunca lo sustituye.
- `areas.ts` — las seis áreas del diagrama de flujo del negocio. El color viaja
  con el dato mediante la variable local `--dom`.
- `folios.ts` — series por tipo de documento y su ruta de detalle.
- `format.ts` — moneda MXN, porcentajes con signo explícito (menos = U+2212),
  fechas en español de México, días, UUID truncado.

## Los tres puntos de espera medibles

El producto existe para medirlos. El ámbar (`warning`) es su color y no se usa
para nada más:

1. `pendiente_autorizacion` — Cliente
2. `autorizacion_oc` — Dirección
3. `en_proceso_pago` — Tesorería

(`espera_refaccion` también cuenta como espera, responsable Abastecimiento.)

## La unidad y el taller

La unidad **no tiene campo de taller actual**. Tiene `tallerBaseId`, el taller
que la atiende normalmente, y nada más. Dónde está ahora mismo sale de su O.S.
abierta: si tiene una, está "En piso" en el taller de esa O.S.; si no, está
"En operación" con el cliente.

Cuando el taller de la O.S. no es el taller base, se marca siempre ("Fuera de
base"), en la lista de unidades, en su ubicación y en el historial: esa unidad
viajó o su base no tuvo capacidad, y eso le dice algo a Dirección.

## Vocabulario

**O.S.** (orden de servicio), nunca O.T. ni "orden de trabajo".
O.C. · requisición · cotización · comparativo · presupuesto · autorización ·
remisión · factura · abastecimiento · tesorería · almacén · taller · unidad ·
flotilla · capa de costo.

Interfaz 100% en español de México. Estados en participio (*Remisionada*,
*Facturada*, *En espera de refacción*). Montos `$000,000.00`. Fechas `22 ago` o
`22 ago 2026`. Desviaciones con signo: `+41.7%`, `−9.1%`.

Los nombres de archivos, componentes, tipos y variables van en español cuando
nombran conceptos del negocio (`Antiguedad`, `PuntoArea`, `EstadoOS`), en inglés
cuando son genéricos de la plataforma (`DataTable`, `Surface`, `KpiCard`).

## Convenciones de código

- Un componente por carpeta: `Componente.tsx` + `Componente.module.css`.
  Se exporta desde `src/components/index.ts`.
- Nombres de clase CSS en camelCase (CSS Modules los expone como propiedades).
- TypeScript estricto con `noUncheckedIndexedAccess`: el acceso indexado a un
  CSS Module devuelve `string | undefined`. Desestructurar con valor por
  defecto, no castear.
- Alias `@/` apunta a `src/`.
- Comentarios en español, solo donde expliquen una decisión de negocio o una
  trampa. No comentar lo obvio.

## Accesibilidad

- Texto 4.5:1 mínimo sobre su fondo, medido contra el vidrio en su punto más
  claro, no contra el lienzo. 3:1 para texto ≥24px, bordes de control e íconos.
- El color nunca es el único portador de significado: todo chip lleva texto,
  toda celda con semáforo lleva su valor, todo `PuntoArea` lleva etiqueta o
  `title`.
- Anillo de foco visible en todo control operable con teclado.
- Respetar `prefers-reduced-motion` y `prefers-reduced-transparency`.

## Fuera de alcance de la fase 1

Facturación y timbrado CFDI · cuentas por cobrar · inventarios físicos y punto de
reorden · conciliación bancaria · módulo de personal · tableros y constructor de
reportes · app móvil nativa · migración de históricos.

No construir nada de esto sin que se pida explícitamente.

## Referencia visual

Las diez pantallas del prototipo están en la carpeta del export de Claude Design.
La referencia vigente es **`ERP FlotillaTaller.dc.html`** (navegación horizontal).
`ERP FlotillaTaller (sidebar).dc.html` es una alternativa descartada: no usarla.

Los `.dc.html` sirven como referencia de composición, nunca como base de código:
su lógica está en plantillas `{{ }}` y sus datos viven dentro del archivo.

## Pendiente antes de la primera pantalla real

- Contrato de la API con el backend (Omar).
- Contexto de sesión: usuario, rol y taller activo. El scoping por taller va en
  la capa de datos desde el primer fetch, no se agrega después.
- Medir `backdrop-filter` con una tabla de 200 filas antes de comprometer el
  vidrio en vistas densas.

# ERP MKNICAR — aplicación React

Fase 1 del ERP para flotas vehiculares de MKNICAR. Construido por
Paralelo Product Studio.

## Arranque

```bash
npm install
npm run dev
```

`npm run dev` genera `src/styles/tokens.css` antes de levantar Vite.

## Cómo está armado

| Carpeta | Qué contiene |
| --- | --- |
| `design-system/tokens.json` | **Fuente de verdad del diseño.** Sincronizado con el artifact "MKNICAR ERP" |
| `scripts/build-tokens.mjs` | Genera `src/styles/tokens.css` desde el JSON |
| `src/styles/base.css` | Lienzo, vidrio, fallbacks, animaciones, scrollbars |
| `src/domain/` | Máquina de estados, áreas, series de folio y formato |
| `src/components/` | Componentes del sistema, uno por carpeta con su CSS Module |
| `src/app/` | Shell, navegación y router |
| `src/pages/` | Una carpeta por módulo |

## Reglas que no se rompen

1. **`tokens.css` no se edita a mano.** Está en `.gitignore` y se regenera en
   cada build. Un color nuevo se agrega a `design-system/tokens.json`.
2. **Ningún valor de color, radio o espaciado se escribe literal en un
   componente.** Siempre `var(--token)`.
3. **El dato no va sobre vidrio traslúcido.** Contenedor en `glass`, cuerpo de
   tabla en `Surface variante="solid"`.
4. **Toda superficie de vidrio lleva las tres cosas juntas:** fondo, `blur` y
   borde. El componente `Surface` ya lo resuelve; no reimplementarlo.
5. **`font-variant-numeric: tabular-nums`** en toda cifra. El componente
   `Monto` lo aplica.
6. **Todo folio de la cadena navega.** Usar `Folio` con su `tipo`.
7. **`pulso-actual` solo en el nodo actual de una O.S. detenida.** Es la única
   animación con significado.
8. **Vocabulario:** O.S., nunca O.T. Interfaz en español de México.

## Pendiente antes de la primera pantalla real

- Definir el cliente HTTP y el contrato con el backend de Omar.
- Contexto de sesión: usuario, rol, taller activo y scoping de datos.
- Motor de permisos en cliente que refleje el del backend (nunca lo sustituya).
- Layout de la fotografía de fondo: definir `--canvas-image` en `base.css`
  apuntando al asset servido.

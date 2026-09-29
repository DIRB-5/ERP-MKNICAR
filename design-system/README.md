# Design system

`tokens.json` es la copia local del design system publicado como artifact
**MKNICAR ERP** (tipo Design System). Contiene colores en dos temas
—`glass` y `solid`—, escala tipográfica, espaciado, radios, sombras y layout.

## Sincronización

Cuando el artifact cambie, se reemplaza este archivo y se corre:

```bash
npm run tokens
```

No se edita `src/styles/tokens.css`: es generado y está en `.gitignore`.

## El tema `solid` no es modo oscuro

Es el estado al que cae la interfaz cuando el navegador no soporta
`backdrop-filter`, cuando el usuario pide transparencia reducida y al
imprimir. El ERP no tiene modo oscuro.

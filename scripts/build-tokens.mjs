#!/usr/bin/env node
/**
 * Genera src/styles/tokens.css a partir de design-system/tokens.json.
 *
 * tokens.json es la fuente de verdad y se sincroniza con el artifact
 * "MKNICAR ERP" (tipo Design System). NUNCA edites tokens.css a mano:
 * se sobrescribe en cada build.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(here, "../design-system/tokens.json");
const OUT = resolve(here, "../src/styles/tokens.css");

const t = JSON.parse(readFileSync(SRC, "utf8"));
const themes = t.color.themes.map((x) => x.id);
const [base, ...rest] = themes;

const val = (v, theme) =>
  typeof v === "string" ? v : v[theme] ?? v[base];

const lines = [];
lines.push("/* GENERADO POR scripts/build-tokens.mjs — no editar a mano. */");
lines.push(`/* Fuente: design-system/tokens.json v${t.version} */`);
lines.push("");

// ── tema base: color + shadow + el resto de familias
lines.push(`:root, [data-theme="${base}"] {`);
for (const c of t.color.tokens) lines.push(`  --${c.name}: ${val(c.value, base)};`);
if (t.shadow) for (const s of t.shadow.tokens) lines.push(`  --${s.name}: ${val(s.value, base)};`);
lines.push("}");
lines.push("");

// ── temas adicionales
for (const th of rest) {
  lines.push(`[data-theme="${th}"] {`);
  for (const c of t.color.tokens) lines.push(`  --${c.name}: ${val(c.value, th)};`);
  if (t.shadow) for (const s of t.shadow.tokens) lines.push(`  --${s.name}: ${val(s.value, th)};`);
  lines.push("}");
  lines.push("");
}

// ── familias sin tema
lines.push(":root {");
for (const fam of ["spacing", "radius", "effect", "layout"]) {
  if (!t[fam]) continue;
  lines.push(`  /* ${fam} */`);
  for (const tok of t[fam].tokens) {
    const name = tok.name.replace(/\./g, "\\.");
    lines.push(`  --${name}: ${tok.value};`);
  }
}
for (const [key, stack] of Object.entries(t.type.families)) {
  lines.push(`  --font-${key}: ${stack};`);
}
lines.push("}");
lines.push("");

// ── clases de estilo tipográfico
for (const g of t.type.groups) {
  lines.push(`/* ${g.name} */`);
  for (const s of g.styles) {
    lines.push(`.${s.name} {`);
    lines.push(`  font-family: var(--font-${s.family ?? g.family});`);
    lines.push(`  font-size: ${s.fontSize};`);
    if (s.lineHeight) lines.push(`  line-height: ${s.lineHeight};`);
    if (s.fontWeight) lines.push(`  font-weight: ${s.fontWeight};`);
    if (s.letterSpacing) lines.push(`  letter-spacing: ${s.letterSpacing};`);
    lines.push("}");
  }
  lines.push("");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join("\n"), "utf8");
console.log(`tokens.css generado · ${t.color.tokens.length} colores, ${themes.length} temas`);

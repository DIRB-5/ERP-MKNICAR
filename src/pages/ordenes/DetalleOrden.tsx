import { Surface } from "@/components/Surface/Surface";

export function Component() {
  return (
    <Surface style={{ padding: "var(--space-6)" }}>
      <h1 style={{ fontSize: "1.375rem", fontWeight: 700, letterSpacing: "-0.6px" }}>
        Detalle de O.S.
      </h1>
      <p style={{ marginTop: "var(--space-2)", color: "var(--ink-muted)", fontSize: "0.75rem" }}>
        Pendiente: línea de tiempo, pestañas documentales y trazabilidad financiera.
      </p>
    </Surface>
  );
}

Component.displayName = "DetalleOrden";

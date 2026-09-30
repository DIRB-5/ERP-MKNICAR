import { Campo, Input, Select } from "@/components/Campo/Campo";
import { Button } from "@/components/Button/Button";
import { Chip } from "@/components/Chip/Chip";
import type { CanalContacto } from "@/domain/tipos";
import { CANAL } from "@/pages/catalogos/etiquetas";
import styles from "./NuevoCliente.module.css";

export interface ContactoEditable {
  /** Clave local para React; el id real lo asigna el backend. */
  clave: string;
  nombre: string;
  puesto: string;
  correo: string;
  telefono: string;
  autorizaPresupuesto: boolean;
  canalPreferido: CanalContacto;
}

export type ErroresContacto = Partial<Record<"nombre" | "correo" | "telefono", string>>;

export const contactoVacio = (): ContactoEditable => ({
  clave: crypto.randomUUID(),
  nombre: "",
  puesto: "",
  correo: "",
  telefono: "",
  autorizaPresupuesto: false,
  canalPreferido: "correo",
});

/** Una fila sin nada escrito no cuenta: no se valida ni se guarda. */
export const estaVacio = (c: ContactoEditable) =>
  !c.nombre.trim() && !c.puesto.trim() && !c.correo.trim() && !c.telefono.trim();

interface Props {
  contactos: ContactoEditable[];
  onCambiar: (contactos: ContactoEditable[]) => void;
  errores: Record<string, ErroresContacto>;
}

export function EditorContactos({ contactos, onCambiar, errores }: Props) {
  const poner = (clave: string, cambio: Partial<ContactoEditable>) =>
    onCambiar(contactos.map((c) => (c.clave === clave ? { ...c, ...cambio } : c)));

  return (
    <div className={styles.contactos}>
      {contactos.map((c, i) => {
        const e = errores[c.clave] ?? {};
        return (
          <fieldset key={c.clave} className={`${styles.contacto} ${c.autorizaPresupuesto ? styles.autoriza : ""}`}>
            <legend className={styles.contactoTitulo}>
              Contacto {i + 1}
              {c.autorizaPresupuesto && <Chip tono="brand">✓ Autoriza presupuestos</Chip>}
            </legend>
            <div className={styles.rejilla2}>
              <Campo etiqueta="Nombre" obligatorio error={e.nombre}>
                {(p) => <Input {...p} autoComplete="off" value={c.nombre} onChange={(x) => poner(c.clave, { nombre: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Puesto">
                {(p) => (
                  <Input {...p} placeholder="Gerente de flota, jefe de mantenimiento…" value={c.puesto} onChange={(x) => poner(c.clave, { puesto: x.target.value })} />
                )}
              </Campo>
              <Campo etiqueta="Correo" obligatorio={c.canalPreferido === "correo"} error={e.correo}>
                {(p) => <Input {...p} type="email" autoComplete="off" value={c.correo} onChange={(x) => poner(c.clave, { correo: x.target.value })} />}
              </Campo>
              <Campo etiqueta="Teléfono" obligatorio={c.canalPreferido === "whatsapp"} error={e.telefono} ayuda="10 dígitos.">
                {(p) => <Input {...p} type="tel" autoComplete="off" value={c.telefono} onChange={(x) => poner(c.clave, { telefono: x.target.value })} />}
              </Campo>
            </div>
            <div className={styles.contactoPie}>
              <label className={styles.casilla}>
                <input
                  type="checkbox"
                  checked={c.autorizaPresupuesto}
                  onChange={(x) => poner(c.clave, { autorizaPresupuesto: x.target.checked })}
                />
                Autoriza presupuestos
              </label>
              <Campo etiqueta="Canal preferido" className={styles.canal}>
                {(p) => (
                  <Select {...p} value={c.canalPreferido} onChange={(x) => poner(c.clave, { canalPreferido: x.target.value as CanalContacto })}>
                    {(Object.keys(CANAL) as CanalContacto[]).map((k) => (
                      <option key={k} value={k}>{CANAL[k]}</option>
                    ))}
                  </Select>
                )}
              </Campo>
              <Button
                variante="fantasma"
                onClick={() => onCambiar(contactos.filter((x) => x.clave !== c.clave))}
                aria-label={`Quitar contacto ${i + 1}`}
              >
                Quitar
              </Button>
            </div>
          </fieldset>
        );
      })}
      <div>
        <Button onClick={() => onCambiar([...contactos, contactoVacio()])}>+ Agregar contacto</Button>
      </div>
    </div>
  );
}

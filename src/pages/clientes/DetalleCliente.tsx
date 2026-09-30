import { Link, useParams, useSearchParams } from "react-router-dom";
import { Surface } from "@/components/Surface/Surface";
import { Tabs } from "@/components/Tabs/Tabs";
import { Chip } from "@/components/Chip/Chip";
import { DataTable } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import type { Cliente, Contacto } from "@/domain/tipos";
import { useCliente, useOrdenesDeCliente, useUnidadesDeCliente } from "@/data/consultas";
import { CANAL, ChipEstadoCliente, TIPO_CLIENTE } from "@/pages/catalogos/etiquetas";
import { COLUMNAS_UNIDADES_DE_CLIENTE } from "@/pages/unidades/columnasUnidades";
import { columnasHistorial } from "@/pages/unidades/columnasHistorial";
import styles from "@/pages/catalogos/Catalogo.module.css";
import dc from "./DetalleCliente.module.css";

const PESTANAS = ["unidades", "historial", "contactos", "convenio"] as const;
type IdPestana = (typeof PESTANAS)[number];

const esPestana = (v: string | null): v is IdPestana => PESTANAS.some((p) => p === v);

function Contactos({ contactos }: { contactos: Contacto[] }) {
  // Quien autoriza va primero: es a quien se le manda el presupuesto.
  const ordenados = [...contactos].sort(
    (a, b) => Number(b.autorizaPresupuesto) - Number(a.autorizaPresupuesto)
  );
  const autorizan = contactos.filter((c) => c.autorizaPresupuesto).length;

  if (contactos.length === 0) {
    return (
      <EmptyState titulo="Este cliente no tiene contactos registrados">
        Sin un contacto que autorice presupuestos no se puede enviar una O.S. a autorización.
      </EmptyState>
    );
  }

  return (
    <div className={dc.contactos}>
      <p className={dc.nota}>
        El alta de O.S. envía la solicitud de autorización a los contactos marcados, por su canal
        preferido.{" "}
        {autorizan === 0 && (
          <Chip tono="critico">Ningún contacto autoriza presupuestos</Chip>
        )}
      </p>
      <ul className={dc.lista}>
        {ordenados.map((c) => (
          <li key={`${c.correo}-${c.nombre}`}>
            <Surface
              variante="solid"
              className={`${dc.contacto} ${c.autorizaPresupuesto ? dc.autoriza : ""}`}
            >
              <div className={dc.contactoHead}>
                <div>
                  <div className={dc.nombre}>{c.nombre}</div>
                  <div className={styles.secundario}>{c.puesto}</div>
                </div>
                {c.autorizaPresupuesto ? (
                  <Chip tono="brand">✓ Autoriza presupuestos</Chip>
                ) : (
                  <Chip>No autoriza</Chip>
                )}
              </div>
              <dl className={dc.medios}>
                <dt>Correo</dt>
                <dd>
                  <a href={`mailto:${c.correo}`}>{c.correo}</a>
                </dd>
                <dt>Teléfono</dt>
                <dd>
                  <a href={`tel:${c.telefono.replace(/\s+/g, "")}`}>{c.telefono}</a>
                </dd>
                <dt>Canal preferido</dt>
                <dd>
                  <b>{CANAL[c.canalPreferido]}</b>
                </dd>
              </dl>
            </Surface>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Convenio({ cliente }: { cliente: Cliente }) {
  return cliente.convenioId ? (
    <EmptyState titulo={`Convenio ${cliente.convenioId}`}>
      Las tarifas de mano de obra y refacciones del convenio se mostrarán aquí cuando exista el
      catálogo de convenios.
    </EmptyState>
  ) : (
    <EmptyState titulo="Este cliente no tiene convenio">
      Sus O.S. se cotizan con las tarifas de lista.
    </EmptyState>
  );
}

export function Component() {
  const { id = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const crudo = params.get("pestana");
  const pestana: IdPestana = esPestana(crudo) ? crudo : "unidades";

  const { data: cliente, isPending } = useCliente(id);
  const { data: unidades } = useUnidadesDeCliente(id);
  const { data: ordenes } = useOrdenesDeCliente(id);

  const cambiar = (p: IdPestana) => {
    const s = new URLSearchParams(params);
    s.set("pestana", p);
    setParams(s, { replace: true });
  };

  if (isPending) return <EmptyState titulo="Cargando cliente…" />;

  if (!cliente) {
    return (
      <div className={styles.vista}>
        <div className={styles.migas}>
          <Link to="/clientes">Clientes</Link> / {id}
        </div>
        <EmptyState titulo="No encontramos este cliente">
          Puede que el enlace sea viejo o que el cliente esté fuera de tu alcance.
          <div className={styles.acciones}>
            <Link to="/clientes" className={styles.botonPrimario}>
              Ir a la cartera de clientes
            </Link>
          </div>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.vista}>
      <div className={styles.migas}>
        <Link to="/clientes">Clientes</Link> / {cliente.razonSocial}
      </div>

      <Surface as="header" className={styles.ficha}>
        <div className={styles.fichaPrincipal}>
          <h1 className={`${styles.fichaTitulo} ${cliente.estado === "credito_suspendido" ? styles.critico : ""}`}>
            {cliente.razonSocial} <ChipEstadoCliente estado={cliente.estado} />
          </h1>
          <div className={styles.fichaSub}>RFC {cliente.rfc}</div>
        </div>
        <dl className={styles.datos}>
          <div>
            <dt>Tipo</dt>
            <dd>{TIPO_CLIENTE[cliente.tipo]}</dd>
          </div>
          <div>
            <dt>Convenio</dt>
            <dd>{cliente.convenioId ?? "Sin convenio"}</dd>
          </div>
          <div>
            <dt>Ejecutivo de cuenta</dt>
            <dd>{cliente.ejecutivoCuenta}</dd>
          </div>
        </dl>
      </Surface>

      <Surface className={dc.cuerpo}>
        <Tabs
          etiqueta="Expediente del cliente"
          idBase="cliente"
          activa={pestana}
          onCambiar={cambiar}
          pestanas={[
            { id: "unidades", etiqueta: "Unidades", conteo: unidades?.length },
            { id: "historial", etiqueta: "Historial de O.S.", conteo: ordenes?.length },
            { id: "contactos", etiqueta: "Contactos", conteo: cliente.contactos.length },
            { id: "convenio", etiqueta: "Convenio y tarifas" },
          ]}
        >
          {pestana === "unidades" && (
            <DataTable
              plano
              columnas={COLUMNAS_UNIDADES_DE_CLIENTE}
              filas={unidades ?? []}
              claveFila={(u) => u.unidad.id}
              vacio={
                <EmptyState titulo="Este cliente aún no tiene unidades">
                  <div className={styles.acciones}>
                    <Link to={`/unidades/nueva?cliente=${encodeURIComponent(cliente.id)}`} className={styles.botonPrimario}>
                      + Registrar unidad
                    </Link>
                  </div>
                </EmptyState>
              }
            />
          )}
          {pestana === "historial" && (
            <DataTable
              plano
              columnas={columnasHistorial()}
              filas={ordenes ?? []}
              claveFila={(o) => o.folio}
              vacio={
                <EmptyState titulo="Este cliente aún no tiene O.S.">
                  <div className={styles.acciones}>
                    <Link to="/ordenes/nueva" className={styles.botonPrimario}>
                      + Crear O.S.
                    </Link>
                  </div>
                </EmptyState>
              }
            />
          )}
          {pestana === "contactos" && <Contactos contactos={cliente.contactos} />}
          {pestana === "convenio" && <Convenio cliente={cliente} />}
        </Tabs>
      </Surface>
    </div>
  );
}

Component.displayName = "DetalleCliente";

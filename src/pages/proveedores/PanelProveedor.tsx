import { Chip } from "@/components/Chip/Chip";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { Button } from "@/components/Button/Button";
import { numero } from "@/domain/format";
import { useProveedor } from "@/data/consultas";
import { ESTADO_PROVEEDOR } from "./etiquetas";
import s from "./ProveedoresProductos.module.css";

export function PanelProveedor({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { data: d, isPending } = useProveedor(id);

  if (isPending) return <div className={s.panelVacio}>Cargando proveedor…</div>;
  if (!d) {
    return (
      <div className={s.panelVacio}>
        No encontramos este proveedor.
        <Button variante="fantasma" onClick={onCerrar}>Cerrar</Button>
      </div>
    );
  }

  const p = d.proveedor;
  return (
    <>
      <header className={s.panelHead}>
        <div>
          <h2 className={s.panelTitulo}>{p.razonSocial}</h2>
          <div className={s.etiquetas}>
            <Folio folio={p.rfc} />
            <Chip tono={ESTADO_PROVEEDOR[p.estado].tono}>{ESTADO_PROVEEDOR[p.estado].label}</Chip>
          </div>
        </div>
        <button type="button" className={s.cerrar} onClick={onCerrar} aria-label="Cerrar detalle">
          ✕
        </button>
      </header>

      <section className={s.bloque} aria-labelledby="fiscales">
        <h3 id="fiscales" className={s.bloqueTitulo}>Datos fiscales</h3>
        <dl className={s.datos}>
          <div className={s.ancho}>
            <dt>Razón social</dt>
            <dd>{p.razonSocial}</dd>
          </div>
          <div>
            <dt>RFC</dt>
            <dd>{p.rfc}</dd>
          </div>
          <div>
            <dt>Régimen</dt>
            <dd>{d.regimenFiscal}</dd>
          </div>
          <div className={s.ancho}>
            <dt>Uso de CFDI</dt>
            <dd>{d.usoCfdi}</dd>
          </div>
          <div className={s.ancho}>
            <dt>Domicilio fiscal</dt>
            <dd>{d.domicilioFiscal}</dd>
          </div>
        </dl>
      </section>

      <section className={s.bloque} aria-labelledby="contactos">
        <h3 id="contactos" className={s.bloqueTitulo}>Contactos</h3>
        {d.contactos.length === 0 ? (
          <p className={s.nota}>Sin contactos registrados.</p>
        ) : (
          <ul className={s.contactos}>
            {d.contactos.map((c) => (
              <li key={`${c.nombre}-${c.correo}`}>
                <b>{c.nombre}</b>
                <span className={s.secundario}>{c.puesto}</span>
                <a href={`tel:${c.telefono.replace(/\s+/g, "")}`}>{c.telefono}</a>
                <a href={`mailto:${c.correo}`}>{c.correo}</a>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className={s.bloque} aria-labelledby="desempeno">
        <h3 id="desempeno" className={s.bloqueTitulo}>Desempeño</h3>
        <dl className={s.datos3}>
          <div>
            <dt>Entrega a tiempo</dt>
            <dd className={p.cumplimiento < 85 ? s.malo : undefined}>{p.cumplimiento.toFixed(0)}%</dd>
          </div>
          <div>
            <dt>Entrega prom.</dt>
            <dd>{p.entregaPromedioDias.toFixed(1)} días</dd>
          </div>
          <div>
            <dt>Devoluciones</dt>
            <dd>{d.devoluciones.toFixed(1)}%</dd>
          </div>
        </dl>
        <div className={s.subtitulo}>Historial de O.C.</div>
        {d.ordenes.length === 0 ? (
          <p className={s.nota}>Sin órdenes de compra.</p>
        ) : (
          <ul className={s.ordenes}>
            {d.ordenes.map((o) => (
              <li key={o.folio}>
                <Folio folio={o.folio} tipo="ordenCompra" />
                <span className={s.secundario}>{o.detalle}</span>
                <Monto valor={o.monto} />
                <span className={s.secundario}>{o.estado}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className={s.nota}>
        {numero(p.productos)} productos en catálogo · crédito {numero(p.creditoDias)} días
      </p>
    </>
  );
}

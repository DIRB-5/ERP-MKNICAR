import { Chip } from "@/components/Chip/Chip";
import { Monto } from "@/components/Monto/Monto";
import { Folio } from "@/components/Folio/Folio";
import { BarChart } from "@/components/BarChart/BarChart";
import { BarList } from "@/components/BarList/BarList";
import { Button } from "@/components/Button/Button";
import { fecha, numero, porcentaje } from "@/domain/format";
import { useProducto } from "@/data/consultas";
import { fechaLocal } from "@/app/fechas";
import { nombreMes } from "@/pages/tesoreria/formato";
import { DISPONIBILIDAD, TIPO_PRODUCTO } from "./etiquetas";
import s from "./ProveedoresProductos.module.css";

export function PanelProducto({ id, onCerrar }: { id: string; onCerrar: () => void }) {
  const { data: d, isPending } = useProducto(id);

  if (isPending) return <div className={s.panelVacio}>Cargando producto…</div>;
  if (!d) {
    return (
      <div className={s.panelVacio}>
        No encontramos este producto.
        <Button variante="fantasma" onClick={onCerrar}>Cerrar</Button>
      </div>
    );
  }

  const p = d.producto;
  const mejor = d.precios.length > 0 ? Math.min(...d.precios.map((x) => x.precio)) : null;
  const primero = d.historicoCosto[0]?.costo;
  const ultimo = d.historicoCosto[d.historicoCosto.length - 1]?.costo;
  const variacion = primero && ultimo ? ((ultimo - primero) / primero) * 100 : null;

  return (
    <>
      <header className={s.panelHead}>
        <div>
          <Folio folio={p.numeroParte} />
          <h2 className={s.panelTitulo}>{p.descripcion}</h2>
          <div className={s.etiquetas}>
            <Chip>{p.marca}</Chip>
            <Chip tono="brand">{TIPO_PRODUCTO[p.tipo]}</Chip>
            <Chip>{p.subcategoria?.nombre ?? p.categoria.nombre}</Chip>
          </div>
        </div>
        <button type="button" className={s.cerrar} onClick={onCerrar} aria-label="Cerrar detalle">
          ✕
        </button>
      </header>

      <section className={s.bloque} aria-labelledby="precios">
        <h3 id="precios" className={s.bloqueTitulo}>Precios por proveedor</h3>
        {d.precios.length === 0 ? (
          <p className={s.nota}>Ningún proveedor lo ha cotizado.</p>
        ) : (
          <table className={s.mini}>
            <thead>
              <tr>
                <th scope="col">Proveedor</th>
                <th scope="col" className={s.der}>Último precio</th>
                <th scope="col" className={s.der}>Entrega</th>
                <th scope="col">Disponibilidad</th>
              </tr>
            </thead>
            <tbody>
              {[...d.precios].sort((a, b) => a.precio - b.precio).map((x) => (
                <tr key={x.proveedor.id}>
                  <td>
                    {x.proveedor.nombre}
                    {x.precio === mejor && d.precios.length > 1 && <Chip tono="ok">Mejor precio</Chip>}
                    <span className={s.secundario}>{fecha(fechaLocal(x.fecha), { anio: true })}</span>
                  </td>
                  <td className={s.der}><Monto valor={x.precio} /></td>
                  <td className={s.der}>{numero(x.entregaDias)} d</td>
                  <td><Chip tono={DISPONIBILIDAD[x.disponibilidad].tono}>{DISPONIBILIDAD[x.disponibilidad].label}</Chip></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className={s.bloque} aria-labelledby="historico">
        <h3 id="historico" className={s.bloqueTitulo}>
          Histórico de costo
          {variacion != null && (
            <span className={s.nota}> · <Monto valor={variacion} formato="porcentaje" sentido="desviacion" /> en 12 meses</span>
          )}
        </h3>
        <BarChart
          series={[{ nombre: "Costo", color: "var(--data-2)" }]}
          categorias={d.historicoCosto.map((h) => ({ etiqueta: nombreMes(h.mes).slice(0, 3), valores: [h.costo] }))}
          formato={(v) => `$${numero(Math.round(v))}`}
          vacio="Sin compras registradas"
        />
        {variacion != null && <span className={s.oculto}>Variación {porcentaje(variacion)}</span>}
      </section>

      <section className={s.bloque} aria-labelledby="consumo">
        <h3 id="consumo" className={s.bloqueTitulo}>Consumo</h3>
        <dl className={s.datos}>
          <div>
            <dt>Unidades compradas en el año</dt>
            <dd>{numero(d.unidadesCompradasAnio)}</dd>
          </div>
          <div>
            <dt>O.S. donde se usó</dt>
            <dd>{numero(d.osDondeSeUso)}</dd>
          </div>
        </dl>
        <div className={s.subtitulo}>Talleres que más lo consumen</div>
        <BarList
          filas={d.talleres.map((t) => ({
            id: t.taller.id,
            etiqueta: t.taller.nombre,
            valor: t.unidades,
            texto: `${numero(t.unidades)} ${p.unidadMedida.toLowerCase()}`,
          }))}
          vacio="Sin consumo registrado"
        />
      </section>

      <div className={s.panelAcciones}>
        <Button variante="primario" disabled title="Próximamente">Generar requisición</Button>
        <Button disabled title="Próximamente">Editar producto</Button>
      </div>
    </>
  );
}

import { Link, Navigate, useParams } from "react-router-dom";
import { Aviso } from "@/components/Aviso/Aviso";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import type { TipoDocumento } from "@/domain/folios";
import type { ClaveSeccion } from "@/domain/expediente";
import { useDocumentoOS } from "@/data/consultas";

/** Sección del expediente donde vive cada documento de la cadena. */
const SECCION: Partial<Record<TipoDocumento, ClaveSeccion>> = {
  presupuesto: "presupuesto",
  remision: "entrega",
  factura: "facturacion",
  ordenCompra: "compra",
};

const NOMBRE: Partial<Record<TipoDocumento, string>> = {
  presupuesto: "el presupuesto",
  remision: "la remisión",
  factura: "la factura",
  ordenCompra: "la orden de compra",
};

/** /os/:folio es la dirección corta del expediente. */
export function RedirigirOS() {
  const { folio = "" } = useParams();
  return <Navigate to={`/ordenes/${encodeURIComponent(folio)}`} replace />;
}

/**
 * Todo folio de la cadena navega. Presupuestos, remisiones, facturas y O.C.
 * todavía no tienen pantalla propia: su folio lleva a la sección del
 * expediente de la O.S. donde aparecen.
 */
export function documento(tipo: TipoDocumento) {
  function DocumentoEnOS() {
    const { folio = "" } = useParams();
    const { data: os, isPending } = useDocumentoOS(tipo, folio);
    if (isPending) return <EmptyState titulo="Buscando el documento…" />;
    if (!os) {
      return (
        <Aviso tono="critico" titulo={`No encontramos ${NOMBRE[tipo] ?? "el documento"} ${folio}.`}>
          <Link to="/ordenes">Ir a Órdenes de Servicio</Link>
        </Aviso>
      );
    }
    return <Navigate to={`/ordenes/${encodeURIComponent(os)}#${SECCION[tipo] ?? ""}`} replace />;
  }
  DocumentoEnOS.displayName = `Documento_${tipo}`;
  return DocumentoEnOS;
}

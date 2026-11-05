import type { ReactNode } from "react";

import { Icono } from "./Iconos";
import { Enlace } from "./Ui";
import { MAPA } from "@/lib/contenido";
import type { Costo, DatoConfirmable, Lugar } from "@/lib/tipos";

/** Fila de la columna "Información práctica". */
export function Dato({ icono, titulo, children }: { icono: string; titulo: string; children: ReactNode }) {
  return (
    <div className="dato-ficha">
      <dt><Icono nombre={icono} tamano={18} />{titulo}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function textoCosto(c: Costo): string {
  const base = c.modalidad === "gratis" ? "Gratis" : c.modalidad === "pago" ? "Pago" : "Consultar antes de ir";
  return c.detalle ? `${base}. ${c.detalle}` : base;
}

/**
 * Un horario sin confirmar no se presenta como firme: se muestra lo que se
 * sabe y se pide consultarlo. Sin horario estructurado no hay "Abierto ahora".
 */
export function TextoHorario({ horario }: { horario?: DatoConfirmable }) {
  if (!horario) return <>A confirmar. Consultá antes de ir.</>;
  if (horario.confirmado) return <>{horario.texto}</>;
  return (
    <>
      {horario.texto}
      <span className="dato-ficha__nota">Dato a confirmar: consultalo antes de ir.</span>
    </>
  );
}

/** "Cómo llegar": con coordenadas verificadas o la dirección; si no hay, el mapa de la ciudad. */
export function enlaceComoLlegar(l: Pick<Lugar, "coordenadas" | "direccion" | "titulo">): { url: string; texto: string } {
  if (l.coordenadas) {
    return { url: `https://www.google.com/maps/search/?api=1&query=${l.coordenadas.lat},${l.coordenadas.lng}`, texto: "Cómo llegar" };
  }
  if (l.direccion) {
    return { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.direccion}, San Miguel de Tucumán`)}`, texto: "Cómo llegar" };
  }
  return { url: MAPA, texto: "Buscar en el mapa de la ciudad" };
}

export function BotonAccion({ url, texto, primario = true }: { url: string; texto: string; primario?: boolean }) {
  return (
    <Enlace href={url} className={`boton ${primario ? "boton--primario" : "boton--claro"} boton--ancho`}>
      {texto} <Icono nombre={url.startsWith("http") ? "externo" : "flecha"} tamano={16} />
    </Enlace>
  );
}

/** Datos estructurados para buscadores. Sólo con contenido visible y publicado. */
export function JsonLd({ datos }: { datos: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(datos).replace(/</g, "\\u003c") }}
    />
  );
}

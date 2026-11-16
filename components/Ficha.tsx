import type { ReactNode } from "react";

import { Icono } from "./Iconos";
import { Enlace } from "./Ui";
import { MAPA } from "@/lib/contenido";
import { IDIOMA_BASE, type Idioma } from "@/lib/i18n/config";
import { comun } from "@/lib/i18n/textos/comun";
import { fichas } from "@/lib/i18n/textos/fichas";
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

/** El costo en palabras. `idioma` es opcional para no romper a quien todavía no lo pasa. */
export function textoCosto(c: Costo, idioma: Idioma = IDIOMA_BASE): string {
  const t = fichas[idioma].dato;
  const base = c.modalidad === "gratis" ? comun[idioma].ui.gratis : c.modalidad === "pago" ? t.pago : t.consultar;
  return c.detalle ? `${base}. ${c.detalle}` : base;
}

/**
 * Un horario sin confirmar no se presenta como firme: se muestra lo que se
 * sabe y se pide consultarlo. Sin horario estructurado no hay "Abierto ahora".
 */
export function TextoHorario({ horario, idioma = IDIOMA_BASE }: { horario?: DatoConfirmable; idioma?: Idioma }) {
  const t = fichas[idioma].dato;
  if (!horario) return <>{t.horarioAConfirmar}</>;
  if (horario.confirmado) return <>{horario.texto}</>;
  return (
    <>
      {horario.texto}
      <span className="dato-ficha__nota">{t.datoAConfirmar}</span>
    </>
  );
}

/** "Cómo llegar": con coordenadas verificadas o la dirección; si no hay, el mapa de la ciudad. */
export function enlaceComoLlegar(
  l: Pick<Lugar, "coordenadas" | "direccion" | "titulo">,
  idioma: Idioma = IDIOMA_BASE,
): { url: string; texto: string } {
  const t = fichas[idioma].dato;
  if (l.coordenadas) {
    return { url: `https://www.google.com/maps/search/?api=1&query=${l.coordenadas.lat},${l.coordenadas.lng}`, texto: t.comoLlegar };
  }
  if (l.direccion) {
    return { url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${l.direccion}, San Miguel de Tucumán`)}`, texto: t.comoLlegar };
  }
  return { url: MAPA, texto: t.buscarEnMapa };
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

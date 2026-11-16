"use client";

import { useTextos } from "./i18n/Idioma";

/** Evento con el que cualquier parte del sitio abre el chat de Migue (lo escucha MigueTurismo). */
export const EVENTO_ABRIR_MIGUE = "migue:abrir";

/**
 * Dónde está el backend de Migue. Se puede cambiar con NEXT_PUBLIC_MIGUE_URL al compilar; si no
 * se define, una compilación de producción usa el de la Municipalidad, así el chat aparece en
 * cualquier servidor sin configurar nada. En desarrollo no hay chat salvo que se defina (el
 * backend no acepta pedidos de localhost). NEXT_PUBLIC_MIGUE_URL=no lo apaga.
 */
const CONFIGURADA = process.env.NEXT_PUBLIC_MIGUE_URL;
export const MIGUE_URL = (
  CONFIGURADA === "no" ? ""
  : CONFIGURADA ? CONFIGURADA
  : process.env.NODE_ENV === "production" ? "https://migue.smt.gob.ar"
  : ""
).replace(/\/+$/, "");

const HAY_MIGUE = !!MIGUE_URL;

/**
 * Un elemento que abre el chat de Migue, como la burbuja «Soy Migue y te muestro la ciudad»
 * de la portada. Sin chat configurado queda como el adorno que era.
 */
export function AbrirMigue({ className, children }: { className?: string; children: React.ReactNode }) {
  const t = useTextos().migue;
  if (!HAY_MIGUE) {
    return <div className={className} aria-hidden="true">{children}</div>;
  }
  return (
    <button
      type="button"
      className={`${className ?? ""} abrir-migue`}
      onClick={() => window.dispatchEvent(new Event(EVENTO_ABRIR_MIGUE))}
      aria-label={t.abrir}
    >
      {children}
    </button>
  );
}

"use client";

import { useTextos } from "./i18n/Idioma";

/** Evento con el que cualquier parte del sitio abre el chat de Migue (lo escucha MigueTurismo). */
export const EVENTO_ABRIR_MIGUE = "migue:abrir";

const HAY_MIGUE = !!process.env.NEXT_PUBLIC_MIGUE_URL;

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

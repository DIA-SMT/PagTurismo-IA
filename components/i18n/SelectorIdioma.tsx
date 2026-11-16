"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";

import { Icono } from "../Iconos";
import { useIdioma, useTextos } from "./Idioma";
import { IDIOMAS, LOCALE, rutaEnOtroIdioma, type Idioma } from "@/lib/i18n/config";

/**
 * La misma página en los otros idiomas. Son enlaces comunes (no next/link): al cambiar de
 * idioma se carga la página entera, así el encabezado, el pie y el atributo lang cambian juntos.
 *
 *  - "barra": menú desplegable compacto, en pantallas medianas y grandes.
 *  - "panel": fila de tres idiomas dentro del menú del celular.
 */
export function SelectorIdioma({ variante = "barra" }: { variante?: "barra" | "panel" }) {
  return (
    <Suspense fallback={null}>
      <Selector variante={variante} />
    </Suspense>
  );
}

function Selector({ variante }: { variante: "barra" | "panel" }) {
  const idioma = useIdioma();
  const { comun: t } = useTextos();
  const ruta = usePathname();
  const consulta = useSearchParams().toString();
  const detalles = useRef<HTMLDetailsElement>(null);
  const hacia = (destino: Idioma) => `${rutaEnOtroIdioma(ruta, destino)}${consulta ? `?${consulta}` : ""}`;

  // El desplegable se cierra al hacer clic afuera o con Escape.
  useEffect(() => {
    if (variante !== "barra") return;
    const cerrar = (e: Event) => {
      const d = detalles.current;
      if (!d?.open) return;
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !d.contains(e.target as Node)) d.open = false;
    };
    document.addEventListener("click", cerrar);
    document.addEventListener("keydown", cerrar);
    return () => {
      document.removeEventListener("click", cerrar);
      document.removeEventListener("keydown", cerrar);
    };
  }, [variante]);

  const opciones = IDIOMAS.map((i) => (
    <li key={i}>
      <a
        href={hacia(i)}
        hrefLang={LOCALE[i].lang}
        lang={LOCALE[i].lang}
        aria-current={i === idioma ? "true" : undefined}
      >
        {variante === "barra" && <span className="idioma__corto" aria-hidden="true">{LOCALE[i].corto}</span>}
        {LOCALE[i].nombre}
      </a>
    </li>
  ));

  if (variante === "panel") {
    return (
      <nav className="idioma-panel" aria-label={t.encabezado.idioma}>
        <Icono nombre="idioma" tamano={18} />
        <ul>{opciones}</ul>
      </nav>
    );
  }

  return (
    <details className="idioma" ref={detalles}>
      <summary aria-label={`${t.encabezado.elegirIdioma}: ${LOCALE[idioma].nombre}`}>
        <Icono nombre="idioma" tamano={20} />
        <span aria-hidden="true">{LOCALE[idioma].corto}</span>
      </summary>
      <ul>{opciones}</ul>
    </details>
  );
}

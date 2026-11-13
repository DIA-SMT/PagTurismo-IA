"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icono } from "./Iconos";
import { useTextos } from "./i18n/Idioma";

/**
 * Fila horizontal con scroll-snap y flechas, como el "Qué hacer" de
 * turismo.buenosaires.gob.ar. El desplazamiento es nativo —teclado, rueda,
 * dedo y lector de pantalla funcionan sin programar nada— y las flechas sólo
 * lo empujan una tarjeta por vez. Cada flecha se apaga al llegar al borde.
 */
export function Carrusel({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  const { comun: { controles: t } } = useTextos();
  const pista = useRef<HTMLUListElement>(null);
  const [bordes, setBordes] = useState({ inicio: true, fin: false });

  useEffect(() => {
    const el = pista.current;
    if (!el) return;
    const medir = () =>
      setBordes({
        inicio: el.scrollLeft <= 4,
        fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    medir();
    el.addEventListener("scroll", medir, { passive: true });
    window.addEventListener("resize", medir);
    return () => {
      el.removeEventListener("scroll", medir);
      window.removeEventListener("resize", medir);
    };
  }, []);

  function mover(sentido: 1 | -1) {
    const el = pista.current;
    const tarjeta = el?.querySelector("li");
    if (!el || !tarjeta) return;
    const paso = tarjeta.getBoundingClientRect().width + parseFloat(getComputedStyle(el).columnGap || "0");
    el.scrollBy({ left: paso * sentido, behavior: "smooth" });
  }

  return (
    <div className="carrusel">
      <ul className="carrusel__pista" ref={pista} aria-label={etiqueta} tabIndex={0}>
        {children}
      </ul>
      <div className="carrusel__flechas">
        <button type="button" className="boton-redondo" onClick={() => mover(-1)} disabled={bordes.inicio} aria-label={t.anteriores}>
          <Icono nombre="flecha-izq" tamano={20} />
        </button>
        <button type="button" className="boton-redondo" onClick={() => mover(1)} disabled={bordes.fin} aria-label={t.siguientes}>
          <Icono nombre="flecha" tamano={20} />
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icono } from "./Iconos";
import { LogoSMT } from "./LogoSMT";
import { Tema } from "./Tema";
import { NAV } from "@/lib/contenido";

/**
 * Barra de la landing. Es una sola página, así que la navegación son anclas:
 * la sección que se está leyendo se marca en el menú, y la barra se compacta
 * después del primer tramo de desplazamiento, igual que en smt.gob.ar.
 *
 * El clima llega armado desde el servidor como `clima`, para que el pedido a
 * la API no salga del navegador.
 */
export function Encabezado({ clima }: { clima?: ReactNode }) {
  const [desplazado, setDesplazado] = useState(false);
  const [movil, setMovil] = useState(false);
  const [activa, setActiva] = useState<string | null>(null);

  // Compacta la barra y marca la sección que se está leyendo: la última del
  // menú cuyo comienzo ya pasó el tercio superior de la pantalla. Se calcula
  // en cada scroll y no con IntersectionObserver porque entre secciones del
  // menú hay otras (historia, escapadas) y un salto directo por ancla no
  // dispara ninguna intersección.
  useEffect(() => {
    const secciones = NAV.flatMap((e) => document.querySelector<HTMLElement>(e.url) ?? []);
    const alScrollear = () => {
      setDesplazado(window.scrollY > 80);
      const linea = window.innerHeight / 3;
      const pasadas = secciones.filter((s) => s.getBoundingClientRect().top <= linea);
      const alFinal = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
      const actual = alFinal ? secciones.at(-1) : pasadas.at(-1);
      setActiva(actual ? `#${actual.id}` : null);
    };
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  return (
    <>
      <header className="header" data-compacto={desplazado ? "" : undefined}>
        <div className="contenedor header__inner">
          <a className="header__marca" href="#inicio" aria-label="Turismo — Ciudad San Miguel de Tucumán, ir al inicio">
            <LogoSMT ancho={184} alto={60} alt="" prioritario />
            <span className="header__turismo" aria-hidden="true">Turismo</span>
          </a>

          <nav className="nav" aria-label="Secciones">
            <ul>
              {NAV.map((e) => (
                <li key={e.url}>
                  <a className="nav__enlace" href={e.url} aria-current={activa === e.url ? "true" : undefined}>
                    {e.texto}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__acciones">
            {clima}
            <Tema />
            <a className="boton-planificar" href="#antes-de-llegar">
              <Icono nombre="mapa" tamano={18} />
              Planificá tu visita
            </a>
            <button
              className="boton-menu"
              type="button"
              aria-expanded={movil}
              aria-controls="panel-movil"
              onClick={() => setMovil(true)}
            >
              <Icono nombre="menu" tamano={20} />
              Menú
            </button>
          </div>
        </div>
      </header>

      {movil && <PanelMovil cerrar={() => setMovil(false)} />}
    </>
  );
}

function PanelMovil({ cerrar }: { cerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previo = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    caja.current?.querySelector<HTMLElement>("button, a")?.focus();

    function teclas(e: KeyboardEvent) {
      if (e.key === "Escape") return cerrar();
      if (e.key !== "Tab" || !caja.current) return;
      const focables = caja.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
      const primero = focables[0];
      const ultimo = focables[focables.length - 1];
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener("keydown", teclas);
    return () => {
      document.removeEventListener("keydown", teclas);
      document.body.style.overflow = "";
      previo?.focus();
    };
  }, [cerrar]);

  return (
    <div className="panel-movil" id="panel-movil" role="dialog" aria-modal="true" aria-label="Menú de secciones">
      <button className="panel-movil__fondo" type="button" onClick={cerrar} tabIndex={-1} aria-hidden="true" />
      <div className="panel-movil__caja" ref={caja}>
        <div className="panel-movil__cierre">
          <LogoSMT ancho={130} alto={42} alt="" />
          <button className="boton-redondo" type="button" onClick={cerrar} aria-label="Cerrar menú">
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>
        <nav aria-label="Secciones">
          <ul>
            {NAV.map((e) => (
              <li key={e.url}>
                {/* El ancla navega sola; cerrar el panel devuelve el scroll. */}
                <a href={e.url} onClick={cerrar}>
                  {e.texto}
                  <Icono nombre="flecha" tamano={18} />
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a className="boton boton--primario panel-movil__cta" href="#antes-de-llegar" onClick={cerrar}>
          Planificá tu visita
        </a>
      </div>
    </div>
  );
}

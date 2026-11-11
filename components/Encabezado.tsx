"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icono } from "./Iconos";
import { LogoSMT } from "./LogoSMT";
import { Tema } from "./Tema";
import { NAV } from "@/lib/contenido";

/**
 * Barra del portal. La navegación lleva a las secciones (rutas propias) y
 * marca la actual según la URL. La barra se compacta después del primer
 * tramo de desplazamiento, igual que en smt.gob.ar.
 *
 * El clima llega armado desde el servidor como `clima`, para que el pedido a
 * la API no salga del navegador.
 */
export function Encabezado({ clima }: { clima?: ReactNode }) {
  const [desplazado, setDesplazado] = useState(false);
  const [movil, setMovil] = useState(false);
  const ruta = usePathname();

  useEffect(() => {
    const alScrollear = () => setDesplazado(window.scrollY > 80);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  // Al navegar a otra página se cierra el menú móvil.
  useEffect(() => setMovil(false), [ruta]);

  const actual = (url: string) => ruta === url || ruta.startsWith(`${url}/`);

  return (
    <>
      <header className="header" data-compacto={desplazado ? "" : undefined}>
        <div className="contenedor header__inner">
          <Link className="header__marca" href="/" aria-label="Turismo — Ciudad San Miguel de Tucumán, ir al inicio">
            <LogoSMT ancho={184} alto={60} alt="" prioritario />
            <span className="header__turismo" aria-hidden="true">Turismo</span>
          </Link>

          <nav className="nav" aria-label="Secciones">
            <ul>
              {NAV.map((e) => (
                <li key={e.url}>
                  <Link className="nav__enlace" href={e.url} aria-current={actual(e.url) ? "page" : undefined}>
                    {e.texto}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__acciones">
            {clima}
            <Tema />
            <Link className="boton-planificar" href="/que-hacer#buscar">
              <Icono nombre="buscar" tamano={18} />
              Buscar
            </Link>
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

      {movil && <PanelMovil cerrar={() => setMovil(false)} actual={actual} />}
    </>
  );
}

function PanelMovil({ cerrar, actual }: { cerrar: () => void; actual: (url: string) => boolean }) {
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
                <Link href={e.url} onClick={cerrar} aria-current={actual(e.url) ? "page" : undefined}>
                  {e.texto}
                  <Icono nombre="flecha" tamano={18} />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Link className="boton boton--primario panel-movil__cta" href="/que-hacer#buscar" onClick={cerrar}>
          <Icono nombre="buscar" tamano={18} /> Buscar en el portal
        </Link>
      </div>
    </div>
  );
}

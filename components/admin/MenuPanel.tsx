"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { Icono } from "@/components/Iconos";

export type SeccionMenu = { href: string; texto: string; icono: string; separar?: boolean };

const esActiva = (ruta: string, href: string) => (href === "/admin" ? ruta === "/admin" : ruta === href || ruta.startsWith(`${href}/`));

// Menú plegado: se recuerda en este navegador. useSyncExternalStore evita leer localStorage en el servidor.
const CLAVE = "panel:menu-plegado";
const oyentes = new Set<() => void>();
const leer = () => {
  try {
    return localStorage.getItem(CLAVE) === "1";
  } catch {
    return false;
  }
};
const guardar = (v: boolean) => {
  try {
    localStorage.setItem(CLAVE, v ? "1" : "0");
  } catch {}
  oyentes.forEach((f) => f());
};
const suscribir = (f: () => void) => {
  oyentes.add(f);
  return () => oyentes.delete(f);
};

/**
 * Menú del panel en azul noche municipal. En la computadora es una columna fija que se pliega
 * a íconos; en el celular y la tablet, un diálogo lateral que abre el botón «Menú» de la barra.
 */
export function MenuPanel({ secciones }: { secciones: SeccionMenu[] }) {
  const ruta = usePathname() ?? "";
  const plegado = useSyncExternalStore(suscribir, leer, () => false);
  const [abierto, setAbierto] = useState(false);
  const dialogo = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.querySelector(".adm")?.toggleAttribute("data-plegado", plegado);
  }, [plegado]);

  useEffect(() => {
    const d = dialogo.current;
    if (!d) return;
    if (abierto && !d.open) d.showModal();
    if (!abierto && d.open) d.close();
  }, [abierto]);

  useEffect(() => setAbierto(false), [ruta]);

  // El botón de la barra superior abre el menú del celular.
  useEffect(() => {
    const abrir = () => setAbierto(true);
    window.addEventListener("panel:abrir-menu", abrir);
    return () => window.removeEventListener("panel:abrir-menu", abrir);
  }, []);

  const contenido = (movil: boolean) => (
    <nav className="adm-menu" aria-label="Panel">
      <Link className="adm-menu__logo" href="/admin" title={plegado && !movil ? "Tablero" : undefined}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/img/logo-smt-neg.png" alt="Ciudad San Miguel de Tucumán" width={184} height={60} />
        <span className="adm-oculto">: ir al tablero</span>
      </Link>
      <ul className="adm-menu__lista">
        {secciones.map((s) => (
          <li key={s.href}>
            {s.separar && <div className="adm-menu__separador" aria-hidden="true" />}
            <Link
              className="adm-menu__enlace"
              href={s.href}
              aria-current={esActiva(ruta, s.href) ? "page" : undefined}
              title={plegado && !movil ? s.texto : undefined}
            >
              <Icono nombre={s.icono} tamano={20} />
              <span>{s.texto}</span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="adm-menu__pie">
        <Link className="adm-menu__enlace" href="/" title={plegado && !movil ? "Ver el sitio" : undefined}>
          <Icono nombre="ojo" tamano={20} />
          <span>Ver el sitio</span>
        </Link>
        {movil ? (
          <button type="button" className="adm-menu__enlace" onClick={() => setAbierto(false)}>
            <Icono nombre="cerrar" tamano={20} />
            <span>Cerrar el menú</span>
          </button>
        ) : (
          <button type="button" className="adm-menu__enlace" onClick={() => guardar(!plegado)} aria-expanded={!plegado}
            title={plegado ? "Desplegar el menú" : undefined}>
            <Icono nombre={plegado ? "flecha" : "flecha-izq"} tamano={20} />
            <span>{plegado ? "Desplegar el menú" : "Plegar el menú"}</span>
          </button>
        )}
      </div>
      <span className="adm-menu__marca" aria-hidden="true" />
    </nav>
  );

  return (
    <>
      <div className="adm-espaciador" aria-hidden="true" />
      {contenido(false)}
      <dialog
        ref={dialogo}
        className="adm-menu-movil"
        aria-label="Menú del panel"
        onClose={() => setAbierto(false)}
        onClick={(e) => e.target === e.currentTarget && setAbierto(false)}
      >
        {contenido(true)}
      </dialog>
    </>
  );
}

/** Botón «Menú» de la barra superior (celular y tablet). */
export function BotonMenuPanel() {
  return (
    <button type="button" className="adm-boton-menu" onClick={() => window.dispatchEvent(new Event("panel:abrir-menu"))}>
      <Icono nombre="menu" tamano={22} />
      Menú
    </button>
  );
}

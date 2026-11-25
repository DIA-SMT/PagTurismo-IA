"use client";

import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

import { Icono } from "./Iconos";
import { LogoSMT } from "./LogoSMT";
import { Tema } from "./Tema";
import { SelectorIdioma } from "./i18n/SelectorIdioma";
import { useIdioma, useTextos, Vinculo as Link } from "./i18n/Idioma";
import { NAV, type Subseccion } from "@/lib/contenido";
import { localizarRuta } from "@/lib/i18n/config";
import { formatear } from "@/lib/i18n/definir";

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
  const idioma = useIdioma();
  const { comun: t } = useTextos();

  useEffect(() => {
    const alScrollear = () => setDesplazado(window.scrollY > 80);
    alScrollear();
    window.addEventListener("scroll", alScrollear, { passive: true });
    return () => window.removeEventListener("scroll", alScrollear);
  }, []);

  // Al navegar a otra página se cierra el menú móvil.
  useEffect(() => setMovil(false), [ruta]);

  const actual = (url: string) => {
    const publica = localizarRuta(url, idioma);
    return ruta === publica || ruta.startsWith(`${publica}/`);
  };

  return (
    <>
      <header className="header" data-compacto={desplazado ? "" : undefined}>
        <div className="contenedor header__inner">
          <Link className="header__marca" href="/" aria-label={t.sitio.irAlInicio}>
            <LogoSMT ancho={184} alto={60} alt="" prioritario />
            <span className="header__turismo" aria-hidden="true">{t.sitio.turismo}</span>
          </Link>

          <nav className="nav" aria-label={t.encabezado.secciones}>
            <ul>
              {NAV.map((e) => e.sub ? (
                <NavDesplegable key={e.url} url={e.url} texto={t.nav[e.clave]} sub={e.sub} actual={actual} />
              ) : (
                <li key={e.url}>
                  <Link className="nav__enlace" href={e.url} aria-current={actual(e.url) ? "page" : undefined}>
                    {t.nav[e.clave]}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__acciones">
            {clima}
            <SelectorIdioma />
            <Tema />
            <Link className="boton-planificar" href="/que-hacer#buscar">
              <Icono nombre="buscar" tamano={18} />
              {t.encabezado.buscar}
            </Link>
            <button
              className="boton-menu"
              type="button"
              aria-expanded={movil}
              aria-controls="panel-movil"
              onClick={() => setMovil(true)}
            >
              <Icono nombre="menu" tamano={20} />
              {t.encabezado.menu}
            </button>
          </div>
        </div>
      </header>

      {movil && <PanelMovil cerrar={() => setMovil(false)} actual={actual} />}
    </>
  );
}

function PanelMovil({ cerrar, actual }: { cerrar: () => void; actual: (url: string) => boolean }) {
  const { comun: t } = useTextos();
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
    <div className="panel-movil" id="panel-movil" role="dialog" aria-modal="true" aria-label={t.encabezado.menuSecciones}>
      <button className="panel-movil__fondo" type="button" onClick={cerrar} tabIndex={-1} aria-hidden="true" />
      <div className="panel-movil__caja" ref={caja}>
        <div className="panel-movil__cierre">
          <LogoSMT ancho={130} alto={42} alt="" />
          <button className="boton-redondo" type="button" onClick={cerrar} aria-label={t.encabezado.cerrarMenu}>
            <Icono nombre="cerrar" tamano={18} />
          </button>
        </div>
        <nav aria-label={t.encabezado.secciones}>
          <ul>
            {NAV.map((e) => (
              <li key={e.url}>
                <Link href={e.url} onClick={cerrar} aria-current={actual(e.url) ? "page" : undefined}>
                  {t.nav[e.clave]}
                  <Icono nombre="flecha" tamano={18} />
                </Link>
                {e.sub && (
                  <ul className="panel-movil__sub">
                    {e.sub.filter((x) => x.url !== e.url).map((x) => (
                      <li key={x.url}>
                        <Link href={x.url} onClick={cerrar} aria-current={actual(x.url) ? "page" : undefined}>
                          <Icono nombre={x.icono} tamano={18} /> {t.subnav[x.clave].titulo}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <Link className="boton boton--primario panel-movil__cta" href="/que-hacer#buscar" onClick={cerrar}>
          <Icono nombre="buscar" tamano={18} /> {t.encabezado.buscarEnPortal}
        </Link>
        <SelectorIdioma variante="panel" />
      </div>
    </div>
  );
}

/**
 * Sección con menú desplegable («Descubrí San Miguel»). El enlace lleva a la sección; el botón de al lado abre
 * el panel (teclado y pantallas táctiles) y también se abre al pasar el mouse. Escape o un clic afuera lo cierran.
 */
function NavDesplegable({ url, texto, sub, actual }: { url: string; texto: string; sub: Subseccion[]; actual: (url: string) => boolean }) {
  const { comun: t } = useTextos();
  const [abierto, setAbierto] = useState(false);
  const li = useRef<HTMLLIElement>(null);
  const boton = useRef<HTMLButtonElement>(null);
  const espera = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  // Si el panel se abrió con el mouse, el clic en la flecha lo deja abierto (no lo cierra al instante).
  const porMouse = useRef(false);
  const id = useId();
  const ruta = usePathname();

  useEffect(() => setAbierto(false), [ruta]);
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!li.current?.contains(e.target as Node)) setAbierto(false); };
    const tecla = (e: KeyboardEvent) => { if (e.key === "Escape") { setAbierto(false); boton.current?.focus(); } };
    document.addEventListener("pointerdown", fuera);
    document.addEventListener("keydown", tecla);
    return () => { document.removeEventListener("pointerdown", fuera); document.removeEventListener("keydown", tecla); };
  }, [abierto]);

  // Con el mouse, un instante de margen al salir para poder bajar al panel sin que se cierre.
  const entrar = () => { clearTimeout(espera.current); if (!abierto) porMouse.current = true; setAbierto(true); };
  const salir = () => { clearTimeout(espera.current); espera.current = setTimeout(() => { porMouse.current = false; setAbierto(false); }, 180); };
  const alternar = () => {
    const abiertoConMouse = porMouse.current;
    porMouse.current = false;
    setAbierto((x) => (abiertoConMouse ? true : !x));
  };
  const enLaSeccion = actual(url) || sub.some((x) => actual(x.url));

  return (
    <li ref={li} className="nav__desplegable" data-abierto={abierto ? "" : undefined} data-activa={enLaSeccion ? "" : undefined}
      onPointerEnter={(e) => e.pointerType === "mouse" && entrar()} onPointerLeave={(e) => e.pointerType === "mouse" && salir()}
      onBlur={(e) => { if (!li.current?.contains(e.relatedTarget as Node)) setAbierto(false); }}>
      <Link className="nav__enlace" href={url} aria-current={actual(url) ? "page" : undefined}>{texto}</Link>
      <button ref={boton} type="button" className="nav__abrir" aria-expanded={abierto} aria-controls={id}
        aria-label={formatear(t.encabezado.abrirSubmenu, { seccion: texto })} onClick={alternar}>
        <Icono nombre="chevron" tamano={14} />
      </button>
      <div className="nav__panel" id={id} hidden={!abierto}>
        <ul>
          {sub.map((x) => (
            <li key={x.url}>
              <Link className="nav__subenlace" href={x.url} aria-current={actual(x.url) ? "page" : undefined}>
                <span className="nav__subicono" aria-hidden="true"><Icono nombre={x.icono} tamano={20} /></span>
                <span>
                  <strong>{t.subnav[x.clave].titulo}</strong>
                  <small>{t.subnav[x.clave].detalle}</small>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </li>
  );
}

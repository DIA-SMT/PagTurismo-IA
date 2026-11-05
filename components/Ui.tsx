import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Icono } from "./Iconos";
import { esExterno } from "@/lib/rutas";
import type { Fuente, ItemCatalogo, Validacion } from "@/lib/tipos";

/**
 * Enlace que decide solo: si sale del portal abre otra pestaña y lo avisa al
 * lector de pantalla; si es interno navega con Link.
 */
export function Enlace({ href, className, children, ...resto }: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
}) {
  if (esExterno(href)) {
    return (
      <a href={href} className={className} rel="noopener" target="_blank" {...resto}>
        {children}
        <span className="visualmente-oculto"> (se abre en otra pestaña)</span>
      </a>
    );
  }
  if (href.startsWith("mailto:") || href.startsWith("tel:")) {
    return <a href={href} className={className} {...resto}>{children}</a>;
  }
  return <Link href={href} className={className} {...resto}>{children}</Link>;
}

export function Cabecera({ id, kicker, titulo, bajada, enlace, nivel = 2 }: {
  id: string;
  kicker: string;
  titulo: string;
  bajada?: string;
  enlace?: { texto: string; url: string };
  nivel?: 1 | 2;
}) {
  const T = nivel === 1 ? "h1" : "h2";
  return (
    <div className="cabecera">
      <div>
        <p className="kicker">{kicker}</p>
        <T id={id}>{titulo}</T>
        {bajada && <p>{bajada}</p>}
      </div>
      {enlace && (
        <Enlace href={enlace.url} className="cabecera__enlace">
          {enlace.texto} <Icono nombre={esExterno(enlace.url) ? "externo" : "flecha"} tamano={18} />
        </Enlace>
      )}
    </div>
  );
}

export type Miga = { texto: string; url?: string };

export function MigaDePan({ migas }: { migas: Miga[] }) {
  return (
    <nav className="migas" aria-label="Estás en">
      <ol>
        <li><Link href="/">Inicio</Link></li>
        {migas.map((m) => (
          <li key={m.texto}>
            {m.url ? <Link href={m.url}>{m.texto}</Link> : <span aria-current="page">{m.texto}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** Encabezado de las páginas internas: miga, antetítulo, título y bajada. */
export function EncabezadoPagina({ migas, kicker, titulo, bajada, children }: {
  migas: Miga[];
  kicker: string;
  titulo: string;
  bajada?: string;
  children?: ReactNode;
}) {
  return (
    <header className="pagina-cabecera">
      <div className="contenedor">
        <MigaDePan migas={migas} />
        <p className="kicker">{kicker}</p>
        <h1>{titulo}</h1>
        {bajada && <p className="pagina-cabecera__bajada">{bajada}</p>}
        {children}
      </div>
    </header>
  );
}

export function AvisoBorrador() {
  return (
    <p className="aviso aviso--borrador" role="note">
      <strong>Borrador.</strong> Esta ficha no se muestra en el sitio público hasta que la Dirección de Turismo la revise y la publique.
    </p>
  );
}

export function Aviso({ children, tipo = "info" }: { children: ReactNode; tipo?: "info" | "alerta" }) {
  return (
    <p className={`aviso aviso--${tipo}`} role="note">
      <Icono nombre="info" tamano={18} />
      <span>{children}</span>
    </p>
  );
}

export function Marca({ children, tipo = "neutra" }: { children: ReactNode; tipo?: "neutra" | "borrador" | "alerta" | "exito" }) {
  return <span className={`marca marca--${tipo}`}>{children}</span>;
}

const ENTIDAD: Record<ItemCatalogo["entidad"], string> = {
  lugar: "Lugar", experiencia: "Experiencia", recorrido: "Recorrido", evento: "Agenda",
};

/** Tarjeta de resultado del catálogo y de los listados de categorías. */
export function TarjetaItem({ item, titulo: Titulo = "h3" }: { item: ItemCatalogo; titulo?: "h2" | "h3" }) {
  return (
    <Link className="item" href={item.url}>
      <div className="item__foto">
        {item.imagen ? (
          <Image src={item.imagen.src} alt="" fill sizes="(max-width: 600px) 100vw, (max-width: 1100px) 50vw, 33vw" />
        ) : (
          <span className="item__sin-foto" aria-hidden="true"><Icono nombre={ICONO_ENTIDAD[item.entidad]} tamano={40} /></span>
        )}
      </div>
      <div className="item__cuerpo">
        <div className="item__marcas">
          <Marca>{ENTIDAD[item.entidad]}</Marca>
          {item.gratis && <Marca tipo="exito">Gratis</Marca>}
          {item.fueraDeLaCiudad && <Marca tipo="alerta">Fuera de la ciudad</Marca>}
          {item.borrador && <Marca tipo="borrador">Borrador</Marca>}
        </div>
        <Titulo className="item__titulo">{item.titulo}</Titulo>
        {item.meta && <p className="item__meta">{item.meta}</p>}
        <p className="item__resumen">{item.resumen}</p>
      </div>
    </Link>
  );
}

const ICONO_ENTIDAD: Record<ItemCatalogo["entidad"], string> = {
  lugar: "ubicacion", experiencia: "brujula", recorrido: "caminata", evento: "calendario",
};

export function Fuentes({ fuentes, validacion }: { fuentes: Fuente[]; validacion: Validacion }) {
  if (!fuentes.length && !validacion.fecha) return null;
  return (
    <section className="fuentes" aria-labelledby="fuentes-titulo">
      <h2 id="fuentes-titulo">Fuentes de esta información</h2>
      {fuentes.length > 0 && (
        <ul>
          {fuentes.map((f) => (
            <li key={f.titulo}>{f.url ? <Enlace href={f.url}>{f.titulo}</Enlace> : f.titulo}</li>
          ))}
        </ul>
      )}
      <p>
        {validacion.fecha
          ? `Datos revisados el ${formatearDia(validacion.fecha)}${validacion.responsable ? ` por ${validacion.responsable}` : ""}.`
          : "Los datos operativos todavía no fueron confirmados por la Dirección de Turismo: consultá antes de ir."}
      </p>
    </section>
  );
}

export function formatearDia(dia: string) {
  const [a, m, d] = dia.split("-");
  return d && m && a ? `${Number(d)}/${Number(m)}/${a}` : dia;
}

/** Texto con párrafos separados por una línea en blanco. */
export function Parrafos({ texto, className }: { texto?: string; className?: string }) {
  if (!texto) return null;
  return (
    <div className={className}>
      {texto.split(/\n\s*\n/).map((p, i) => <p key={i}>{p.trim()}</p>)}
    </div>
  );
}

/** Foto principal de una ficha, con crédito si lo hay. */
export function FotoFicha({ imagen }: { imagen?: { src: string; alt: string; credito?: string } }) {
  if (!imagen) return null;
  return (
    <figure className="ficha__foto">
      <div className="ficha__foto-marco">
        <Image src={imagen.src} alt={imagen.alt} fill priority sizes="(max-width: 900px) 100vw, 60vw" />
      </div>
      {imagen.credito && <figcaption>Foto: {imagen.credito}</figcaption>}
    </figure>
  );
}

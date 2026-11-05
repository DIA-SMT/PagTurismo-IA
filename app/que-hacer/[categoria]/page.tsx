import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, TarjetaItem } from "@/components/Ui";
import { getCatalogo, getCategoria, getCategorias, getPlatos } from "@/lib/datos";
import type { ItemCatalogo } from "@/lib/tipos";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCategorias().map((c) => ({ categoria: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/que-hacer/[categoria]">): Promise<Metadata> {
  const c = getCategoria((await params).categoria);
  if (!c) return {};
  return {
    title: c.titulo,
    description: c.detalle,
    alternates: { canonical: `/que-hacer/${c.id}` },
    openGraph: { images: [c.imagen] },
  };
}

const GRUPOS: { entidad: ItemCatalogo["entidad"]; titulo: string }[] = [
  { entidad: "lugar", titulo: "Lugares" },
  { entidad: "experiencia", titulo: "Experiencias" },
  { entidad: "recorrido", titulo: "Recorridos" },
  { entidad: "evento", titulo: "Fechas y eventos" },
];

export default async function PaginaCategoria({ params }: PageProps<"/que-hacer/[categoria]">) {
  const { categoria } = await params;
  const c = getCategoria(categoria);
  if (!c) notFound();

  const items = getCatalogo().filter((i) => i.categorias.includes(c.id));
  const platos = c.id === "sabores-tucumanos" ? getPlatos() : [];

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Qué hacer", url: "/que-hacer" }, { texto: c.titulo }]}
        kicker="Qué hacer"
        titulo={c.titulo}
        bajada={c.detalle}
      >
        <Link className="cabecera__enlace" href={`/que-hacer?categoria=${c.id}`}>
          Filtrar en el catálogo <Icono nombre="flecha" tamano={18} />
        </Link>
      </EncabezadoPagina>

      <div className="contenedor bloque-interno">
        {platos.length > 0 && (
          <section className="grupo" aria-labelledby="platos-titulo">
            <h2 id="platos-titulo">Platos típicos</h2>
            <ul className="sabores">
              {platos.map((s) => (
                <li key={s.slug}>
                  <article className={`sabor tono-${s.tono}`}>
                    <div className="sabor__imagen"><Image src={s.imagen.src} alt={s.imagen.alt} fill sizes="(max-width: 1024px) 45vw, 22vw" /></div>
                    <div className="sabor__texto">
                      <h3>{s.titulo}</h3>
                      <p>{s.detalle}</p>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          </section>
        )}

        {GRUPOS.map((g) => {
          const delGrupo = items.filter((i) => i.entidad === g.entidad);
          if (!delGrupo.length) return null;
          return (
            <section className="grupo" key={g.entidad} aria-labelledby={`grupo-${g.entidad}`}>
              <h2 id={`grupo-${g.entidad}`}>{g.titulo}</h2>
              <ul className="items">
                {delGrupo.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}
              </ul>
            </section>
          );
        })}

        {items.length === 0 && platos.length === 0 && (
          <div className="vacio">
            <h2>Todavía no hay propuestas publicadas en este tema</h2>
            <p>Mientras tanto, mirá el resto del catálogo o los recorridos guiados.</p>
            <div className="vacio__acciones">
              <Link className="boton boton--primario" href="/que-hacer">Ver todo el catálogo</Link>
              <Link className="boton boton--claro" href="/recorridos">Recorridos</Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

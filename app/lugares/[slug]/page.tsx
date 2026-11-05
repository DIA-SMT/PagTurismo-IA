import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, JsonLd, TextoHorario, enlaceComoLlegar, textoCosto } from "@/components/Ficha";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, EncabezadoPagina, Enlace, FotoFicha, Fuentes, Marca, Parrafos, TarjetaItem } from "@/components/Ui";
import { getCatalogo, getCategoria, getLugar, getLugares, nombresDeEtiquetas, relacionadosConLugar } from "@/lib/datos";

export const dynamicParams = false;

export function generateStaticParams() {
  return getLugares().map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/lugares/[slug]">): Promise<Metadata> {
  const l = getLugar((await params).slug);
  if (!l) return {};
  return {
    title: l.titulo,
    description: l.resumen,
    alternates: { canonical: `/lugares/${l.slug}` },
    openGraph: { title: l.titulo, description: l.resumen, ...(l.imagen ? { images: [l.imagen.src] } : {}) },
    robots: l.estado === "borrador" ? { index: false } : undefined,
  };
}

export default async function FichaLugar({ params }: PageProps<"/lugares/[slug]">) {
  const l = getLugar((await params).slug);
  if (!l) notFound();

  const categoria = l.categorias.map(getCategoria).find(Boolean);
  const etiquetas = nombresDeEtiquetas();
  const rel = relacionadosConLugar(l.slug);
  const catalogo = getCatalogo();
  const item = (entidad: string, slug: string) => catalogo.find((i) => i.entidad === entidad && i.slug === slug);
  const llegar = enlaceComoLlegar(l);
  const mas = categoria
    ? catalogo.filter((i) => i.entidad === "lugar" && i.slug !== l.slug && i.categorias.includes(categoria.id)).slice(0, 3)
    : [];

  return (
    <>
      {l.estado === "publicado" && (
        <JsonLd datos={{
          "@context": "https://schema.org",
          "@type": "TouristAttraction",
          name: l.titulo,
          description: l.resumen,
          ...(l.imagen ? { image: l.imagen.src } : {}),
          ...(l.direccion ? { address: { "@type": "PostalAddress", streetAddress: l.direccion, addressLocality: "San Miguel de Tucumán", addressRegion: "Tucumán", addressCountry: "AR" } } : {}),
          ...(l.coordenadas ? { geo: { "@type": "GeoCoordinates", latitude: l.coordenadas.lat, longitude: l.coordenadas.lng } } : {}),
        }} />
      )}

      <EncabezadoPagina
        migas={[
          { texto: "Qué hacer", url: "/que-hacer" },
          ...(categoria ? [{ texto: categoria.titulo, url: `/que-hacer/${categoria.id}` }] : []),
          { texto: l.titulo },
        ]}
        kicker={l.clase}
        titulo={l.titulo}
        bajada={l.resumen}
      >
        <div className="marcas">
          {l.costo.modalidad === "gratis" && <Marca tipo="exito">Gratis</Marca>}
          {l.etiquetas.filter((e) => e !== "gratis").map((e) => <Marca key={e}>{etiquetas[e] ?? e}</Marca>)}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          {l.estado === "borrador" && <AvisoBorrador />}
          <FotoFicha imagen={l.imagen} />
          {l.porQueIr && (
            <section aria-labelledby="por-que">
              <h2 id="por-que">Por qué ir</h2>
              <p className="ficha__destacado">{l.porQueIr}</p>
            </section>
          )}
          {l.descripcion && (
            <section aria-labelledby="historia">
              <h2 id="historia">Historia</h2>
              <Parrafos texto={l.descripcion} className="prosa" />
            </section>
          )}
          {l.accesibilidad && (
            <section aria-labelledby="accesibilidad">
              <h2 id="accesibilidad">Accesibilidad</h2>
              <Parrafos texto={l.accesibilidad} className="prosa" />
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">Información práctica</h2>
            <dl>
              {(l.direccion || l.zona) && (
                <Dato icono="ubicacion" titulo="Dónde">
                  {l.direccion ?? l.zona}
                  {l.direccion && l.zona && <span className="dato-ficha__nota">{l.zona}</span>}
                </Dato>
              )}
              <Dato icono="reloj" titulo="Horario"><TextoHorario horario={l.horario} /></Dato>
              <Dato icono="ticket" titulo="Costo">{textoCosto(l.costo)}</Dato>
              {l.duracion && <Dato icono="caminata" titulo="Duración de la visita">{l.duracion}</Dato>}
              {l.contacto?.telefono && <Dato icono="telefono" titulo="Teléfono"><a href={`tel:${l.contacto.telefono.replace(/[^\d+]/g, "")}`}>{l.contacto.telefono}</a></Dato>}
              {l.contacto?.email && <Dato icono="correo" titulo="Correo"><a href={`mailto:${l.contacto.email}`}>{l.contacto.email}</a></Dato>}
            </dl>
            <div className="panel-practico__acciones">
              <BotonAccion url={llegar.url} texto={llegar.texto} />
              {l.contacto?.web && <BotonAccion url={l.contacto.web} texto="Sitio oficial" primario={false} />}
            </div>
          </div>
        </aside>
      </div>

      <div className="contenedor relacionados">
        {rel.experiencias.length > 0 && (
          <section className="grupo" aria-labelledby="rel-exp">
            <h2 id="rel-exp">Experiencias que lo visitan</h2>
            <ul className="items">{rel.experiencias.map((e) => { const i = item("experiencia", e.slug); return i && <li key={e.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {rel.recorridos.length > 0 && (
          <section className="grupo" aria-labelledby="rel-rec">
            <h2 id="rel-rec">Recorridos que pasan por acá</h2>
            <ul className="items">{rel.recorridos.map((r) => { const i = item("recorrido", r.slug); return i && <li key={r.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {rel.eventos.length > 0 && (
          <section className="grupo" aria-labelledby="rel-ev">
            <h2 id="rel-ev">Fechas que se celebran acá</h2>
            <ul className="items">{rel.eventos.map((e) => { const i = item("evento", e.slug); return i && <li key={e.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {mas.length > 0 && categoria && (
          <section className="grupo" aria-labelledby="rel-mas">
            <div className="grupo__cabecera">
              <h2 id="rel-mas">Más en {categoria.titulo}</h2>
              <Enlace href={`/que-hacer/${categoria.id}`} className="cabecera__enlace">Ver todo <Icono nombre="flecha" tamano={18} /></Enlace>
            </div>
            <ul className="items">{mas.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}
        <Fuentes fuentes={l.fuentes} validacion={l.validacion} />
      </div>
    </>
  );
}

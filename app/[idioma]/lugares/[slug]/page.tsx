import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, JsonLd, TextoHorario, enlaceComoLlegar, textoCosto } from "@/components/Ficha";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, AvisoSinTraducir, EncabezadoPagina, Enlace, FotoFicha, Fuentes, Marca, Parrafos, TarjetaItem } from "@/components/Ui";
import { contenido, porSlug, categoriaDe, catalogo, nombresDeEtiquetas, relacionadosConLugar } from "@/lib/datos";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";

export async function generateMetadata({ params }: PageProps<"/[idioma]/lugares/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const l = porSlug(c.lugares, (await params).slug);
  if (!l) return {};
  return {
    title: l.titulo,
    description: l.resumen,
    alternates: await alternativas(`/lugares/${l.slug}`),
    openGraph: { title: l.titulo, description: l.resumen, ...(l.imagen ? { images: [l.imagen.src] } : {}) },
    robots: l.estado === "borrador" ? { index: false } : undefined,
  };
}

export default async function FichaLugar({ params }: PageProps<"/[idioma]/lugares/[slug]">) {
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const l = porSlug(c.lugares, (await params).slug);
  if (!l) notFound();
  const { dato, lugar: tl } = t.fichas;

  const categoria = categoriaDe(c, l.categorias);
  const etiquetas = nombresDeEtiquetas(c);
  const rel = relacionadosConLugar(c, l.slug);
  const todos = catalogo(c);
  const item = (entidad: string, slug: string) => todos.find((i) => i.entidad === entidad && i.slug === slug);
  const llegar = enlaceComoLlegar(l, c.idioma);
  const mas = categoria
    ? todos.filter((i) => i.entidad === "lugar" && i.slug !== l.slug && i.categorias.includes(categoria.id)).slice(0, 3)
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
          { texto: t.comun.nav.queHacer, url: "/que-hacer" },
          ...(categoria ? [{ texto: categoria.titulo, url: `/que-hacer/${categoria.id}` }] : []),
          { texto: l.titulo },
        ]}
        kicker={l.clase}
        titulo={l.titulo}
        bajada={l.resumen}
      >
        <div className="marcas">
          {l.costo.modalidad === "gratis" && <Marca tipo="exito">{t.comun.ui.gratis}</Marca>}
          {l.etiquetas.filter((e) => e !== "gratis").map((e) => <Marca key={e}>{etiquetas[e] ?? e}</Marca>)}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          <AvisoSinTraducir sinTraducir={c.sinTraducir.has(`lugares/${l.slug}`)} />
          {l.estado === "borrador" && <AvisoBorrador />}
          <FotoFicha imagen={l.imagen} />
          {l.porQueIr && (
            <section aria-labelledby="por-que">
              <h2 id="por-que">{tl.porQueIr}</h2>
              <p className="ficha__destacado">{l.porQueIr}</p>
            </section>
          )}
          {l.descripcion && (
            <section aria-labelledby="historia">
              <h2 id="historia">{tl.historia}</h2>
              <Parrafos texto={l.descripcion} className="prosa" />
            </section>
          )}
          {l.accesibilidad && (
            <section aria-labelledby="accesibilidad">
              <h2 id="accesibilidad">{tl.accesibilidad}</h2>
              <Parrafos texto={l.accesibilidad} className="prosa" />
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">{dato.infoPractica}</h2>
            <dl>
              {(l.direccion || l.zona) && (
                <Dato icono="ubicacion" titulo={dato.donde}>
                  {l.direccion ?? l.zona}
                  {l.direccion && l.zona && <span className="dato-ficha__nota">{l.zona}</span>}
                </Dato>
              )}
              <Dato icono="reloj" titulo={dato.horario}><TextoHorario horario={l.horario} idioma={c.idioma} /></Dato>
              <Dato icono="ticket" titulo={dato.costo}>{textoCosto(l.costo, c.idioma)}</Dato>
              {l.duracion && <Dato icono="caminata" titulo={dato.duracionVisita}>{l.duracion}</Dato>}
              {l.contacto?.telefono && <Dato icono="telefono" titulo={dato.telefono}><a href={`tel:${l.contacto.telefono.replace(/[^\d+]/g, "")}`}>{l.contacto.telefono}</a></Dato>}
              {l.contacto?.email && <Dato icono="correo" titulo={dato.correo}><a href={`mailto:${l.contacto.email}`}>{l.contacto.email}</a></Dato>}
            </dl>
            <div className="panel-practico__acciones">
              <BotonAccion url={llegar.url} texto={llegar.texto} />
              {l.contacto?.web && <BotonAccion url={l.contacto.web} texto={dato.sitioOficial} primario={false} />}
            </div>
          </div>
        </aside>
      </div>

      <div className="contenedor relacionados">
        {rel.experiencias.length > 0 && (
          <section className="grupo" aria-labelledby="rel-exp">
            <h2 id="rel-exp">{tl.experiencias}</h2>
            <ul className="items">{rel.experiencias.map((e) => { const i = item("experiencia", e.slug); return i && <li key={e.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {rel.recorridos.length > 0 && (
          <section className="grupo" aria-labelledby="rel-rec">
            <h2 id="rel-rec">{tl.recorridos}</h2>
            <ul className="items">{rel.recorridos.map((r) => { const i = item("recorrido", r.slug); return i && <li key={r.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {rel.eventos.length > 0 && (
          <section className="grupo" aria-labelledby="rel-ev">
            <h2 id="rel-ev">{tl.eventos}</h2>
            <ul className="items">{rel.eventos.map((e) => { const i = item("evento", e.slug); return i && <li key={e.slug}><TarjetaItem item={i} /></li>; })}</ul>
          </section>
        )}
        {mas.length > 0 && categoria && (
          <section className="grupo" aria-labelledby="rel-mas">
            <div className="grupo__cabecera">
              <h2 id="rel-mas">{formatear(tl.masEn, { categoria: categoria.titulo })}</h2>
              <Enlace href={`/que-hacer/${categoria.id}`} className="cabecera__enlace">{dato.verTodo} <Icono nombre="flecha" tamano={18} /></Enlace>
            </div>
            <ul className="items">{mas.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}
        <Fuentes fuentes={l.fuentes} validacion={l.validacion} />
      </div>
    </>
  );
}

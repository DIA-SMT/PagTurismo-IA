import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, TextoHorario, textoCosto } from "@/components/Ficha";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos, TarjetaItem } from "@/components/Ui";
import { esFechaValida, finDeOcurrencia, formatearOcurrencia } from "@/lib/fechas";
import { contenido, porSlug, categoriaDe, catalogo, etiquetaModalidad } from "@/lib/datos";
import type { Experiencia } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/experiencias/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const e = porSlug(c.experiencias, (await params).slug);
  if (!e) return {};
  return {
    title: e.titulo,
    description: e.resumen,
    alternates: { canonical: `/experiencias/${e.slug}` },
    openGraph: { title: e.titulo, description: e.resumen, ...(e.imagen ? { images: [e.imagen.src] } : {}) },
    robots: e.estado === "borrador" ? { index: false } : undefined,
  };
}

const ESTADO_SALIDA: Record<Experiencia["salidas"][number]["estado"], { texto: string; tipo: "neutra" | "alerta" | "exito" }> = {
  programada: { texto: "Programada", tipo: "exito" },
  agotada: { texto: "Agotada", tipo: "alerta" },
  suspendida: { texto: "Suspendida", tipo: "alerta" },
  cancelada: { texto: "Cancelada", tipo: "alerta" },
};

export default async function FichaExperiencia({ params }: PageProps<"/experiencias/[slug]">) {
  const c = await contenido();
  const e = porSlug(c.experiencias, (await params).slug);
  if (!e) notFound();

  const ahora = Date.now();
  const salidas = e.salidas
    .filter((s) => esFechaValida(s.inicio) && finDeOcurrencia(s) >= ahora)
    .sort((a, b) => a.inicio.localeCompare(b.inicio));
  const categoria = categoriaDe(c, e.categorias);
  const todos = catalogo(c);
  const lugares = e.lugares.flatMap((slug) => todos.find((i) => i.entidad === "lugar" && i.slug === slug) ?? []);
  const recorridos = c.recorridos.filter((r) => r.experiencia === e.slug)
    .flatMap((r) => todos.find((i) => i.entidad === "recorrido" && i.slug === r.slug) ?? []);

  // La acción principal. Nunca se ofrece reservar sin un destino concreto.
  const accion = e.accion.url && e.accion.tipo !== "sin-salidas" ? e.accion : undefined;

  return (
    <>
      <EncabezadoPagina
        migas={[
          { texto: "Qué hacer", url: "/que-hacer" },
          ...(categoria ? [{ texto: categoria.titulo, url: `/que-hacer/${categoria.id}` }] : []),
          { texto: e.titulo },
        ]}
        kicker={etiquetaModalidad(e)}
        titulo={e.titulo}
        bajada={e.resumen}
      >
        <div className="marcas">
          {e.costo.modalidad === "gratis" && <Marca tipo="exito">Gratis</Marca>}
          {e.etiquetas.includes("requiere-reserva") && <Marca>Requiere reserva</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          {e.estado === "borrador" && <AvisoBorrador />}
          <FotoFicha imagen={e.imagen} />
          {e.descripcion && (
            <section aria-labelledby="que-se-hace">
              <h2 id="que-se-hace">Qué se hace</h2>
              <Parrafos texto={e.descripcion} className="prosa" />
            </section>
          )}

          <section aria-labelledby="salidas">
            <h2 id="salidas">Próximas salidas</h2>
            {salidas.length > 0 ? (
              <ul className="lista-fechas">
                {salidas.map((s) => {
                  const est = ESTADO_SALIDA[s.estado];
                  const reservable = s.estado === "programada" && (s.urlReserva || accion?.url);
                  return (
                    <li key={s.inicio}>
                      <div>
                        <strong>{formatearOcurrencia(s)}</strong>
                        {s.nota && <span className="dato-ficha__nota">{s.nota}</span>}
                      </div>
                      <Marca tipo={est.tipo}>{est.texto}</Marca>
                      {reservable && (
                        <a className="enlace-flecha" href={(s.urlReserva || accion!.url)!} rel="noopener" target="_blank">
                          Reservar esta salida<span className="visualmente-oculto"> (se abre en otra pestaña)</span> <Icono nombre="externo" tamano={14} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="texto-suave">
                {e.accion.tipo === "reservar" && accion
                  ? "Las salidas y los cupos los publica el sistema de reservas. Consultalos con el botón de esta página."
                  : e.accion.tipo === "sin-inscripcion"
                    ? "No tiene salidas programadas: se recorre por tu cuenta."
                    : "No hay salidas publicadas por el momento."}
              </p>
            )}
          </section>

          {recorridos.length > 0 && (
            <section className="grupo" aria-labelledby="circuitos">
              <h2 id="circuitos">Circuitos</h2>
              <ul className="items">{recorridos.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">Información práctica</h2>
            <dl>
              <Dato icono={e.modalidad === "bus" ? "bus-linea" : "caminata"} titulo="Modalidad">{etiquetaModalidad(e)}</Dato>
              {e.duracion && <Dato icono="reloj" titulo="Duración">{e.duracion}</Dato>}
              {e.horario && <Dato icono="calendario" titulo="Horario"><TextoHorario horario={e.horario} /></Dato>}
              {e.puntoEncuentro && <Dato icono="ubicacion" titulo="Punto de encuentro">{e.puntoEncuentro}</Dato>}
              <Dato icono="ticket" titulo="Costo">{textoCosto(e.costo)}</Dato>
              {e.incluye && <Dato icono="info" titulo="Incluye">{e.incluye}</Dato>}
              {e.requisitos && <Dato icono="info" titulo="Requisitos">{e.requisitos}</Dato>}
              {e.politicaClima && <Dato icono="lluvia" titulo="Si llueve">{e.politicaClima}</Dato>}
              {e.operador && <Dato icono="brujula" titulo="A cargo de">{e.operador}</Dato>}
            </dl>
            <div className="panel-practico__acciones">
              {accion ? (
                <>
                  <BotonAccion url={accion.url!} texto={accion.texto} />
                  {accion.url!.startsWith("http") && (
                    <p className="dato-ficha__nota">La reserva y su confirmación se hacen en ese sitio, no en este portal.</p>
                  )}
                </>
              ) : (
                <p className="panel-practico__sin-accion">{e.accion.texto}</p>
              )}
            </div>
          </div>
        </aside>
      </div>

      <div className="contenedor relacionados">
        {lugares.length > 0 && (
          <section className="grupo" aria-labelledby="lugares">
            <h2 id="lugares">Lugares que visita</h2>
            <ul className="items">{lugares.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}
        <Fuentes fuentes={e.fuentes} validacion={e.validacion} />
      </div>
    </>
  );
}

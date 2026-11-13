import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, TextoHorario, textoCosto } from "@/components/Ficha";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, AvisoSinTraducir, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos, TarjetaItem } from "@/components/Ui";
import { esFechaValida, finDeOcurrencia, formatearOcurrencia } from "@/lib/fechas";
import { contenido, porSlug, categoriaDe, catalogo, etiquetaModalidad } from "@/lib/datos";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import type { Experiencia } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/[idioma]/experiencias/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const e = porSlug(c.experiencias, (await params).slug);
  if (!e) return {};
  return {
    title: e.titulo,
    description: e.resumen,
    alternates: await alternativas(`/experiencias/${e.slug}`),
    openGraph: { title: e.titulo, description: e.resumen, ...(e.imagen ? { images: [e.imagen.src] } : {}) },
    robots: e.estado === "borrador" ? { index: false } : undefined,
  };
}

/** El color de cada estado; el texto sale de t.fichas.experiencia.estadoSalida. */
const ESTADO_SALIDA: Record<Experiencia["salidas"][number]["estado"], "neutra" | "alerta" | "exito"> = {
  programada: "exito",
  agotada: "alerta",
  suspendida: "alerta",
  cancelada: "alerta",
};

export default async function FichaExperiencia({ params }: PageProps<"/[idioma]/experiencias/[slug]">) {
  const [c, t] = await Promise.all([contenido(), textosActuales()]);
  const e = porSlug(c.experiencias, (await params).slug);
  if (!e) notFound();
  const { dato, experiencia: te } = t.fichas;

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
          { texto: t.comun.nav.queHacer, url: "/que-hacer" },
          ...(categoria ? [{ texto: categoria.titulo, url: `/que-hacer/${categoria.id}` }] : []),
          { texto: e.titulo },
        ]}
        kicker={etiquetaModalidad(e, c.idioma)}
        titulo={e.titulo}
        bajada={e.resumen}
      >
        <div className="marcas">
          {e.costo.modalidad === "gratis" && <Marca tipo="exito">{t.comun.ui.gratis}</Marca>}
          {e.etiquetas.includes("requiere-reserva") && <Marca>{te.requiereReserva}</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          <AvisoSinTraducir sinTraducir={c.sinTraducir.has(`experiencias/${e.slug}`)} />
          {e.estado === "borrador" && <AvisoBorrador />}
          <FotoFicha imagen={e.imagen} />
          {e.descripcion && (
            <section aria-labelledby="que-se-hace">
              <h2 id="que-se-hace">{te.queSeHace}</h2>
              <Parrafos texto={e.descripcion} className="prosa" />
            </section>
          )}

          <section aria-labelledby="salidas">
            <h2 id="salidas">{te.proximasSalidas}</h2>
            {salidas.length > 0 ? (
              <ul className="lista-fechas">
                {salidas.map((s) => {
                  const reservable = s.estado === "programada" && (s.urlReserva || accion?.url);
                  return (
                    <li key={s.inicio}>
                      <div>
                        <strong>{formatearOcurrencia(s, c.idioma)}</strong>
                        {s.nota && <span className="dato-ficha__nota">{s.nota}</span>}
                      </div>
                      <Marca tipo={ESTADO_SALIDA[s.estado]}>{te.estadoSalida[s.estado]}</Marca>
                      {reservable && (
                        <a className="enlace-flecha" href={(s.urlReserva || accion!.url)!} rel="noopener" target="_blank">
                          {te.reservarSalida}<span className="visualmente-oculto">{t.comun.controles.otraPestana}</span> <Icono nombre="externo" tamano={14} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="texto-suave">
                {e.accion.tipo === "reservar" && accion
                  ? te.salidasEnSistema
                  : e.accion.tipo === "sin-inscripcion"
                    ? te.sinSalidasPorTuCuenta
                    : te.sinSalidas}
              </p>
            )}
          </section>

          {recorridos.length > 0 && (
            <section className="grupo" aria-labelledby="circuitos">
              <h2 id="circuitos">{te.circuitos}</h2>
              <ul className="items">{recorridos.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">{dato.infoPractica}</h2>
            <dl>
              <Dato icono={e.modalidad === "bus" ? "bus-linea" : "caminata"} titulo={te.modalidad}>{etiquetaModalidad(e, c.idioma)}</Dato>
              {e.duracion && <Dato icono="reloj" titulo={dato.duracion}>{e.duracion}</Dato>}
              {e.horario && <Dato icono="calendario" titulo={dato.horario}><TextoHorario horario={e.horario} idioma={c.idioma} /></Dato>}
              {e.puntoEncuentro && <Dato icono="ubicacion" titulo={te.puntoEncuentro}>{e.puntoEncuentro}</Dato>}
              <Dato icono="ticket" titulo={dato.costo}>{textoCosto(e.costo, c.idioma)}</Dato>
              {e.incluye && <Dato icono="info" titulo={te.incluye}>{e.incluye}</Dato>}
              {e.requisitos && <Dato icono="info" titulo={te.requisitos}>{e.requisitos}</Dato>}
              {e.politicaClima && <Dato icono="lluvia" titulo={te.siLlueve}>{e.politicaClima}</Dato>}
              {e.operador && <Dato icono="brujula" titulo={te.aCargoDe}>{e.operador}</Dato>}
            </dl>
            <div className="panel-practico__acciones">
              {accion ? (
                <>
                  <BotonAccion url={accion.url!} texto={accion.texto} />
                  {accion.url!.startsWith("http") && (
                    <p className="dato-ficha__nota">{te.reservaEnOtroSitio}</p>
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
            <h2 id="lugares">{te.lugares}</h2>
            <ul className="items">{lugares.map((i) => <li key={i.slug}><TarjetaItem item={i} /></li>)}</ul>
          </section>
        )}
        <Fuentes fuentes={e.fuentes} validacion={e.validacion} />
      </div>
    </>
  );
}

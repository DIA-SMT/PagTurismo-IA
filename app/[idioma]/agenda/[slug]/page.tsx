import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, JsonLd, textoCosto } from "@/components/Ficha";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, Aviso, AvisoSinTraducir, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos } from "@/components/Ui";
import { contenido, porSlug, claseEvento } from "@/lib/datos";
import { aInstante, esFechaValida, fechaAnual, formatearOcurrencia, nombreMes, ocurrenciasVigentes } from "@/lib/fechas";
import { formatear } from "@/lib/i18n/definir";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import type { Evento, Ocurrencia } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/[idioma]/agenda/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const e = porSlug(c.eventos, (await params).slug);
  if (!e) return {};
  return {
    title: e.titulo,
    description: e.resumen,
    alternates: await alternativas(`/agenda/${e.slug}`),
    openGraph: { title: e.titulo, description: e.resumen, ...(e.imagen ? { images: [e.imagen.src] } : {}) },
    robots: e.estado === "borrador" ? { index: false } : undefined,
  };
}

/** Marca de cada estado; el texto sale de los textos de la agenda. */
const ESTADO: Record<Ocurrencia["estado"], "exito" | "alerta" | "neutra"> = {
  confirmado: "exito",
  reprogramado: "neutra",
  suspendido: "alerta",
  cancelado: "alerta",
};

/** Archivo .ics para "Agregar al calendario", armado en el momento como data URI. */
function enlaceCalendario(e: Evento, o: Ocurrencia, sede?: string): string {
  const utc = (local: string) => new Date(aInstante(local)).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const inicio = utc(o.inicio);
  const fin = o.fin && esFechaValida(o.fin) ? utc(o.fin) : new Date(aInstante(o.inicio) + 2 * 3_600_000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escapar = (t: string) => t.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, "\\n");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Turismo San Miguel de Tucuman//Agenda//ES",
    "BEGIN:VEVENT",
    `UID:${e.slug}-${inicio}@turismo-smt`,
    `DTSTAMP:${inicio}`, `DTSTART:${inicio}`, `DTEND:${fin}`,
    `SUMMARY:${escapar(e.titulo)}`,
    ...(sede ? [`LOCATION:${escapar(sede)}`] : []),
    `DESCRIPTION:${escapar(e.resumen)}`,
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(ics)}`;
}

export default async function FichaEvento({ params }: PageProps<"/[idioma]/agenda/[slug]">) {
  const [c, textos, { slug }] = await Promise.all([contenido(), textosActuales(), params]);
  const t = textos.agenda.ficha;
  const te = textos.agenda.estado;
  const e = porSlug(c.eventos, slug);
  if (!e) notFound();

  const ahora = Date.now();
  const proximas = ocurrenciasVigentes([e], ahora);
  const pasadas = e.ocurrencias.filter((o) => esFechaValida(o.inicio) && !proximas.some((p) => p.inicio === o.inicio));
  const lugar = e.lugar ? porSlug(c.lugares, e.lugar) : undefined;
  const sede = e.fueraDeLaCiudad ? e.localidad || e.sede : lugar?.titulo ?? e.sede;
  const r = e.recurrente;
  const confirmadaConSede = proximas.find((o) => o.estado === "confirmado" && (o.sede || sede));

  return (
    <>
      {e.estado === "publicado" && confirmadaConSede && (
        <JsonLd datos={{
          "@context": "https://schema.org",
          "@type": "Event",
          name: e.titulo,
          description: e.resumen,
          startDate: new Date(aInstante(confirmadaConSede.inicio)).toISOString(),
          ...(confirmadaConSede.fin && esFechaValida(confirmadaConSede.fin) ? { endDate: new Date(aInstante(confirmadaConSede.fin)).toISOString() } : {}),
          eventStatus: "https://schema.org/EventScheduled",
          location: { "@type": "Place", name: confirmadaConSede.sede || sede, address: { "@type": "PostalAddress", addressLocality: e.fueraDeLaCiudad ? e.localidad : "San Miguel de Tucumán", addressCountry: "AR" } },
          ...(e.organizador ? { organizer: { "@type": "Organization", name: e.organizador } } : {}),
        }} />
      )}

      <EncabezadoPagina
        migas={[{ texto: textos.agenda.titulo, url: "/agenda" }, { texto: e.titulo }]}
        kicker={claseEvento(e.clase, c.idioma)}
        titulo={e.titulo}
        bajada={e.resumen}
      >
        <div className="marcas">
          {e.fueraDeLaCiudad && <Marca tipo="alerta">{t.fueraDeSmt}</Marca>}
          {e.costo.modalidad === "gratis" && <Marca tipo="exito">{textos.comun.ui.gratis}</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          <AvisoSinTraducir sinTraducir={c.sinTraducir.has(`eventos/${slug}`)} />
          {e.estado === "borrador" && <AvisoBorrador />}
          {e.fueraDeLaCiudad && (
            <Aviso tipo="alerta">{formatear(t.avisoFuera, { localidad: e.localidad || t.otraLocalidad })}</Aviso>
          )}
          <FotoFicha imagen={e.imagen} />
          <Parrafos texto={e.descripcion} className="prosa" />

          <section aria-labelledby="fechas">
            <h2 id="fechas">{t.proximasFechas}</h2>
            {proximas.length > 0 ? (
              <ul className="lista-fechas">
                {proximas.map((o) => {
                  const enCurso = o.enCurso && o.estado === "confirmado";
                  return (
                    <li key={o.inicio} className={o.estado === "cancelado" ? "lista-fechas__apagada" : undefined}>
                      <div>
                        <strong>{formatearOcurrencia(o, c.idioma)}</strong>
                        {(o.sede || sede) && <span className="dato-ficha__nota">{o.sede || sede}</span>}
                        {o.nota && <span className="dato-ficha__nota">{o.nota}</span>}
                      </div>
                      <Marca tipo={enCurso ? "exito" : ESTADO[o.estado]}>{enCurso ? te.enCurso : te[o.estado]}</Marca>
                      {(o.estado === "confirmado" || o.estado === "reprogramado") && (
                        <a className="enlace-flecha" href={enlaceCalendario(e, o, o.sede || sede)} download={`${e.slug}.ics`}>
                          <Icono nombre="calendario" tamano={16} /> {t.agregarAlCalendario}
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="texto-suave">
                {r
                  ? r.dia
                    ? formatear(t.cadaAnioElDia, { fecha: fechaAnual(r.mes, r.dia, c.idioma) })
                    : formatear(t.cadaAnioEnMes, { mes: nombreMes(r.mes, c.idioma) })
                  : t.sinFechas}
              </p>
            )}
          </section>

          {pasadas.length > 0 && (
            <section aria-labelledby="pasadas">
              <h2 id="pasadas">{t.fechasAnteriores}</h2>
              <ul className="lista-simple">
                {pasadas.map((o) => <li key={o.inicio}>{formatear(t.finalizado, { fecha: formatearOcurrencia(o, c.idioma) })}</li>)}
              </ul>
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">{t.infoPractica}</h2>
            <dl>
              {r && <Dato icono="calendario" titulo={t.cadaAnio}>{fechaAnual(r.mes, r.dia, c.idioma)}</Dato>}
              {sede && (
                <Dato icono="ubicacion" titulo={t.donde}>
                  {lugar ? <Link href={`/lugares/${lugar.slug}`}>{lugar.titulo}</Link> : sede}
                </Dato>
              )}
              {e.organizador && <Dato icono="info" titulo={t.organiza}>{e.organizador}</Dato>}
              <Dato icono="ticket" titulo={t.costo}>{textoCosto(e.costo, c.idioma)}</Dato>
              {e.inscripcion && <Dato icono="ticket" titulo={t.entradas}>{e.inscripcion}</Dato>}
            </dl>
            <div className="panel-practico__acciones">
              {e.urlOficial && <BotonAccion url={e.urlOficial} texto={t.sitioOficial} />}
              <BotonAccion url="/agenda" texto={t.volver} primario={!e.urlOficial} />
            </div>
          </div>
        </aside>
      </div>

      <div className="contenedor relacionados">
        <Fuentes fuentes={e.fuentes} validacion={e.validacion} />
      </div>
    </>
  );
}

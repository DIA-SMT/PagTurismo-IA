import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BotonAccion, Dato, JsonLd, textoCosto } from "@/components/Ficha";
import { Icono } from "@/components/Iconos";
import { AvisoBorrador, Aviso, EncabezadoPagina, FotoFicha, Fuentes, Marca, Parrafos } from "@/components/Ui";
import { contenido, porSlug, CLASE_EVENTO } from "@/lib/datos";
import { MESES, aInstante, esFechaValida, formatearOcurrencia, ocurrenciasVigentes } from "@/lib/fechas";
import type { Evento, Ocurrencia } from "@/lib/tipos";

export async function generateMetadata({ params }: PageProps<"/agenda/[slug]">): Promise<Metadata> {
  const c = await contenido();
  const e = porSlug(c.eventos, (await params).slug);
  if (!e) return {};
  return {
    title: e.titulo,
    description: e.resumen,
    alternates: { canonical: `/agenda/${e.slug}` },
    openGraph: { title: e.titulo, description: e.resumen, ...(e.imagen ? { images: [e.imagen.src] } : {}) },
    robots: e.estado === "borrador" ? { index: false } : undefined,
  };
}

const ESTADO: Record<Ocurrencia["estado"], { texto: string; tipo: "exito" | "alerta" | "neutra" }> = {
  confirmado: { texto: "Confirmado", tipo: "exito" },
  reprogramado: { texto: "Reprogramado", tipo: "neutra" },
  suspendido: { texto: "Suspendido", tipo: "alerta" },
  cancelado: { texto: "Cancelado", tipo: "alerta" },
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

export default async function FichaEvento({ params }: PageProps<"/agenda/[slug]">) {
  const c = await contenido();
  const e = porSlug(c.eventos, (await params).slug);
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
        migas={[{ texto: "Agenda", url: "/agenda" }, { texto: e.titulo }]}
        kicker={CLASE_EVENTO[e.clase] ?? "Evento"}
        titulo={e.titulo}
        bajada={e.resumen}
      >
        <div className="marcas">
          {e.fueraDeLaCiudad && <Marca tipo="alerta">Fuera de San Miguel de Tucumán</Marca>}
          {e.costo.modalidad === "gratis" && <Marca tipo="exito">Gratis</Marca>}
        </div>
      </EncabezadoPagina>

      <div className="contenedor ficha">
        <div className="ficha__principal">
          {e.estado === "borrador" && <AvisoBorrador />}
          {e.fueraDeLaCiudad && (
            <Aviso tipo="alerta">
              Este evento se hace en {e.localidad || "otra localidad"}, fuera de San Miguel de Tucumán. Tené en cuenta el traslado.
            </Aviso>
          )}
          <FotoFicha imagen={e.imagen} />
          <Parrafos texto={e.descripcion} className="prosa" />

          <section aria-labelledby="fechas">
            <h2 id="fechas">Próximas fechas</h2>
            {proximas.length > 0 ? (
              <ul className="lista-fechas">
                {proximas.map((o) => {
                  const est = ESTADO[o.estado];
                  return (
                    <li key={o.inicio} className={o.estado === "cancelado" ? "lista-fechas__apagada" : undefined}>
                      <div>
                        <strong>{formatearOcurrencia(o)}</strong>
                        {(o.sede || sede) && <span className="dato-ficha__nota">{o.sede || sede}</span>}
                        {o.nota && <span className="dato-ficha__nota">{o.nota}</span>}
                      </div>
                      <Marca tipo={o.enCurso && o.estado === "confirmado" ? "exito" : est.tipo}>{o.enCurso && o.estado === "confirmado" ? "En curso" : est.texto}</Marca>
                      {(o.estado === "confirmado" || o.estado === "reprogramado") && (
                        <a className="enlace-flecha" href={enlaceCalendario(e, o, o.sede || sede)} download={`${e.slug}.ics`}>
                          <Icono nombre="calendario" tamano={16} /> Agregar al calendario
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="texto-suave">
                {r
                  ? `Se celebra cada año ${r.dia ? `el ${r.dia} de ${MESES[r.mes - 1]}` : `en ${MESES[r.mes - 1]}`}. La programación de la próxima edición todavía no fue publicada.`
                  : "Todavía no hay fechas confirmadas."}
              </p>
            )}
          </section>

          {pasadas.length > 0 && (
            <section aria-labelledby="pasadas">
              <h2 id="pasadas">Fechas anteriores</h2>
              <ul className="lista-simple">
                {pasadas.map((o) => <li key={o.inicio}>{formatearOcurrencia(o)} — finalizado</li>)}
              </ul>
            </section>
          )}
        </div>

        <aside className="ficha__lateral" aria-labelledby="info-practica">
          <div className="panel-practico">
            <h2 id="info-practica">Información práctica</h2>
            <dl>
              {r && <Dato icono="calendario" titulo="Cada año">{r.dia ? `${r.dia} de ${MESES[r.mes - 1]}` : MESES[r.mes - 1]}</Dato>}
              {sede && (
                <Dato icono="ubicacion" titulo="Dónde">
                  {lugar ? <Link href={`/lugares/${lugar.slug}`}>{lugar.titulo}</Link> : sede}
                </Dato>
              )}
              {e.organizador && <Dato icono="info" titulo="Organiza">{e.organizador}</Dato>}
              <Dato icono="ticket" titulo="Costo">{textoCosto(e.costo)}</Dato>
              {e.inscripcion && <Dato icono="ticket" titulo="Entradas o inscripción">{e.inscripcion}</Dato>}
            </dl>
            <div className="panel-practico__acciones">
              {e.urlOficial && <BotonAccion url={e.urlOficial} texto="Sitio oficial del evento" />}
              <BotonAccion url="/agenda" texto="Volver a la agenda" primario={!e.urlOficial} />
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

import type { Metadata } from "next";
import { Suspense } from "react";

import { AgendaFiltrable, type OcurrenciaAgenda } from "@/components/AgendaFiltrable";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Marca } from "@/components/Ui";
import { contenido, lugaresPorSlug, agenda } from "@/lib/datos";
import { fechaAnual, mesCorto } from "@/lib/fechas";
import { alternativas, textosActuales } from "@/lib/i18n/servidor";
import { rutas } from "@/lib/rutas";

export async function generateMetadata(): Promise<Metadata> {
  const t = (await textosActuales()).agenda;
  return { title: t.titulo, description: t.descripcion, alternates: await alternativas("/agenda") };
}

export default async function Agenda() {
  const [c, textos] = await Promise.all([contenido(), textosActuales()]);
  const t = textos.agenda;
  const ahora = Date.now();
  const lugares = lugaresPorSlug(c);
  const ocurrencias: OcurrenciaAgenda[] = agenda(c, ahora).map((o) => ({
    evento: o.evento, inicio: o.inicio, fin: o.fin, estado: o.estado, sede: o.sede ?? o.datos.sede, nota: o.nota, enCurso: o.enCurso,
    titulo: o.datos.titulo, url: rutas.evento(o.evento),
    lugar: o.datos.lugar ? lugares.get(o.datos.lugar)?.titulo : undefined,
    fueraDeLaCiudad: !!o.datos.fueraDeLaCiudad,
  }));

  // Calendario anual: fechas que se repiten. No son eventos confirmados.
  const calendario = c.eventos
    .filter((e) => e.recurrente)
    .sort((a, b) => a.recurrente!.mes - b.recurrente!.mes || (a.recurrente!.dia ?? 0) - (b.recurrente!.dia ?? 0));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: t.titulo }]}
        kicker={t.titulo}
        titulo={t.encabezado.titulo}
        bajada={t.encabezado.bajada}
      />

      <div className="contenedor bloque-interno">
        <Suspense fallback={null}>
          <AgendaFiltrable ocurrencias={ocurrencias} ahoraServidor={ahora} />
        </Suspense>

        <section className="grupo calendario-anual" id="calendario" aria-labelledby="calendario-titulo">
          <h2 id="calendario-titulo">{t.calendario.titulo}</h2>
          <p className="texto-suave">{t.calendario.texto}</p>
          <ul className="agenda">
            {calendario.map((e) => {
              const r = e.recurrente!;
              return (
                <li key={e.slug}>
                  <Link className="evento evento--enlace" href={rutas.evento(e.slug)}>
                    <div className={`evento__fecha${r.dia ? "" : " evento__fecha--mes"}`} aria-hidden="true">
                      <span className="evento__mes">{mesCorto(r.mes, c.idioma)}</span>
                      {r.dia && <span className="evento__dia">{r.dia}</span>}
                    </div>
                    <h3>
                      <span className="visualmente-oculto">{fechaAnual(r.mes, r.dia, c.idioma)}: </span>
                      {e.titulo}
                    </h3>
                    {e.fueraDeLaCiudad && <Marca tipo="alerta">{textos.comun.ui.fueraDeLaCiudad}</Marca>}
                    <p className="evento__lugar"><Icono nombre="ubicacion" tamano={15} />{e.fueraDeLaCiudad ? e.localidad || e.sede : e.sede}</p>
                    <p>{e.resumen}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";

import { AgendaFiltrable } from "@/components/AgendaFiltrable";
import { GrillaEventos, SemanaAgenda } from "@/components/cultura/Agenda";
import { Vinculo as Link } from "@/components/i18n/Idioma";
import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Marca } from "@/components/Ui";
import { contenido, ocurrenciasDeAgenda } from "@/lib/datos";
import { categoriasPopulares, proximosDias, proximosEventos } from "@/lib/cultura/agenda";
import { diaLocal, fechaAnual, mesCorto } from "@/lib/fechas";
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
  const ocurrencias = ocurrenciasDeAgenda(c, ahora);
  const destacados = proximosEventos(ocurrencias.filter((o) => o.destacado), ahora, 3);
  const populares = categoriasPopulares(ocurrencias, ahora, 8);

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

      <div className="contenedor bloque-interno" data-modulo="cultura">
        {destacados.length > 0 && (
          <section className="agenda-destacados" aria-labelledby="destacados-agenda">
            <h2 id="destacados-agenda">{textos.cultura.portada.destacados}</h2>
            <GrillaEventos ocurrencias={destacados} categorias={c.categoriasAgenda} />
          </section>
        )}
        {ocurrencias.length > 0 && <SemanaAgenda dias={proximosDias(ocurrencias, diaLocal(ahora))} categorias={c.categoriasAgenda} />}
        <p className="agenda-talleres">
          <span>{textos.talleres.enLaAgenda}</span>
          <Link className="enlace-flecha" href="/talleres">{textos.talleres.verTalleres} <Icono nombre="flecha" tamano={16} /></Link>
        </p>
        <Suspense fallback={null}>
          <AgendaFiltrable ocurrencias={ocurrencias} categorias={c.categoriasAgenda} populares={populares} ahoraServidor={ahora} />
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

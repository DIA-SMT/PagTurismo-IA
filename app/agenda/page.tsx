import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AgendaFiltrable, type OcurrenciaAgenda } from "@/components/AgendaFiltrable";
import { Icono } from "@/components/Iconos";
import { EncabezadoPagina, Marca } from "@/components/Ui";
import { getAgenda, getEventos, lugaresPorSlug } from "@/lib/datos";
import { MESES } from "@/lib/fechas";
import { rutas } from "@/lib/rutas";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Qué hacer hoy, este fin de semana o en la fecha de tu viaje a San Miguel de Tucumán, y las fechas que la ciudad celebra cada año.",
  alternates: { canonical: "/agenda" },
};

// Se regenera cada hora para que los eventos terminados salgan solos.
export const revalidate = 3600;

export default function Agenda() {
  const ahora = Date.now();
  const lugares = lugaresPorSlug();
  const ocurrencias: OcurrenciaAgenda[] = getAgenda(ahora).map((o) => ({
    evento: o.evento, inicio: o.inicio, fin: o.fin, estado: o.estado, sede: o.sede ?? o.datos.sede, nota: o.nota, enCurso: o.enCurso,
    titulo: o.datos.titulo, url: rutas.evento(o.evento),
    lugar: o.datos.lugar ? lugares.get(o.datos.lugar)?.titulo : undefined,
    fueraDeLaCiudad: !!o.datos.fueraDeLaCiudad,
  }));

  // Calendario anual: fechas que se repiten. No son eventos confirmados.
  const calendario = getEventos()
    .filter((e) => e.recurrente)
    .sort((a, b) => a.recurrente!.mes - b.recurrente!.mes || (a.recurrente!.dia ?? 0) - (b.recurrente!.dia ?? 0));

  return (
    <>
      <EncabezadoPagina
        migas={[{ texto: "Agenda" }]}
        kicker="Agenda"
        titulo="Qué hay cuando viajás"
        bajada="Actividades con fecha confirmada, en hora de Tucumán. Los eventos terminados dejan de aparecer solos."
      />

      <div className="contenedor bloque-interno">
        <Suspense fallback={null}>
          <AgendaFiltrable ocurrencias={ocurrencias} ahoraServidor={ahora} />
        </Suspense>

        <section className="grupo calendario-anual" id="calendario" aria-labelledby="calendario-titulo">
          <h2 id="calendario-titulo">Calendario anual</h2>
          <p className="texto-suave">
            Fechas que la ciudad celebra todos los años. Que una fecha esté en el calendario no significa que ya haya
            actividades anunciadas: la programación de cada edición aparece arriba cuando se confirma.
          </p>
          <ul className="agenda">
            {calendario.map((e) => {
              const r = e.recurrente!;
              return (
                <li key={e.slug}>
                  <Link className="evento evento--enlace" href={rutas.evento(e.slug)}>
                    <div className={`evento__fecha${r.dia ? "" : " evento__fecha--mes"}`} aria-hidden="true">
                      <span className="evento__mes">{MESES[r.mes - 1].slice(0, 3).toUpperCase()}</span>
                      {r.dia && <span className="evento__dia">{r.dia}</span>}
                    </div>
                    <h3>
                      <span className="visualmente-oculto">{r.dia ? `${r.dia} de ` : ""}{MESES[r.mes - 1]}: </span>
                      {e.titulo}
                    </h3>
                    {e.fueraDeLaCiudad && <Marca tipo="alerta">Fuera de la ciudad</Marca>}
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
